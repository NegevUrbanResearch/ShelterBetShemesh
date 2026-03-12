#!/usr/bin/env python
"""Backend pipeline for Bet Shemesh meguniot placement.

This script:
1) Loads and normalizes buildings + existing Miguniot/Miklatim data.
2) Filters target buildings (pre-1992 and <=3 floors OR <=2 apartments).
3) Builds an OSMnx walking network for Bet Shemesh bounding polygon.
4) Computes existing-shelter network coverage for time buckets.
5) Proposes up to 300 new meguniot per bucket using greedy marginal gain.
6) Exports JSON + CSV + GeoJSON outputs under data/meguniot_network/.
"""

from __future__ import annotations

import argparse
import json
import logging
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import geopandas as gpd
import networkx as nx
import numpy as np
import osmnx as ox
import pandas as pd
from shapely.geometry import MultiPoint, Point, mapping
from sklearn.cluster import DBSCAN

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUTPUT_DIR = DATA_DIR / "meguniot_network"
CACHE_DIR = ROOT / "cache"

TIME_BUCKETS = {
    "30s": 30,
    "1min": 60,
    "2min": 120,
    "3min": 180,
    "5min": 300,
}
PEOPLE_PER_BUILDING = 7
MAX_PROPOSED = 300
SPACING_FACTOR = 0.6
SCHEMA_VERSION = "1.1.0"

logger = logging.getLogger("meguniot_backend")


@dataclass
class BucketResult:
    bucket: str
    seconds: int
    radius_m: float
    selected_indices: list[int]
    selected_covered_sets: list[set[int]]
    initial_uncovered: set[int]
    final_uncovered: set[int]
    uncovered_clusters: list[dict[str, Any]]


def _configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )


def _assert_input_files_exist(paths: Iterable[Path]) -> None:
    missing = [str(path) for path in paths if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Missing required input files: {missing}")


def _ensure_non_empty_points(gdf: gpd.GeoDataFrame, name: str) -> gpd.GeoDataFrame:
    if gdf.empty:
        raise ValueError(f"{name} dataset is empty.")
    gdf = gdf[gdf.geometry.notna()].copy()
    gdf = gdf[gdf.geometry.is_valid].copy()
    if gdf.empty:
        raise ValueError(f"{name} has no valid geometries.")
    if not gdf.geometry.geom_type.isin(["Point"]).all():
        gdf["geometry"] = gdf.geometry.centroid
    return gdf


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def _build_output_schema_doc() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "time_buckets": list(TIME_BUCKETS.keys()),
        "files": {
            "building_coverage_network.json": {
                "required_top_level_fields": [
                    "schema_version",
                    "time_buckets",
                    "walk_speed_mps",
                    "total_target_buildings",
                    "buildings",
                ]
            },
            "optimal_meguniot_<bucket>.json": {
                "required_top_level_fields": [
                    "schema_version",
                    "time_bucket",
                    "time_seconds",
                    "radius_meters",
                    "walk_speed_mps",
                    "statistics",
                    "top_uncovered_clusters",
                    "proposed_meguniot",
                ]
            },
            "recommended_meguniot_<bucket>.csv": {
                "required_columns": [
                    "rank",
                    "time_bucket",
                    "time_seconds",
                    "coordinates",
                    "lat",
                    "lon",
                    "newly_covered_buildings",
                    "newly_covered_people_est",
                ]
            },
            "recommended_meguniot_<bucket>.geojson": {
                "required_top_level_fields": ["type", "features"],
                "expected_type": "FeatureCollection",
            },
            "optimization_summary.json": {
                "required_top_level_fields": [
                    "schema_version",
                    "walk_speed_mps",
                    "time_buckets",
                    "total_target_buildings",
                    "results",
                ]
            },
        },
    }


def _validate_outputs() -> None:
    expected_files = [
        OUTPUT_DIR / "building_coverage_network.json",
        OUTPUT_DIR / "optimization_summary.json",
        OUTPUT_DIR / "output_schema.json",
    ]
    expected_files.extend(OUTPUT_DIR / f"optimal_meguniot_{bucket}.json" for bucket in TIME_BUCKETS)
    expected_files.extend(
        OUTPUT_DIR / f"recommended_meguniot_{bucket}.csv" for bucket in TIME_BUCKETS
    )
    expected_files.extend(
        OUTPUT_DIR / f"recommended_meguniot_{bucket}.geojson" for bucket in TIME_BUCKETS
    )

    missing = [str(path) for path in expected_files if not path.exists()]
    if missing:
        raise RuntimeError(f"Pipeline completed but missing expected outputs: {missing}")


def _load_geojson_with_real_crs(path: Path) -> gpd.GeoDataFrame:
    """Load GeoJSON and override incorrect CRS metadata when needed."""
    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    raw_crs_name = (
        raw.get("crs", {}).get("properties", {}).get("name", "").upper().strip()
    )

    gdf = gpd.read_file(path)
    minx, miny, maxx, maxy = gdf.total_bounds

    if "EPSG:3857" in raw_crs_name:
        source_crs = "EPSG:3857"
    elif "EPSG:2039" in raw_crs_name:
        source_crs = "EPSG:2039"
    elif maxx > 1_000_000 and maxy > 1_000_000:
        source_crs = "EPSG:3857"
    elif 100_000 < maxx < 400_000 and 400_000 < maxy < 900_000:
        source_crs = "EPSG:2039"
    else:
        source_crs = "EPSG:4326"

    gdf = gdf.set_crs(source_crs, allow_override=True)
    return gdf


def _first_present(df: pd.DataFrame, names: Iterable[str]) -> str | None:
    name_map = {c.lower(): c for c in df.columns}
    for n in names:
        key = n.lower()
        if key in name_map:
            return name_map[key]
    return None


def _to_boolish(val: Any) -> bool:
    if pd.isna(val):
        return False
    if isinstance(val, (bool, np.bool_)):
        return bool(val)
    if isinstance(val, (int, np.integer, float, np.floating)):
        return float(val) >= 1
    s = str(val).strip().lower()
    return s in {"1", "true", "t", "yes", "y", "כן", "ken"}


def _to_int_safe(val: Any, default: int = 0) -> int:
    if pd.isna(val):
        return default
    try:
        return int(float(val))
    except (TypeError, ValueError):
        return default


def load_target_buildings(path: Path) -> gpd.GeoDataFrame:
    gdf = _load_geojson_with_real_crs(path).to_crs("EPSG:2039")
    gdf = _ensure_non_empty_points(gdf, "buildings")

    year_col = _first_present(
        gdf,
        [
            "BuildYear",
            "build_year",
            "year_built",
            "year",
            "shnat_bnia",
            "shnat_bnaya",
        ],
    )
    floors_col = _first_present(gdf, ["Floors", "floors", "komot"])
    apartments_col = _first_present(
        gdf, ["Apartments", "apartments", "units", "diyot", "dirhot", "deyrot"]
    )
    before_1992_col = _first_present(
        gdf, ["Before_1992", "before_1992", "before1992", "lifney_1992"]
    )
    single_family_col = _first_present(
        gdf,
        [
            "single_family",
            "singlefamily",
            "private_house",
            "tzmod_krka",
            "tzamud_karka",
        ],
    )
    residential_col = _first_present(
        gdf,
        [
            "residential",
            "is_residential",
            "res",
            "miyuad_mgourim",
            "megurim",
        ],
    )

    gdf["build_year_norm"] = gdf[year_col].apply(_to_int_safe) if year_col else 0
    gdf["floors_norm"] = gdf[floors_col].apply(_to_int_safe) if floors_col else 0
    gdf["apartments_norm"] = (
        gdf[apartments_col].apply(_to_int_safe) if apartments_col else 0
    )
    if before_1992_col:
        gdf["before_1992_norm"] = gdf[before_1992_col].apply(_to_boolish)
    else:
        gdf["before_1992_norm"] = gdf["build_year_norm"].between(1, 1991)

    residential_mask = pd.Series(True, index=gdf.index)
    if single_family_col:
        residential_mask &= gdf[single_family_col].apply(_to_boolish)
    if residential_col:
        residential_mask &= gdf[residential_col].apply(_to_boolish)

    target_mask = (
        gdf["before_1992_norm"]
        & ((gdf["floors_norm"] <= 3) | (gdf["apartments_norm"] <= 2))
        & residential_mask
    )
    target = gdf[target_mask].copy().reset_index(drop=True)
    if target.empty:
        raise ValueError("No target buildings found after filtering criteria.")
    target["building_idx"] = target.index.astype(int)
    id_col = _first_present(target, ["OBJECTID", "objectid", "id"])
    if id_col:
        target["id"] = target[id_col]
        missing = target["id"].isna()
        if missing.any():
            target.loc[missing, "id"] = np.arange(len(target))[missing.to_numpy()]
        target["id"] = target["id"].astype(int)
    else:
        target["id"] = target.index.astype(int)
    return target


def load_existing_shelters(mig_path: Path, mik_path: Path) -> gpd.GeoDataFrame:
    mig = _load_geojson_with_real_crs(mig_path).to_crs("EPSG:2039").copy()
    mik = _load_geojson_with_real_crs(mik_path).to_crs("EPSG:2039").copy()
    mig["shelter_type"] = "megunit"
    mik["shelter_type"] = "miklat"
    mig = _ensure_non_empty_points(mig, "Miguniot")
    mik = _ensure_non_empty_points(mik, "Miklatim")
    merged = pd.concat([mig, mik], ignore_index=True)
    if merged.empty:
        raise ValueError("No existing shelters loaded from Miguniot/Miklatim.")
    merged["shelter_id"] = np.arange(len(merged)).astype(int)
    return gpd.GeoDataFrame(merged, geometry="geometry", crs="EPSG:2039")


def build_walking_graph(buildings_2039: gpd.GeoDataFrame) -> nx.MultiDiGraph:
    if len(buildings_2039) < 3:
        raise ValueError("Need at least 3 buildings to build walking graph hull.")
    points_wgs = buildings_2039.to_crs("EPSG:4326").geometry
    hull = MultiPoint(list(points_wgs.values)).convex_hull.buffer(0.01)

    ox.settings.use_cache = True
    ox.settings.cache_folder = str(CACHE_DIR)
    ox.settings.log_console = False

    graph_wgs = ox.graph_from_polygon(hull, network_type="walk", simplify=True)
    graph_proj = ox.project_graph(graph_wgs, to_crs="EPSG:2039")
    return graph_proj


def _nearest_nodes_for_points(
    graph: nx.MultiDiGraph, points: gpd.GeoSeries
) -> list[int]:
    xs = np.array([geom.x for geom in points], dtype=float)
    ys = np.array([geom.y for geom in points], dtype=float)
    nodes = ox.distance.nearest_nodes(graph, xs, ys)
    return [int(n) for n in np.asarray(nodes)]


def _cluster_uncovered(
    buildings: gpd.GeoDataFrame, uncovered: set[int], radius_m: float
) -> list[dict[str, Any]]:
    if len(uncovered) < 5:
        return []
    coords = np.array(
        [[buildings.geometry.iloc[i].x, buildings.geometry.iloc[i].y] for i in uncovered]
    )
    db = DBSCAN(eps=max(radius_m, 40.0), min_samples=5).fit(coords)
    labels = db.labels_
    clusters: list[dict[str, Any]] = []
    for label in sorted(set(labels)):
        if label < 0:
            continue
        idxs = np.where(labels == label)[0]
        if len(idxs) == 0:
            continue
        pts = coords[idxs]
        center_x = float(np.mean(pts[:, 0]))
        center_y = float(np.mean(pts[:, 1]))
        clusters.append(
            {
                "cluster_id": int(label),
                "building_count": int(len(idxs)),
                "centroid_x_2039": center_x,
                "centroid_y_2039": center_y,
            }
        )
    clusters.sort(key=lambda c: c["building_count"], reverse=True)
    return clusters[:20]


def _candidate_coverages_for_bucket(
    graph: nx.MultiDiGraph,
    building_nodes: dict[int, int],
    candidate_indices: list[int],
    radius_m: float,
) -> dict[int, set[int]]:
    coverages: dict[int, set[int]] = {}
    node_to_building_indices: dict[int, list[int]] = {}
    for idx, node in building_nodes.items():
        node_to_building_indices.setdefault(node, []).append(idx)

    for idx in candidate_indices:
        src = building_nodes[idx]
        lengths = nx.single_source_dijkstra_path_length(
            graph, src, cutoff=radius_m, weight="length"
        )
        covered: set[int] = set()
        for node in lengths:
            matched = node_to_building_indices.get(int(node))
            if matched:
                covered.update(matched)
        coverages[idx] = covered
    return coverages


def _greedy_select(
    buildings: gpd.GeoDataFrame,
    initial_uncovered: set[int],
    candidate_coverages: dict[int, set[int]],
    radius_m: float,
) -> tuple[list[int], list[set[int]], set[int]]:
    uncovered = set(initial_uncovered)
    selected: list[int] = []
    selected_sets: list[set[int]] = []
    candidates = list(candidate_coverages.keys())
    blocked: set[int] = set()
    min_sep = SPACING_FACTOR * radius_m

    coords = {
        idx: np.array([buildings.geometry.iloc[idx].x, buildings.geometry.iloc[idx].y])
        for idx in candidates
    }
    density_bonus = {}
    for idx in candidates:
        p = coords[idx]
        density = 0
        for j in candidates:
            if idx == j:
                continue
            if np.linalg.norm(p - coords[j]) <= radius_m:
                density += 1
        density_bonus[idx] = density

    while uncovered and len(selected) < MAX_PROPOSED:
        best_idx = None
        best_gain = 0
        best_density = -1

        for idx in candidates:
            if idx in blocked or idx in selected:
                continue
            gain = len(candidate_coverages[idx] & uncovered)
            if gain > best_gain or (
                gain == best_gain and gain > 0 and density_bonus[idx] > best_density
            ):
                best_idx = idx
                best_gain = gain
                best_density = density_bonus[idx]

        if best_idx is None or best_gain <= 0:
            break

        selected.append(best_idx)
        covered_now = candidate_coverages[best_idx] & uncovered
        selected_sets.append(set(covered_now))
        uncovered -= covered_now

        best_point = coords[best_idx]
        for idx in candidates:
            if idx in blocked or idx in selected:
                continue
            if np.linalg.norm(coords[idx] - best_point) <= min_sep:
                blocked.add(idx)

    return selected, selected_sets, uncovered


def run_pipeline(walk_speed_mps: float, force_rebuild_graph: bool) -> None:
    if walk_speed_mps <= 0:
        raise ValueError("walk_speed_mps must be positive.")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    _assert_input_files_exist(
        [
            DATA_DIR / "buildings.geojson",
            DATA_DIR / "Miguniot.geojson",
            DATA_DIR / "Miklatim.geojson",
        ]
    )
    logger.info("Loading inputs and filtering target buildings")

    buildings = load_target_buildings(DATA_DIR / "buildings.geojson")
    shelters = load_existing_shelters(DATA_DIR / "Miguniot.geojson", DATA_DIR / "Miklatim.geojson")
    logger.info("Loaded %d target buildings and %d existing shelters", len(buildings), len(shelters))

    graph_path = OUTPUT_DIR / "walk_graph_2039.graphml"
    if graph_path.exists() and not force_rebuild_graph:
        logger.info("Loading cached walk graph from %s", graph_path)
        graph = ox.load_graphml(graph_path)
    else:
        logger.info("Building walking graph with OSMnx")
        graph = build_walking_graph(buildings)
        ox.save_graphml(graph, graph_path)
        logger.info("Saved walk graph to %s", graph_path)

    buildings["node_id"] = _nearest_nodes_for_points(graph, buildings.geometry)
    shelters["node_id"] = _nearest_nodes_for_points(graph, shelters.geometry)
    shelter_nodes = [int(n) for n in shelters["node_id"].tolist()]
    if not shelter_nodes:
        raise ValueError("No shelter nodes were mapped to walking graph.")
    building_nodes = {int(r.building_idx): int(r.node_id) for r in buildings.itertuples()}

    bucket_distances = {k: v * walk_speed_mps for k, v in TIME_BUCKETS.items()}
    max_radius = max(bucket_distances.values())

    dist_to_any = nx.multi_source_dijkstra_path_length(
        graph, shelter_nodes, cutoff=max_radius, weight="length"
    )

    buildings_wgs = buildings.to_crs("EPSG:4326")
    coverage_records: list[dict[str, Any]] = []
    for row, row_wgs in zip(buildings.itertuples(), buildings_wgs.itertuples()):
        d = float(dist_to_any.get(int(row.node_id), math.inf))
        record = {
            "id": int(row.id),
            "building_idx": int(row.building_idx),
            "lon": float(row_wgs.geometry.x),
            "lat": float(row_wgs.geometry.y),
            "build_year": int(row.build_year_norm),
            "floors": int(row.floors_norm),
            "apartments": int(row.apartments_norm),
            "before_1992": bool(row.before_1992_norm),
            "nearest_shelter_distance_m": None if math.isinf(d) else round(d, 2),
        }
        for bucket, radius in bucket_distances.items():
            record[f"covered_{bucket}"] = bool(d <= radius)
        coverage_records.append(record)

    _write_json(
        OUTPUT_DIR / "building_coverage_network.json",
        {
            "schema_version": SCHEMA_VERSION,
            "time_buckets": TIME_BUCKETS,
            "walk_speed_mps": walk_speed_mps,
            "total_target_buildings": len(coverage_records),
            "buildings": coverage_records,
        },
    )

    results: list[BucketResult] = []
    for bucket, seconds in TIME_BUCKETS.items():
        logger.info("Optimizing recommendations for %s bucket", bucket)
        radius_m = bucket_distances[bucket]
        initially_uncovered = {
            int(r["building_idx"])
            for r in coverage_records
            if not r.get(f"covered_{bucket}", False)
        }
        clusters = _cluster_uncovered(buildings, initially_uncovered, radius_m)

        candidate_indices = sorted(initially_uncovered)
        candidate_coverages = _candidate_coverages_for_bucket(
            graph, building_nodes, candidate_indices, radius_m
        )

        selected, selected_sets, final_uncovered = _greedy_select(
            buildings, initially_uncovered, candidate_coverages, radius_m
        )
        results.append(
            BucketResult(
                bucket=bucket,
                seconds=seconds,
                radius_m=radius_m,
                selected_indices=selected,
                selected_covered_sets=selected_sets,
                initial_uncovered=initially_uncovered,
                final_uncovered=final_uncovered,
                uncovered_clusters=clusters,
            )
        )

    for res in results:
        proposed = []
        for rank, (idx, covered_set) in enumerate(
            zip(res.selected_indices, res.selected_covered_sets), start=1
        ):
            geom = buildings_wgs.geometry.iloc[idx]
            proposed.append(
                {
                    "rank": rank,
                    "building_idx": int(idx),
                    "coordinates": f"{geom.y:.6f},{geom.x:.6f}",
                    "lat": float(geom.y),
                    "lon": float(geom.x),
                    "newly_covered_buildings": int(len(covered_set)),
                    "newly_covered_people_est": int(len(covered_set) * PEOPLE_PER_BUILDING),
                    "covered_building_indices": sorted(int(x) for x in covered_set),
                }
            )

        stats = {
            "time_bucket": res.bucket,
            "time_seconds": res.seconds,
            "radius_meters": round(res.radius_m, 2),
            "walk_speed_mps": walk_speed_mps,
            "total_target_buildings": len(buildings),
            "covered_by_existing": int(len(buildings) - len(res.initial_uncovered)),
            "currently_uncovered": int(len(res.initial_uncovered)),
            "additional_covered_by_proposed": int(len(res.initial_uncovered) - len(res.final_uncovered)),
            "final_uncovered": int(len(res.final_uncovered)),
            "num_proposed_meguniot": int(len(res.selected_indices)),
            "max_proposed_limit": MAX_PROPOSED,
        }

        out_json = OUTPUT_DIR / f"optimal_meguniot_{res.bucket}.json"
        _write_json(
            out_json,
            {
                "schema_version": SCHEMA_VERSION,
                "time_bucket": res.bucket,
                "time_seconds": res.seconds,
                "radius_meters": round(res.radius_m, 2),
                "walk_speed_mps": walk_speed_mps,
                "statistics": stats,
                "top_uncovered_clusters": res.uncovered_clusters,
                "proposed_meguniot": proposed,
            },
        )

        csv_df = pd.DataFrame(
            [
                {
                    "rank": p["rank"],
                    "time_bucket": res.bucket,
                    "time_seconds": res.seconds,
                    "coordinates": p["coordinates"],
                    "lat": p["lat"],
                    "lon": p["lon"],
                    "newly_covered_buildings": p["newly_covered_buildings"],
                    "newly_covered_people_est": p["newly_covered_people_est"],
                }
                for p in proposed
            ]
        )
        csv_df.to_csv(OUTPUT_DIR / f"recommended_meguniot_{res.bucket}.csv", index=False)

        geojson_features = []
        for p in proposed:
            pt = Point(float(p["lon"]), float(p["lat"]))
            geojson_features.append(
                {
                    "type": "Feature",
                    "geometry": mapping(pt),
                    "properties": {
                        "rank": p["rank"],
                        "time_bucket": res.bucket,
                        "time_seconds": res.seconds,
                        "coordinates": p["coordinates"],
                        "newly_covered_buildings": p["newly_covered_buildings"],
                        "newly_covered_people_est": p["newly_covered_people_est"],
                    },
                }
            )
        _write_json(
            OUTPUT_DIR / f"recommended_meguniot_{res.bucket}.geojson",
            {"type": "FeatureCollection", "features": geojson_features},
        )

    summary = {
        "schema_version": SCHEMA_VERSION,
        "walk_speed_mps": walk_speed_mps,
        "time_buckets": TIME_BUCKETS,
        "total_target_buildings": int(len(buildings)),
        "results": [
            {
                "time_bucket": r.bucket,
                "time_seconds": r.seconds,
                "radius_meters": round(r.radius_m, 2),
                "currently_uncovered": int(len(r.initial_uncovered)),
                "additional_covered_by_proposed": int(
                    len(r.initial_uncovered) - len(r.final_uncovered)
                ),
                "num_proposed_meguniot": int(len(r.selected_indices)),
                "final_uncovered": int(len(r.final_uncovered)),
            }
            for r in results
        ],
    }
    _write_json(OUTPUT_DIR / "optimization_summary.json", summary)
    _write_json(OUTPUT_DIR / "output_schema.json", _build_output_schema_doc())
    _validate_outputs()
    logger.info("Pipeline completed successfully. Outputs written to %s", OUTPUT_DIR)


def main() -> None:
    _configure_logging()
    parser = argparse.ArgumentParser(description="Run Bet Shemesh meguniot backend pipeline.")
    parser.add_argument("--walk-speed-mps", type=float, default=1.3)
    parser.add_argument("--force-rebuild-graph", action="store_true")
    args = parser.parse_args()
    run_pipeline(walk_speed_mps=args.walk_speed_mps, force_rebuild_graph=args.force_rebuild_graph)


if __name__ == "__main__":
    main()
