#!/usr/bin/env python
"""Generate all Step-0 assumption scenarios for the frontend."""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

from tqdm import tqdm

from meguniot_backend_v3 import (
    CandidateSource,
    DATA_DIR,
    ScenarioAssumptions,
    run_pipeline,
)


def scenario_key(assumptions: ScenarioAssumptions) -> str:
    return (
        f"p{int(assumptions.post_1992_has_shelter)}"
        f"_f{int(assumptions.over_3_floors_has_shelter)}"
        f"_e{int(assumptions.education_facilities_are_shelters)}"
        f"_u{int(assumptions.public_buildings_are_shelters)}"
    )


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
    args = parser.parse_args()

    sources = {CandidateSource(s) for s in args.candidate_sources}
    scenarios = []
    assumption_combinations = list(itertools.product([False, True], repeat=4))
    progress = tqdm(
        assumption_combinations,
        desc="Running scenarios",
        total=len(assumption_combinations),
        unit="scenario",
    )
    for post_1992, over_3, education, public in progress:
        assumptions = ScenarioAssumptions(
            post_1992_has_shelter=post_1992,
            over_3_floors_has_shelter=over_3,
            education_facilities_are_shelters=education,
            public_buildings_are_shelters=public,
        )
        key = scenario_key(assumptions)
        progress.set_postfix_str(key)
        run_pipeline(
            walk_speed_mps=args.walk_speed_mps,
            force_rebuild_graph=args.force_rebuild_graph and not scenarios,
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
            output_subdir=f"scenarios/{key}",
        )
        scenarios.append(
            {
                "key": key,
                "assumptions": {
                    "post1992Sheltered": assumptions.post_1992_has_shelter,
                    "over3FloorsSheltered": assumptions.over_3_floors_has_shelter,
                    "educationShelters": assumptions.education_facilities_are_shelters,
                    "publicShelters": assumptions.public_buildings_are_shelters,
                },
            }
        )

    manifest = {
        "version": 1,
        "defaultScenarioKey": "p1_f0_e0_u0",
        "scenarios": scenarios,
    }
    out_path = DATA_DIR / "meguniot_network" / "scenario_manifest.json"
    out_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
