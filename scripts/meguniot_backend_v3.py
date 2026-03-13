#!/usr/bin/env python
"""Backend pipeline for Bet Shemesh meguniot placement (v3).

Key upgrades:
- Elevation-aware walking times (optional DEM via --dem-path).
- Candidate search across buildings, network nodes, and optional public parcels.
- Emergency direct-crossing fallback for short mid-block access.
"""

from __future__ import annotations

import argparse
import heapq
import json
import logging
import math
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Iterable

import geopandas as gpd
import networkx as nx
import numpy as np
import osmnx as ox
import pandas as pd
from shapely.geometry import MultiPoint, Point, mapping
from sklearn.neighbors import KDTree

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
DEFAULT_MAX_PROPOSED: int | None = None
SCHEMA_VERSION = "3.0.0"
DEFAULT_NODE_PROXIMITY_M = 150.0
DEFAULT_WALK_SPEED_MPS = 1.3
DEFAULT_EMERGENCY_CROSSING_RADIUS_M = 22.0

logger = logging.getLogger("meguniot_backend")


class CandidateSource(str, Enum):
    BUILDINGS = "buildings"
    NETWORK_NODES = "network_nodes"
    PUBLIC_PARCELS = "public_parcels"


@dataclass
class CandidatePoint:
    candidate_id: int
    source: CandidateSource
    geometry_2039: Point
    graph_node: int
    source_id: int | None = None
    nearest_building_dist_m: float = 0.0
    building_idx: int | None = None


@dataclass
class BucketResult:
    bucket: str
    seconds: int
    selected_candidate_ids: list[int]
    selected_covered_sets: list[set[int]]
    initial_uncovered: set[int]
    final_uncovered: set[int]
    stop_reason: str


def _configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


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


def _cleanup_stale_bucket_outputs() -> None:
    valid_suffixes = set(TIME_BUCKETS.keys())
    prefixes = ("optimal_meguniot_", "recommended_meguniot_", "shelter_coverages_", "shelter_isochrones_")
    extensions = (".json", ".csv", ".geojson")
    for path in OUTPUT_DIR.glob("*"):
        if not path.is_file():
            continue
        name = path.name
        for prefix in prefixes:
            if not name.startswith(prefix) or not name.endswith(extensions):
                continue
            if prefix == "shelter_isochrones_":
                path.unlink(missing_ok=True)
                break
            bucket = name[len(prefix) :].split(".")[0]
            if bucket not in valid_suffixes:
                path.unlink(missing_ok=True)
            break


def _build_output_schema_doc() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "time_buckets": list(TIME_BUCKETS.keys()),
        "notes": [
            "Optimization uses walk_time (seconds), not flat distance.",
            "elevation_model.mode is dem_tobler when DEM is supplied.",
            "candidate_source documents where each proposed shelter came from.",
        ],
    }


def _validate_outputs() -> None:
    expected = [
        OUTPUT_DIR / "building_coverage_network.json",
        OUTPUT_DIR / "optimization_summary.json",
        OUTPUT_DIR / "output_schema.json",
    ]
    for bucket in TIME_BUCKETS:
        expected.append(OUTPUT_DIR / f"optimal_meguniot_{bucket}.json")
        expected.append(OUTPUT_DIR / f"recommended_meguniot_{bucket}.csv")
        expected.append(OUTPUT_DIR / f"recommended_meguniot_{bucket}.geojson")
        expected.append(OUTPUT_DIR / f"shelter_coverages_{bucket}.json")
    missing = [str(p) for p in expected if not p.exists()]
    if missing:
        raise RuntimeError(f"Pipeline completed but missing outputs: {missing}")


def _load_geojson_with_real_crs(path: Path) -> gpd.GeoDataFrame:
    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    raw_crs_name = raw.get("crs", {}).get("properties", {}).get("name", "").upper().strip()

    gdf = gpd.read_file(path)
    _minx, _miny, maxx, maxy = gdf.total_bounds

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
        ["BuildYear", "build_year", "year_built", "year", "shnat_bnia", "shnat_bnaya"],
    )
    floors_col = _first_present(gdf, ["Floors", "floors", "komot"])
    apartments_col = _first_present(
        gdf, ["Apartments", "apartments", "units", "diyot", "dirhot", "deyrot"]
    )
    before_1992_col = _first_present(gdf, ["Before_1992", "before_1992", "before1992", "lifney_1992"])
    single_family_col = _first_present(
        gdf, ["single_family", "singlefamily", "private_house", "tzmod_krka", "tzamud_karka"]
    )
    residential_col = _first_present(
        gdf, ["residential", "is_residential", "res", "miyuad_mgourim", "megurim"]
    )

    gdf["build_year_norm"] = gdf[year_col].apply(_to_int_safe) if year_col else 0
    gdf["floors_norm"] = gdf[floors_col].apply(_to_int_safe) if floors_col else 0
    gdf["apartments_norm"] = gdf[apartments_col].apply(_to_int_safe) if apartments_col else 0
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


def tobler_walking_speed(grade: float) -> float:
    return 0.6 * math.exp(-3.5 * abs(grade + 0.05))


def _compute_edge_walk_time(length: float, grade: float) -> float:
    speed = max(tobler_walking_speed(grade), 0.10)
    return float(length) / speed


def attach_elevation_and_walk_times(graph_wgs: nx.MultiDiGraph, dem_path: Path) -> nx.MultiDiGraph:
    logger.info("Attaching DEM elevation from %s", dem_path)
    graph_wgs = ox.elevation.add_node_elevations_raster(graph_wgs, str(dem_path))
    graph_wgs = ox.elevation.add_edge_grades(graph_wgs, add_absolute=True)
    for _u, _v, _k, data in graph_wgs.edges(data=True, keys=True):
        data["walk_time"] = _compute_edge_walk_time(data.get("length", 0.0), data.get("grade", 0.0))
    return graph_wgs


def attach_flat_walk_times(graph: nx.MultiDiGraph, walk_speed_mps: float) -> None:
    logger.info("No DEM provided; using flat speed %.2f m/s", walk_speed_mps)
    for _u, _v, _k, data in graph.edges(data=True, keys=True):
        data["walk_time"] = data.get("length", 0.0) / walk_speed_mps


def _coerce_graph_numeric_attrs(graph: nx.MultiDiGraph) -> None:
    """GraphML may load numeric edge attrs as strings; normalize in-place."""
    for _u, _v, _k, data in graph.edges(data=True, keys=True):
        for key in ("length", "grade", "grade_abs", "walk_time"):
            if key not in data:
                continue
            val = data.get(key)
            if isinstance(val, (int, float, np.integer, np.floating)):
                data[key] = float(val)
                continue
            try:
                data[key] = float(val)
            except (TypeError, ValueError):
                pass


def _elevation_metadata(graph: nx.MultiDiGraph, dem_path: Path | None) -> dict[str, Any]:
    if dem_path is None:
        return {"mode": "flat_speed", "dem_file": None}
    grades = [d.get("grade_abs", 0.0) for _, _, _, d in graph.edges(data=True, keys=True)]
    elevations = [d.get("elevation", 0.0) for _, d in graph.nodes(data=True) if "elevation" in d]
    return {
        "mode": "dem_tobler",
        "dem_file": dem_path.name,
        "impedance_function": "tobler_hiking_1993",
        "num_nodes_with_elevation": len(elevations),
        "elevation_range_m": [
            round(float(np.min(elevations)), 1) if elevations else None,
            round(float(np.max(elevations)), 1) if elevations else None,
        ],
        "grade_mean_pct": round(float(np.mean(grades)) * 100, 2) if grades else None,
        "grade_median_pct": round(float(np.median(grades)) * 100, 2) if grades else None,
        "grade_max_pct": round(float(np.max(grades)) * 100, 2) if grades else None,
    }


def build_walking_graph(
    buildings_2039: gpd.GeoDataFrame,
    dem_path: Path | None,
    walk_speed_mps: float,
) -> nx.MultiDiGraph:
    if len(buildings_2039) < 3:
        raise ValueError("Need at least 3 buildings to build walking graph hull.")
    points_wgs = buildings_2039.to_crs("EPSG:4326").geometry
    hull = MultiPoint(list(points_wgs.values)).convex_hull.buffer(0.01)

    ox.settings.use_cache = True
    ox.settings.cache_folder = str(CACHE_DIR)
    ox.settings.log_console = False

    graph_wgs = ox.graph_from_polygon(hull, network_type="walk", simplify=True)
    if dem_path and dem_path.exists():
        graph_wgs = attach_elevation_and_walk_times(graph_wgs, dem_path)
    else:
        attach_flat_walk_times(graph_wgs, walk_speed_mps)
    graph_proj = ox.project_graph(graph_wgs, to_crs="EPSG:2039")

    if dem_path and dem_path.exists():
        for _u, _v, _k, data in graph_proj.edges(data=True, keys=True):
            data["walk_time"] = _compute_edge_walk_time(data.get("length", 0.0), data.get("grade", 0.0))
    else:
        attach_flat_walk_times(graph_proj, walk_speed_mps)
    return graph_proj


def _nearest_nodes_for_points(graph: nx.MultiDiGraph, points: gpd.GeoSeries) -> list[int]:
    xs = np.array([geom.x for geom in points], dtype=float)
    ys = np.array([geom.y for geom in points], dtype=float)
    nodes = ox.distance.nearest_nodes(graph, xs, ys)
    return [int(n) for n in np.asarray(nodes)]


def _extract_graph_node_coords(graph: nx.MultiDiGraph) -> dict[int, tuple[float, float]]:
    return {int(n): (float(d["x"]), float(d["y"])) for n, d in graph.nodes(data=True)}


def _filter_intersection_nodes(graph: nx.MultiDiGraph, min_degree: int = 3) -> list[int]:
    return [int(n) for n in graph.nodes if graph.degree(n) >= min_degree]


def _build_building_kdtree(buildings: gpd.GeoDataFrame) -> tuple[KDTree, np.ndarray]:
    coords = np.array([(geom.x, geom.y) for geom in buildings.geometry], dtype=float)
    return KDTree(coords), coords


def _load_public_parcels(path: Path) -> gpd.GeoDataFrame:
    gdf = _load_geojson_with_real_crs(path).to_crs("EPSG:2039")
    gdf = gdf[gdf.geometry.notna() & gdf.geometry.is_valid].copy()
    if gdf.empty:
        return gdf
    gdf["geometry"] = gdf.geometry.centroid
    gdf["parcel_id"] = np.arange(len(gdf)).astype(int)
    return gdf


def generate_candidate_sites(
    buildings: gpd.GeoDataFrame,
    graph: nx.MultiDiGraph,
    sources: set[CandidateSource],
    node_proximity_m: float,
    public_parcels_path: Path | None,
) -> list[CandidatePoint]:
    tree, _ = _build_building_kdtree(buildings)
    building_node_ids = _nearest_nodes_for_points(graph, buildings.geometry)
    node_coords = _extract_graph_node_coords(graph)

    candidates: list[CandidatePoint] = []
    next_id = 0

    if CandidateSource.BUILDINGS in sources:
        for row in buildings.itertuples():
            bidx = int(row.building_idx)
            candidates.append(
                CandidatePoint(
                    candidate_id=next_id,
                    source=CandidateSource.BUILDINGS,
                    geometry_2039=row.geometry,
                    graph_node=building_node_ids[bidx],
                    source_id=bidx,
                    nearest_building_dist_m=0.0,
                    building_idx=bidx,
                )
            )
            next_id += 1
        logger.info("Added %d building-centroid candidates", len(buildings))

    if CandidateSource.NETWORK_NODES in sources:
        intersection_ids = _filter_intersection_nodes(graph, min_degree=3)
        if intersection_ids:
            node_xy = np.array([node_coords[n] for n in intersection_ids], dtype=float)
            dists, _ = tree.query(node_xy, k=1)
            added = 0
            for nid, d in zip(intersection_ids, dists[:, 0]):
                if float(d) > node_proximity_m:
                    continue
                xy = node_coords[nid]
                candidates.append(
                    CandidatePoint(
                        candidate_id=next_id,
                        source=CandidateSource.NETWORK_NODES,
                        geometry_2039=Point(xy[0], xy[1]),
                        graph_node=nid,
                        source_id=nid,
                        nearest_building_dist_m=float(d),
                        building_idx=None,
                    )
                )
                next_id += 1
                added += 1
            logger.info("Added %d network-node candidates", added)

    if CandidateSource.PUBLIC_PARCELS in sources:
        if public_parcels_path is None or not public_parcels_path.exists():
            logger.warning("PUBLIC_PARCELS source requested but file is missing; skipping.")
        else:
            parcels = _load_public_parcels(public_parcels_path)
            if not parcels.empty:
                parcel_nodes = _nearest_nodes_for_points(graph, parcels.geometry)
                parcel_xy = np.array([(g.x, g.y) for g in parcels.geometry], dtype=float)
                dists, _ = tree.query(parcel_xy, k=1)
                added = 0
                for row, node_id, d in zip(parcels.itertuples(), parcel_nodes, dists[:, 0]):
                    if float(d) > node_proximity_m * 2:
                        continue
                    candidates.append(
                        CandidatePoint(
                            candidate_id=next_id,
                            source=CandidateSource.PUBLIC_PARCELS,
                            geometry_2039=row.geometry,
                            graph_node=int(node_id),
                            source_id=int(row.parcel_id),
                            nearest_building_dist_m=float(d),
                            building_idx=None,
                        )
                    )
                    next_id += 1
                    added += 1
                logger.info("Added %d public-parcel candidates", added)

    seen_nodes: dict[int, int] = {}
    deduped: list[CandidatePoint] = []
    for c in candidates:
        if c.graph_node in seen_nodes:
            prev = deduped[seen_nodes[c.graph_node]]
            if c.nearest_building_dist_m < prev.nearest_building_dist_m:
                deduped[seen_nodes[c.graph_node]] = c
        else:
            seen_nodes[c.graph_node] = len(deduped)
            deduped.append(c)
    for i, c in enumerate(deduped):
        c.candidate_id = i
    logger.info("Total candidates after dedup: %d", len(deduped))
    return deduped


def _candidate_coverages_for_bucket(
    graph: nx.MultiDiGraph,
    building_nodes: dict[int, int],
    candidates: list[CandidatePoint],
    cutoff_seconds: float,
) -> dict[int, set[int]]:
    node_to_building_indices: dict[int, list[int]] = {}
    for idx, node in building_nodes.items():
        node_to_building_indices.setdefault(node, []).append(idx)

    coverages: dict[int, set[int]] = {}
    for candidate in candidates:
        lengths = nx.single_source_dijkstra_path_length(
            graph, candidate.graph_node, cutoff=cutoff_seconds, weight="walk_time"
        )
        covered: set[int] = set()
        for node in lengths:
            matched = node_to_building_indices.get(int(node))
            if matched:
                covered.update(matched)
        coverages[candidate.candidate_id] = covered
    return coverages


def _shelter_coverages_for_bucket(
    graph: nx.MultiDiGraph,
    building_nodes: dict[int, int],
    shelter_node_ids: list[int],
    cutoff_seconds: float,
) -> dict[int, set[int]]:
    coverages: dict[int, set[int]] = {}
    node_to_building_indices: dict[int, list[int]] = {}
    for idx, node in building_nodes.items():
        node_to_building_indices.setdefault(node, []).append(idx)
    for shelter_id, src in enumerate(shelter_node_ids):
        lengths = nx.single_source_dijkstra_path_length(
            graph, int(src), cutoff=cutoff_seconds, weight="walk_time"
        )
        covered: set[int] = set()
        for node in lengths:
            matched = node_to_building_indices.get(int(node))
            if matched:
                covered.update(matched)
        coverages[shelter_id] = covered
    return coverages


def _augment_coverages_with_direct_crossing(
    coverages: dict[int, set[int]],
    source_points_by_id: dict[int, Point],
    building_tree: KDTree,
    crossing_radius_m: float,
) -> None:
    """Add short direct-access matches for emergency mid-block crossing behavior."""
    if crossing_radius_m <= 0:
        return
    for source_id, point in source_points_by_id.items():
        matched = building_tree.query_radius(np.array([[float(point.x), float(point.y)]]), r=float(crossing_radius_m))
        if not len(matched):
            continue
        indices = matched[0]
        if len(indices) == 0:
            continue
        covered = coverages.setdefault(int(source_id), set())
        covered.update(int(i) for i in indices)


def _nearest_shelter_direct_times(
    buildings: gpd.GeoDataFrame,
    shelters: gpd.GeoDataFrame,
    crossing_radius_m: float,
    walk_speed_mps: float,
) -> np.ndarray:
    """Compute nearest direct-access seconds to any shelter within crossing radius."""
    if crossing_radius_m <= 0 or shelters.empty:
        return np.full(len(buildings), np.inf, dtype=float)
    shelter_xy = np.array([(float(g.x), float(g.y)) for g in shelters.geometry], dtype=float)
    out = np.full(len(buildings), np.inf, dtype=float)
    for i, geom in enumerate(buildings.geometry):
        dx = shelter_xy[:, 0] - float(geom.x)
        dy = shelter_xy[:, 1] - float(geom.y)
        dists = np.hypot(dx, dy)
        nearest = float(np.min(dists)) if dists.size else math.inf
        if nearest <= crossing_radius_m:
            out[i] = nearest / walk_speed_mps
    return out


def _greedy_select(
    initial_uncovered: set[int],
    candidate_coverages: dict[int, set[int]],
    max_new_shelters: int | None,
) -> tuple[list[int], list[set[int]], set[int], str]:
    uncovered = set(initial_uncovered)
    selected: list[int] = []
    selected_sets: list[set[int]] = []
    if not uncovered:
        return selected, selected_sets, uncovered, "all_covered_by_existing"
    if max_new_shelters is not None and max_new_shelters <= 0:
        return selected, selected_sets, uncovered, "budget_limit"

    heap: list[tuple[int, int, int]] = []
    for cid, covered in candidate_coverages.items():
        gain = len(covered & uncovered)
        if gain > 0:
            heapq.heappush(heap, (-gain, int(cid), -1))

    current_round = 0
    while uncovered and (max_new_shelters is None or len(selected) < max_new_shelters) and heap:
        neg_gain, cid, eval_round = heapq.heappop(heap)
        if eval_round != current_round:
            refreshed_gain = len(candidate_coverages[cid] & uncovered)
            if refreshed_gain > 0:
                heapq.heappush(heap, (-refreshed_gain, cid, current_round))
            continue
        gain = -neg_gain
        if gain <= 0:
            break
        covered_now = candidate_coverages[cid] & uncovered
        if not covered_now:
            continue
        selected.append(cid)
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
    walk_speed_mps: float,
    force_rebuild_graph: bool,
    max_new_shelters: int | None,
    candidate_sources: set[CandidateSource],
    node_proximity_m: float,
    public_parcels_path: Path | None,
    dem_path: Path | None,
    emergency_crossing_radius_m: float,
) -> None:
    if walk_speed_mps <= 0:
        raise ValueError("walk_speed_mps must be positive.")
    if max_new_shelters is not None and max_new_shelters < 0:
        raise ValueError("max_new_shelters must be non-negative.")
    if emergency_crossing_radius_m < 0:
        raise ValueError("emergency_crossing_radius_m must be non-negative.")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    _cleanup_stale_bucket_outputs()

    required = [DATA_DIR / "buildings.geojson", DATA_DIR / "Miguniot.geojson", DATA_DIR / "Miklatim.geojson"]
    if dem_path is not None:
        required.append(dem_path)
    _assert_input_files_exist(required)

    buildings = load_target_buildings(DATA_DIR / "buildings.geojson")
    shelters = load_existing_shelters(DATA_DIR / "Miguniot.geojson", DATA_DIR / "Miklatim.geojson")
    logger.info("Loaded %d target buildings and %d existing shelters", len(buildings), len(shelters))

    graph_path = OUTPUT_DIR / "walk_graph_2039.graphml"
    if graph_path.exists() and not force_rebuild_graph:
        logger.info("Loading cached walk graph from %s", graph_path)
        graph = ox.load_graphml(graph_path)
        _coerce_graph_numeric_attrs(graph)
        has_walk_time = any("walk_time" in d for _, _, _, d in graph.edges(data=True, keys=True))
        if not has_walk_time:
            logger.info("Cached graph missing walk_time; rebuilding graph.")
            graph = build_walking_graph(buildings, dem_path, walk_speed_mps)
            ox.save_graphml(graph, graph_path)
    else:
        logger.info("Building walking graph with OSMnx")
        graph = build_walking_graph(buildings, dem_path, walk_speed_mps)
        ox.save_graphml(graph, graph_path)
        logger.info("Saved walk graph to %s", graph_path)

    elevation_model = _elevation_metadata(graph, dem_path)

    buildings["node_id"] = _nearest_nodes_for_points(graph, buildings.geometry)
    shelters["node_id"] = _nearest_nodes_for_points(graph, shelters.geometry)
    shelter_nodes = [int(n) for n in shelters["node_id"].tolist()]
    if not shelter_nodes:
        raise ValueError("No shelter nodes mapped to walking graph.")
    building_nodes = {int(r.building_idx): int(r.node_id) for r in buildings.itertuples()}

    candidates = generate_candidate_sites(
        buildings=buildings,
        graph=graph,
        sources=candidate_sources,
        node_proximity_m=node_proximity_m,
        public_parcels_path=public_parcels_path,
    )
    building_tree, _ = _build_building_kdtree(buildings)
    cand_lookup = {c.candidate_id: c for c in candidates}
    cand_points_wgs = gpd.GeoSeries([c.geometry_2039 for c in candidates], crs="EPSG:2039").to_crs("EPSG:4326")

    max_cutoff_seconds = max(TIME_BUCKETS.values())
    dist_to_any = nx.multi_source_dijkstra_path_length(
        graph, shelter_nodes, cutoff=float(max_cutoff_seconds), weight="walk_time"
    )
    direct_to_any = _nearest_shelter_direct_times(
        buildings=buildings,
        shelters=shelters,
        crossing_radius_m=emergency_crossing_radius_m,
        walk_speed_mps=walk_speed_mps,
    )

    buildings_wgs = buildings.to_crs("EPSG:4326")
    coverage_records: list[dict[str, Any]] = []
    for idx, (row, row_wgs) in enumerate(zip(buildings.itertuples(), buildings_wgs.itertuples())):
        walk_sec_network = float(dist_to_any.get(int(row.node_id), math.inf))
        walk_sec_direct = float(direct_to_any[idx])
        walk_sec = min(walk_sec_network, walk_sec_direct)
        rec = {
            "id": int(row.id),
            "building_idx": int(row.building_idx),
            "lon": float(row_wgs.geometry.x),
            "lat": float(row_wgs.geometry.y),
            "build_year": int(row.build_year_norm),
            "floors": int(row.floors_norm),
            "apartments": int(row.apartments_norm),
            "before_1992": bool(row.before_1992_norm),
            "nearest_shelter_walk_seconds": None if math.isinf(walk_sec) else round(walk_sec, 1),
        }
        for bucket, seconds in TIME_BUCKETS.items():
            rec[f"covered_{bucket}"] = bool(walk_sec <= seconds)
        coverage_records.append(rec)

    _write_json(
        OUTPUT_DIR / "building_coverage_network.json",
        {
            "schema_version": SCHEMA_VERSION,
            "time_buckets": TIME_BUCKETS,
            "walk_speed_mps_fallback": walk_speed_mps,
            "emergency_crossing_radius_m": emergency_crossing_radius_m,
            "elevation_model": elevation_model,
            "candidate_sources": [s.value for s in sorted(candidate_sources, key=lambda x: x.value)],
            "total_candidates": len(candidates),
            "total_target_buildings": len(coverage_records),
            "buildings": coverage_records,
        },
    )

    results: list[BucketResult] = []
    candidate_coverages_by_bucket: dict[str, dict[int, set[int]]] = {}
    shelters_wgs = shelters.to_crs("EPSG:4326")

    for bucket, seconds in TIME_BUCKETS.items():
        logger.info("Optimizing recommendations for %s (%ss)", bucket, seconds)
        initially_uncovered = {
            int(r["building_idx"]) for r in coverage_records if not r.get(f"covered_{bucket}", False)
        }
        candidate_coverages = _candidate_coverages_for_bucket(
            graph=graph,
            building_nodes=building_nodes,
            candidates=candidates,
            cutoff_seconds=float(seconds),
        )
        candidate_points_by_id = {int(c.candidate_id): c.geometry_2039 for c in candidates}
        _augment_coverages_with_direct_crossing(
            coverages=candidate_coverages,
            source_points_by_id=candidate_points_by_id,
            building_tree=building_tree,
            crossing_radius_m=emergency_crossing_radius_m,
        )
        candidate_coverages_by_bucket[bucket] = candidate_coverages
        existing_coverages = _shelter_coverages_for_bucket(
            graph=graph,
            building_nodes=building_nodes,
            shelter_node_ids=shelter_nodes,
            cutoff_seconds=float(seconds),
        )
        shelter_points_by_id = {
            int(row.shelter_id): row.geometry for row in shelters.itertuples()
        }
        _augment_coverages_with_direct_crossing(
            coverages=existing_coverages,
            source_points_by_id=shelter_points_by_id,
            building_tree=building_tree,
            crossing_radius_m=emergency_crossing_radius_m,
        )

        selected_ids, selected_sets, final_uncovered, stop_reason = _greedy_select(
            initially_uncovered, candidate_coverages, max_new_shelters
        )

        coverage_entries: list[dict[str, Any]] = []

        for shelter_row in shelters.itertuples():
            sid = int(shelter_row.shelter_id)
            covered_set = existing_coverages.get(sid, set())
            covered_indices = sorted(int(x) for x in covered_set)
            if not covered_indices:
                continue
            coverage_entries.append(
                {
                    "shelter_kind": "existing",
                    "shelter_id": sid,
                    "shelter_type": str(shelter_row.shelter_type),
                    "time_bucket": bucket,
                    "time_seconds": seconds,
                    "covered_building_indices": covered_indices,
                    "covered_buildings_count": len(covered_indices),
                }
            )

        for cid in selected_ids:
            candidate = cand_lookup[cid]
            full_covered_set = candidate_coverages.get(cid, set())
            covered_indices = sorted(int(x) for x in full_covered_set)
            if not covered_indices:
                continue
            coverage_entries.append(
                {
                    "shelter_kind": "recommended",
                    "shelter_id": int(cid),
                    "candidate_id": int(cid),
                    "candidate_source": candidate.source.value,
                    "time_bucket": bucket,
                    "time_seconds": seconds,
                    "covered_building_indices": covered_indices,
                    "covered_buildings_count": len(covered_indices),
                }
            )

        _write_json(
            OUTPUT_DIR / f"shelter_coverages_{bucket}.json",
            {
                "schema_version": SCHEMA_VERSION,
                "time_bucket": bucket,
                "time_seconds": seconds,
                "elevation_model": elevation_model,
                "emergency_crossing_radius_m": emergency_crossing_radius_m,
                "coverages": coverage_entries,
            },
        )
        results.append(
            BucketResult(
                bucket=bucket,
                seconds=seconds,
                selected_candidate_ids=selected_ids,
                selected_covered_sets=selected_sets,
                initial_uncovered=initially_uncovered,
                final_uncovered=final_uncovered,
                stop_reason=stop_reason,
            )
        )

    for res in results:
        proposed = []
        for rank, (cid, covered_marginal) in enumerate(
            zip(res.selected_candidate_ids, res.selected_covered_sets), start=1
        ):
            candidate = cand_lookup[cid]
            geom = cand_points_wgs.iloc[cid]
            full_covered_set = candidate_coverages_by_bucket[res.bucket].get(cid, set())
            proposed.append(
                {
                    "rank": rank,
                    "shelter_id": int(cid),
                    "candidate_id": int(cid),
                    "candidate_source": candidate.source.value,
                    "source_id": candidate.source_id,
                    "building_idx": candidate.building_idx,
                    "coordinates": f"{geom.y:.6f},{geom.x:.6f}",
                    "lat": float(geom.y),
                    "lon": float(geom.x),
                    "nearest_building_dist_m": round(float(candidate.nearest_building_dist_m), 2),
                    "newly_covered_buildings": int(len(covered_marginal)),
                    "newly_covered_people_est": int(len(covered_marginal) * PEOPLE_PER_BUILDING),
                    "covered_building_indices": sorted(int(x) for x in full_covered_set),
                    "marginal_covered_building_indices": sorted(int(x) for x in covered_marginal),
                }
            )

        source_counts: dict[str, int] = {}
        for p in proposed:
            source_counts[p["candidate_source"]] = source_counts.get(p["candidate_source"], 0) + 1

        stats = {
            "time_bucket": res.bucket,
            "time_seconds": res.seconds,
            "walk_speed_mps_fallback": walk_speed_mps,
            "emergency_crossing_radius_m": emergency_crossing_radius_m,
            "total_target_buildings": len(buildings),
            "total_candidates_evaluated": len(candidates),
            "candidate_sources_used": [s.value for s in sorted(candidate_sources, key=lambda x: x.value)],
            "covered_by_existing": int(len(buildings) - len(res.initial_uncovered)),
            "currently_uncovered": int(len(res.initial_uncovered)),
            "additional_covered_by_proposed": int(len(res.initial_uncovered) - len(res.final_uncovered)),
            "final_uncovered": int(len(res.final_uncovered)),
            "num_proposed_meguniot": int(len(res.selected_candidate_ids)),
            "proposed_by_source": source_counts,
            "max_proposed_limit": max_new_shelters,
            "stop_reason": res.stop_reason,
        }

        _write_json(
            OUTPUT_DIR / f"optimal_meguniot_{res.bucket}.json",
            {
                "schema_version": SCHEMA_VERSION,
                "time_bucket": res.bucket,
                "time_seconds": res.seconds,
                "elevation_model": elevation_model,
                "optimization_method": "lazy_greedy_maximum_coverage",
                "candidate_generation": {
                    "sources": [s.value for s in sorted(candidate_sources, key=lambda x: x.value)],
                    "node_proximity_m": node_proximity_m,
                    "total_candidates": len(candidates),
                },
                "statistics": stats,
                "proposed_meguniot": proposed,
            },
        )

        csv_df = pd.DataFrame(
            [
                {
                    "rank": p["rank"],
                    "candidate_source": p["candidate_source"],
                    "time_bucket": res.bucket,
                    "time_seconds": res.seconds,
                    "coordinates": p["coordinates"],
                    "lat": p["lat"],
                    "lon": p["lon"],
                    "nearest_building_dist_m": p["nearest_building_dist_m"],
                    "newly_covered_buildings": p["newly_covered_buildings"],
                    "newly_covered_people_est": p["newly_covered_people_est"],
                }
                for p in proposed
            ]
        )
        csv_df.to_csv(OUTPUT_DIR / f"recommended_meguniot_{res.bucket}.csv", index=False)

        geojson_features = []
        for p in proposed:
            geojson_features.append(
                {
                    "type": "Feature",
                    "geometry": mapping(Point(float(p["lon"]), float(p["lat"]))),
                    "properties": {
                        "rank": p["rank"],
                        "shelter_id": p["shelter_id"],
                        "candidate_source": p["candidate_source"],
                        "time_bucket": res.bucket,
                        "time_seconds": res.seconds,
                        "coordinates": p["coordinates"],
                        "nearest_building_dist_m": p["nearest_building_dist_m"],
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
        "walk_speed_mps_fallback": walk_speed_mps,
        "emergency_crossing_radius_m": emergency_crossing_radius_m,
        "elevation_model": elevation_model,
        "time_buckets": TIME_BUCKETS,
        "total_target_buildings": int(len(buildings)),
        "candidate_generation": {
            "sources": [s.value for s in sorted(candidate_sources, key=lambda x: x.value)],
            "node_proximity_m": node_proximity_m,
            "total_candidates": len(candidates),
        },
        "results": [
            {
                "time_bucket": r.bucket,
                "time_seconds": r.seconds,
                "currently_uncovered": int(len(r.initial_uncovered)),
                "additional_covered_by_proposed": int(len(r.initial_uncovered) - len(r.final_uncovered)),
                "num_proposed_meguniot": int(len(r.selected_candidate_ids)),
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
    parser = argparse.ArgumentParser(
        description="Run Bet Shemesh meguniot backend pipeline (v3)."
    )
    parser.add_argument("--walk-speed-mps", type=float, default=DEFAULT_WALK_SPEED_MPS)
    parser.add_argument("--force-rebuild-graph", action="store_true")
    parser.add_argument(
        "--max-new-shelters",
        type=int,
        default=DEFAULT_MAX_PROPOSED,
        help="Optional budget cap. Default is unlimited.",
    )
    parser.add_argument(
        "--candidate-sources",
        nargs="+",
        default=["buildings", "network_nodes"],
        choices=["buildings", "network_nodes", "public_parcels"],
    )
    parser.add_argument("--node-proximity-m", type=float, default=DEFAULT_NODE_PROXIMITY_M)
    parser.add_argument("--public-parcels", type=Path, default=None)
    parser.add_argument(
        "--dem-path",
        type=Path,
        default=None,
        help="DEM raster path for elevation-aware walking times.",
    )
    parser.add_argument(
        "--emergency-crossing-radius-m",
        type=float,
        default=DEFAULT_EMERGENCY_CROSSING_RADIUS_M,
        help="Allow direct emergency crossing to shelters within this short radius (meters).",
    )
    args = parser.parse_args()

    sources = {CandidateSource(s) for s in args.candidate_sources}
    run_pipeline(
        walk_speed_mps=args.walk_speed_mps,
        force_rebuild_graph=args.force_rebuild_graph,
        max_new_shelters=args.max_new_shelters,
        candidate_sources=sources,
        node_proximity_m=args.node_proximity_m,
        public_parcels_path=args.public_parcels,
        dem_path=args.dem_path,
        emergency_crossing_radius_m=args.emergency_crossing_radius_m,
    )


if __name__ == "__main__":
    main()

