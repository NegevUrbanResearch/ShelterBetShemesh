const BUCKET_OPTIONS = [
  { label: "30s", key: "30s", seconds: 30 },
  { label: "1m", key: "1min", seconds: 60 },
  { label: "2m", key: "2min", seconds: 120 },
  { label: "3m", key: "3min", seconds: 180 },
  { label: "5m", key: "5min", seconds: 300 },
];

const DATA_BASE = "../data";
const NETWORK_BASE = `${DATA_BASE}/meguniot_network`;

proj4.defs(
  "EPSG:2039",
  "+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +units=m +no_defs",
);

const bucketSelect = document.getElementById("bucketSelect");
const countRange = document.getElementById("countRange");
const countValue = document.getElementById("countValue");
const toggleMeguniot = document.getElementById("toggleMeguniot");
const toggleMiklatim = document.getElementById("toggleMiklatim");
const toggleRecommended = document.getElementById("toggleRecommended");
const toggleUncovered = document.getElementById("toggleUncovered");
const statsEl = document.getElementById("stats");
const downloadCsvBtn = document.getElementById("downloadCsv");
const downloadGeojsonBtn = document.getElementById("downloadGeojson");

for (const bucket of BUCKET_OPTIONS) {
  const opt = document.createElement("option");
  opt.value = bucket.key;
  opt.textContent = bucket.label;
  bucketSelect.appendChild(opt);
}

bucketSelect.value = "1min";

const map = L.map("map", { preferCanvas: true }).setView([31.745, 34.99], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19,
}).addTo(map);

const existingMeguniotLayer = L.layerGroup().addTo(map);
const existingMiklatimLayer = L.layerGroup().addTo(map);
const recommendedLayer = L.layerGroup().addTo(map);
const uncoveredLayer = L.layerGroup();

let miguniotData = null;
let miklatimData = null;
let coverageData = null;
const optimalByBucket = {};

function epsg2039ToLatLng(coord) {
  const [lon, lat] = proj4("EPSG:2039", "EPSG:4326", coord);
  return [lat, lon];
}

function geometryToLatLng(feature) {
  const coords = feature?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  return epsg2039ToLatLng(coords);
}

function addPointLayerFromGeojson(data, layer, color, popupLabel) {
  layer.clearLayers();
  const features = Array.isArray(data?.features) ? data.features : [];
  for (const feature of features) {
    const latLng = geometryToLatLng(feature);
    if (!latLng) continue;
    const marker = L.circleMarker(latLng, {
      radius: 4,
      color,
      weight: 1,
      fillOpacity: 0.9,
    });
    const title = feature?.properties?.ctovet || feature?.properties?.OBJECTID || "";
    marker.bindPopup(`<strong>${popupLabel}</strong><br>${title}`);
    marker.addTo(layer);
  }
}

function renderRecommended(bucketKey, limit) {
  recommendedLayer.clearLayers();
  const bucketData = optimalByBucket[bucketKey];
  if (!bucketData) return [];

  const recommendations = bucketData.proposed_meguniot.slice(0, limit);
  for (const rec of recommendations) {
    const marker = L.circleMarker([rec.lat, rec.lon], {
      radius: 5,
      color: "#ce2c2c",
      fillColor: "#ff4f4f",
      fillOpacity: 0.9,
      weight: 1,
    });
    marker.bindPopup(
      `<strong>Recommended #${rec.rank}</strong><br>` +
        `Newly covered buildings: ${rec.newly_covered_buildings}<br>` +
        `Est. people: ${rec.newly_covered_people_est}`,
    );
    marker.addTo(recommendedLayer);
  }
  return recommendations;
}

function renderUncovered(bucketKey) {
  uncoveredLayer.clearLayers();
  const coveredKey = `covered_${bucketKey}`;
  const buildings = Array.isArray(coverageData?.buildings) ? coverageData.buildings : [];
  for (const building of buildings) {
    if (building[coveredKey]) continue;
    const marker = L.circleMarker([building.lat, building.lon], {
      radius: 2,
      color: "#5649c8",
      fillColor: "#5649c8",
      fillOpacity: 0.4,
      weight: 1,
    });
    marker.addTo(uncoveredLayer);
  }
}

function updateLayerVisibility() {
  if (toggleMeguniot.checked) {
    map.addLayer(existingMeguniotLayer);
  } else {
    map.removeLayer(existingMeguniotLayer);
  }
  if (toggleMiklatim.checked) {
    map.addLayer(existingMiklatimLayer);
  } else {
    map.removeLayer(existingMiklatimLayer);
  }
  if (toggleRecommended.checked) {
    map.addLayer(recommendedLayer);
  } else {
    map.removeLayer(recommendedLayer);
  }
  if (toggleUncovered.checked) {
    map.addLayer(uncoveredLayer);
  } else {
    map.removeLayer(uncoveredLayer);
  }
}

function renderStats(bucketKey, shownRecommendations) {
  const bucketData = optimalByBucket[bucketKey];
  if (!bucketData) {
    statsEl.textContent = "No data loaded.";
    return;
  }
  const stats = bucketData.statistics;
  const coveredByShown = shownRecommendations.reduce(
    (sum, rec) => sum + rec.newly_covered_buildings,
    0,
  );
  statsEl.innerHTML =
    `Target buildings: <strong>${stats.total_target_buildings}</strong><br>` +
    `Covered by existing: <strong>${stats.covered_by_existing}</strong><br>` +
    `Currently uncovered: <strong>${stats.currently_uncovered}</strong><br>` +
    `Recommended available: <strong>${stats.num_proposed_meguniot}</strong><br>` +
    `Shown on map: <strong>${shownRecommendations.length}</strong><br>` +
    `Approx buildings covered by shown: <strong>${coveredByShown}</strong>`;
}

function recommendationsForCurrentView() {
  const bucketKey = bucketSelect.value;
  const limit = Number(countRange.value);
  const bucketData = optimalByBucket[bucketKey];
  if (!bucketData) return [];
  return bucketData.proposed_meguniot.slice(0, limit).map((row) => ({
    ...row,
    time_bucket: bucketData.time_bucket,
    time_seconds: bucketData.time_seconds,
  }));
}

function csvCell(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function toCsv(rows) {
  const headers = [
    "rank",
    "time_bucket",
    "time_seconds",
    "lat",
    "lon",
    "coordinates",
    "newly_covered_buildings",
    "newly_covered_people_est",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.rank,
        row.time_bucket,
        row.time_seconds,
        row.lat,
        row.lon,
        row.coordinates,
        row.newly_covered_buildings,
        row.newly_covered_people_est,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function refreshView() {
  countValue.textContent = countRange.value;
  const bucketKey = bucketSelect.value;
  const shown = renderRecommended(bucketKey, Number(countRange.value));
  renderUncovered(bucketKey);
  renderStats(bucketKey, shown);
  updateLayerVisibility();
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json();
}

async function loadAllData() {
  miguniotData = await fetchJson(`${DATA_BASE}/Miguniot.geojson`);
  miklatimData = await fetchJson(`${DATA_BASE}/Miklatim.geojson`);
  coverageData = await fetchJson(`${NETWORK_BASE}/building_coverage_network.json`);

  for (const bucket of BUCKET_OPTIONS) {
    const jsonPath = `${NETWORK_BASE}/optimal_meguniot_${bucket.key}.json`;
    optimalByBucket[bucket.key] = await fetchJson(jsonPath);
  }

  addPointLayerFromGeojson(miguniotData, existingMeguniotLayer, "#2b73d3", "Existing megunit");
  addPointLayerFromGeojson(miklatimData, existingMiklatimLayer, "#2a9d4b", "Existing miklat");
}

bucketSelect.addEventListener("change", refreshView);
countRange.addEventListener("input", refreshView);
toggleMeguniot.addEventListener("change", updateLayerVisibility);
toggleMiklatim.addEventListener("change", updateLayerVisibility);
toggleRecommended.addEventListener("change", updateLayerVisibility);
toggleUncovered.addEventListener("change", updateLayerVisibility);

downloadCsvBtn.addEventListener("click", () => {
  const rows = recommendationsForCurrentView();
  const bucketLabel = BUCKET_OPTIONS.find((b) => b.key === bucketSelect.value)?.label || "bucket";
  const csv = toCsv(rows);
  downloadBlob(csv, `recommended_meguniot_${bucketLabel}.csv`, "text/csv;charset=utf-8");
});

downloadGeojsonBtn.addEventListener("click", () => {
  const rows = recommendationsForCurrentView();
  const features = rows.map((row) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [row.lon, row.lat],
    },
    properties: {
      rank: row.rank,
      time_bucket: row.time_bucket,
      time_seconds: row.time_seconds,
      coordinates: row.coordinates,
      newly_covered_buildings: row.newly_covered_buildings,
      newly_covered_people_est: row.newly_covered_people_est,
    },
  }));
  const bucketLabel = BUCKET_OPTIONS.find((b) => b.key === bucketSelect.value)?.label || "bucket";
  downloadBlob(
    JSON.stringify({ type: "FeatureCollection", features }, null, 2),
    `recommended_meguniot_${bucketLabel}.geojson`,
    "application/geo+json;charset=utf-8",
  );
});

loadAllData()
  .then(() => refreshView())
  .catch((err) => {
    console.error(err);
    statsEl.textContent = `Error loading data: ${err.message}`;
  });
