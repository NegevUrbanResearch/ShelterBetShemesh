#!/usr/bin/env python
"""Backend pipeline for Bet Shemesh meguniot placement (v5).

Key upgrades over v3:
- Graph densification: inserts intermediate nodes along long edges so pedestrians
  can enter/exit the network mid-block.
- Building access edges: projects each building/shelter onto its nearest edge,
  splits the edge, and adds a short access link capturing actual door-to-street
  walking time.
- Weighted coverage objective with optional local-swap improvement.
- Two placement modes:
  - exact placement (precise graph-linked recommendations),
  - cluster placement (area-level recommendations from clustering ensemble).
- Time bucket is fixed to 5 minutes.
- Each placement mode recommends up to 200 shelters.
- Elevation-aware walking times (optional DEM via --dem-path).
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
from shapely.geometry import LineString, MultiPoint, Point, mapping
from sklearn.cluster import KMeans
from sklearn.neighbors import KDTree

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUTPUT_DIR = DATA_DIR / "meguniot_network"
CACHE_DIR = ROOT / "cache"

TIME_BUCKETS = {
    "5min": 300,
}
EUCLIDEAN_ACCESS_RADIUS_M = 100.0
PEOPLE_PER_BUILDING = 7
DEFAULT_MAX_PROPOSED: int | None = 200
MAX_SHELTERS_PER_MODE = 200
DEFAULT_CLUSTER_ENSEMBLE_RUNS = 150
DEFAULT_CLUSTER_CANDIDATE_POOL = 150
DEFAULT_CLUSTER_MIN_SEPARATION_M = 120.0
SCHEMA_VERSION = "5.0.0"
DEFAULT_NODE_PROXIMITY_M = 150.0
DEFAULT_WALK_SPEED_MPS = 1.3
DEFAULT_EMERGENCY_CROSSING_RADIUS_M = 22.0
DEFAULT_DENSIFY_INTERVAL_M = 25.0
DEFAULT_BUILDING_ACCESS_RADIUS_M = 80.0

logger = logging.getLogger("meguniot_backend")


class CandidateSource(str, Enum):
    BUILDINGS = "buildings"
    NETWORK_NODES = "network_nodes"
    PUBLIC_PARCELS = "public_parcels"
    CLUSTER_CANDIDATES = "cluster_candidates"


class PlacementMode(str, Enum):
    EXACT = "exact"
    CLUSTER = "cluster"


class DistanceMetric(str, Enum):
    GRAPH = "graph"
    EUCLIDEAN = "euclidean"


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


@dataclass(frozen=True)
class ScenarioAssumptions:
    post_1992_has_shelter: bool = True
    over_3_floors_has_shelter: bool = False
    education_facilities_are_shelters: bool = False
    public_buildings_are_shelters: bool = False


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
    valid_placement_types = {m.value for m in PlacementMode}
    valid_distance_metrics = {m.value for m in DistanceMetric}
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
            suffix = name[len(prefix) :].split(".")[0]
            parts = suffix.split("_")
            if (
                len(parts) == 3
                and parts[0] in valid_distance_metrics
                and parts[1] in valid_placement_types
                and parts[2] in valid_suffixes
            ):
                pass
            elif len(parts) == 1 and parts[0] in valid_suffixes:
                # Legacy non-mode output: remove to avoid stale frontend confusion.
                path.unlink(missing_ok=True)
            elif (
                len(parts) == 2
                and parts[0] in valid_placement_types
                and parts[1] in valid_suffixes
            ):
                # Legacy placement-only outputs: remove.
                path.unlink(missing_ok=True)
            else:
                path.unlink(missing_ok=True)
            break


def _build_output_schema_doc() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "time_buckets": list(TIME_BUCKETS.keys()),
        "distance_metrics": [m.value for m in DistanceMetric],
        "placement_types": [m.value for m in PlacementMode],
        "notes": [
            "Optimization uses walk_time (seconds), not flat distance.",
            "elevation_model.mode is dem_tobler when DEM is supplied.",
            "candidate_source documents where each proposed shelter came from.",
            "Graph is densified with intermediate nodes at densify_interval_m.",
            "Buildings/shelters connected via projected access edges, not nearest-node.",
            "Optimizer supports weighted coverage and local-swap improvement.",
            "Exact mode recommends precise graph-linked points.",
            "Cluster mode recommends area-level cluster centers from a KMeans ensemble.",
            f"Euclidean distance metric uses straight-line accessibility with a fixed {int(EUCLIDEAN_ACCESS_RADIUS_M)}m threshold.",
        ],
    }


def _validate_outputs() -> None:
    expected = [
        OUTPUT_DIR / "optimization_summary.json",
        OUTPUT_DIR / "output_schema.json",
        OUTPUT_DIR / "building_shelter_audit.json",
        OUTPUT_DIR / "coverage_diagnostics.json",
    ]
    for metric in DistanceMetric:
        expected.append(OUTPUT_DIR / f"building_coverage_network_{metric.value}.json")
        for mode in PlacementMode:
            for bucket in TIME_BUCKETS:
                expected.append(OUTPUT_DIR / f"optimal_meguniot_{metric.value}_{mode.value}_{bucket}.json")
                expected.append(OUTPUT_DIR / f"recommended_meguniot_{metric.value}_{mode.value}_{bucket}.csv")
                expected.append(OUTPUT_DIR / f"recommended_meguniot_{metric.value}_{mode.value}_{bucket}.geojson")
                expected.append(OUTPUT_DIR / f"shelter_coverages_{metric.value}_{mode.value}_{bucket}.json")
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


def load_target_buildings(path: Path, assumptions: ScenarioAssumptions) -> gpd.GeoDataFrame:
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
    before_1992_col = _first_present(
        gdf, ["Before_199", "Before_1992", "before_1992", "before1992", "lifney_1992"]
    )
    over_3_floors_col = _first_present(
        gdf, ["more_tha_3", "more_than_3_floors", "more_than_3_floors_or_2_apartments"]
    )
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
    if over_3_floors_col:
        gdf["over_3_floors_norm"] = gdf[over_3_floors_col].apply(_to_boolish)
    else:
        gdf["over_3_floors_norm"] = (gdf["floors_norm"] > 3) | (gdf["apartments_norm"] > 3)

    residential_mask = pd.Series(True, index=gdf.index)
    if single_family_col:
        residential_mask &= gdf[single_family_col].apply(_to_boolish)
    if residential_col:
        residential_mask &= gdf[residential_col].apply(_to_boolish)

    exempt_mask = pd.Series(False, index=gdf.index)
    if assumptions.post_1992_has_shelter:
        exempt_mask |= ~gdf["before_1992_norm"]
    if assumptions.over_3_floors_has_shelter:
        exempt_mask |= gdf["over_3_floors_norm"]
    target_mask = residential_mask & ~exempt_mask
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


def _load_optional_shelters(path: Path, shelter_type: str) -> gpd.GeoDataFrame:
    gdf = _load_geojson_with_real_crs(path).to_crs("EPSG:2039")
    gdf = gdf[gdf.geometry.notna() & gdf.geometry.is_valid].copy()
    if gdf.empty:
        return gdf
    if not gdf.geometry.geom_type.isin(["Point"]).all():
        gdf["geometry"] = gdf.geometry.centroid
    gdf["shelter_type"] = shelter_type
    return gdf


def load_existing_shelters(
    mig_path: Path,
    mik_path: Path,
    assumptions: ScenarioAssumptions,
    education_path: Path | None = None,
    public_buildings_path: Path | None = None,
) -> gpd.GeoDataFrame:
    mig = _load_geojson_with_real_crs(mig_path).to_crs("EPSG:2039").copy()
    mik = _load_geojson_with_real_crs(mik_path).to_crs("EPSG:2039").copy()
    mig["shelter_type"] = "megunit"
    mik["shelter_type"] = "miklat"
    mig = _ensure_non_empty_points(mig, "Miguniot")
    mik = _ensure_non_empty_points(mik, "Miklatim")
    shelter_frames = [mig, mik]
    if assumptions.education_facilities_are_shelters:
        if education_path is None or not education_path.exists():
            raise FileNotFoundError("Education facilities file is required for this scenario.")
        education = _load_optional_shelters(education_path, "education")
        if not education.empty:
            shelter_frames.append(education)
    if assumptions.public_buildings_are_shelters:
        if public_buildings_path is None or not public_buildings_path.exists():
            raise FileNotFoundError("Public buildings file is required for this scenario.")
        public_buildings = _load_optional_shelters(public_buildings_path, "public")
        if not public_buildings.empty:
            shelter_frames.append(public_buildings)
    merged = pd.concat(shelter_frames, ignore_index=True)
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


def _build_undirected_routing_graph(graph: nx.MultiDiGraph) -> nx.Graph:
    """Collapse to an undirected routing graph using minimal walk_time per edge.

    This avoids direction artifacts in pedestrian coverage calculations.
    """
    routing = nx.Graph()
    for nid, attrs in graph.nodes(data=True):
        routing.add_node(int(nid), **attrs)

    for u, v, data in graph.edges(data=True):
        uu, vv = int(u), int(v)
        wt = data.get("walk_time")
        if wt is None:
            continue
        try:
            wt_f = float(wt)
        except (TypeError, ValueError):
            continue
        if not math.isfinite(wt_f):
            continue
        length_val = data.get("length", 0.0)
        try:
            length_f = float(length_val)
        except (TypeError, ValueError):
            length_f = 0.0

        if routing.has_edge(uu, vv):
            if wt_f < float(routing[uu][vv].get("walk_time", math.inf)):
                routing[uu][vv]["walk_time"] = wt_f
                routing[uu][vv]["length"] = min(length_f, float(routing[uu][vv].get("length", length_f)))
        else:
            routing.add_edge(uu, vv, walk_time=wt_f, length=length_f)
    return routing


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


def _get_edge_geometry(
    graph: nx.MultiDiGraph, u: int, v: int, data: dict[str, Any]
) -> LineString:
    """Return edge geometry as a LineString, reconstructing from node coords if absent."""
    if "geometry" in data and isinstance(data["geometry"], LineString):
        return data["geometry"]
    ux, uy = float(graph.nodes[u]["x"]), float(graph.nodes[u]["y"])
    vx, vy = float(graph.nodes[v]["x"]), float(graph.nodes[v]["y"])
    return LineString([(ux, uy), (vx, vy)])


def _densify_graph(
    graph: nx.MultiDiGraph,
    interval_m: float,
    walk_speed_mps: float,
) -> int:
    """Subdivide long edges by inserting intermediate nodes at regular intervals.

    Operates in-place on *graph*.  Returns the number of new nodes added.
    """
    if interval_m <= 0:
        return 0

    next_node_id = max(graph.nodes) + 1
    edges_to_remove: list[tuple[int, int, int]] = []
    edges_to_add: list[tuple[int, int, dict[str, Any]]] = []
    nodes_to_add: list[tuple[int, dict[str, Any]]] = []

    for u, v, k, data in list(graph.edges(data=True, keys=True)):
        length = float(data.get("length", 0.0))
        if length <= interval_m:
            continue

        geom = _get_edge_geometry(graph, u, v, data)
        n_segments = max(2, int(math.ceil(length / interval_m)))
        grade = float(data.get("grade", 0.0))

        interp_points: list[Point] = []
        for seg_i in range(1, n_segments):
            frac = seg_i / n_segments
            interp_points.append(geom.interpolate(frac, normalized=True))

        chain_nodes: list[int] = [u]
        for pt in interp_points:
            nid = next_node_id
            next_node_id += 1
            nodes_to_add.append((nid, {"x": float(pt.x), "y": float(pt.y)}))
            chain_nodes.append(nid)
        chain_nodes.append(v)

        chain_coords: list[Point] = [Point(float(graph.nodes[u]["x"]), float(graph.nodes[u]["y"]))]
        chain_coords.extend(interp_points)
        chain_coords.append(Point(float(graph.nodes[v]["x"]), float(graph.nodes[v]["y"])))

        edges_to_remove.append((u, v, k))
        for seg_i in range(len(chain_nodes) - 1):
            n1 = chain_nodes[seg_i]
            n2 = chain_nodes[seg_i + 1]
            sub_length = chain_coords[seg_i].distance(chain_coords[seg_i + 1])
            sub_walk_time = _compute_edge_walk_time(sub_length, grade)
            sub_data = {
                "length": sub_length,
                "grade": grade,
                "walk_time": sub_walk_time,
                "densified": True,
            }
            edges_to_add.append((n1, n2, sub_data))

    for nid, attrs in nodes_to_add:
        graph.add_node(nid, **attrs)
    for u, v, k in edges_to_remove:
        if graph.has_edge(u, v, key=k):
            graph.remove_edge(u, v, key=k)
    for u, v, sub_data in edges_to_add:
        graph.add_edge(u, v, **sub_data)

    added = len(nodes_to_add)
    if added > 0:
        logger.info(
            "Densified graph: added %d nodes, replaced %d long edges with %d sub-edges (interval=%.0fm)",
            added, len(edges_to_remove), len(edges_to_add), interval_m,
        )
    return added


def _connect_points_to_graph(
    graph: nx.MultiDiGraph,
    points: gpd.GeoSeries,
    walk_speed_mps: float,
    access_radius_m: float,
    label: str = "point",
) -> list[int]:
    """Project each point onto its nearest edge, split that edge, and add an
    access edge from the point to the network.

    Returns a list of node IDs (one per input point) for routing.  Falls back
    to nearest existing node when projection is too far or trivially close.
    """
    if points.empty:
        return []

    xs = np.array([float(g.x) for g in points], dtype=float)
    ys = np.array([float(g.y) for g in points], dtype=float)

    nearest_edges_raw = ox.distance.nearest_edges(graph, xs, ys)
    # OSMnx can return nearest edges in multiple formats depending on version:
    # - tuple of arrays: (u_arr, v_arr, k_arr)
    # - ndarray/list of tuples: [(u, v, k), ...]
    if isinstance(nearest_edges_raw, tuple) and len(nearest_edges_raw) == 3:
        u_arr = np.asarray(nearest_edges_raw[0], dtype=int)
        v_arr = np.asarray(nearest_edges_raw[1], dtype=int)
        k_arr = np.asarray(nearest_edges_raw[2], dtype=int)
        nearest_edges = np.column_stack((u_arr, v_arr, k_arr))
    else:
        raw_arr = np.asarray(nearest_edges_raw, dtype=object)
        if raw_arr.ndim == 1 and len(raw_arr) and isinstance(raw_arr[0], tuple):
            nearest_edges = np.array(
                [[int(t[0]), int(t[1]), int(t[2]) if len(t) > 2 else 0] for t in raw_arr],
                dtype=int,
            )
        elif raw_arr.ndim == 2 and raw_arr.shape[1] >= 2:
            nearest_edges = np.array(raw_arr[:, :3], dtype=int)
            if nearest_edges.shape[1] == 2:
                nearest_edges = np.column_stack((nearest_edges, np.zeros(len(nearest_edges), dtype=int)))
        else:
            raise ValueError(
                f"Unexpected nearest_edges output shape: {raw_arr.shape} (type={type(nearest_edges_raw)})"
            )

    next_node_id = max(graph.nodes) + 1
    result_node_ids: list[int] = []

    edge_projections: dict[tuple[int, int, int], list[tuple[float, Point, int, float]]] = {}

    for i, point in enumerate(points):
        u, v, k = int(nearest_edges[i, 0]), int(nearest_edges[i, 1]), int(nearest_edges[i, 2])

        if not graph.has_edge(u, v, key=k):
            nn = int(ox.distance.nearest_nodes(graph, float(point.x), float(point.y)))
            result_node_ids.append(nn)
            continue

        data = graph[u][v][k]
        geom = _get_edge_geometry(graph, u, v, data)

        snap_dist_along = geom.project(point)
        snap_point = geom.interpolate(snap_dist_along)
        access_dist = float(point.distance(snap_point))

        if access_dist > access_radius_m:
            nn = int(ox.distance.nearest_nodes(graph, float(point.x), float(point.y)))
            result_node_ids.append(nn)
            continue

        frac = snap_dist_along / geom.length if geom.length > 0 else 0.0
        edge_projections.setdefault((u, v, k), []).append(
            (frac, snap_point, i, access_dist)
        )
        result_node_ids.append(-1)

    for (u, v, k), projs in edge_projections.items():
        if not graph.has_edge(u, v, key=k):
            for _, _, pidx, _ in projs:
                if result_node_ids[pidx] == -1:
                    pt = points.iloc[pidx]
                    result_node_ids[pidx] = int(
                        ox.distance.nearest_nodes(graph, float(pt.x), float(pt.y))
                    )
            continue

        data = dict(graph[u][v][k])
        edge_length = float(data.get("length", 0.0))
        edge_grade = float(data.get("grade", 0.0))

        projs.sort(key=lambda t: t[0])

        chain: list[tuple[float, int]] = [(0.0, u)]
        snap_node_ids: dict[int, int] = {}

        for frac, snap_pt, pidx, access_dist in projs:
            frac_clamped = max(0.001, min(0.999, frac))
            snap_nid = next_node_id
            next_node_id += 1
            graph.add_node(snap_nid, x=float(snap_pt.x), y=float(snap_pt.y))
            chain.append((frac_clamped, snap_nid))
            snap_node_ids[pidx] = snap_nid

        chain.append((1.0, v))

        graph.remove_edge(u, v, key=k)

        reverse_key: int | None = None
        if graph.has_edge(v, u):
            for rk in list(graph[v][u]):
                reverse_key = rk
                break
            if reverse_key is not None:
                graph.remove_edge(v, u, key=reverse_key)

        for seg_i in range(len(chain) - 1):
            f1, n1 = chain[seg_i]
            f2, n2 = chain[seg_i + 1]
            if n1 == n2:
                continue
            sub_length = (f2 - f1) * edge_length
            if sub_length < 0.01:
                continue
            sub_walk_time = _compute_edge_walk_time(sub_length, edge_grade)
            graph.add_edge(n1, n2, length=sub_length, walk_time=sub_walk_time, grade=edge_grade, split_edge=True)

        if reverse_key is not None:
            for seg_i in range(len(chain) - 1, 0, -1):
                f2, n2 = chain[seg_i]
                f1, n1 = chain[seg_i - 1]
                if n1 == n2:
                    continue
                sub_length = (f2 - f1) * edge_length
                if sub_length < 0.01:
                    continue
                sub_walk_time = _compute_edge_walk_time(sub_length, edge_grade)
                graph.add_edge(n2, n1, length=sub_length, walk_time=sub_walk_time, grade=edge_grade, split_edge=True)

        for pidx, snap_nid in snap_node_ids.items():
            pt = points.iloc[pidx]
            access_dist = float(pt.distance(Point(
                float(graph.nodes[snap_nid]["x"]),
                float(graph.nodes[snap_nid]["y"]),
            )))

            if access_dist < 1.0:
                result_node_ids[pidx] = snap_nid
            else:
                access_nid = next_node_id
                next_node_id += 1
                access_time = access_dist / walk_speed_mps
                graph.add_node(access_nid, x=float(pt.x), y=float(pt.y))
                graph.add_edge(access_nid, snap_nid, length=access_dist, walk_time=access_time, grade=0.0, access_edge=True)
                graph.add_edge(snap_nid, access_nid, length=access_dist, walk_time=access_time, grade=0.0, access_edge=True)
                result_node_ids[pidx] = access_nid

    for i in range(len(result_node_ids)):
        if result_node_ids[i] == -1:
            pt = points.iloc[i]
            result_node_ids[i] = int(
                ox.distance.nearest_nodes(graph, float(pt.x), float(pt.y))
            )

    connected = sum(1 for nid in result_node_ids if graph.nodes.get(nid, {}).get("x") is not None)
    logger.info(
        "Connected %d/%d %s points to graph (access_radius=%.0fm)",
        connected, len(points), label, access_radius_m,
    )
    return result_node_ids


def _generate_cluster_mode_candidates(
    buildings: gpd.GeoDataFrame,
    graph: nx.MultiDiGraph,
    max_candidates: int,
    ensemble_runs: int = DEFAULT_CLUSTER_ENSEMBLE_RUNS,
    min_cluster_size: int = 5,
    min_center_separation_m: float = DEFAULT_CLUSTER_MIN_SEPARATION_M,
    random_seed: int = 42,
) -> tuple[list[CandidatePoint], dict[int, list[int]]]:
    """Generate area-level candidates from a KMeans ensemble.

    The ensemble runs clustering many times with varied parameters and keeps
    clusters with low within-cluster distance (compact, spatially coherent).
    Candidate placement is the cluster center projected to nearest graph node.
    """
    if buildings.empty or max_candidates <= 0 or ensemble_runs <= 0:
        return [], {}

    coords = np.array([(float(g.x), float(g.y)) for g in buildings.geometry], dtype=float)
    if len(coords) == 0:
        return [], {}

    rng = np.random.default_rng(random_seed)
    sample_limit = min(len(coords), 3500)
    kmeans_runs = max(1, ensemble_runs)

    cluster_pool: list[dict[str, Any]] = []

    def _cluster_quality(center_xy: np.ndarray, members_xy: np.ndarray) -> float:
        d = np.linalg.norm(members_xy - center_xy, axis=1)
        return float(np.mean(d))

    # KMeans ensemble
    for _ in range(kmeans_runs):
        if sample_limit < min_cluster_size:
            break
        sample_idx = rng.choice(len(coords), size=sample_limit, replace=False)
        sample = coords[sample_idx]
        k_low = max(2, int(math.sqrt(sample_limit) / 3))
        k_high = max(k_low, min(120, int(math.sqrt(sample_limit) * 1.8)))
        k = int(rng.integers(k_low, k_high + 1))
        km = KMeans(n_clusters=k, random_state=int(rng.integers(0, 1_000_000_000)), n_init=1)
        labels = km.fit_predict(sample)
        centers = km.cluster_centers_
        for cid in range(k):
            members = sample[labels == cid]
            member_indices = sample_idx[labels == cid]
            if len(members) < min_cluster_size:
                continue
            center = centers[cid]
            cluster_pool.append(
                {
                    "method": "kmeans",
                    "center": np.array([float(center[0]), float(center[1])], dtype=float),
                    "size": int(len(members)),
                    "within_dist_m": _cluster_quality(center, members),
                    "member_building_indices": sorted(int(i) for i in member_indices.tolist()),
                }
            )

    if not cluster_pool:
        logger.warning("Cluster placement mode generated no viable clusters.")
        return [], {}

    cluster_pool.sort(key=lambda c: (c["within_dist_m"], -c["size"], c["method"]))

    tree, _ = _build_building_kdtree(buildings)
    candidates: list[CandidatePoint] = []
    cluster_members_by_candidate: dict[int, list[int]] = {}
    seen_graph_nodes: set[int] = set()
    selected_centers_xy: list[np.ndarray] = []
    next_id = 0
    for cluster in cluster_pool:
        if len(candidates) >= max_candidates:
            break
        cx, cy = float(cluster["center"][0]), float(cluster["center"][1])
        center_xy = np.array([cx, cy], dtype=float)
        too_close = any(float(np.linalg.norm(center_xy - prev_xy)) < min_center_separation_m for prev_xy in selected_centers_xy)
        if too_close:
            continue
        graph_node = int(ox.distance.nearest_nodes(graph, cx, cy))
        if graph_node in seen_graph_nodes:
            continue
        dist_arr, idx_arr = tree.query(np.array([[cx, cy]], dtype=float), k=1)
        candidates.append(
            CandidatePoint(
                candidate_id=next_id,
                source=CandidateSource.CLUSTER_CANDIDATES,
                geometry_2039=Point(cx, cy),
                graph_node=graph_node,
                source_id=None,
                nearest_building_dist_m=float(dist_arr[0][0]),
                building_idx=int(idx_arr[0][0]),
            )
        )
        cluster_members_by_candidate[next_id] = list(cluster["member_building_indices"])
        seen_graph_nodes.add(graph_node)
        selected_centers_xy.append(center_xy)
        next_id += 1

    logger.info(
        "Cluster placement candidates: selected %d compact centers from %d KMeans runs (%d raw clusters, min_sep=%.0fm)",
        len(candidates),
        ensemble_runs,
        len(cluster_pool),
        min_center_separation_m,
    )
    return candidates, cluster_members_by_candidate


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
    graph: nx.Graph | nx.MultiDiGraph,
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
    graph: nx.Graph | nx.MultiDiGraph,
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


def _candidate_coverages_euclidean_for_bucket(
    buildings: gpd.GeoDataFrame,
    candidates: list[CandidatePoint],
    cutoff_m: float,
) -> dict[int, set[int]]:
    building_xy = np.array([(float(g.x), float(g.y)) for g in buildings.geometry], dtype=float)
    coverages: dict[int, set[int]] = {}
    for candidate in candidates:
        dx = building_xy[:, 0] - float(candidate.geometry_2039.x)
        dy = building_xy[:, 1] - float(candidate.geometry_2039.y)
        dists = np.hypot(dx, dy)
        covered = set(int(i) for i in np.where(dists <= cutoff_m)[0].tolist())
        coverages[candidate.candidate_id] = covered
    return coverages


def _shelter_coverages_euclidean_for_bucket(
    buildings: gpd.GeoDataFrame,
    shelters: gpd.GeoDataFrame,
    cutoff_m: float,
) -> dict[int, set[int]]:
    building_xy = np.array([(float(g.x), float(g.y)) for g in buildings.geometry], dtype=float)
    shelter_xy = np.array([(float(g.x), float(g.y)) for g in shelters.geometry], dtype=float)
    coverages: dict[int, set[int]] = {}
    for shelter_row in shelters.itertuples():
        sid = int(shelter_row.shelter_id)
        sx, sy = shelter_xy[sid]
        dx = building_xy[:, 0] - float(sx)
        dy = building_xy[:, 1] - float(sy)
        dists = np.hypot(dx, dy)
        coverages[sid] = set(int(i) for i in np.where(dists <= cutoff_m)[0].tolist())
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


def _weighted_gain(
    covered: set[int],
    uncovered: set[int],
    weights: dict[int, float] | None,
) -> float:
    overlap = covered & uncovered
    if not overlap:
        return 0.0
    if weights is None:
        return float(len(overlap))
    return sum(weights.get(b, 1.0) for b in overlap)


def _greedy_select(
    initial_uncovered: set[int],
    candidate_coverages: dict[int, set[int]],
    max_new_shelters: int | None,
    building_weights: dict[int, float] | None = None,
) -> tuple[list[int], list[set[int]], set[int], str]:
    uncovered = set(initial_uncovered)
    selected: list[int] = []
    selected_sets: list[set[int]] = []
    if not uncovered:
        return selected, selected_sets, uncovered, "all_covered_by_existing"
    if max_new_shelters is not None and max_new_shelters <= 0:
        return selected, selected_sets, uncovered, "budget_limit"

    heap: list[tuple[float, int, int]] = []
    for cid, covered in candidate_coverages.items():
        gain = _weighted_gain(covered, uncovered, building_weights)
        if gain > 0:
            heapq.heappush(heap, (-gain, int(cid), -1))

    current_round = 0
    while uncovered and (max_new_shelters is None or len(selected) < max_new_shelters) and heap:
        neg_gain, cid, eval_round = heapq.heappop(heap)
        if eval_round != current_round:
            refreshed_gain = _weighted_gain(candidate_coverages[cid], uncovered, building_weights)
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


def _local_swap_improvement(
    selected_ids: list[int],
    candidate_coverages: dict[int, set[int]],
    initial_uncovered: set[int],
    building_weights: dict[int, float] | None = None,
    max_rounds: int = 3,
) -> tuple[list[int], list[set[int]]]:
    """Try 1-swap improvements: replace one selected candidate with a non-selected
    one if total weighted coverage improves.  Runs up to *max_rounds* passes."""
    if len(selected_ids) <= 1:
        return selected_ids, [candidate_coverages.get(c, set()) & initial_uncovered for c in selected_ids]

    best_ids = list(selected_ids)
    non_selected = set(candidate_coverages.keys()) - set(best_ids)
    improved = True
    rounds = 0

    def _total_coverage(ids: list[int]) -> tuple[float, set[int]]:
        covered: set[int] = set()
        for cid in ids:
            covered |= (candidate_coverages.get(cid, set()) & initial_uncovered)
        if building_weights is None:
            return float(len(covered)), covered
        return sum(building_weights.get(b, 1.0) for b in covered), covered

    while improved and rounds < max_rounds:
        improved = False
        rounds += 1
        current_score, _ = _total_coverage(best_ids)
        for i in range(len(best_ids)):
            for alt in list(non_selected):
                trial = list(best_ids)
                old = trial[i]
                trial[i] = alt
                trial_score, _ = _total_coverage(trial)
                if trial_score > current_score:
                    non_selected.discard(alt)
                    non_selected.add(old)
                    best_ids[i] = alt
                    current_score = trial_score
                    improved = True
                    break
            if improved:
                break

    result_sets: list[set[int]] = []
    remaining = set(initial_uncovered)
    for cid in best_ids:
        marginal = candidate_coverages.get(cid, set()) & remaining
        result_sets.append(marginal)
        remaining -= marginal

    if best_ids != selected_ids:
        logger.info("Swap improvement: changed %d/%d selections", sum(a != b for a, b in zip(best_ids, selected_ids)), len(best_ids))
    return best_ids, result_sets


def run_pipeline(
    walk_speed_mps: float,
    force_rebuild_graph: bool,
    max_new_shelters: int | None,
    candidate_sources: set[CandidateSource],
    node_proximity_m: float,
    public_parcels_path: Path | None,
    dem_path: Path | None,
    emergency_crossing_radius_m: float,
    densify_interval_m: float = DEFAULT_DENSIFY_INTERVAL_M,
    building_access_radius_m: float = DEFAULT_BUILDING_ACCESS_RADIUS_M,
    cluster_ensemble_runs: int = DEFAULT_CLUSTER_ENSEMBLE_RUNS,
    enable_swap_improvement: bool = False,
    building_weight_field: str | None = None,
    assumptions: ScenarioAssumptions = ScenarioAssumptions(),
    education_facilities_path: Path | None = None,
    public_buildings_path: Path | None = None,
    output_subdir: str | None = None,
) -> None:
    global OUTPUT_DIR
    base_output_dir = DATA_DIR / "meguniot_network"
    OUTPUT_DIR = base_output_dir / output_subdir if output_subdir else base_output_dir
    if walk_speed_mps <= 0:
        raise ValueError("walk_speed_mps must be positive.")
    if max_new_shelters is not None and max_new_shelters < 0:
        raise ValueError("max_new_shelters must be non-negative.")
    if emergency_crossing_radius_m < 0:
        raise ValueError("emergency_crossing_radius_m must be non-negative.")
    if cluster_ensemble_runs <= 0:
        raise ValueError("cluster_ensemble_runs must be positive.")

    effective_max_new_shelters = (
        MAX_SHELTERS_PER_MODE
        if max_new_shelters is None
        else min(int(max_new_shelters), MAX_SHELTERS_PER_MODE)
    )
    if max_new_shelters is not None and max_new_shelters > MAX_SHELTERS_PER_MODE:
        logger.info(
            "Capping --max-new-shelters from %d to %d",
            max_new_shelters,
            MAX_SHELTERS_PER_MODE,
        )
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    _cleanup_stale_bucket_outputs()

    required = [DATA_DIR / "buildings_built_year.geojson", DATA_DIR / "Miguniot.geojson", DATA_DIR / "Miklatim.geojson"]
    if assumptions.education_facilities_are_shelters:
        required.append(education_facilities_path or DATA_DIR / "Education_Facilities.geojson")
    if assumptions.public_buildings_are_shelters:
        required.append(public_buildings_path or DATA_DIR / "buildings_on_מבני_ציבור.geojson")
    if dem_path is not None:
        required.append(dem_path)
    _assert_input_files_exist(required)

    buildings = load_target_buildings(DATA_DIR / "buildings_built_year.geojson", assumptions=assumptions)
    shelters = load_existing_shelters(
        DATA_DIR / "Miguniot.geojson",
        DATA_DIR / "Miklatim.geojson",
        assumptions=assumptions,
        education_path=education_facilities_path or DATA_DIR / "Education_Facilities.geojson",
        public_buildings_path=public_buildings_path or DATA_DIR / "buildings_on_מבני_ציבור.geojson",
    )
    logger.info("Loaded %d target buildings and %d existing shelters", len(buildings), len(shelters))

    # --- Build or load walking graph ---
    graph_path = base_output_dir / "walk_graph_2039.graphml"
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

    # --- Graph densification ---
    densified_nodes = 0
    if densify_interval_m > 0:
        densified_nodes = _densify_graph(graph, densify_interval_m, walk_speed_mps)

    # --- Building & shelter access edges ---
    if building_access_radius_m > 0:
        building_node_ids = _connect_points_to_graph(
            graph, buildings.geometry, walk_speed_mps, building_access_radius_m, label="building",
        )
        buildings["node_id"] = building_node_ids
        shelter_node_ids_list = _connect_points_to_graph(
            graph, shelters.geometry, walk_speed_mps, building_access_radius_m, label="shelter",
        )
        shelters["node_id"] = shelter_node_ids_list
    else:
        buildings["node_id"] = _nearest_nodes_for_points(graph, buildings.geometry)
        shelters["node_id"] = _nearest_nodes_for_points(graph, shelters.geometry)

    shelter_nodes = [int(n) for n in shelters["node_id"].tolist()]
    if not shelter_nodes:
        raise ValueError("No shelter nodes mapped to walking graph.")
    building_nodes = {int(r.building_idx): int(r.node_id) for r in buildings.itertuples()}
    routing_graph = _build_undirected_routing_graph(graph)

    # --- Building weights ---
    building_weights: dict[int, float] | None = None
    if building_weight_field:
        wt_col = _first_present(buildings, [building_weight_field])
        if wt_col:
            building_weights = {}
            for row in buildings.itertuples():
                val = getattr(row, wt_col, None)
                building_weights[int(row.building_idx)] = max(float(_to_int_safe(val, 1)), 1.0)
            logger.info("Using building weights from column '%s'", wt_col)
        else:
            logger.warning("Weight field '%s' not found; falling back to uniform weights", building_weight_field)

    exact_candidates = generate_candidate_sites(
        buildings=buildings,
        graph=graph,
        sources=candidate_sources,
        node_proximity_m=node_proximity_m,
        public_parcels_path=public_parcels_path,
    )

    building_tree, _ = _build_building_kdtree(buildings)
    cluster_candidates, cluster_members_by_candidate = _generate_cluster_mode_candidates(
        buildings=buildings,
        graph=graph,
        max_candidates=DEFAULT_CLUSTER_CANDIDATE_POOL,
        ensemble_runs=cluster_ensemble_runs,
    )
    mode_candidates: dict[PlacementMode, list[CandidatePoint]] = {
        PlacementMode.EXACT: exact_candidates,
        PlacementMode.CLUSTER: cluster_candidates,
    }
    mode_cluster_members: dict[PlacementMode, dict[int, list[int]]] = {
        PlacementMode.EXACT: {},
        PlacementMode.CLUSTER: cluster_members_by_candidate,
    }

    max_cutoff_seconds = max(TIME_BUCKETS.values())
    dist_to_any = nx.multi_source_dijkstra_path_length(
        routing_graph, shelter_nodes, cutoff=float(max_cutoff_seconds), weight="walk_time"
    )
    direct_to_any = _nearest_shelter_direct_times(
        buildings=buildings,
        shelters=shelters,
        crossing_radius_m=emergency_crossing_radius_m,
        walk_speed_mps=walk_speed_mps,
    )
    shelter_xy = np.array([(float(g.x), float(g.y)) for g in shelters.geometry], dtype=float)
    euclidean_nearest_dist_m = np.full(len(buildings), np.inf, dtype=float)
    for i, geom in enumerate(buildings.geometry):
        dx = shelter_xy[:, 0] - float(geom.x)
        dy = shelter_xy[:, 1] - float(geom.y)
        dists = np.hypot(dx, dy)
        euclidean_nearest_dist_m[i] = float(np.min(dists)) if dists.size else math.inf

    buildings_wgs = buildings.to_crs("EPSG:4326")
    coverage_records_by_metric: dict[DistanceMetric, list[dict[str, Any]]] = {
        DistanceMetric.GRAPH: [],
        DistanceMetric.EUCLIDEAN: [],
    }
    for idx, (row, row_wgs) in enumerate(zip(buildings.itertuples(), buildings_wgs.itertuples())):
        walk_sec_network = float(dist_to_any.get(int(row.node_id), math.inf))
        walk_sec_direct = float(direct_to_any[idx])
        walk_sec = min(walk_sec_network, walk_sec_direct)
        nearest_euclidean_m = float(euclidean_nearest_dist_m[idx])
        for metric in DistanceMetric:
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
                "nearest_shelter_distance_m": None if math.isinf(nearest_euclidean_m) else round(nearest_euclidean_m, 1),
            }
            for bucket, seconds in TIME_BUCKETS.items():
                if metric == DistanceMetric.GRAPH:
                    rec[f"covered_{bucket}"] = bool(walk_sec <= seconds)
                else:
                    rec[f"covered_{bucket}"] = bool(nearest_euclidean_m <= EUCLIDEAN_ACCESS_RADIUS_M)
            coverage_records_by_metric[metric].append(rec)

    for metric in DistanceMetric:
        _write_json(
            OUTPUT_DIR / f"building_coverage_network_{metric.value}.json",
            {
                "schema_version": SCHEMA_VERSION,
                "distance_metric": metric.value,
                "time_buckets": TIME_BUCKETS,
                "placement_types": [m.value for m in PlacementMode],
                "euclidean_access_radius_m": EUCLIDEAN_ACCESS_RADIUS_M,
                "walk_speed_mps_fallback": walk_speed_mps,
                "emergency_crossing_radius_m": emergency_crossing_radius_m,
                "densify_interval_m": densify_interval_m,
                "building_access_radius_m": building_access_radius_m,
                "densified_nodes_added": densified_nodes,
                "elevation_model": elevation_model,
                "candidate_sources_exact": [s.value for s in sorted(candidate_sources, key=lambda x: x.value)],
                "assumptions": {
                    "post1992Sheltered": assumptions.post_1992_has_shelter,
                    "over3FloorsSheltered": assumptions.over_3_floors_has_shelter,
                    "educationShelters": assumptions.education_facilities_are_shelters,
                    "publicShelters": assumptions.public_buildings_are_shelters,
                },
                "total_candidates_by_placement": {
                    PlacementMode.EXACT.value: len(exact_candidates),
                    PlacementMode.CLUSTER.value: len(cluster_candidates),
                },
                "total_target_buildings": len(coverage_records_by_metric[metric]),
                "buildings": coverage_records_by_metric[metric],
            },
        )

    results_by_metric_mode: dict[DistanceMetric, dict[PlacementMode, list[BucketResult]]] = {
        metric: {mode: [] for mode in PlacementMode} for metric in DistanceMetric
    }
    candidate_coverages_by_metric_mode_bucket: dict[
        DistanceMetric, dict[PlacementMode, dict[str, dict[int, set[int]]]]
    ] = {
        metric: {mode: {} for mode in PlacementMode} for metric in DistanceMetric
    }

    for metric in DistanceMetric:
        coverage_records = coverage_records_by_metric[metric]
        for mode in PlacementMode:
            candidates = mode_candidates[mode]
            cand_lookup = {c.candidate_id: c for c in candidates}
            cand_points_wgs = gpd.GeoSeries([c.geometry_2039 for c in candidates], crs="EPSG:2039").to_crs("EPSG:4326")
            if mode == PlacementMode.EXACT:
                mode_sources = [s.value for s in sorted(candidate_sources, key=lambda x: x.value)]
            else:
                mode_sources = ["cluster_ensemble_kmeans"]

            for bucket, seconds in TIME_BUCKETS.items():
                logger.info("Optimizing %s/%s placement for %s (%ss)", metric.value, mode.value, bucket, seconds)
                initially_uncovered = {
                    int(r["building_idx"]) for r in coverage_records if not r.get(f"covered_{bucket}", False)
                }
                if metric == DistanceMetric.GRAPH:
                    candidate_coverages = _candidate_coverages_for_bucket(
                        graph=routing_graph,
                        building_nodes=building_nodes,
                        candidates=candidates,
                        cutoff_seconds=float(seconds),
                    )
                    existing_coverages = _shelter_coverages_for_bucket(
                        graph=routing_graph,
                        building_nodes=building_nodes,
                        shelter_node_ids=shelter_nodes,
                        cutoff_seconds=float(seconds),
                    )
                    candidate_points_by_id = {int(c.candidate_id): c.geometry_2039 for c in candidates}
                    shelter_points_by_id = {int(row.shelter_id): row.geometry for row in shelters.itertuples()}
                    _augment_coverages_with_direct_crossing(
                        coverages=candidate_coverages,
                        source_points_by_id=candidate_points_by_id,
                        building_tree=building_tree,
                        crossing_radius_m=emergency_crossing_radius_m,
                    )
                    _augment_coverages_with_direct_crossing(
                        coverages=existing_coverages,
                        source_points_by_id=shelter_points_by_id,
                        building_tree=building_tree,
                        crossing_radius_m=emergency_crossing_radius_m,
                    )
                else:
                    candidate_coverages = _candidate_coverages_euclidean_for_bucket(
                        buildings=buildings,
                        candidates=candidates,
                        cutoff_m=EUCLIDEAN_ACCESS_RADIUS_M,
                    )
                    existing_coverages = _shelter_coverages_euclidean_for_bucket(
                        buildings=buildings,
                        shelters=shelters,
                        cutoff_m=EUCLIDEAN_ACCESS_RADIUS_M,
                    )
                candidate_coverages_by_metric_mode_bucket[metric][mode][bucket] = candidate_coverages

                selected_ids, selected_sets, final_uncovered, stop_reason = _greedy_select(
                    initially_uncovered,
                    candidate_coverages,
                    effective_max_new_shelters,
                    building_weights,
                )

                if enable_swap_improvement and selected_ids:
                    selected_ids, selected_sets = _local_swap_improvement(
                        selected_ids, candidate_coverages, initially_uncovered, building_weights,
                    )
                    final_uncovered = (
                        initially_uncovered - set().union(*selected_sets)
                        if selected_sets
                        else initially_uncovered
                    )

                coverage_entries: list[dict[str, Any]] = []
                for shelter_row in shelters.itertuples():
                    sid = int(shelter_row.shelter_id)
                    covered_set = existing_coverages.get(sid, set())
                    covered_indices = sorted(int(x) for x in covered_set)
                    coverage_entries.append(
                        {
                            "distance_metric": metric.value,
                            "placement_mode": mode.value,
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
                    if mode == PlacementMode.CLUSTER:
                        full_covered_set = set(mode_cluster_members[mode].get(cid, []))
                    else:
                        full_covered_set = candidate_coverages.get(cid, set())
                    covered_indices = sorted(int(x) for x in full_covered_set)
                    coverage_entries.append(
                        {
                            "distance_metric": metric.value,
                            "placement_mode": mode.value,
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
                    OUTPUT_DIR / f"shelter_coverages_{metric.value}_{mode.value}_{bucket}.json",
                    {
                        "schema_version": SCHEMA_VERSION,
                        "distance_metric": metric.value,
                        "placement_mode": mode.value,
                        "time_bucket": bucket,
                        "time_seconds": seconds,
                        "elevation_model": elevation_model,
                        "euclidean_access_radius_m": EUCLIDEAN_ACCESS_RADIUS_M,
                        "emergency_crossing_radius_m": emergency_crossing_radius_m,
                        "assumptions": {
                            "post1992Sheltered": assumptions.post_1992_has_shelter,
                            "over3FloorsSheltered": assumptions.over_3_floors_has_shelter,
                            "educationShelters": assumptions.education_facilities_are_shelters,
                            "publicShelters": assumptions.public_buildings_are_shelters,
                        },
                        "coverages": coverage_entries,
                    },
                )

                bucket_result = BucketResult(
                    bucket=bucket,
                    seconds=seconds,
                    selected_candidate_ids=selected_ids,
                    selected_covered_sets=selected_sets,
                    initial_uncovered=initially_uncovered,
                    final_uncovered=final_uncovered,
                    stop_reason=stop_reason,
                )
                results_by_metric_mode[metric][mode].append(bucket_result)

                proposed = []
                for rank, (cid, covered_marginal) in enumerate(
                    zip(bucket_result.selected_candidate_ids, bucket_result.selected_covered_sets), start=1
                ):
                    candidate = cand_lookup[cid]
                    geom = cand_points_wgs.iloc[cid]
                    if mode == PlacementMode.CLUSTER:
                        full_covered_set = set(mode_cluster_members[mode].get(cid, []))
                        marginal_for_output = set(full_covered_set)
                    else:
                        full_covered_set = candidate_coverages_by_metric_mode_bucket[metric][mode][bucket_result.bucket].get(cid, set())
                        marginal_for_output = set(covered_marginal)
                    proposed.append(
                        {
                            "rank": rank,
                            "distance_metric": metric.value,
                            "placement_mode": mode.value,
                            "placement_semantics": "exact_point"
                            if mode == PlacementMode.EXACT
                            else "area_center",
                            "shelter_id": int(cid),
                            "candidate_id": int(cid),
                            "candidate_source": candidate.source.value,
                            "source_id": candidate.source_id,
                            "building_idx": candidate.building_idx,
                            "coordinates": f"{geom.y:.6f},{geom.x:.6f}",
                            "lat": float(geom.y),
                            "lon": float(geom.x),
                            "nearest_building_dist_m": round(float(candidate.nearest_building_dist_m), 2),
                            "newly_covered_buildings": int(len(marginal_for_output)),
                            "newly_covered_people_est": int(len(marginal_for_output) * PEOPLE_PER_BUILDING),
                            "covered_building_indices": sorted(int(x) for x in full_covered_set),
                            "marginal_covered_building_indices": sorted(int(x) for x in marginal_for_output),
                        }
                    )

                source_counts: dict[str, int] = {}
                for p in proposed:
                    source_counts[p["candidate_source"]] = source_counts.get(p["candidate_source"], 0) + 1

                stats = {
                    "distance_metric": metric.value,
                    "placement_mode": mode.value,
                    "time_bucket": bucket_result.bucket,
                    "time_seconds": bucket_result.seconds,
                    "euclidean_access_radius_m": EUCLIDEAN_ACCESS_RADIUS_M,
                    "walk_speed_mps_fallback": walk_speed_mps,
                    "emergency_crossing_radius_m": emergency_crossing_radius_m,
                    "total_target_buildings": len(buildings),
                    "total_candidates_evaluated": len(candidates),
                    "candidate_sources_used": mode_sources,
                    "covered_by_existing": int(len(buildings) - len(bucket_result.initial_uncovered)),
                    "currently_uncovered": int(len(bucket_result.initial_uncovered)),
                    "additional_covered_by_proposed": int(
                        len(bucket_result.initial_uncovered) - len(bucket_result.final_uncovered)
                    ),
                    "final_uncovered": int(len(bucket_result.final_uncovered)),
                    "num_proposed_meguniot": int(len(bucket_result.selected_candidate_ids)),
                    "proposed_by_source": source_counts,
                    "max_proposed_limit": effective_max_new_shelters,
                    "stop_reason": bucket_result.stop_reason,
                }

                _write_json(
                    OUTPUT_DIR / f"optimal_meguniot_{metric.value}_{mode.value}_{bucket_result.bucket}.json",
                    {
                        "schema_version": SCHEMA_VERSION,
                        "distance_metric": metric.value,
                        "placement_mode": mode.value,
                        "time_bucket": bucket_result.bucket,
                        "time_seconds": bucket_result.seconds,
                        "elevation_model": elevation_model,
                        "euclidean_access_radius_m": EUCLIDEAN_ACCESS_RADIUS_M,
                        "optimization_method": "weighted_greedy_maximum_coverage"
                        if building_weights
                        else "lazy_greedy_maximum_coverage",
                        "swap_improvement_enabled": enable_swap_improvement,
                        "candidate_generation": {
                            "sources": mode_sources,
                            "node_proximity_m": node_proximity_m if mode == PlacementMode.EXACT else None,
                            "cluster_ensemble_runs": cluster_ensemble_runs if mode == PlacementMode.CLUSTER else None,
                            "total_candidates": len(candidates),
                        },
                        "assumptions": {
                            "post1992Sheltered": assumptions.post_1992_has_shelter,
                            "over3FloorsSheltered": assumptions.over_3_floors_has_shelter,
                            "educationShelters": assumptions.education_facilities_are_shelters,
                            "publicShelters": assumptions.public_buildings_are_shelters,
                        },
                        "statistics": stats,
                        "proposed_meguniot": proposed,
                    },
                )

                csv_df = pd.DataFrame(
                    [
                        {
                            "rank": p["rank"],
                            "distance_metric": p["distance_metric"],
                            "placement_mode": p["placement_mode"],
                            "placement_semantics": p["placement_semantics"],
                            "candidate_source": p["candidate_source"],
                            "time_bucket": bucket_result.bucket,
                            "time_seconds": bucket_result.seconds,
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
                csv_df.to_csv(
                    OUTPUT_DIR / f"recommended_meguniot_{metric.value}_{mode.value}_{bucket_result.bucket}.csv",
                    index=False,
                )

                geojson_features = []
                for p in proposed:
                    geojson_features.append(
                        {
                            "type": "Feature",
                            "geometry": mapping(Point(float(p["lon"]), float(p["lat"]))),
                            "properties": {
                                "rank": p["rank"],
                                "distance_metric": p["distance_metric"],
                                "placement_mode": p["placement_mode"],
                                "placement_semantics": p["placement_semantics"],
                                "shelter_id": p["shelter_id"],
                                "candidate_source": p["candidate_source"],
                                "time_bucket": bucket_result.bucket,
                                "time_seconds": bucket_result.seconds,
                                "coordinates": p["coordinates"],
                                "nearest_building_dist_m": p["nearest_building_dist_m"],
                                "newly_covered_buildings": p["newly_covered_buildings"],
                                "newly_covered_people_est": p["newly_covered_people_est"],
                            },
                        }
                    )
                _write_json(
                    OUTPUT_DIR / f"recommended_meguniot_{metric.value}_{mode.value}_{bucket_result.bucket}.geojson",
                    {"type": "FeatureCollection", "features": geojson_features},
                )
    # --- Per-building audit: which shelters cover each building ---
    audit_records: list[dict[str, Any]] = []
    for metric in DistanceMetric:
        for bucket, seconds in TIME_BUCKETS.items():
            if metric == DistanceMetric.GRAPH:
                existing_coverages_audit = _shelter_coverages_for_bucket(
                    graph=routing_graph, building_nodes=building_nodes, shelter_node_ids=shelter_nodes, cutoff_seconds=float(seconds),
                )
                shelter_points_audit = {int(row.shelter_id): row.geometry for row in shelters.itertuples()}
                _augment_coverages_with_direct_crossing(
                    coverages=existing_coverages_audit, source_points_by_id=shelter_points_audit,
                    building_tree=building_tree, crossing_radius_m=emergency_crossing_radius_m,
                )
            else:
                existing_coverages_audit = _shelter_coverages_euclidean_for_bucket(
                    buildings=buildings, shelters=shelters, cutoff_m=EUCLIDEAN_ACCESS_RADIUS_M,
                )
            building_to_shelters: dict[int, list[int]] = {}
            for sid, covered in existing_coverages_audit.items():
                for bidx in covered:
                    building_to_shelters.setdefault(int(bidx), []).append(int(sid))
            for bidx in sorted(building_nodes.keys()):
                covering = sorted(building_to_shelters.get(bidx, []))
                audit_records.append({
                    "distance_metric": metric.value,
                    "building_idx": bidx,
                    "time_bucket": bucket,
                    "time_seconds": seconds,
                    "covering_shelter_ids": covering,
                    "covering_shelter_count": len(covering),
                })

    _write_json(OUTPUT_DIR / "building_shelter_audit.json", {
        "schema_version": SCHEMA_VERSION,
        "euclidean_access_radius_m": EUCLIDEAN_ACCESS_RADIUS_M,
        "description": "Per-building list of existing shelters that can reach it within each time bucket and distance metric",
        "records": audit_records,
    })

    # --- Overlap diagnostics ---
    diagnostics: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "euclidean_access_radius_m": EUCLIDEAN_ACCESS_RADIUS_M,
        "densify_interval_m": densify_interval_m,
        "building_access_radius_m": building_access_radius_m,
        "densified_nodes_added": densified_nodes,
        "cluster_ensemble_runs": cluster_ensemble_runs,
        "max_new_shelters_per_mode": effective_max_new_shelters,
        "swap_improvement_enabled": enable_swap_improvement,
        "building_weight_field": building_weight_field,
        "assumptions": {
            "post1992Sheltered": assumptions.post_1992_has_shelter,
            "over3FloorsSheltered": assumptions.over_3_floors_has_shelter,
            "educationShelters": assumptions.education_facilities_are_shelters,
            "publicShelters": assumptions.public_buildings_are_shelters,
        },
        "per_metric": {},
    }
    for metric in DistanceMetric:
        metric_records = coverage_records_by_metric[metric]
        walk_seconds_list = [
            r["nearest_shelter_walk_seconds"] for r in metric_records
            if r["nearest_shelter_walk_seconds"] is not None
        ]
        walk_arr = np.array(walk_seconds_list, dtype=float) if walk_seconds_list else np.array([], dtype=float)
        per_bucket: dict[str, Any] = {}
        for bucket in TIME_BUCKETS:
            if metric == DistanceMetric.GRAPH:
                existing_coverages_diag = _shelter_coverages_for_bucket(
                    graph=routing_graph, building_nodes=building_nodes, shelter_node_ids=shelter_nodes,
                    cutoff_seconds=float(TIME_BUCKETS[bucket]),
                )
                shelter_pts_diag = {int(row.shelter_id): row.geometry for row in shelters.itertuples()}
                _augment_coverages_with_direct_crossing(
                    coverages=existing_coverages_diag, source_points_by_id=shelter_pts_diag,
                    building_tree=building_tree, crossing_radius_m=emergency_crossing_radius_m,
                )
            else:
                existing_coverages_diag = _shelter_coverages_euclidean_for_bucket(
                    buildings=buildings, shelters=shelters, cutoff_m=EUCLIDEAN_ACCESS_RADIUS_M,
                )
            building_coverage_counts: dict[int, int] = {}
            for _sid, covered in existing_coverages_diag.items():
                for bidx in covered:
                    building_coverage_counts[bidx] = building_coverage_counts.get(bidx, 0) + 1
            multi_covered = sum(1 for c in building_coverage_counts.values() if c >= 2)
            per_bucket[bucket] = {
                "buildings_covered_by_2plus_shelters": multi_covered,
                "buildings_covered_by_1_shelter": sum(1 for c in building_coverage_counts.values() if c == 1),
                "buildings_with_no_coverage": len(building_nodes) - len(building_coverage_counts),
            }
        diagnostics["per_metric"][metric.value] = {
            "access_time_stats": {
                "median_seconds": round(float(np.median(walk_arr)), 1) if len(walk_arr) else None,
                "p90_seconds": round(float(np.percentile(walk_arr, 90)), 1) if len(walk_arr) else None,
                "p95_seconds": round(float(np.percentile(walk_arr, 95)), 1) if len(walk_arr) else None,
                "max_seconds": round(float(np.max(walk_arr)), 1) if len(walk_arr) else None,
            },
            "per_bucket": per_bucket,
        }
    _write_json(OUTPUT_DIR / "coverage_diagnostics.json", diagnostics)

    summary = {
        "schema_version": SCHEMA_VERSION,
        "walk_speed_mps_fallback": walk_speed_mps,
        "euclidean_access_radius_m": EUCLIDEAN_ACCESS_RADIUS_M,
        "emergency_crossing_radius_m": emergency_crossing_radius_m,
        "densify_interval_m": densify_interval_m,
        "building_access_radius_m": building_access_radius_m,
        "cluster_ensemble_runs": cluster_ensemble_runs,
        "max_new_shelters_per_mode": effective_max_new_shelters,
        "swap_improvement_enabled": enable_swap_improvement,
        "building_weight_field": building_weight_field,
        "assumptions": {
            "post1992Sheltered": assumptions.post_1992_has_shelter,
            "over3FloorsSheltered": assumptions.over_3_floors_has_shelter,
            "educationShelters": assumptions.education_facilities_are_shelters,
            "publicShelters": assumptions.public_buildings_are_shelters,
        },
        "elevation_model": elevation_model,
        "time_buckets": TIME_BUCKETS,
        "distance_metrics": [m.value for m in DistanceMetric],
        "placement_types": [m.value for m in PlacementMode],
        "total_target_buildings": int(len(buildings)),
        "candidate_generation_by_placement": {
            PlacementMode.EXACT.value: {
                "sources": [s.value for s in sorted(candidate_sources, key=lambda x: x.value)],
                "node_proximity_m": node_proximity_m,
                "total_candidates": len(exact_candidates),
            },
            PlacementMode.CLUSTER.value: {
                "sources": ["cluster_ensemble_kmeans"],
                "cluster_ensemble_runs": cluster_ensemble_runs,
                "total_candidates": len(cluster_candidates),
            },
        },
        "results_by_metric_and_placement": {
            metric.value: {
                mode.value: [
                    {
                        "time_bucket": r.bucket,
                        "time_seconds": r.seconds,
                        "currently_uncovered": int(len(r.initial_uncovered)),
                        "additional_covered_by_proposed": int(len(r.initial_uncovered) - len(r.final_uncovered)),
                        "num_proposed_meguniot": int(len(r.selected_candidate_ids)),
                        "final_uncovered": int(len(r.final_uncovered)),
                        "stop_reason": r.stop_reason,
                    }
                    for r in results_by_metric_mode[metric][mode]
                ]
                for mode in PlacementMode
            }
            for metric in DistanceMetric
        },
    }
    _write_json(OUTPUT_DIR / "optimization_summary.json", summary)
    _write_json(OUTPUT_DIR / "output_schema.json", _build_output_schema_doc())
    _validate_outputs()
    logger.info("Pipeline completed successfully. Outputs written to %s", OUTPUT_DIR)


def main() -> None:
    _configure_logging()
    parser = argparse.ArgumentParser(
        description="Run Bet Shemesh meguniot backend pipeline (v5)."
    )
    parser.add_argument("--walk-speed-mps", type=float, default=DEFAULT_WALK_SPEED_MPS)
    parser.add_argument("--force-rebuild-graph", action="store_true")
    parser.add_argument(
        "--max-new-shelters",
        type=int,
        default=DEFAULT_MAX_PROPOSED,
        help=f"Max number of recommended shelters per placement mode (capped at {MAX_SHELTERS_PER_MODE}).",
    )
    parser.add_argument(
        "--candidate-sources",
        nargs="+",
        default=["buildings", "network_nodes"],
        choices=["buildings", "network_nodes", "public_parcels", "cluster_candidates"],
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
    parser.add_argument(
        "--densify-interval-m",
        type=float,
        default=DEFAULT_DENSIFY_INTERVAL_M,
        help="Insert intermediate graph nodes every N meters along long edges. 0 to disable.",
    )
    parser.add_argument(
        "--building-access-radius-m",
        type=float,
        default=DEFAULT_BUILDING_ACCESS_RADIUS_M,
        help="Max distance to project buildings/shelters onto nearest edge. 0 for nearest-node only.",
    )
    parser.add_argument(
        "--cluster-ensemble-runs",
        type=int,
        default=DEFAULT_CLUSTER_ENSEMBLE_RUNS,
        help="Number of KMeans ensemble runs for cluster placement mode.",
    )
    parser.add_argument(
        "--enable-swap-improvement",
        action="store_true",
        help="Run local 1-swap improvement pass after greedy selection.",
    )
    parser.add_argument(
        "--building-weight-field",
        type=str,
        default=None,
        help="Column name for building weights (e.g. apartments). Default is uniform.",
    )
    parser.add_argument(
        "--assume-post-1992-has-shelter",
        dest="assume_post_1992_has_shelter",
        action="store_true",
        default=True,
        help="Treat buildings built in/after 1992 as already sheltered.",
    )
    parser.add_argument(
        "--no-assume-post-1992-has-shelter",
        dest="assume_post_1992_has_shelter",
        action="store_false",
    )
    parser.add_argument(
        "--assume-over-3-floors-has-shelter",
        action="store_true",
        help="Treat buildings above 3 floors as already sheltered.",
    )
    parser.add_argument(
        "--assume-education-facilities-are-shelters",
        action="store_true",
        help="Count education facilities as existing shelter supply.",
    )
    parser.add_argument(
        "--assume-public-buildings-are-shelters",
        action="store_true",
        help="Count public buildings as existing shelter supply.",
    )
    parser.add_argument(
        "--education-facilities-path",
        type=Path,
        default=DATA_DIR / "Education_Facilities.geojson",
        help="GeoJSON path for education facilities used as shelters when enabled.",
    )
    parser.add_argument(
        "--public-buildings-path",
        type=Path,
        default=DATA_DIR / "buildings_on_מבני_ציבור.geojson",
        help="GeoJSON path for public buildings used as shelters when enabled.",
    )
    parser.add_argument(
        "--output-subdir",
        type=str,
        default=None,
        help="Optional subdirectory under data/meguniot_network for scenario outputs.",
    )
    args = parser.parse_args()

    sources = {CandidateSource(s) for s in args.candidate_sources}
    assumptions = ScenarioAssumptions(
        post_1992_has_shelter=bool(args.assume_post_1992_has_shelter),
        over_3_floors_has_shelter=bool(args.assume_over_3_floors_has_shelter),
        education_facilities_are_shelters=bool(args.assume_education_facilities_are_shelters),
        public_buildings_are_shelters=bool(args.assume_public_buildings_are_shelters),
    )
    run_pipeline(
        walk_speed_mps=args.walk_speed_mps,
        force_rebuild_graph=args.force_rebuild_graph,
        max_new_shelters=args.max_new_shelters,
        candidate_sources=sources,
        node_proximity_m=args.node_proximity_m,
        public_parcels_path=args.public_parcels,
        dem_path=args.dem_path,
        emergency_crossing_radius_m=args.emergency_crossing_radius_m,
        densify_interval_m=args.densify_interval_m,
        building_access_radius_m=args.building_access_radius_m,
        cluster_ensemble_runs=args.cluster_ensemble_runs,
        enable_swap_improvement=args.enable_swap_improvement,
        building_weight_field=args.building_weight_field,
        assumptions=assumptions,
        education_facilities_path=args.education_facilities_path,
        public_buildings_path=args.public_buildings_path,
        output_subdir=args.output_subdir,
    )


if __name__ == "__main__":
    main()

