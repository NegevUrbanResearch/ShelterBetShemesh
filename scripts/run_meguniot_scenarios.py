#!/usr/bin/env python
"""Generate all Step-0 assumption scenarios for the frontend."""

from __future__ import annotations

import argparse
import os
import itertools
import json
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
from typing import Any

from tqdm import tqdm

from meguniot_backend_v3 import (
    CandidateSource,
    DATA_DIR,
    ScenarioAssumptions,
    run_pipeline,
)

REQUIRED_SCENARIO_OUTPUT_FILES = (
    "optimization_summary.json",
    "output_schema.json",
    "building_shelter_audit.json",
    "coverage_diagnostics.json",
    "building_coverage_network_graph.json",
    "building_coverage_network_euclidean.json",
    "optimal_meguniot_graph_exact_5min.json",
    "optimal_meguniot_graph_cluster_5min.json",
    "optimal_meguniot_euclidean_exact_5min.json",
    "optimal_meguniot_euclidean_cluster_5min.json",
    "recommended_meguniot_graph_exact_5min.csv",
    "recommended_meguniot_graph_cluster_5min.csv",
    "recommended_meguniot_euclidean_exact_5min.csv",
    "recommended_meguniot_euclidean_cluster_5min.csv",
    "recommended_meguniot_graph_exact_5min.geojson",
    "recommended_meguniot_graph_cluster_5min.geojson",
    "recommended_meguniot_euclidean_exact_5min.geojson",
    "recommended_meguniot_euclidean_cluster_5min.geojson",
    "shelter_coverages_graph_exact_5min.json",
    "shelter_coverages_graph_cluster_5min.json",
    "shelter_coverages_euclidean_exact_5min.json",
    "shelter_coverages_euclidean_cluster_5min.json",
)


def scenario_key(assumptions: ScenarioAssumptions) -> str:
    use_bits = "".join(
        "1" if t in assumptions.selected_building_use_types else "0" for t in (1, 2, 3, 4, 5)
    )
    return (
        f"p{int(assumptions.post_1992_has_shelter)}"
        f"_f{int(assumptions.over_3_floors_has_shelter)}"
        f"_e{int(assumptions.education_facilities_are_shelters)}"
        f"_u{int(assumptions.public_buildings_are_shelters)}"
        f"_l{int(assumptions.only_place_on_public_land)}"
        f"_w{int(assumptions.weight_by_population)}"
        f"_t{use_bits}"
    )


def _scenario_manifest_entry(assumptions: ScenarioAssumptions) -> dict[str, Any]:
    return {
        "key": scenario_key(assumptions),
        "assumptions": {
            "post1992Sheltered": assumptions.post_1992_has_shelter,
            "over3FloorsSheltered": assumptions.over_3_floors_has_shelter,
            "educationShelters": assumptions.education_facilities_are_shelters,
            "publicShelters": assumptions.public_buildings_are_shelters,
            "onlyPublicLand": assumptions.only_place_on_public_land,
            "weightByPopulation": assumptions.weight_by_population,
            "buildingUseTypes": sorted(int(v) for v in assumptions.selected_building_use_types),
        },
    }


def _run_single_scenario(job: dict[str, Any]) -> str:
    assumptions = ScenarioAssumptions(
        post_1992_has_shelter=bool(job["post_1992_has_shelter"]),
        over_3_floors_has_shelter=bool(job["over_3_floors_has_shelter"]),
        education_facilities_are_shelters=bool(job["education_facilities_are_shelters"]),
        public_buildings_are_shelters=bool(job["public_buildings_are_shelters"]),
        only_place_on_public_land=bool(job["only_place_on_public_land"]),
        weight_by_population=bool(job["weight_by_population"]),
        selected_building_use_types=frozenset(int(v) for v in job["selected_building_use_types"]),
    )
    key = scenario_key(assumptions)
    sources = {CandidateSource(s) for s in job["candidate_sources"]}
    run_pipeline(
        walk_speed_mps=float(job["walk_speed_mps"]),
        force_rebuild_graph=bool(job["force_rebuild_graph"]),
        max_new_shelters=int(job["max_new_shelters"]),
        candidate_sources=sources,
        node_proximity_m=float(job["node_proximity_m"]),
        public_parcels_path=Path(job["public_parcels"]) if job["public_parcels"] else None,
        dem_path=Path(job["dem_path"]) if job["dem_path"] else None,
        emergency_crossing_radius_m=float(job["emergency_crossing_radius_m"]),
        densify_interval_m=float(job["densify_interval_m"]),
        building_access_radius_m=float(job["building_access_radius_m"]),
        cluster_ensemble_runs=int(job["cluster_ensemble_runs"]),
        enable_swap_improvement=bool(job["enable_swap_improvement"]),
        building_weight_field=job["building_weight_field"],
        assumptions=assumptions,
        education_facilities_path=Path(job["education_facilities_path"]),
        public_buildings_path=Path(job["public_buildings_path"]),
        output_subdir=f"scenarios/{key}",
        designated_public_land_path=Path(job["designated_public_land_path"]),
        buildings_population_path=Path(job["buildings_population_path"]),
    )
    return key


def _build_assumption_grid() -> list[ScenarioAssumptions]:
    assumption_combinations = list(itertools.product([False, True], repeat=6))
    building_type_subsets: list[frozenset[int]] = []
    for mask in range(1, 1 << 4):
        selected = frozenset(i + 1 for i in range(4) if mask & (1 << i))
        building_type_subsets.append(selected)
    weighted_subsets = [frozenset({2}), frozenset({3}), frozenset({2, 3})]

    scenarios: list[ScenarioAssumptions] = []
    for post_1992, over_3, education, public, public_land, pop_weight in assumption_combinations:
        scenario_subsets = weighted_subsets if pop_weight else building_type_subsets
        for selected_types in scenario_subsets:
            scenarios.append(
                ScenarioAssumptions(
                    post_1992_has_shelter=post_1992,
                    over_3_floors_has_shelter=over_3,
                    education_facilities_are_shelters=education,
                    public_buildings_are_shelters=public,
                    only_place_on_public_land=public_land,
                    weight_by_population=pop_weight,
                    selected_building_use_types=selected_types,
                )
            )
    return scenarios


def _scenario_output_dir(key: str) -> Path:
    return DATA_DIR / "meguniot_network" / "scenarios" / key


def _scenario_outputs_complete(key: str) -> bool:
    out_dir = _scenario_output_dir(key)
    if not out_dir.exists():
        return False
    return all((out_dir / name).exists() for name in REQUIRED_SCENARIO_OUTPUT_FILES)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run all shelter-assumption backend scenarios.")
    parser.add_argument("--walk-speed-mps", type=float, default=1.3)
    parser.add_argument("--force-rebuild-graph", action="store_true")
    parser.add_argument("--max-new-shelters", type=int, default=200)
    parser.add_argument(
        "--candidate-sources",
        nargs="+",
        default=["buildings", "network_nodes"],
        choices=["buildings", "network_nodes", "public_parcels", "cluster_candidates"],
    )
    parser.add_argument("--node-proximity-m", type=float, default=150.0)
    parser.add_argument("--public-parcels", type=Path, default=None)
    parser.add_argument("--dem-path", type=Path, default=None)
    parser.add_argument("--emergency-crossing-radius-m", type=float, default=22.0)
    parser.add_argument("--densify-interval-m", type=float, default=25.0)
    parser.add_argument("--building-access-radius-m", type=float, default=80.0)
    parser.add_argument("--cluster-ensemble-runs", type=int, default=150)
    parser.add_argument("--enable-swap-improvement", action="store_true")
    parser.add_argument("--building-weight-field", type=str, default=None)
    parser.add_argument("--education-facilities-path", type=Path, default=DATA_DIR / "Education_Facilities.geojson")
    parser.add_argument(
        "--public-buildings-path", type=Path, default=DATA_DIR / "buildings_on_מבני_ציבור.geojson"
    )
    parser.add_argument(
        "--designated-public-land-path", type=Path, default=DATA_DIR / "designated-public-land.geojson"
    )
    parser.add_argument(
        "--buildings-population-path", type=Path, default=DATA_DIR / "updated_all_buildings_data_with_use.geojson"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=max(1, min(6, (os.cpu_count() or 2) - 1)),
        help="Parallel worker processes. Use 1 for sequential execution.",
    )
    parser.add_argument(
        "--skip-existing",
        dest="skip_existing",
        action="store_true",
        default=True,
        help="Fast resume: skip scenarios with complete existing outputs (default).",
    )
    parser.add_argument(
        "--no-skip-existing",
        dest="skip_existing",
        action="store_false",
        help="Recompute all scenarios even when complete outputs already exist.",
    )
    args = parser.parse_args()

    scenario_assumptions = _build_assumption_grid()
    progress = tqdm(
        total=len(scenario_assumptions),
        desc="Running scenarios",
        unit="scenario",
    )
    jobs: list[dict[str, Any]] = []
    skipped = 0
    for idx, assumptions in enumerate(scenario_assumptions):
        key = scenario_key(assumptions)
        if args.skip_existing and _scenario_outputs_complete(key):
            skipped += 1
            continue
        jobs.append(
            {
                "index": idx,
                "key": key,
                "post_1992_has_shelter": assumptions.post_1992_has_shelter,
                "over_3_floors_has_shelter": assumptions.over_3_floors_has_shelter,
                "education_facilities_are_shelters": assumptions.education_facilities_are_shelters,
                "public_buildings_are_shelters": assumptions.public_buildings_are_shelters,
                "only_place_on_public_land": assumptions.only_place_on_public_land,
                "weight_by_population": assumptions.weight_by_population,
                "selected_building_use_types": sorted(int(v) for v in assumptions.selected_building_use_types),
                "walk_speed_mps": args.walk_speed_mps,
                "force_rebuild_graph": False,
                "max_new_shelters": args.max_new_shelters,
                "candidate_sources": list(args.candidate_sources),
                "node_proximity_m": args.node_proximity_m,
                "public_parcels": str(args.public_parcels) if args.public_parcels else None,
                "dem_path": str(args.dem_path) if args.dem_path else None,
                "emergency_crossing_radius_m": args.emergency_crossing_radius_m,
                "densify_interval_m": args.densify_interval_m,
                "building_access_radius_m": args.building_access_radius_m,
                "cluster_ensemble_runs": args.cluster_ensemble_runs,
                "enable_swap_improvement": args.enable_swap_improvement,
                "building_weight_field": args.building_weight_field,
                "education_facilities_path": str(args.education_facilities_path),
                "public_buildings_path": str(args.public_buildings_path),
                "designated_public_land_path": str(args.designated_public_land_path),
                "buildings_population_path": str(args.buildings_population_path),
            }
        )

    if skipped:
        progress.update(skipped)
        progress.set_postfix_str(f"skipped={skipped}")

    if jobs:
        # Warm the graph once to avoid parallel workers rebuilding it.
        jobs[0]["force_rebuild_graph"] = bool(args.force_rebuild_graph)
        first_key = _run_single_scenario(jobs[0])
        progress.set_postfix_str(first_key)
        progress.update(1)

    if len(jobs) > 1:
        remaining_jobs = jobs[1:]
        if args.workers <= 1:
            for job in remaining_jobs:
                key = _run_single_scenario(job)
                progress.set_postfix_str(key)
                progress.update(1)
        else:
            with ProcessPoolExecutor(max_workers=args.workers) as executor:
                futures = [executor.submit(_run_single_scenario, job) for job in remaining_jobs]
                for future in as_completed(futures):
                    key = future.result()
                    progress.set_postfix_str(key)
                    progress.update(1)
    progress.close()

    scenarios = [_scenario_manifest_entry(assumptions) for assumptions in scenario_assumptions]

    manifest = {
        "version": 1,
        "defaultScenarioKey": "p1_f0_e0_u0_l0_w0_t11110",
        "scenarios": scenarios,
    }
    out_path = DATA_DIR / "meguniot_network" / "scenario_manifest.json"
    out_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
