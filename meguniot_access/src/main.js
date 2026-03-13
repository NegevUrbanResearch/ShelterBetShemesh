const BUCKET_OPTIONS = [
  { label: "1m", key: "1min", seconds: 60 },
  { label: "2m", key: "2min", seconds: 120 },
  { label: "3m", key: "3min", seconds: 180 },
];

const DATA_BASE = "../data";
const NETWORK_BASE = `${DATA_BASE}/meguniot_network`;
const LAYER_DEFAULTS = {
  meguniot: true,
  miklatim: true,
  recommended: true,
  uncoveredBuildings: true,
  coveredBuildingsBase: true,
  covered: true,
};

proj4.defs(
  "EPSG:2039",
  "+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +units=m +no_defs",
);

const bucketSelect = document.getElementById("bucketSelect");
const countRange = document.getElementById("countRange");
const countValue = document.getElementById("countValue");
const countLabel = document.querySelector('label[for="countRange"]');
const statsEl = document.getElementById("stats");
const downloadCsvBtn = document.getElementById("downloadCsv");
const downloadGeojsonBtn = document.getElementById("downloadGeojson");

const layerMeguniot = document.getElementById("layerMeguniot");
const layerMiklatim = document.getElementById("layerMiklatim");
const layerRecommended = document.getElementById("layerRecommended");
const layerUncoveredBuildings = document.getElementById("layerUncoveredBuildings");
const layerCoveredBuildingsBase = document.getElementById("layerCoveredBuildingsBase");
const layerCovered = document.getElementById("layerCovered");

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

for (const bucket of BUCKET_OPTIONS) {
  const opt = document.createElement("option");
  opt.value = bucket.key;
  opt.textContent = bucket.label;
  bucketSelect.appendChild(opt);
}
bucketSelect.value = "1min";

const map = L.map("map", { preferCanvas: true, zoomControl: false }).setView([31.745, 34.99], 13);
L.control.zoom({ position: "bottomright" }).addTo(map);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19,
}).addTo(map);

const layers = {
  existingMeguniot: L.layerGroup().addTo(map),
  existingMiklatim: L.layerGroup().addTo(map),
  recommended: L.layerGroup().addTo(map),
  uncoveredBuildings: L.layerGroup().addTo(map),
  coveredBuildingsBase: L.layerGroup().addTo(map),
  coveredBuildings: L.layerGroup().addTo(map),
  selectedShelter: L.layerGroup().addTo(map),
};

const layerVisibility = { ...LAYER_DEFAULTS };

const dataStore = {
  miguniot: null,
  miklatim: null,
  buildings: null,
  buildingsSourceCrs: "EPSG:2039",
  coverage: null,
  optimalByBucket: {},
  shelterCoveragesByBucket: {},
};

let selectedShelter = null;
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

function epsg2039ToLatLng(coord) {
  const [lon, lat] = proj4("EPSG:2039", "EPSG:4326", coord);
  return [lat, lon];
}

function geometryToLatLng(feature) {
  const coords = feature?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  return epsg2039ToLatLng(coords);
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

function getCurrentBucketData() {
  const bucketKey = bucketSelect.value;
  return dataStore.optimalByBucket[bucketKey];
}

async function ensureBucketAuxData(bucketKey) {
  if (!dataStore.shelterCoveragesByBucket[bucketKey]) {
    dataStore.shelterCoveragesByBucket[bucketKey] = await fetchJson(
      `${NETWORK_BASE}/shelter_coverages_${bucketKey}.json`,
    );
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
    countLabel.textContent = `Recommended shelters (max ${maxRecommendations})`;
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
  layers.uncoveredBuildings.clearLayers();
  layers.coveredBuildingsBase.clearLayers();
  const bucket = bucketSelect.value;
  const uncoveredStyle = {
    color: "#ff4d4f",
    weight: 1.4,
    fillColor: "#ff6b6d",
    fillOpacity: 0.38,
    opacity: 0.95,
  };
  const coveredStyle = {
    color: "#2ecc71",
    weight: 1.2,
    fillColor: "#34d27c",
    fillOpacity: 0.22,
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
}

function normalizeCrsName(rawName) {
  if (!rawName) return "EPSG:2039";
  const normalized = String(rawName).toUpperCase();
  if (normalized.includes("EPSG:3857")) return "EPSG:3857";
  if (normalized.includes("EPSG:2039")) return "EPSG:2039";
  if (normalized.includes("EPSG:4326")) return "EPSG:4326";
  return "EPSG:2039";
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
  const body = rows.map((row) =>
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
  return [headers.join(","), ...body].join("\n");
}

function clearSelection() {
  selectedShelter = null;
  layers.coveredBuildings.clearLayers();
  layers.selectedShelter.clearLayers();
}

function renderExistingShelters() {
  layers.existingMeguniot.clearLayers();
  layers.existingMiklatim.clearLayers();

  const migFeatures = Array.isArray(dataStore.miguniot?.features) ? dataStore.miguniot.features : [];
  const mikFeatures = Array.isArray(dataStore.miklatim?.features) ? dataStore.miklatim.features : [];

  let shelterIdCounter = 0;
  for (const feature of migFeatures) {
    const latLng = geometryToLatLng(feature);
    if (!latLng) continue;
    const shelterId = shelterIdCounter++;
    const marker = L.marker(latLng, { icon: existingIcon });
    marker.bindPopup("<strong>Existing megunit</strong>");
    marker.on("click", () =>
      selectShelter({
        kind: "existing",
        id: shelterId,
        lat: latLng[0],
        lon: latLng[1],
        label: "Existing megunit",
      }),
    );
    marker.addTo(layers.existingMeguniot);
  }

  for (const feature of mikFeatures) {
    const latLng = geometryToLatLng(feature);
    if (!latLng) continue;
    const shelterId = shelterIdCounter++;
    const marker = L.marker(latLng, { icon: existingIcon });
    marker.bindPopup("<strong>Existing miklat</strong>");
    marker.on("click", () =>
      selectShelter({
        kind: "existing",
        id: shelterId,
        lat: latLng[0],
        lon: latLng[1],
        label: "Existing miklat",
      }),
    );
    marker.addTo(layers.existingMiklatim);
  }
}

function renderRecommended() {
  layers.recommended.clearLayers();
  const rows = recommendationsForCurrentView();
  for (const rec of rows) {
    const shelterId = rec.shelter_id ?? rec.candidate_id ?? rec.building_idx;
    const marker = L.marker([rec.lat, rec.lon], { icon: recommendedIcon });
    marker.bindPopup(
      `<strong>Recommended #${rec.rank}</strong><br>` +
        `Source: ${rec.candidate_source || "building"}<br>` +
        `Covers: ${rec.covered_building_indices.length} buildings`,
    );
    marker.on("click", () =>
      selectShelter({
        kind: "recommended",
        id: shelterId,
        lat: rec.lat,
        lon: rec.lon,
        label: `Recommended #${rec.rank}`,
      }),
    );
    marker.addTo(layers.recommended);
  }
  return rows;
}

function renderSelectedShelterCoverage() {
  layers.coveredBuildings.clearLayers();
  layers.selectedShelter.clearLayers();
  if (!selectedShelter) return;

  const bucket = bucketSelect.value;
  const payload = dataStore.shelterCoveragesByBucket[bucket];
  const allCoverages = Array.isArray(payload?.coverages) ? payload.coverages : [];
  const match = allCoverages.find(
    (c) =>
      c?.shelter_kind === selectedShelter.kind &&
      Number(c?.shelter_id) === Number(selectedShelter.id),
  );
  if (!match) return;

  const coveredIndices = Array.isArray(match.covered_building_indices)
    ? match.covered_building_indices
    : [];
  const selectedCoveredStyle = {
    color: "#2f80ff",
    weight: 2,
    fillColor: "#2f80ff",
    fillOpacity: 0.7,
    opacity: 1,
  };
  for (const idx of coveredIndices) {
    const buildingFeature = buildingFeatureByIndex.get(Number(idx));
    if (buildingFeature) {
      createBuildingLayer(buildingFeature, selectedCoveredStyle, 4).addTo(layers.coveredBuildings);
      continue;
    }
    const b = coverageByIndex.get(Number(idx));
    if (!b) continue;
    L.circleMarker([b.lat, b.lon], {
      radius: 4,
      color: selectedCoveredStyle.color,
      fillColor: selectedCoveredStyle.fillColor,
      fillOpacity: selectedCoveredStyle.fillOpacity,
      weight: selectedCoveredStyle.weight,
    }).addTo(layers.coveredBuildings);
  }

  L.circleMarker([selectedShelter.lat, selectedShelter.lon], {
    radius: 9,
    color: "#ffffff",
    fillColor: "#ffffff",
    fillOpacity: 0.16,
    weight: 2,
  }).addTo(layers.selectedShelter);
}

function selectShelter(shelter) {
  selectedShelter = shelter;
  renderSelectedShelterCoverage();
  renderStats();
}

function applyLayerVisibility() {
  const bindings = [
    ["meguniot", layers.existingMeguniot],
    ["miklatim", layers.existingMiklatim],
    ["recommended", layers.recommended],
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
  const shownCoverage = shown.reduce((sum, row) => sum + row.newly_covered_buildings, 0);
  const uncoveredNow = Number(stats.currently_uncovered) || 0;
  const shownImprovementPct = uncoveredNow > 0 ? (shownCoverage / uncoveredNow) * 100 : 0;
  const fullImprovementPct =
    uncoveredNow > 0 ? (Number(stats.additional_covered_by_proposed || 0) / uncoveredNow) * 100 : 0;
  const selectedNote = selectedShelter
    ? `You selected <strong>${selectedShelter.label}</strong>. Buildings it covers within the selected time are highlighted in blue on the map.`
    : "Click any shelter to instantly see which nearby buildings it can cover within the selected time.";

  statsEl.innerHTML =
    `At <strong>${BUCKET_OPTIONS.find((b) => b.key === bucketSelect.value)?.label || bucketSelect.value}</strong> travel time, ` +
    `there are currently <strong>${stats.currently_uncovered}</strong> uncovered buildings.<br>` +
    `You are viewing <strong>${shown.length}</strong> suggested shelters, which could help cover about <strong>${shownCoverage}</strong> additional buildings.<br>` +
    `Coverage improvement (current selection): <strong>${shownImprovementPct.toFixed(1)}%</strong> of currently uncovered buildings.<br>` +
    `Coverage improvement (all suggested): <strong>${fullImprovementPct.toFixed(1)}%</strong>.<br>` +
    `If all suggested shelters for this time are placed, uncovered buildings drop to <strong>${stats.final_uncovered}</strong>.<br><br>` +
    selectedNote;
}

async function refreshView() {
  await ensureBucketAuxData(bucketSelect.value);
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
      <p class="guide-kicker">Quick start</p>
      <h3>How to Use</h3>
      <ul>
        <li>Choose a travel-time target (1 to 3 minutes).</li>
        <li>Set how many suggested shelters you want to view using the slider.</li>
        <li>Click any shelter marker to highlight the buildings it can cover within that time.</li>
        <li>Use the <strong>Layers</strong> section in the legend to hide or show map information.</li>
      </ul>
      <p><strong>Tip:</strong> Start with 1 minute to focus on the most urgent uncovered buildings.</p>
    </div>
  `;
  const usageHe = `
    <div class="guide-block" dir="rtl">
      <p class="guide-kicker">התחלה מהירה</p>
      <h3>איך משתמשים</h3>
      <ul>
        <li>בוחרים יעד זמן הגעה (מ-1 עד 3 דקות).</li>
        <li>מגדירים בסליידר כמה מיקומים מומלצים יוצגו על המפה.</li>
        <li>לוחצים על סמן של מקלט/מיגונית כדי לראות אילו בניינים הוא מכסה בזמן שנבחר.</li>
        <li>משתמשים באזור <strong>Layers</strong> שבמקרא כדי להסתיר או להציג שכבות כשיש עומס מידע.</li>
      </ul>
      <p><strong>טיפ:</strong> כדאי להתחיל ביעד של דקה כדי לזהות מהר אזורים דחופים.</p>
    </div>
  `;

  const methodsEn = `
    <div class="guide-block">
      <p class="guide-kicker">Method overview</p>
      <h3>Methods</h3>
      <ul>
        <li>Coverage is estimated along <strong>real walking streets</strong>, not straight-line distance.</li>
        <li>The analysis combines existing shelters and focuses on residential buildings likely to need nearby protection.</li>
        <li>Suggested shelter points are ranked by how many currently uncovered buildings they can newly cover.</li>
        <li>Per-shelter coverage is precomputed, so clicking a shelter simply highlights the buildings it can reach within the selected time.</li>
      </ul>
      <p>Goal: help prioritize locations that reduce uncovered buildings under strict response times.</p>
    </div>
  `;
  const methodsHe = `
    <div class="guide-block" dir="rtl">
      <p class="guide-kicker">סקירת מתודולוגיה</p>
      <h3>מתודולוגיה</h3>
      <ul>
        <li>הכיסוי מחושב לפי <strong>הליכה ברחובות אמיתיים</strong>, ולא לפי קו אווירי.</li>
        <li>הניתוח משלב מקלטים קיימים ומתמקד בבנייני מגורים שסביר שנדרשת להם הגנה קרובה.</li>
        <li>המיקומים המומלצים מדורגים לפי מספר המבנים הלא-מכוסים שהם יכולים לכסות מחדש.</li>
        <li>הכיסוי של כל מקלט/מיגונית מחושב מראש, כך שלחיצה על סמן רק מדגישה את הבניינים שהוא יכול לכסות בזמן הנבחר.</li>
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
  dataStore.miklatim = await fetchJson(`${DATA_BASE}/Miklatim.geojson`);
  dataStore.buildings = await fetchJson(`${DATA_BASE}/buildings.geojson`);
  dataStore.buildingsSourceCrs = normalizeCrsName(
    dataStore.buildings?.crs?.properties?.name || "",
  );
  dataStore.coverage = await fetchJson(`${NETWORK_BASE}/building_coverage_network.json`);

  coverageByIndex.clear();
  coverageById.clear();
  for (const b of dataStore.coverage.buildings || []) {
    coverageByIndex.set(Number(b.building_idx), b);
    coverageById.set(Number(b.id), b);
  }
  buildBuildingFeatureIndex();

  for (const bucket of BUCKET_OPTIONS) {
    const key = bucket.key;
    dataStore.optimalByBucket[key] = await fetchJson(`${NETWORK_BASE}/optimal_meguniot_${key}.json`);
  }
}

function wireEvents() {
  bucketSelect.addEventListener("change", () => {
    clearSelection();
    void refreshView();
  });
  countRange.addEventListener("input", () => void refreshView());

  downloadCsvBtn.addEventListener("click", () => {
    const rows = recommendationsForCurrentView();
    const label = BUCKET_OPTIONS.find((b) => b.key === bucketSelect.value)?.label || "bucket";
    downloadBlob(toCsv(rows), `recommended_meguniot_${label}.csv`, "text/csv;charset=utf-8");
  });

  downloadGeojsonBtn.addEventListener("click", () => {
    const rows = recommendationsForCurrentView();
    const features = rows.map((r) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [r.lon, r.lat] },
      properties: {
        rank: r.rank,
        time_bucket: r.time_bucket,
        time_seconds: r.time_seconds,
        coordinates: r.coordinates,
        newly_covered_buildings: r.newly_covered_buildings,
        newly_covered_people_est: r.newly_covered_people_est,
      },
    }));
    const label = BUCKET_OPTIONS.find((b) => b.key === bucketSelect.value)?.label || "bucket";
    downloadBlob(
      JSON.stringify({ type: "FeatureCollection", features }, null, 2),
      `recommended_meguniot_${label}.geojson`,
      "application/geo+json;charset=utf-8",
    );
  });

  const layerCheckboxMap = [
    [layerMeguniot, "meguniot"],
    [layerMiklatim, "miklatim"],
    [layerRecommended, "recommended"],
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

loadAllData()
  .then(() => {
    wireEvents();
    renderExistingShelters();
    void refreshView();
    setGuideLanguage("en");
    setGuideTab("usage");
    guideModal.classList.remove("hidden");
  })
  .catch((err) => {
    console.error(err);
    statsEl.textContent = `Error loading data: ${err.message}`;
  });
