const BUCKET_OPTIONS = [
  { label: "5-minute", key: "5min", seconds: 300 },
];
const DISTANCE_METRIC_OPTIONS = [
  { key: "graph", label: "Graph distance" },
  { key: "euclidean", label: "Euclidean (200m)" },
];
const PLACEMENT_OPTIONS = [
  { key: "exact", label: "Exact placement" },
  { key: "cluster", label: "Cluster placement" },
];
const BASE_MAP_OPTIONS = [
  {
    key: "streets",
    label: "Streets (OpenStreetMap)",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    },
  },
  {
    key: "satellite",
    label: "Satellite (Esri World Imagery)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: {
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      maxZoom: 19,
    },
  },
  {
    key: "light",
    label: "Light (Carto Positron)",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    options: {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    },
  },
];
const FIXED_BUCKET_KEY = "5min";

const DATA_BASE = "../data";
const NETWORK_BASE = `${DATA_BASE}/meguniot_network`;
const LAYER_DEFAULTS = {
  meguniot: true,
  miklatim: true,
  recommended: true,
  post1992Buildings: true,
  uncoveredBuildings: true,
  coveredBuildingsBase: true,
  covered: true,
};

proj4.defs(
  "EPSG:2039",
  "+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +units=m +no_defs",
);

const bucketSelect = document.getElementById("bucketSelect");
const bucketControls = document.getElementById("bucketControls");
const coverageDisplayControls = document.getElementById("coverageDisplayControls");
const countRange = document.getElementById("countRange");
const countValue = document.getElementById("countValue");
const countLabel = document.querySelector('label[for="countRange"]');
const statsEl = document.getElementById("stats");
const downloadCsvBtn = document.getElementById("downloadCsv");
const downloadGeojsonBtn = document.getElementById("downloadGeojson");
const metricGraphBtn = document.getElementById("metricGraphBtn");
const metricEuclideanBtn = document.getElementById("metricEuclideanBtn");
const modeExactBtn = document.getElementById("modeExactBtn");
const modeClusterBtn = document.getElementById("modeClusterBtn");
const baseMapSelect = document.getElementById("baseMapSelect");

const layerMeguniot = document.getElementById("layerMeguniot");
const layerMiklatim = document.getElementById("layerMiklatim");
const layerRecommended = document.getElementById("layerRecommended");
const layerPost1992Buildings = document.getElementById("layerPost1992Buildings");
const layerUncoveredBuildings = document.getElementById("layerUncoveredBuildings");
const layerCoveredBuildingsBase = document.getElementById("layerCoveredBuildingsBase");
const layerCovered = document.getElementById("layerCovered");

const coverageModeFull = document.getElementById("coverageModeFull");
const coverageModeMarginal = document.getElementById("coverageModeMarginal");

const openGuideBtn = document.getElementById("openGuideBtn");
const closeGuideBtn = document.getElementById("closeGuideBtn");
const guideModal = document.getElementById("guideModal");
const guideCard = document.querySelector(".guide-card");
const guideTitle = document.getElementById("guideTitle");
const guideContent = document.getElementById("guideContent");
const languageToggle = document.getElementById("languageToggle");
const langLabelEn = document.getElementById("langLabelEn");
const langLabelHe = document.getElementById("langLabelHe");
const guideTabUsage = document.getElementById("guideTabUsage");
const guideTabMethods = document.getElementById("guideTabMethods");

let currentLanguage = "en";
let currentGuideTab = "usage";
let coverageDisplayMode = "full";
let currentDistanceMetric = "euclidean";
let currentPlacementMode = "exact";

for (const bucket of BUCKET_OPTIONS) {
  const opt = document.createElement("option");
  opt.value = bucket.key;
  opt.textContent = bucket.label;
  bucketSelect.appendChild(opt);
}
bucketSelect.value = FIXED_BUCKET_KEY;

for (const basemap of BASE_MAP_OPTIONS) {
  const opt = document.createElement("option");
  opt.value = basemap.key;
  opt.textContent = basemap.label;
  baseMapSelect.appendChild(opt);
}
baseMapSelect.value = "streets";

const map = L.map("map", { preferCanvas: true, zoomControl: false }).setView([31.745, 34.99], 13);
L.control.zoom({ position: "bottomright" }).addTo(map);
const baseMapLayers = new Map();
let currentBaseMapLayer = null;

const layers = {
  existingMeguniot: L.layerGroup().addTo(map),
  existingMiklatim: L.layerGroup().addTo(map),
  recommended: L.layerGroup().addTo(map),
  post1992Buildings: L.layerGroup().addTo(map),
  uncoveredBuildings: L.layerGroup().addTo(map),
  coveredBuildingsBase: L.layerGroup().addTo(map),
  coveredBuildings: L.layerGroup().addTo(map),
};

const layerVisibility = { ...LAYER_DEFAULTS };

const dataStore = {
  miguniot: null,
  miguniotSourceCrs: "EPSG:2039",
  miklatim: null,
  miklatimSourceCrs: "EPSG:2039",
  buildings: null,
  buildingsSourceCrs: "EPSG:2039",
  coverage: null,
  coverageByMetric: {},
  optimalByMetricModeBucket: {},
  shelterCoveragesByMetricModeBucket: {},
};

let selectedShelters = [];
const coverageByIndex = new Map();
const coverageById = new Map();
const buildingFeatureByIndex = new Map();

const existingIcon = L.icon({
  iconUrl: "assets/existing.svg",
  iconSize: [20, 24],
  iconAnchor: [10, 24],
  popupAnchor: [0, -22],
  className: "custom-icon",
});

const recommendedIcon = L.icon({
  iconUrl: "assets/proposed.svg",
  iconSize: [16, 20],
  iconAnchor: [8, 20],
  popupAnchor: [0, -18],
  className: "recommended-icon",
});

function geometryToLatLng(feature, sourceCrs = "EPSG:2039") {
  const coords = feature?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lon, lat] = proj4(sourceCrs, "EPSG:4326", coords);
  return [lat, lon];
}

function convertCoordinateToWgs(coord, sourceCrs = "EPSG:2039") {
  const [lon, lat] = proj4(sourceCrs, "EPSG:4326", coord);
  return [lon, lat];
}

function convertCoordinatesToWgs(coords, sourceCrs = "EPSG:2039") {
  if (!Array.isArray(coords)) return coords;
  if (typeof coords[0] === "number") {
    return convertCoordinateToWgs(coords, sourceCrs);
  }
  return coords.map((nested) => convertCoordinatesToWgs(nested, sourceCrs));
}

function geometryToWgs(geometry, sourceCrs = "EPSG:2039") {
  if (!geometry?.type || !geometry?.coordinates) return null;
  return {
    type: geometry.type,
    coordinates: convertCoordinatesToWgs(geometry.coordinates, sourceCrs),
  };
}

function getFirstNumericProperty(properties, keys) {
  if (!properties) return null;
  for (const key of keys) {
    const value = properties[key];
    if (value === null || value === undefined || value === "") continue;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function getFeatureNumericId(feature, keys) {
  const directId = Number(feature?.id);
  if (Number.isFinite(directId)) return directId;
  return getFirstNumericProperty(feature?.properties, keys);
}

function toBoolish(value) {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value >= 1;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "t", "yes", "y", "ken", "כן"].includes(normalized);
}

function isBuiltAfter1992(feature) {
  const props = feature?.properties || {};
  const before1992Raw =
    props.Before_1992 ?? props.before_1992 ?? props.before1992 ?? props.lifney_1992;
  if (before1992Raw !== null && before1992Raw !== undefined && before1992Raw !== "") {
    return !toBoolish(before1992Raw);
  }
  const year = getFirstNumericProperty(props, [
    "BuildYear",
    "build_year",
    "year_built",
    "year",
    "shnat_bnia",
    "shnat_bnaya",
  ]);
  return Number.isFinite(year) ? year >= 1992 : false;
}

function createBuildingLayer(feature, style, radius = 3) {
  return L.geoJSON(feature, {
    style: () => style,
    pointToLayer: (_feature, latlng) =>
      L.circleMarker(latlng, {
        radius,
        color: style.color,
        weight: style.weight,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
        opacity: style.opacity ?? 1,
      }),
  });
}

function csvCell(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
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

function isClusterMode() {
  return currentPlacementMode === "cluster";
}

function getActiveBucketKey() {
  return FIXED_BUCKET_KEY;
}

function getCurrentBucketData() {
  const bucketKey = getActiveBucketKey();
  return dataStore.optimalByMetricModeBucket?.[currentDistanceMetric]?.[currentPlacementMode]?.[bucketKey];
}

async function ensureBucketAuxData(bucketKey = getActiveBucketKey()) {
  if (!dataStore.shelterCoveragesByMetricModeBucket[currentDistanceMetric]?.[currentPlacementMode]?.[bucketKey]) {
    const payload = await fetchJson(
      `${NETWORK_BASE}/shelter_coverages_${currentDistanceMetric}_${currentPlacementMode}_${bucketKey}.json`,
    );
    if (!dataStore.shelterCoveragesByMetricModeBucket[currentDistanceMetric]) {
      dataStore.shelterCoveragesByMetricModeBucket[currentDistanceMetric] = {};
    }
    if (!dataStore.shelterCoveragesByMetricModeBucket[currentDistanceMetric][currentPlacementMode]) {
      dataStore.shelterCoveragesByMetricModeBucket[currentDistanceMetric][currentPlacementMode] = {};
    }
    dataStore.shelterCoveragesByMetricModeBucket[currentDistanceMetric][currentPlacementMode][bucketKey] = payload;
  }
}

function recommendationsForCurrentView() {
  const bucketData = getCurrentBucketData();
  if (!bucketData) return [];
  const limit = Math.min(Number(countRange.value), bucketData.proposed_meguniot.length);
  return bucketData.proposed_meguniot.slice(0, limit).map((p) => ({
    ...p,
    time_bucket: bucketData.time_bucket,
    time_seconds: bucketData.time_seconds,
  }));
}

function updateSliderBounds() {
  const bucketData = getCurrentBucketData();
  if (!bucketData) return;
  const maxRecommendations = bucketData.proposed_meguniot.length;
  countRange.max = String(maxRecommendations);
  if (!countRange.dataset.initialized) {
    countRange.value = String(maxRecommendations);
    countRange.dataset.initialized = "true";
  }
  if (Number(countRange.value) > maxRecommendations) {
    countRange.value = String(maxRecommendations);
  }
  if (countLabel) {
    const modeLabel = currentPlacementMode === "cluster" ? "cluster areas" : "shelters";
    countLabel.textContent = `Recommended ${modeLabel} (max ${maxRecommendations})`;
  }
}

function buildBuildingFeatureIndex() {
  buildingFeatureByIndex.clear();
  const features = Array.isArray(dataStore.buildings?.features) ? dataStore.buildings.features : [];
  const idKeys = ["building_idx", "OBJECTID", "objectid", "id", "ID"];
  for (const feature of features) {
    const geometry = geometryToWgs(feature?.geometry, dataStore.buildingsSourceCrs);
    if (!geometry) continue;
    const featureId = getFeatureNumericId(feature, idKeys);
    if (featureId === null) continue;
    const matchedCoverage = coverageById.get(Number(featureId));
    if (!matchedCoverage) continue;
    const idx = Number(matchedCoverage.building_idx);
    buildingFeatureByIndex.set(idx, {
      type: "Feature",
      geometry,
      properties: { ...(feature.properties || {}), building_idx: idx },
    });
  }
}

function renderExistingCoverageBuildings() {
  layers.post1992Buildings.clearLayers();
  layers.uncoveredBuildings.clearLayers();
  layers.coveredBuildingsBase.clearLayers();
  const bucket = getActiveBucketKey();
  const post1992Style = {
    color: "#2ecc71",
    weight: 1.2,
    fillColor: "#35d27f",
    fillOpacity: 0.24,
    opacity: 0.94,
  };
  const uncoveredStyle = {
    color: "#ff4d4f",
    weight: 1.4,
    fillColor: "#ff6b6d",
    fillOpacity: 0.38,
    opacity: 0.95,
  };
  const coveredStyle = {
    color: "#f2c94c",
    weight: 1.2,
    fillColor: "#f5d96b",
    fillOpacity: 0.3,
    opacity: 0.92,
  };

  for (const [idx, coverage] of coverageByIndex.entries()) {
    const feature = buildingFeatureByIndex.get(Number(idx));
    if (!feature) continue;
    const covered = Boolean(coverage?.[`covered_${bucket}`]);
    const layer = createBuildingLayer(feature, covered ? coveredStyle : uncoveredStyle, 2.5);
    layer.bindPopup(
      `<strong>Building #${idx}</strong><br>` +
        `${covered ? "Covered by existing shelters" : "Uncovered by existing shelters"}`,
    );
    layer.addTo(covered ? layers.coveredBuildingsBase : layers.uncoveredBuildings);
  }

  const sourceFeatures = Array.isArray(dataStore.buildings?.features) ? dataStore.buildings.features : [];
  const idKeys = ["building_idx", "OBJECTID", "objectid", "id", "ID"];
  for (const feature of sourceFeatures) {
    const featureId = getFeatureNumericId(feature, idKeys);
    if (featureId !== null && coverageById.has(Number(featureId))) continue;
    if (!isBuiltAfter1992(feature)) continue;
    const geometry = geometryToWgs(feature?.geometry, dataStore.buildingsSourceCrs);
    if (!geometry) continue;
    const featureForRender = { type: "Feature", geometry, properties: feature?.properties || {} };
    const layer = createBuildingLayer(featureForRender, post1992Style, 2.3);
    layer.bindPopup("<strong>Building built in/after 1992</strong><br>Shown as not requiring new shelter coverage in this analysis");
    layer.addTo(layers.post1992Buildings);
  }
}

function normalizeCrsName(rawName) {
  if (!rawName) return "EPSG:2039";
  const normalized = String(rawName).toUpperCase();
  if (normalized.includes("EPSG::3857")) return "EPSG:3857";
  if (normalized.includes("EPSG::2039")) return "EPSG:2039";
  if (normalized.includes("EPSG::4326")) return "EPSG:4326";
  if (normalized.includes("900913")) return "EPSG:3857";
  if (normalized.includes("EPSG:3857")) return "EPSG:3857";
  if (normalized.includes("EPSG:2039")) return "EPSG:2039";
  if (normalized.includes("EPSG:4326")) return "EPSG:4326";
  return "EPSG:2039";
}

function ensureBaseMapLayer(mapKey) {
  if (baseMapLayers.has(mapKey)) return baseMapLayers.get(mapKey);
  const spec = BASE_MAP_OPTIONS.find((option) => option.key === mapKey) || BASE_MAP_OPTIONS[0];
  const layer = L.tileLayer(spec.url, spec.options);
  baseMapLayers.set(spec.key, layer);
  return layer;
}

function setBaseMap(mapKey) {
  const spec = BASE_MAP_OPTIONS.find((option) => option.key === mapKey) || BASE_MAP_OPTIONS[0];
  const nextLayer = ensureBaseMapLayer(spec.key);
  if (currentBaseMapLayer && map.hasLayer(currentBaseMapLayer)) {
    map.removeLayer(currentBaseMapLayer);
  }
  nextLayer.addTo(map);
  currentBaseMapLayer = nextLayer;
  if (baseMapSelect.value !== spec.key) baseMapSelect.value = spec.key;
}

function reportProjectionStatus() {
  const baseProjection = "EPSG:3857";
  const layersToAudit = [
    ["buildings", dataStore.buildingsSourceCrs],
    ["miguniot", dataStore.miguniotSourceCrs],
    ["miklatim", dataStore.miklatimSourceCrs],
  ];
  for (const [label, sourceCrs] of layersToAudit) {
    const status =
      sourceCrs === baseProjection || sourceCrs === "EPSG:4326"
        ? "aligned (converted safely to WGS84 for Leaflet)"
        : "reprojected from local CRS; small datum-related offsets are possible";
    console.info(`[CRS check] ${label}: source=${sourceCrs}, base=${baseProjection} -> ${status}`);
  }
}

function toCsv(rows) {
  const headers = isClusterMode()
    ? ["rank", "lat", "lon", "coordinates", "candidate_source", "placement_mode"]
    : [
        "rank",
        "time_bucket",
        "time_seconds",
        "lat",
        "lon",
        "coordinates",
        "newly_covered_buildings",
        "newly_covered_people_est",
      ];
  const body = rows.map((row) =>
    (isClusterMode()
      ? [
          row.rank,
          row.lat,
          row.lon,
          row.coordinates,
          row.candidate_source,
          row.placement_mode || "cluster",
        ]
      : [
          row.rank,
          row.time_bucket,
          row.time_seconds,
          row.lat,
          row.lon,
          row.coordinates,
          row.newly_covered_buildings,
          row.newly_covered_people_est,
        ])
      .map(csvCell)
      .join(","),
  );
  return [headers.join(","), ...body].join("\n");
}

function clearSelection() {
  selectedShelters = [];
  layers.coveredBuildings.clearLayers();
}

function getSelectedCoverageMatches() {
  if (!selectedShelters.length) return [];
  const bucket = getActiveBucketKey();
  const payload =
    dataStore.shelterCoveragesByMetricModeBucket?.[currentDistanceMetric]?.[currentPlacementMode]?.[bucket];
  const allCoverages = Array.isArray(payload?.coverages) ? payload.coverages : [];
  const matches = [];
  for (const sel of selectedShelters) {
    const match = allCoverages.find(
      (c) => c?.shelter_kind === sel.kind && Number(c?.shelter_id) === Number(sel.id),
    );
    if (match) matches.push({ shelter: sel, coverage: match });
  }
  return matches;
}

function getMarginalIndicesForRecommended(shelterId) {
  const bucketData = getCurrentBucketData();
  if (!bucketData) return null;
  const rec = bucketData.proposed_meguniot.find(
    (p) => Number(p.shelter_id ?? p.candidate_id ?? p.building_idx) === Number(shelterId),
  );
  return rec?.marginal_covered_building_indices ?? null;
}

function renderExistingShelters() {
  layers.existingMeguniot.clearLayers();
  layers.existingMiklatim.clearLayers();

  const migFeatures = Array.isArray(dataStore.miguniot?.features) ? dataStore.miguniot.features : [];
  const mikFeatures = Array.isArray(dataStore.miklatim?.features) ? dataStore.miklatim.features : [];

  let shelterIdCounter = 0;
  for (const feature of migFeatures) {
    const latLng = geometryToLatLng(feature, dataStore.miguniotSourceCrs);
    if (!latLng) continue;
    const shelterId = shelterIdCounter++;
    const marker = L.marker(latLng, { icon: existingIcon });
    marker.bindPopup("<strong>Existing megunit</strong>");
    marker.on("click", (e) =>
      selectShelter(
        {
          kind: "existing",
          id: shelterId,
          lat: latLng[0],
          lon: latLng[1],
          label: "Existing megunit",
        },
        e.originalEvent?.shiftKey,
      ),
    );
    marker.addTo(layers.existingMeguniot);
  }

  for (const feature of mikFeatures) {
    const latLng = geometryToLatLng(feature, dataStore.miklatimSourceCrs);
    if (!latLng) continue;
    const shelterId = shelterIdCounter++;
    const marker = L.marker(latLng, { icon: existingIcon });
    marker.bindPopup("<strong>Existing miklat</strong>");
    marker.on("click", (e) =>
      selectShelter(
        {
          kind: "existing",
          id: shelterId,
          lat: latLng[0],
          lon: latLng[1],
          label: "Existing miklat",
        },
        e.originalEvent?.shiftKey,
      ),
    );
    marker.addTo(layers.existingMiklatim);
  }
}

function renderRecommended() {
  layers.recommended.clearLayers();
  const rows = recommendationsForCurrentView();
  const modeLabel = currentPlacementMode === "cluster" ? "Cluster area" : "Exact point";
  for (const rec of rows) {
    const shelterId = rec.shelter_id ?? rec.candidate_id ?? rec.building_idx;
    const fullCount = (rec.covered_building_indices || []).length;
    const marginalCount = rec.newly_covered_buildings ?? fullCount;
    const marker = L.marker([rec.lat, rec.lon], { icon: recommendedIcon });
    if (isClusterMode()) {
      marker.bindPopup(
        `<strong>Cluster #${rec.rank}</strong><br>` +
          `Mode: ${modeLabel}<br>` +
          `Source: ${rec.candidate_source || "cluster_ensemble_kmeans"}<br>` +
          `General recommended area`,
      );
    } else {
      marker.bindPopup(
        `<strong>Recommended #${rec.rank}</strong><br>` +
          `Mode: ${modeLabel}<br>` +
          `Source: ${rec.candidate_source || "building"}<br>` +
          `Total reachable: ${fullCount} buildings<br>` +
          `Newly covered: ${marginalCount} buildings`,
      );
    }
    marker.on("click", (e) =>
      selectShelter(
        {
          kind: "recommended",
          id: shelterId,
          lat: rec.lat,
          lon: rec.lon,
          label: `Recommended #${rec.rank}`,
        },
        e.originalEvent?.shiftKey,
      ),
    );
    marker.addTo(layers.recommended);
  }
  return rows;
}

function renderSelectedShelterCoverage() {
  layers.coveredBuildings.clearLayers();
  if (!selectedShelters.length) return;

  const matches = getSelectedCoverageMatches();
  if (!matches.length) return;

  const colors = ["#2f80ff", "#ff6b2f", "#2fcc71", "#c02fff", "#ffcc2f"];
  const useMarginal = coverageDisplayMode === "marginal";

  for (let mi = 0; mi < matches.length; mi++) {
    const { shelter, coverage: match } = matches[mi];
    const color = colors[mi % colors.length];
    const style = { color, weight: 2, fillColor: color, fillOpacity: 0.7, opacity: 1 };

    let indices;
    if (useMarginal && shelter.kind === "recommended") {
      const marginal = getMarginalIndicesForRecommended(shelter.id);
      indices = marginal ?? match.covered_building_indices ?? [];
    } else {
      indices = Array.isArray(match.covered_building_indices) ? match.covered_building_indices : [];
    }

    for (const idx of indices) {
      const buildingFeature = buildingFeatureByIndex.get(Number(idx));
      if (buildingFeature) {
        createBuildingLayer(buildingFeature, style, 4).addTo(layers.coveredBuildings);
        continue;
      }
      const b = coverageByIndex.get(Number(idx));
      if (!b) continue;
      L.circleMarker([b.lat, b.lon], {
        radius: 4,
        color: style.color,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
        weight: style.weight,
      }).addTo(layers.coveredBuildings);
    }
  }
}

function flyToSelectedShelterView() {
  if (!selectedShelters.length) return;
  const last = selectedShelters[selectedShelters.length - 1];
  const matches = getSelectedCoverageMatches();
  if (!matches.length) {
    map.flyTo([last.lat, last.lon], Math.max(map.getZoom(), 16), { duration: 0.9 });
    return;
  }

  const bounds = L.latLngBounds([]);
  for (const sel of selectedShelters) {
    bounds.extend([sel.lat, sel.lon]);
  }
  for (const { coverage: match } of matches) {
    const coveredIndices = Array.isArray(match.covered_building_indices)
      ? match.covered_building_indices
      : [];
    for (const idx of coveredIndices) {
      const buildingFeature = buildingFeatureByIndex.get(Number(idx));
      if (buildingFeature) {
        const featureBounds = L.geoJSON(buildingFeature).getBounds();
        if (featureBounds.isValid()) bounds.extend(featureBounds);
        continue;
      }
      const b = coverageByIndex.get(Number(idx));
      if (b) bounds.extend([b.lat, b.lon]);
    }
  }

  if (bounds.isValid()) {
    map.flyToBounds(bounds.pad(0.24), { duration: 1.0, maxZoom: 17 });
    return;
  }
  map.flyTo([last.lat, last.lon], Math.max(map.getZoom(), 16), { duration: 0.9 });
}

function selectShelter(shelter, addToSelection = false) {
  if (addToSelection) {
    const exists = selectedShelters.findIndex(
      (s) => s.kind === shelter.kind && s.id === shelter.id,
    );
    if (exists >= 0) {
      selectedShelters.splice(exists, 1);
    } else {
      selectedShelters.push(shelter);
    }
  } else {
    selectedShelters = [shelter];
  }
  renderSelectedShelterCoverage();
  flyToSelectedShelterView();
  renderStats();
}

function applyLayerVisibility() {
  const bindings = [
    ["meguniot", layers.existingMeguniot],
    ["miklatim", layers.existingMiklatim],
    ["recommended", layers.recommended],
    ["post1992Buildings", layers.post1992Buildings],
    ["uncoveredBuildings", layers.uncoveredBuildings],
    ["coveredBuildingsBase", layers.coveredBuildingsBase],
    ["covered", layers.coveredBuildings],
  ];
  for (const [key, layer] of bindings) {
    if (layerVisibility[key]) map.addLayer(layer);
    else map.removeLayer(layer);
  }
}

function renderStats() {
  const bucketData = getCurrentBucketData();
  if (!bucketData) {
    statsEl.textContent = "Loading data...";
    return;
  }
  const stats = bucketData.statistics;
  const shown = recommendationsForCurrentView();
  const minuteLabel =
    BUCKET_OPTIONS.find((b) => b.key === getActiveBucketKey())?.label || getActiveBucketKey();
  const metricLabel = currentDistanceMetric === "euclidean" ? "euclidean straight-line (200m)" : "graph walking";

  if (isClusterMode()) {
    statsEl.innerHTML =
      `Cluster placement mode is showing <strong>${shown.length}</strong> recommended cluster centers from the top <strong>150 KMeans fits</strong>. ` +
      `Distance metric: <strong>${metricLabel}</strong>. These markers represent general recommended areas for shelter placement, not exact accessibility-distance coverage.`;
    return;
  }

  const marginalCoverage = shown.reduce((sum, row) => sum + row.newly_covered_buildings, 0);
  const uncoveredNow = Number(stats.currently_uncovered) || 0;
  const remainingUncovered = Math.max(0, uncoveredNow - marginalCoverage);
  const modeLabel = `exact placement mode (${metricLabel})`;
  const coveragePhrase =
    currentDistanceMetric === "euclidean"
      ? "within 200m straight-line distance"
      : `within ${minuteLabel} walking distance`;

  statsEl.innerHTML =
    `In <strong>${modeLabel}</strong>, there are <strong>${uncoveredNow}</strong> residential buildings without any shelter <strong>${coveragePhrase}</strong>. ` +
    `You have added <strong>${shown.length}</strong> shelters that would <strong>newly cover</strong> about <strong>${marginalCoverage}</strong> additional buildings <strong>${coveragePhrase}</strong>. ` +
    `There remain <strong>${remainingUncovered}</strong> uncovered buildings.`;
}

async function refreshView() {
  await ensureBucketAuxData(getActiveBucketKey());
  updateSliderBounds();
  countValue.textContent = countRange.value;
  renderExistingCoverageBuildings();
  renderRecommended();
  renderSelectedShelterCoverage();
  renderStats();
  applyLayerVisibility();
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json();
}

function renderGuideContent() {
  const usageEn = `
    <div class="guide-block">
      <h3>How to Use</h3>
      <ul>
        <li>Choose a placement mode: <strong>Exact placement</strong> for precise points or <strong>Cluster placement</strong> for area-level guidance.</li>
        <li><strong>Exact placement</strong> now uses a single fixed threshold of <strong>5-minute walking distance</strong>.</li>
        <li><strong>Cluster placement</strong> hides accessibility controls while keeping all buildings visible for context.</li>
        <li>Set how many suggested shelters you want to view using the slider.</li>
        <li>Click any marker to inspect the recommendation details and location.</li>
        <li>Use the <strong>Layers</strong> section in the legend to hide or show map information.</li>
      </ul>
      <p><strong>Tip:</strong> Use cluster mode to identify where to plan, then switch to exact mode for specific candidate points.</p>
    </div>
  `;
  const usageHe = `
    <div class="guide-block" dir="rtl">
      <h3>איך משתמשים</h3>
      <ul>
        <li>בוחרים מצב מיקום: <strong>מיקום מדויק</strong> לנקודות ספציפיות או <strong>מיקום באשכולות</strong> להכוונה אזורית.</li>
        <li><strong>מיקום מדויק</strong> פועל כעת עם סף קבוע של <strong>5 דקות הליכה</strong>.</li>
        <li><strong>מיקום באשכולות</strong> מסתיר את בקרות הנגישות אך שומר על תצוגת כל המבנים להקשר.</li>
        <li>מגדירים בסליידר כמה מיקומים מומלצים יוצגו על המפה.</li>
        <li>לוחצים על סמן כדי לראות פרטי המלצה ומיקום.</li>
        <li>משתמשים באזור <strong>Layers</strong> שבמקרא כדי להסתיר או להציג שכבות כשיש עומס מידע.</li>
      </ul>
      <p><strong>טיפ:</strong> השתמשו במצב אשכולות לזיהוי אזורי תעדוף, ואז עברו למיקום מדויק לבחינת נקודות ספציפיות.</p>
    </div>
  `;

  const methodsEn = `
    <div class="guide-block">
      <h3>Methodology</h3>
      <ul>
        <li>Coverage is estimated along <strong>real walking streets</strong> with a densified network graph that adds entry points every 25m along long road segments.</li>
        <li>Each building is projected onto its nearest road edge, capturing actual door-to-street walking time.</li>
        <li>The analysis combines existing shelters and now treats <strong>all residential buildings built before 1992</strong> as requiring nearby shelter access.</li>
        <li><strong>Cluster placement mode</strong> runs 150 KMeans models and keeps the best 150 compact fits to point at <strong>general areas</strong> where shelters should be considered.</li>
        <li><strong>Exact placement mode</strong> outputs <strong>specific candidate points</strong> and evaluates them against a fixed 5-minute walking threshold.</li>
        <li>Exact point outputs are useful for prioritization but are not perfectly accurate: road-network geometry, missing paths, and routing assumptions can shift local results.</li>
        <li><strong>Total reachable</strong> shows all buildings a shelter can reach; <strong>newly covered</strong> shows only buildings not already served by a higher-ranked shelter.</li>
        <li>Use the <em>Coverage display</em> toggle to switch between these views. Shift-click shelters to compare coverage of multiple shelters at once.</li>
      </ul>
      <p>Goal: help prioritize locations that reduce uncovered buildings under strict response times.</p>
    </div>
  `;
  const methodsHe = `
    <div class="guide-block" dir="rtl">
      <h3>מתודולוגיה</h3>
      <ul>
        <li>הכיסוי מחושב לפי <strong>הליכה ברחובות אמיתיים</strong> עם רשת צפופה שמוסיפה נקודות כניסה כל 25 מטר לאורך קטעי כביש ארוכים.</li>
        <li>כל בניין מחובר לקטע הכביש הקרוב אליו, כך שזמן ההליכה מהדלת לרחוב נלקח בחשבון.</li>
        <li>הניתוח משלב מקלטים קיימים ומתייחס כעת אל <strong>כל בנייני המגורים שנבנו לפני 1992</strong> כמבנים שדורשים גישה קרובה למיגון.</li>
        <li><strong>מצב מיקום באשכולות</strong> מריץ 150 מודלי KMeans ובוחר את 150 ההתאמות הקומפקטיות הטובות ביותר כדי להצביע על <strong>אזור כללי</strong> למיקום מקלטים.</li>
        <li><strong>מצב מיקום מדויק</strong> מציג <strong>נקודות ספציפיות</strong> ונבחן מול סף קבוע של 5 דקות הליכה.</li>
        <li>התוצאות במצב המדויק שימושיות לתעדוף אך אינן מדויקות לחלוטין: אי-ודאות ברשת הדרכים ובהנחות הניתוב יכולה להשפיע מקומית על הכיסוי.</li>
        <li><strong>סה"כ נגישים</strong> מראה את כל הבניינים שמקלט יכול להגיע אליהם; <strong>מכוסים חדשים</strong> מראה רק בניינים שלא כבר מכוסים על ידי מקלט בדירוג גבוה יותר.</li>
        <li>השתמשו ב-Shift+לחיצה כדי להשוות כיסוי של מספר מקלטים בו-זמנית.</li>
      </ul>
      <p>המטרה: לסייע בתעדוף מיקומים שמצמצמים מבנים לא מכוסים בזמני תגובה קצרים.</p>
    </div>
  `;

  const contentByTabAndLang = {
    usage: { en: usageEn, he: usageHe },
    methods: { en: methodsEn, he: methodsHe },
  };
  guideContent.classList.toggle("methods-body", currentGuideTab === "methods");
  guideContent.setAttribute("dir", currentLanguage === "he" ? "rtl" : "ltr");
  guideContent.innerHTML = contentByTabAndLang[currentGuideTab][currentLanguage];
  guideTitle.textContent =
    currentGuideTab === "usage"
      ? currentLanguage === "he"
        ? "עיר מקלט - בית שמש"
        : "Access to Shelter - Beit Shemesh"
      : currentLanguage === "he"
        ? "איך זה עובד"
        : "Methods";
}

function setGuideLanguage(lang) {
  currentLanguage = lang;
  guideCard.classList.toggle("lang-he", lang === "he");
  languageToggle.checked = lang === "he";
  langLabelEn.classList.toggle("active-lang-label", lang === "en");
  langLabelHe.classList.toggle("active-lang-label", lang === "he");
  guideTabUsage.textContent = lang === "he" ? "שימוש" : "Usage";
  guideTabMethods.textContent = lang === "he" ? "איך זה עובד" : "Methods";
  guideTabUsage.setAttribute("aria-label", lang === "he" ? "לשונית שימוש" : "Usage tab");
  guideTabMethods.setAttribute("aria-label", lang === "he" ? "לשונית מתודולוגיה" : "Methods tab");
  renderGuideContent();
}

function setGuideTab(tab) {
  currentGuideTab = tab;
  guideTabUsage.classList.toggle("active-tab", tab === "usage");
  guideTabMethods.classList.toggle("active-tab", tab === "methods");
  guideTabUsage.setAttribute("aria-selected", String(tab === "usage"));
  guideTabMethods.setAttribute("aria-selected", String(tab === "methods"));
  renderGuideContent();
}

async function loadAllData() {
  dataStore.miguniot = await fetchJson(`${DATA_BASE}/Miguniot.geojson`);
  dataStore.miguniotSourceCrs = normalizeCrsName(
    dataStore.miguniot?.crs?.properties?.name || "",
  );
  dataStore.miklatim = await fetchJson(`${DATA_BASE}/Miklatim.geojson`);
  dataStore.miklatimSourceCrs = normalizeCrsName(
    dataStore.miklatim?.crs?.properties?.name || "",
  );
  dataStore.buildings = await fetchJson(`${DATA_BASE}/buildings.geojson`);
  dataStore.buildingsSourceCrs = normalizeCrsName(
    dataStore.buildings?.crs?.properties?.name || "",
  );
  dataStore.coverageByMetric = {};
  for (const metric of DISTANCE_METRIC_OPTIONS) {
    dataStore.coverageByMetric[metric.key] = await fetchJson(
      `${NETWORK_BASE}/building_coverage_network_${metric.key}.json`,
    );
  }
  dataStore.coverage = dataStore.coverageByMetric[currentDistanceMetric];

  coverageByIndex.clear();
  coverageById.clear();
  for (const b of dataStore.coverage.buildings || []) {
    coverageByIndex.set(Number(b.building_idx), b);
    coverageById.set(Number(b.id), b);
  }
  buildBuildingFeatureIndex();

  dataStore.optimalByMetricModeBucket = {};
  for (const metric of DISTANCE_METRIC_OPTIONS) {
    dataStore.optimalByMetricModeBucket[metric.key] = {};
    for (const mode of PLACEMENT_OPTIONS) {
      dataStore.optimalByMetricModeBucket[metric.key][mode.key] = {};
      for (const bucket of BUCKET_OPTIONS) {
        const key = bucket.key;
        dataStore.optimalByMetricModeBucket[metric.key][mode.key][key] = await fetchJson(
          `${NETWORK_BASE}/optimal_meguniot_${metric.key}_${mode.key}_${key}.json`,
        );
      }
    }
  }
}

function setDistanceMetric(metricKey) {
  if (!DISTANCE_METRIC_OPTIONS.find((m) => m.key === metricKey)) return;
  currentDistanceMetric = metricKey;
  dataStore.coverage = dataStore.coverageByMetric[currentDistanceMetric] || null;
  coverageByIndex.clear();
  coverageById.clear();
  for (const b of dataStore.coverage?.buildings || []) {
    coverageByIndex.set(Number(b.building_idx), b);
    coverageById.set(Number(b.id), b);
  }
  buildBuildingFeatureIndex();
  metricGraphBtn?.classList.toggle("active-toggle", metricKey === "graph");
  metricEuclideanBtn?.classList.toggle("active-toggle", metricKey === "euclidean");
  clearSelection();
  void refreshView();
}

function setPlacementMode(modeKey) {
  if (!PLACEMENT_OPTIONS.find((m) => m.key === modeKey)) return;
  currentPlacementMode = modeKey;
  modeExactBtn?.classList.toggle("active-toggle", modeKey === "exact");
  modeClusterBtn?.classList.toggle("active-toggle", modeKey === "cluster");
  bucketControls?.classList.add("hidden-control");
  coverageDisplayControls?.classList.toggle("hidden-control", modeKey === "cluster");
  if (bucketSelect) {
    bucketSelect.disabled = true;
  }
  if (modeKey === "cluster" && coverageModeFull) {
    coverageModeFull.checked = true;
    coverageDisplayMode = "full";
  }
  clearSelection();
  void refreshView();
}

function wireEvents() {
  bucketSelect.addEventListener("change", () => {
    clearSelection();
    void refreshView();
  });
  countRange.addEventListener("input", () => void refreshView());
  metricGraphBtn?.addEventListener("click", () => setDistanceMetric("graph"));
  metricEuclideanBtn?.addEventListener("click", () => setDistanceMetric("euclidean"));
  modeExactBtn?.addEventListener("click", () => setPlacementMode("exact"));
  modeClusterBtn?.addEventListener("click", () => setPlacementMode("cluster"));
  baseMapSelect?.addEventListener("change", () => setBaseMap(baseMapSelect.value));

  downloadCsvBtn.addEventListener("click", () => {
    const rows = recommendationsForCurrentView();
    const activeBucket = getActiveBucketKey();
    const label = BUCKET_OPTIONS.find((b) => b.key === activeBucket)?.label || "bucket";
    const suffix = isClusterMode() ? "clusters" : label;
    downloadBlob(
      toCsv(rows),
      `recommended_meguniot_${currentDistanceMetric}_${currentPlacementMode}_${suffix}.csv`,
      "text/csv;charset=utf-8",
    );
  });

  downloadGeojsonBtn.addEventListener("click", () => {
    const rows = recommendationsForCurrentView();
    const features = rows.map((r) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [r.lon, r.lat] },
      properties: isClusterMode()
        ? {
            rank: r.rank,
            placement_mode: "cluster",
            candidate_source: r.candidate_source,
            coordinates: r.coordinates,
          }
        : {
            rank: r.rank,
            time_bucket: r.time_bucket,
            time_seconds: r.time_seconds,
            coordinates: r.coordinates,
            newly_covered_buildings: r.newly_covered_buildings,
            newly_covered_people_est: r.newly_covered_people_est,
          },
    }));
    const activeBucket = getActiveBucketKey();
    const label = BUCKET_OPTIONS.find((b) => b.key === activeBucket)?.label || "bucket";
    const suffix = isClusterMode() ? "clusters" : label;
    downloadBlob(
      JSON.stringify({ type: "FeatureCollection", features }, null, 2),
      `recommended_meguniot_${currentDistanceMetric}_${currentPlacementMode}_${suffix}.geojson`,
      "application/geo+json;charset=utf-8",
    );
  });

  const layerCheckboxMap = [
    [layerMeguniot, "meguniot"],
    [layerMiklatim, "miklatim"],
    [layerRecommended, "recommended"],
    [layerPost1992Buildings, "post1992Buildings"],
    [layerUncoveredBuildings, "uncoveredBuildings"],
    [layerCoveredBuildingsBase, "coveredBuildingsBase"],
    [layerCovered, "covered"],
  ];
  for (const [checkbox, key] of layerCheckboxMap) {
    checkbox.checked = layerVisibility[key];
    checkbox.addEventListener("change", () => {
      layerVisibility[key] = checkbox.checked;
      applyLayerVisibility();
    });
  }

  coverageModeFull.addEventListener("change", () => {
    coverageDisplayMode = "full";
    renderSelectedShelterCoverage();
    renderStats();
  });
  coverageModeMarginal.addEventListener("change", () => {
    coverageDisplayMode = "marginal";
    renderSelectedShelterCoverage();
    renderStats();
  });

  openGuideBtn.addEventListener("click", () => guideModal.classList.remove("hidden"));
  closeGuideBtn.addEventListener("click", () => guideModal.classList.add("hidden"));
  guideModal.addEventListener("click", (e) => {
    if (e.target === guideModal) guideModal.classList.add("hidden");
  });
  languageToggle.addEventListener("change", () => {
    setGuideLanguage(languageToggle.checked ? "he" : "en");
  });
  guideTabUsage.addEventListener("click", () => setGuideTab("usage"));
  guideTabMethods.addEventListener("click", () => setGuideTab("methods"));
}

setBaseMap(baseMapSelect.value || "streets");

loadAllData()
  .then(() => {
    wireEvents();
    renderExistingShelters();
    reportProjectionStatus();
    setPlacementMode("exact");
    setGuideLanguage("en");
    setGuideTab("usage");
    guideModal.classList.remove("hidden");
  })
  .catch((err) => {
    console.error(err);
    statsEl.textContent = `Error loading data: ${err.message}`;
  });
