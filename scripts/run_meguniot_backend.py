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

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUTPUT_DIR = DATA_DIR / "meguniot_network"
CACHE_DIR = ROOT / "cache"

TIME_BUCKETS = {
    "1min": 60,
    "2min": 120,
    "3min": 180,
}
PEOPLE_PER_BUILDING = 7
SCHEMA_VERSION = "2.0.0"

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
    stop_reason: str


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
                    "optimization_method",
                    "statistics",
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
            "shelter_isochrones_<bucket>.geojson": {
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
    expected_files.extend(OUTPUT_DIR / f"shelter_isochrones_{bucket}.geojson" for bucket in TIME_BUCKETS)

    missing = [str(path) for path in expected_files if not path.exists()]
    if missing:
        raise RuntimeError(f"Pipeline completed but missing expected outputs: {missing}")


def _cleanup_stale_bucket_outputs() -> None:
    """Delete stale per-bucket files from previously supported time buckets."""
    valid_suffixes = set(TIME_BUCKETS.keys())
    prefixes = (
        "optimal_meguniot_",
        "recommended_meguniot_",
        "shelter_isochrones_",
        "uncovered_buildings_",
    )
    extensions = (".json", ".csv", ".geojson")
    for path in OUTPUT_DIR.glob("*"):
        if not path.is_file():
            continue
        name = path.name
        for prefix in prefixes:
            if not name.startswith(prefix):
                continue
            if not name.endswith(extensions):
                continue
            bucket = name[len(prefix) :].split(".")[0]
            if bucket not in valid_suffixes:
                path.unlink(missing_ok=True)
            break


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


def _shelter_coverages_for_bucket(
    graph: nx.MultiDiGraph,
    building_nodes: dict[int, int],
    shelter_node_ids: list[int],
    radius_m: float,
) -> dict[int, set[int]]:
    coverages: dict[int, set[int]] = {}
    node_to_building_indices: dict[int, list[int]] = {}
    for idx, node in building_nodes.items():
        node_to_building_indices.setdefault(node, []).append(idx)

    for shelter_id, src in enumerate(shelter_node_ids):
        lengths = nx.single_source_dijkstra_path_length(
            graph, int(src), cutoff=radius_m, weight="length"
        )
        covered: set[int] = set()
        for node in lengths:
            matched = node_to_building_indices.get(int(node))
            if matched:
                covered.update(matched)
        coverages[shelter_id] = covered
    return coverages


def _coverage_hull_polygon(
    buildings: gpd.GeoDataFrame,
    covered_indices: set[int],
    shelter_point: Point | None = None,
    padding_m: float = 8.0,
) -> Any | None:
    raw_points = [buildings.geometry.iloc[int(idx)] for idx in sorted(covered_indices)]
    if shelter_point is not None:
        raw_points.append(shelter_point)
    points = []
    for geom in raw_points:
        if geom is None or geom.is_empty or not geom.is_valid:
            continue
        if not math.isfinite(float(geom.x)) or not math.isfinite(float(geom.y)):
            continue
        points.append(Point(float(geom.x), float(geom.y)))
    if not points:
        return None

    if len(points) >= 3:
        hull = MultiPoint(points).convex_hull
    else:
        # For sparse coverage sets, keep a visible area around available points.
        hull = MultiPoint(points).buffer(max(padding_m, 12.0))
    if hull.geom_type in {"Point", "LineString"}:
        hull = hull.buffer(max(padding_m, 12.0))
    if not hull.is_valid:
        hull = hull.buffer(0)
    polygon = hull.simplify(3, preserve_topology=True)
    if polygon.is_empty:
        return None
    return polygon


def _greedy_select(
    initial_uncovered: set[int],
    candidate_coverages: dict[int, set[int]],
    max_new_shelters: int | None,
) -> tuple[list[int], list[set[int]], set[int], str]:
    """Lazy-greedy maximum coverage (CELF-style) for uncovered buildings."""
    uncovered = set(initial_uncovered)
    selected: list[int] = []
    selected_sets: list[set[int]] = []
    if not uncovered:
        return selected, selected_sets, uncovered, "all_covered_by_existing"
    if max_new_shelters is not None and max_new_shelters <= 0:
        return selected, selected_sets, uncovered, "budget_limit"

    # Max-heap via negative gain; third value tracks stale evaluations by round.
    import heapq

    heap: list[tuple[int, int, int]] = []
    for idx, covered in candidate_coverages.items():
        gain = len(covered & uncovered)
        if gain > 0:
            heapq.heappush(heap, (-gain, int(idx), -1))

    current_round = 0
    while uncovered and (max_new_shelters is None or len(selected) < max_new_shelters) and heap:
        neg_gain, idx, eval_round = heapq.heappop(heap)
        if eval_round != current_round:
            refreshed_gain = len(candidate_coverages[idx] & uncovered)
            if refreshed_gain > 0:
                heapq.heappush(heap, (-refreshed_gain, idx, current_round))
            continue

        gain = -neg_gain
        if gain <= 0:
            break

        covered_now = candidate_coverages[idx] & uncovered
        if not covered_now:
            continue

        selected.append(idx)
        selected_sets.append(set(covered_now))
        uncovered -= covered_now
        current_round += 1

    if not uncovered:
        stop_reason = "full_coverage_achieved"
    elif max_new_shelters is not None and len(selected) >= max_new_shelters:
        stop_reason = "budget_limit"
    else:
        stop_reason = "no_marginal_gain"

    return selected, selected_sets, uncovered, stop_reason


def run_pipeline(
    walk_speed_mps: float, force_rebuild_graph: bool, max_new_shelters: int | None
) -> None:
    if walk_speed_mps <= 0:
        raise ValueError("walk_speed_mps must be positive.")
    if max_new_shelters is not None and max_new_shelters < 0:
        raise ValueError("max_new_shelters must be non-negative.")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    _cleanup_stale_bucket_outputs()
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
    candidate_coverages_by_bucket: dict[str, dict[int, set[int]]] = {}
    shelter_isochrones_by_bucket: dict[str, list[dict[str, Any]]] = {}
    shelters_wgs = shelters.to_crs("EPSG:4326")

    for bucket, seconds in TIME_BUCKETS.items():
        logger.info("Optimizing recommendations for %s bucket", bucket)
        radius_m = bucket_distances[bucket]
        initially_uncovered = {
            int(r["building_idx"])
            for r in coverage_records
            if not r.get(f"covered_{bucket}", False)
        }
        candidate_indices = sorted(int(i) for i in buildings["building_idx"].tolist())
        candidate_coverages = _candidate_coverages_for_bucket(
            graph, building_nodes, candidate_indices, radius_m
        )
        candidate_coverages_by_bucket[bucket] = candidate_coverages
        existing_coverages = _shelter_coverages_for_bucket(
            graph, building_nodes, shelter_nodes, radius_m
        )

        selected, selected_sets, final_uncovered, stop_reason = _greedy_select(
            initially_uncovered, candidate_coverages, max_new_shelters
        )

        bucket_isochrones: list[dict[str, Any]] = []
        for shelter_row in shelters.itertuples():
            shelter_id = int(shelter_row.shelter_id)
            covered_set = existing_coverages.get(shelter_id, set())
            covered_indices = sorted(int(x) for x in covered_set)
            coverage_hull_2039 = _coverage_hull_polygon(
                buildings, covered_set, shelter_point=shelter_row.geometry
            )
            if coverage_hull_2039 is None:
                continue
            coverage_hull_wgs = (
                gpd.GeoSeries([coverage_hull_2039], crs="EPSG:2039").to_crs("EPSG:4326").iloc[0]
            )
            shelter_wgs_geom = shelters_wgs.geometry.iloc[shelter_id]
            bucket_isochrones.append(
                {
                    "type": "Feature",
                    "geometry": mapping(coverage_hull_wgs),
                    "properties": {
                        "shelter_kind": "existing",
                        "shelter_id": shelter_id,
                        "shelter_type": str(shelter_row.shelter_type),
                        "lat": float(shelter_wgs_geom.y),
                        "lon": float(shelter_wgs_geom.x),
                        "time_bucket": bucket,
                        "time_seconds": seconds,
                        "covered_building_indices": covered_indices,
                        "covered_buildings_count": len(covered_indices),
                    },
                }
            )

        for rank, idx in enumerate(selected, start=1):
            covered_set = candidate_coverages.get(idx, set())
            full_covered_indices = sorted(int(x) for x in covered_set)
            coverage_hull_2039 = _coverage_hull_polygon(
                buildings, covered_set, shelter_point=buildings.geometry.iloc[idx]
            )
            if coverage_hull_2039 is None:
                continue
            coverage_hull_wgs = (
                gpd.GeoSeries([coverage_hull_2039], crs="EPSG:2039").to_crs("EPSG:4326").iloc[0]
            )
            geom = buildings_wgs.geometry.iloc[idx]
            bucket_isochrones.append(
                {
                    "type": "Feature",
                    "geometry": mapping(coverage_hull_wgs),
                    "properties": {
                        "shelter_kind": "recommended",
                        "shelter_id": int(idx),
                        "rank": int(rank),
                        "lat": float(geom.y),
                        "lon": float(geom.x),
                        "time_bucket": bucket,
                        "time_seconds": seconds,
                        "covered_building_indices": full_covered_indices,
                        "covered_buildings_count": len(full_covered_indices),
                    },
                }
            )

        shelter_isochrones_by_bucket[bucket] = bucket_isochrones

        results.append(
            BucketResult(
                bucket=bucket,
                seconds=seconds,
                radius_m=radius_m,
                selected_indices=selected,
                selected_covered_sets=selected_sets,
                initial_uncovered=initially_uncovered,
                final_uncovered=final_uncovered,
                stop_reason=stop_reason,
            )
        )

    for res in results:
        proposed = []
        for rank, (idx, covered_set) in enumerate(
            zip(res.selected_indices, res.selected_covered_sets), start=1
        ):
            geom = buildings_wgs.geometry.iloc[idx]
            full_covered_set = candidate_coverages_by_bucket[res.bucket].get(idx, set())
            proposed.append(
                {
                    "rank": rank,
                    "building_idx": int(idx),
                    "coordinates": f"{geom.y:.6f},{geom.x:.6f}",
                    "lat": float(geom.y),
                    "lon": float(geom.x),
                    "newly_covered_buildings": int(len(covered_set)),
                    "newly_covered_people_est": int(len(covered_set) * PEOPLE_PER_BUILDING),
                    "covered_building_indices": sorted(int(x) for x in full_covered_set),
                    "marginal_covered_building_indices": sorted(int(x) for x in covered_set),
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
            "max_proposed_limit": max_new_shelters,
            "stop_reason": res.stop_reason,
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
                "optimization_method": "lazy_greedy_maximum_coverage",
                "statistics": stats,
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
        _write_json(
            OUTPUT_DIR / f"shelter_isochrones_{res.bucket}.geojson",
            {"type": "FeatureCollection", "features": shelter_isochrones_by_bucket[res.bucket]},
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
                "stop_reason": r.stop_reason,
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
    parser.add_argument(
        "--max-new-shelters",
        type=int,
        default=None,
        help="Optional budget cap for new shelters. Defaults to unlimited.",
    )
    args = parser.parse_args()
    run_pipeline(
        walk_speed_mps=args.walk_speed_mps,
        force_rebuild_graph=args.force_rebuild_graph,
        max_new_shelters=args.max_new_shelters,
    )


if __name__ == "__main__":
    main()
