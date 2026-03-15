# Bet Shemesh Meguniot Access

Bet Shemesh meguniot placement project with:

- A precompute-heavy backend (`scripts/run_meguniot_backend.py`) supporting both graph walking distance and euclidean straight-line distance.
- A lightweight frontend (`meguniot_access/`) for map exploration and recommendation downloads.

## Project structure

- `scripts/run_meguniot_backend.py` - backend pipeline and optimization.
- `data/meguniot_network/` - generated backend outputs consumed by frontend.
- `meguniot_access/` - simple map UI with distance metric + placement controls and recommendation count controls.
- `MEGUNIOT_PROJECT_PLAN.md` - planning doc and status.

## Backend scope

The backend currently:

- Loads `data/buildings.geojson` and filters target buildings:
  - pre-1992
  - (`<=3` floors OR `<=2` apartments)
  - residential/single-family using defensive field mapping
- Loads existing shelter coverage from:
  - `data/Miguniot.geojson`
  - `data/Miklatim.geojson`
- Builds/loads an OSMnx walk graph in EPSG:2039.
- Computes existing coverage for a fixed `5min` bucket.
- Supports two distance metrics:
  - `graph` (walking network with routing and access edges)
  - `euclidean` (straight-line 200m accessibility, no graph routing in coverage scoring)
- Supports two placement types for each metric:
  - `exact`
  - `cluster`
- Supports elevation-aware travel impedance when a DEM is provided (`--dem-path`).
- Supports short direct emergency crossing for near-across-street access
  (`--emergency-crossing-radius-m`, default `22` meters).
- Solves shelter placement as a maximum-coverage problem with lazy-greedy selection.
- Evaluates candidate shelters from configurable sources:
  - building centroids
  - intersection/network nodes near buildings
  - optional public parcel centroids
- Stops recommendations when:
  - full uncovered-building coverage is reached, or
  - shelter budget is reached (optional `--max-new-shelters`; default is no cap).
- Precomputes per-shelter building coverage sets for each time bucket, which the frontend
  uses to highlight covered buildings directly on the map.
- Exports JSON, CSV, and GeoJSON outputs under `data/meguniot_network/`.

## Frontend scope

The frontend currently supports:

- Layers:
  - Existing meguniot
  - Existing miklatim
  - Recommended meguniot
  - Buildings covered by selected shelter
- Controls:
  - Distance metric selector (`graph`, `euclidean`)
  - Placement selector (`exact`, `cluster`)
  - Recommendation count slider
- Downloads:
  - CSV (`lat`, `lon`, combined `coordinates`, coverage metrics)
  - GeoJSON `FeatureCollection`

## Setup

Use `python` (not `python3`).

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Regenerate backend outputs

```bash
python scripts/run_meguniot_backend.py --force-rebuild-graph
```

Optional example with DEM + public parcels:

```bash
python scripts/run_meguniot_backend.py \
  --dem-path data/dem.tif \
  --candidate-sources buildings network_nodes public_parcels \
  --public-parcels data/public_parcels.geojson
```

Optional stricter crossing behavior (reduce direct crossing radius):

```bash
python scripts/run_meguniot_backend.py \
  --force-rebuild-graph \
  --emergency-crossing-radius-m 12
```

Outputs are written to `data/meguniot_network/`.

## Run frontend

Run commands inside `meguniot_access/`:

```bash
npm run dev
```

or

```bash
npm start
```

Then open the URL printed in terminal.

## Notes

- Keep backend and frontend logic separated.
- Do not commit unrelated directories.
- `shelter_access/` remains intentionally excluded from this project milestone.
