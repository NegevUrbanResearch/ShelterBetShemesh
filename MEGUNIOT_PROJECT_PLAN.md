# Bet Shemesh Meguniot Project Plan

## Objective

Build a Bet Shemesh meguniot placement tool, modeled after `shelter_access`, that proposes up to 300 new meguniot based on walking-distance coverage and clustering of relevant residential buildings.

## Agreed priorities

- Backend first.
- Frontend second, after backend is stable.
- Commit once backend is ready.
- Frontend should support simple exports of recommendations:
  - CSV (including coordinates column).
  - GeoJSON.
- No fancy report system in the initial frontend scope.
- Data schemas may use transliterated Hebrew field names, so scripts should use defensive field-mapping logic (synonyms/fallbacks) instead of assuming English-only keys.
- Use `python` for local commands/scripts (not `python3`).

## 1) Data filtering and normalization

- Inspect and confirm schema in `data/buildings.geojson` for:
  - Construction year.
  - Floors.
  - Apartment count.
  - Residential/single-family indicators (boolean fields).
- Define target building filter:
  - Built before 1992.
  - Not more than 3 floors OR not more than 2 apartments.
  - Residential/single-family subset only.
- Normalize existing protection datasets:
  - `data/Miguniot.geojson`
  - `data/Miklatim.geojson`
- Merge existing protection points into one internal structure with source type labels.

## 2) Walking-distance engine (osmnx)

- Build Bet Shemesh pedestrian graph with `osmnx` (`network_type="walk"`).
- Snap filtered buildings and existing shelter points to nearest network nodes.
- Use walking-time buckets requested by the user:
  - 30 seconds
  - 1 minute
  - 2 minutes
  - 3 minutes
  - 5 minutes
- Convert time buckets to distance cutoffs using configurable walking speed.
- Compute existing coverage using network distances (multi-source Dijkstra).

## 3) Clustering and optimization for up to 300 meguniot

- Focus on uncovered buildings per time bucket.
- Identify dense uncovered areas.
- Score candidate points by marginal uncovered coverage gain (network-based).
- Greedy selection with spacing controls to reduce overlap.
- Stop at 300 points or when additional gain becomes negligible.

## 4) Backend outputs

Produce stable machine-readable outputs for each time bucket:

- Building-level coverage summary (nearest existing shelter distance and covered/not-covered flags).
- Recommended meguniot list (ranked):
  - Coordinates.
  - Coverage contribution (buildings/estimated people).
  - Time-bucket context.
- Summary stats to support frontend counters and filtering.

Suggested output files:

- `data/meguniot_coverage_network.json`
- `data/optimal_meguniot_network_30s.json`
- `data/optimal_meguniot_network_1min.json`
- `data/optimal_meguniot_network_2min.json`
- `data/optimal_meguniot_network_3min.json`
- `data/optimal_meguniot_network_5min.json`

## 5) Backend implementation sequence

1. Schema inspection script for all three GeoJSON inputs.
2. Data filtering + normalization script.
3. OSMnx graph build/snap utilities.
4. Existing coverage computation for all time buckets.
5. Uncovered-density analysis and candidate generation.
6. Greedy optimizer for top 300 recommendations.
7. Output writer + validation checks.

## 6) Frontend notes (for later)

Keep frontend simple and functional:

- Map with layer toggles:
  - Existing meguniot.
  - Existing miklatim.
  - Recommended meguniot.
  - Uncovered/high-need layer.
- Controls:
  - Time bucket selector.
  - Number-of-recommendations slider (0-300).
- Download buttons:
  - CSV export (`id`, `lat`, `lon`, `time_bucket`, coverage metrics).
  - GeoJSON export for recommended locations.

## 7) Git and milestones

- Work in backend-first milestones.
- Create a commit when backend pipeline is functional end-to-end and outputs are stable.
- Continue with frontend only after that commit.

