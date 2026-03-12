# Bet Shemesh Meguniot Access

Bet Shemesh meguniot placement project with:

- A precompute-heavy backend (`scripts/run_meguniot_backend.py`) based on OSMnx walking network distance.
- A lightweight frontend (`meguniot_access/`) for map exploration and recommendation downloads.

## Project structure

- `scripts/run_meguniot_backend.py` - backend pipeline and optimization.
- `data/meguniot_network/` - generated backend outputs consumed by frontend.
- `meguniot_access/` - simple map UI with time bucket and recommendation count controls.
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
- Computes existing network coverage for buckets:
  - `1min`, `2min`, `3min`
- Solves shelter placement as a maximum-coverage problem with lazy-greedy selection.
- Stops recommendations when:
  - full uncovered-building coverage is reached, or
  - shelter budget is reached (optional `--max-new-shelters`; default is no cap).
- Exports JSON, CSV, and GeoJSON outputs under `data/meguniot_network/`.

## Frontend scope

The frontend currently supports:

- Layers:
  - Existing meguniot
  - Existing miklatim
  - Recommended meguniot
  - Selected shelter coverage + covered buildings
- Controls:
  - Time bucket selector (`1m`, `2m`, `3m`)
  - Recommendation count slider (`0..300`)
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
