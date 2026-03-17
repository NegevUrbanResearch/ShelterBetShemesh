const BUCKET_OPTIONS = [{ key: "5min", seconds: 300 }];
const DISTANCE_METRIC_OPTIONS = [
  { key: "graph" },
  { key: "euclidean" },
];
const PLACEMENT_OPTIONS = [
  { key: "exact" },
  { key: "cluster" },
];
const BASE_MAP_OPTIONS = [
  {
    key: "streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    },
  },
  {
    key: "satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: {
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      maxZoom: 19,
    },
  },
  {
    key: "light",
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
const ACCESSIBILITY_GRID_CELL_SIZE_PX = 8;
const I18N = {
  en: {
    appTitle: "Access to Shelter - Beit Shemesh",
    appSubtitle: "Municipal shelter accessibility planning",
    infoAriaLabel: "Info",
    closeHelpAriaLabel: "Close help",
    guideTabsAriaLabel: "Guide sections",
    step1Title: '<span class="step-chip">1</span><span class="step-title-text">Inspect coverage</span>',
    step0Title: '<span class="step-chip">0</span><span class="step-title-text">Assumptions</span>',
    step2Title: '<span class="step-chip">2</span><span class="step-title-text">Analysis setup</span>',
    step3Title: '<span class="step-chip">3</span><span class="step-title-text">Add shelters</span>',
    step4Title: '<span class="step-chip">4</span><span class="step-title-text">Local impact</span>',
    heatmapToggleLabel: "Accessibility heatmap (distance to nearest shelter)",
    accessibilityHeatmapHint: "Green = closer | Red = farther",
    distanceMetricLabel: "Distance",
    placementModeLabel: "Placement",
    timeBucketLabel: "Time bucket",
    downloadCsv: "Download CSV",
    downloadGeojson: "Download GeoJSON",
    coverageInspectHint: "Click a shelter marker to see local impact.",
    legendTitle: "Map legend",
    legendExisting: "Existing shelters (meguniot + miklatim)",
    legendRecommended: "Recommended shelters",
    legendPost1992: "Buildings built in/after 1992",
    legendUncovered: "Uncovered buildings (existing conditions)",
    legendCoveredBase: "Buildings covered by existing shelters",
    legendCoveredSelected: "Covered by selected shelter",
    legendTopography: "Topography contour lines",
    legendTopographyScaleTitle: "",
    legendTopographyScaleLow: "Low",
    legendTopographyScaleHigh: "High",
    layersSummary: "Layers",
    baseMapLabel: "Base map",
    layerMeguniotLabel: "Existing meguniot",
    layerMiklatimLabel: "Existing miklatim",
    layerRecommendedLabel: "Recommended meguniot",
    layerTopographyLabel: "Topography (contours)",
    layerPost1992BuildingsLabel: "Buildings built in/after 1992",
    layerUncoveredBuildingsLabel: "Uncovered buildings",
    layerCoveredBuildingsBaseLabel: "Covered buildings",
    layerCoveredLabel: "Covered by selected shelter",
    metricGraphBtn: "Graph",
    metricEuclideanBtn: "Euclidean",
    modeExactBtn: "Exact",
    modeClusterBtn: "Cluster",
    countRangeLabel: "Recommended shelters",
    assumptionsHasShelterTitle: "Has Shelter",
    assumptionsNeighborsTitle: "Shelter Neighbors",
    assumePost1992ShelteredLabel: "Built in/after 1992",
    assumeOver3FloorsShelteredLabel: "Above 3 floors",
    assumeEducationSheltersLabel: "Educational facilities",
    assumePublicSheltersLabel: "Public buildings",
    countRangeLabelDynamic: (modeLabel, maxRecommendations) =>
      `Recommended ${modeLabel} (max ${maxRecommendations})`,
    clusterAreas: "cluster areas",
    shelters: "shelters",
    bucketLabel_5min: "5-minute",
    baseMap_streets: "Streets (OpenStreetMap)",
    baseMap_satellite: "Satellite (Esri World Imagery)",
    baseMap_light: "Light (Carto Positron)",
    loadingData: "Loading data...",
    accessibilityStats:
      "Accessibility screen-grid mode is active. <strong>Green</strong> areas are closer to an existing shelter, while <strong>red</strong> areas are farther away.",
    metricLabelEuclidean: "euclidean straight-line (200m)",
    metricLabelGraph: "graph walking",
    clusterStats: (shownLength, metricLabel) =>
      `Cluster placement mode is showing <strong>${shownLength}</strong> recommended cluster centers from the top <strong>150 KMeans fits</strong>. Distance metric: <strong>${metricLabel}</strong>. These markers represent general recommended areas for shelter placement, not exact accessibility-distance coverage.`,
    exactModeLabel: (metricLabel) => `exact placement mode (${metricLabel})`,
    coveragePhraseEuclidean: "within 200m straight-line distance",
    coveragePhraseGraph: (minuteLabel) => `within ${minuteLabel} walking distance`,
    exactStats: (modeLabel, uncoveredNow, coveragePhrase, shownLength, marginalCoverage, remainingUncovered) =>
      `In <strong>${modeLabel}</strong>, there are <strong>${uncoveredNow}</strong> residential buildings without any shelter <strong>${coveragePhrase}</strong>. You have added <strong>${shownLength}</strong> shelters that would <strong>newly cover</strong> about <strong>${marginalCoverage}</strong> additional buildings <strong>${coveragePhrase}</strong>. There remain <strong>${remainingUncovered}</strong> uncovered buildings.`,
    buildingPopupCovered: (idx) => `<strong>Building #${idx}</strong><br>Covered by existing shelters`,
    buildingPopupUncovered: (idx) => `<strong>Building #${idx}</strong><br>Uncovered by existing shelters`,
    buildingPost1992Popup:
      "<strong>Building built in/after 1992</strong><br>Shown as not requiring new shelter coverage in this analysis",
    existingMegunitPopup: "<strong>Existing megunit</strong>",
    existingMegunitLabel: "Existing megunit",
    existingMiklatPopup: "<strong>Existing miklat</strong>",
    existingMiklatLabel: "Existing miklat",
    contourPopup: (heightMeters) => `<strong>Contour</strong><br>Elevation: ${heightMeters}m`,
    mapClickElevationPopup: (heightMeters) => `<strong>Approx elevation</strong><br>${heightMeters}m`,
    recommendedLabel: (rank) => `Recommended #${rank}`,
    modeLabelCluster: "Cluster area",
    modeLabelExact: "Exact point",
    clusterPopup: (rank, modeLabel, source) =>
      `<strong>Cluster #${rank}</strong><br>Mode: ${modeLabel}<br>Source: ${source}<br>General recommended area`,
    recommendedPopup: (rank, modeLabel, source, fullCount, marginalCount) =>
      `<strong>Recommended #${rank}</strong><br>Mode: ${modeLabel}<br>Source: ${source}<br>Total reachable: ${fullCount} buildings<br>Newly covered: ${marginalCount} buildings`,
    guideUsageTab: "Usage",
    guideMethodsTab: "Methods",
    guideUsageTabAria: "Usage tab",
    guideMethodsTabAria: "Methods tab",
    guideTitleUsage: "Access to Shelter - Beit Shemesh",
    guideTitleMethods: "Methods",
    guideUsageHtml: `
    <div class="guide-block">
      <h3>How to Use</h3>
      <ul>
        <li><strong>1.</strong> Choose <strong>Euclidean</strong> or <strong>Graph distance</strong> to define how accessibility is measured.</li>
        <li><strong>2.</strong> Choose <strong>Exact placement</strong> or <strong>Cluster placement</strong> to set recommendation style.</li>
        <li><strong>3.</strong> Add recommended shelters with the slider to test different intervention sizes.</li>
        <li><strong>4.</strong> Inspect updated statistics, then click shelters on the map to explore local coverage change.</li>
        <li><strong>5.</strong> Use legend <strong>Layers</strong> to manage map visibility and base map context.</li>
      </ul>
    </div>
  `,
    guideMethodsHtml: `
    <div class="guide-block">
      <h3>Methodology</h3>
      <ul>
        <li><strong>0.</strong> Assumption toggles define what is treated as already sheltered and which additional facilities are counted as shelter supply.</li>
        <li><strong>1.</strong> Building and shelter layers are harmonized to a shared map coordinate system.</li>
        <li><strong>2.</strong> Existing accessibility is computed per building under graph or euclidean distance logic.</li>
        <li><strong>3.</strong> Candidate shelters are ranked by additional coverage and exposed as exact points or cluster guidance.</li>
        <li><strong>4.</strong> Statistics and map layers update interactively as you change mode and shelter count.</li>
      </ul>
    </div>
  `,
    errorLoadingData: (message) => `Error loading data: ${message}`,
  },
  he: {
    appTitle: "עיר מקלט - בית שמש",
    appSubtitle: "תכנון נגישות למרחבים מוגנים בעיר",
    infoAriaLabel: "מידע",
    closeHelpAriaLabel: "סגירת עזרה",
    guideTabsAriaLabel: "לשוניות מדריך",
    step1Title: '<span class="step-chip">1</span><span class="step-title-text">בדיקת כיסוי</span>',
    step0Title: '<span class="step-chip">0</span><span class="step-title-text">הנחות</span>',
    step2Title: '<span class="step-chip">2</span><span class="step-title-text">הגדרות ניתוח</span>',
    step3Title: '<span class="step-chip">3</span><span class="step-title-text">הוספת מיגוניות</span>',
    step4Title: '<span class="step-chip">4</span><span class="step-title-text">השפעה מקומית</span>',
    heatmapToggleLabel: "מפת חום לנגישות (מרחק למיגון הקרוב ביותר)",
    accessibilityHeatmapHint: "ירוק = קרוב יותר | אדום = רחוק יותר",
    distanceMetricLabel: "מרחק",
    placementModeLabel: "מיקום",
    timeBucketLabel: "חלון זמן",
    downloadCsv: "הורדת CSV",
    downloadGeojson: "הורדת GeoJSON",
    coverageInspectHint: "לחצו על מיגונית במפה כדי לראות השפעה מקומית.",
    legendTitle: "מקרא מפה",
    legendExisting: "מיגון קיים (מיגוניות + מקלטים)",
    legendRecommended: "מיגוניות מומלצות",
    legendPost1992: "מבנים שנבנו מ-1992 ואילך",
    legendUncovered: "מבנים ללא כיסוי (מצב קיים)",
    legendCoveredBase: "מבנים מכוסים על ידי מיגון קיים",
    legendCoveredSelected: "מכוסים על ידי מיגונית שנבחרה",
    legendTopography: "קווי גובה טופוגרפיים",
    legendTopographyScaleTitle: "",
    legendTopographyScaleLow: "נמוך",
    legendTopographyScaleHigh: "גבוה",
    layersSummary: "שכבות",
    baseMapLabel: "מפת בסיס",
    layerMeguniotLabel: "מיגוניות קיימות",
    layerMiklatimLabel: "מקלטים קיימים",
    layerRecommendedLabel: "מיגוניות מומלצות",
    layerTopographyLabel: "טופוגרפיה (קווי גובה)",
    layerPost1992BuildingsLabel: "מבנים שנבנו מ-1992 ואילך",
    layerUncoveredBuildingsLabel: "מבנים ללא כיסוי",
    layerCoveredBuildingsBaseLabel: "מבנים מכוסים",
    layerCoveredLabel: "מכוסים על ידי מיגונית שנבחרה",
    metricGraphBtn: "גרפי",
    metricEuclideanBtn: "אוקלידי",
    modeExactBtn: "מדויק",
    modeClusterBtn: "אשכול",
    countRangeLabel: "מיגוניות מומלצות",
    assumptionsHasShelterTitle: "כוללים מיגון",
    assumptionsNeighborsTitle: "מיגון שכנים",
    assumePost1992ShelteredLabel: "נבנה מ-1992 ואילך",
    assumeOver3FloorsShelteredLabel: "מעל 3 קומות",
    assumeEducationSheltersLabel: "מוסדות חינוך",
    assumePublicSheltersLabel: "מבני ציבור",
    countRangeLabelDynamic: (modeLabel, maxRecommendations) => `${modeLabel} מומלצות (מקסימום ${maxRecommendations})`,
    clusterAreas: "אזורי אשכול",
    shelters: "מיגוניות",
    bucketLabel_5min: "5 דקות",
    baseMap_streets: "רחובות (OpenStreetMap)",
    baseMap_satellite: "לוויין (Esri World Imagery)",
    baseMap_light: "בהיר (Carto Positron)",
    loadingData: "טוען נתונים...",
    accessibilityStats:
      "מצב מפת חום לרשת הנגישות פעיל. אזורים <strong>ירוקים</strong> קרובים יותר למיגון קיים, ואזורים <strong>אדומים</strong> רחוקים יותר.",
    metricLabelEuclidean: "מרחק אוקלידי בקו אווירי (200 מ')",
    metricLabelGraph: "מרחק הליכה ברשת הדרכים",
    clusterStats: (shownLength, metricLabel) =>
      `מצב מיקום באשכולות מציג <strong>${shownLength}</strong> מרכזי אשכול מומלצים מתוך <strong>150 התאמות KMeans מובילות</strong>. מדד מרחק: <strong>${metricLabel}</strong>. הסמנים מייצגים אזורים כלליים מומלצים למיקום מיגוניות, ולא כיסוי מדויק לפי מרחק נגישות.`,
    exactModeLabel: (metricLabel) => `מצב מיקום מדויק (${metricLabel})`,
    coveragePhraseEuclidean: "בטווח של 200 מ' בקו אווירי",
    coveragePhraseGraph: (minuteLabel) => `בטווח הליכה של ${minuteLabel}`,
    exactStats: (modeLabel, uncoveredNow, coveragePhrase, shownLength, marginalCoverage, remainingUncovered) =>
      `ב<strong>${modeLabel}</strong> יש <strong>${uncoveredNow}</strong> מבני מגורים ללא מיגון <strong>${coveragePhrase}</strong>. הוספתם <strong>${shownLength}</strong> מיגוניות שעשויות <strong>לכסות מחדש</strong> כ-<strong>${marginalCoverage}</strong> מבנים נוספים <strong>${coveragePhrase}</strong>. נותרו <strong>${remainingUncovered}</strong> מבנים ללא כיסוי.`,
    buildingPopupCovered: (idx) => `<strong>מבנה #${idx}</strong><br>מכוסה על ידי מיגון קיים`,
    buildingPopupUncovered: (idx) => `<strong>מבנה #${idx}</strong><br>ללא כיסוי על ידי מיגון קיים`,
    buildingPost1992Popup:
      "<strong>מבנה שנבנה מ-1992 ואילך</strong><br>מוצג כלא נדרש לכיסוי מיגון חדש בניתוח זה",
    existingMegunitPopup: "<strong>מיגונית קיימת</strong>",
    existingMegunitLabel: "מיגונית קיימת",
    existingMiklatPopup: "<strong>מקלט קיים</strong>",
    existingMiklatLabel: "מקלט קיים",
    contourPopup: (heightMeters) => `<strong>קו גובה</strong><br>גובה: ${heightMeters} מ'`,
    mapClickElevationPopup: (heightMeters) => `<strong>גובה משוער</strong><br>${heightMeters} מ'`,
    recommendedLabel: (rank) => `מומלץ #${rank}`,
    modeLabelCluster: "אזור אשכול",
    modeLabelExact: "נקודה מדויקת",
    clusterPopup: (rank, modeLabel, source) =>
      `<strong>אשכול #${rank}</strong><br>מצב: ${modeLabel}<br>מקור: ${source}<br>אזור כללי מומלץ`,
    recommendedPopup: (rank, modeLabel, source, fullCount, marginalCount) =>
      `<strong>מיקום מומלץ #${rank}</strong><br>מצב: ${modeLabel}<br>מקור: ${source}<br>סך מבנים נגישים: ${fullCount}<br>כיסוי חדש: ${marginalCount} מבנים`,
    guideUsageTab: "שימוש",
    guideMethodsTab: "איך זה עובד",
    guideUsageTabAria: "לשונית שימוש",
    guideMethodsTabAria: "לשונית מתודולוגיה",
    guideTitleUsage: "עיר מקלט - בית שמש",
    guideTitleMethods: "איך זה עובד",
    guideUsageHtml: `
    <div class="guide-block" dir="rtl">
      <h3>איך משתמשים</h3>
      <ul>
        <li><strong>1.</strong> בוחרים <strong>אוקלידי</strong> או <strong>מרחק גרפי</strong> כדי לקבוע איך מודדים נגישות.</li>
        <li><strong>2.</strong> בוחרים <strong>מיקום מדויק</strong> או <strong>מיקום באשכולות</strong> לפי סוג ההמלצה הרצוי.</li>
        <li><strong>3.</strong> מוסיפים מיגוניות מומלצות באמצעות הסליידר כדי לבדוק תרחישי התערבות שונים.</li>
        <li><strong>4.</strong> בודקים את הסטטיסטיקה המתעדכנת, ואז לוחצים על מיגוניות במפה כדי לחקור שינויי כיסוי מקומיים.</li>
        <li><strong>5.</strong> משתמשים באזור <strong>שכבות</strong> שבמקרא כדי לשלוט בתצוגה ובמפת הבסיס.</li>
      </ul>
    </div>
  `,
    guideMethodsHtml: `
    <div class="guide-block" dir="rtl">
      <h3>מתודולוגיה</h3>
      <ul>
        <li><strong>0.</strong> מתגי ההנחות קובעים מה נחשב כממוגן מראש ואילו מתקנים נוספים נספרים כהיצע מיגון.</li>
        <li><strong>1.</strong> שכבות המבנים והמיגון מיושרות למערכת קואורדינטות משותפת במפה.</li>
        <li><strong>2.</strong> הנגישות הקיימת מחושבת לכל בניין לפי לוגיקת מרחק גרפי או אוקלידי.</li>
        <li><strong>3.</strong> מועמדים למיגון מדורגים לפי תוספת כיסוי ומוצגים כמיקומים מדויקים או כהנחיית אשכולות.</li>
        <li><strong>4.</strong> הסטטיסטיקה והשכבות מתעדכנות אינטראקטיבית כאשר משנים מצב ניתוח וכמות מיגוניות.</li>
      </ul>
    </div>
  `,
    errorLoadingData: (message) => `שגיאה בטעינת נתונים: ${message}`,
  },
};

const DATA_BASE = window.location.pathname.includes("/meguniot_access/") ? "../data" : "./data";
const NETWORK_BASE = `${DATA_BASE}/meguniot_network`;
const SCENARIO_BASE = `${NETWORK_BASE}/scenarios`;
const DEFAULT_ASSUMPTIONS = {
  post1992Sheltered: true,
  over3FloorsSheltered: false,
  educationShelters: false,
  publicShelters: false,
};
const LAYER_DEFAULTS = {
  meguniot: true,
  miklatim: true,
  recommended: true,
  topography: true,
  post1992Buildings: true,
  uncoveredBuildings: true,
  coveredBuildingsBase: true,
  covered: true,
  accessibilityHeatmap: false,
};

proj4.defs(
  "EPSG:2039",
  "+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +towgs84=-24.0024,-17.1032,-17.8444,-0.33077,-1.85269,1.66969,5.4248 +units=m +no_defs +type=crs",
);

const bucketSelect = document.getElementById("bucketSelect");
const appRoot = document.getElementById("app");
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
const assumePost1992Sheltered = document.getElementById("assumePost1992Sheltered");
const assumeOver3FloorsSheltered = document.getElementById("assumeOver3FloorsSheltered");
const assumeEducationShelters = document.getElementById("assumeEducationShelters");
const assumePublicShelters = document.getElementById("assumePublicShelters");

const layerMeguniot = document.getElementById("layerMeguniot");
const layerMiklatim = document.getElementById("layerMiklatim");
const layerRecommended = document.getElementById("layerRecommended");
const layerTopography = document.getElementById("layerTopography");
const layerPost1992Buildings = document.getElementById("layerPost1992Buildings");
const layerUncoveredBuildings = document.getElementById("layerUncoveredBuildings");
const layerCoveredBuildingsBase = document.getElementById("layerCoveredBuildingsBase");
const layerCovered = document.getElementById("layerCovered");
const accessibilityHeatmapToggle = document.getElementById("accessibilityHeatmapToggle");
const accessibilityHeatmapHint = document.getElementById("accessibilityHeatmapHint");
const coverageInspectHint = document.getElementById("coverageInspectHint");
const legendTopographyScaleLowEl = document.getElementById("legendTopographyScaleLow");
const legendTopographyScaleHighEl = document.getElementById("legendTopographyScaleHigh");
const legendTopographyScaleBarEl = document.getElementById("legendTopographyScaleBar");

const openGuideBtn = document.getElementById("openGuideBtn");
const closeGuideBtn = document.getElementById("closeGuideBtn");
const guideModal = document.getElementById("guideModal");
const guideCard = document.querySelector(".guide-card");
const guideTitle = document.getElementById("guideTitle");
const guideContent = document.getElementById("guideContent");
const languageToggle = document.getElementById("languageToggle");
const languageToggleModal = document.getElementById("languageToggleModal");
const languageToggles = [languageToggle, languageToggleModal].filter(Boolean);
const langLabelEn = document.getElementById("topLangLabelEn");
const langLabelHe = document.getElementById("topLangLabelHe");
const langLabelEnModal = document.getElementById("modalLangLabelEn");
const langLabelHeModal = document.getElementById("modalLangLabelHe");
const langLabelEnEls = [langLabelEn, langLabelEnModal].filter(Boolean);
const langLabelHeEls = [langLabelHe, langLabelHeModal].filter(Boolean);
const guideTabUsage = document.getElementById("guideTabUsage");
const guideTabMethods = document.getElementById("guideTabMethods");

let currentLanguage = "he";
let currentGuideTab = "usage";
let currentDistanceMetric = "euclidean";
let currentPlacementMode = "exact";
let accessibilityHeatmapEnabled = false;
let elevationLabelPopup = null;
let scenarioManifest = [];
let scenarioDataCache = {};
let currentScenarioKey = null;
let currentAssumptions = { ...DEFAULT_ASSUMPTIONS };

function t(key, ...args) {
  const value = I18N[currentLanguage]?.[key];
  if (typeof value === "function") return value(...args);
  return value ?? key;
}

function getBucketLabel(bucketKey) {
  return t(`bucketLabel_${bucketKey}`);
}

function getBaseMapLabel(mapKey) {
  return t(`baseMap_${mapKey}`);
}

function applyStaticTranslations() {
  const textMap = {
    step0Title: "step0Title",
    appTitle: "appTitle",
    appSubtitle: "appSubtitle",
    step1Title: "step1Title",
    step2Title: "step2Title",
    step3Title: "step3Title",
    step4Title: "step4Title",
    heatmapToggleLabel: "heatmapToggleLabel",
    accessibilityHeatmapHint: "accessibilityHeatmapHint",
    distanceMetricLabel: "distanceMetricLabel",
    placementModeLabel: "placementModeLabel",
    timeBucketLabel: "timeBucketLabel",
    downloadCsv: "downloadCsv",
    downloadGeojson: "downloadGeojson",
    coverageInspectHint: "coverageInspectHint",
    legendTitle: "legendTitle",
    legendExisting: "legendExisting",
    legendRecommended: "legendRecommended",
    legendPost1992: "legendPost1992",
    legendUncovered: "legendUncovered",
    legendCoveredBase: "legendCoveredBase",
    legendCoveredSelected: "legendCoveredSelected",
    legendTopography: "legendTopography",
    legendTopographyScaleTitle: "legendTopographyScaleTitle",
    legendTopographyScaleLow: "legendTopographyScaleLow",
    legendTopographyScaleHigh: "legendTopographyScaleHigh",
    layersSummary: "layersSummary",
    baseMapLabel: "baseMapLabel",
    layerMeguniotLabel: "layerMeguniotLabel",
    layerMiklatimLabel: "layerMiklatimLabel",
    layerRecommendedLabel: "layerRecommendedLabel",
    layerTopographyLabel: "layerTopographyLabel",
    layerPost1992BuildingsLabel: "layerPost1992BuildingsLabel",
    layerUncoveredBuildingsLabel: "layerUncoveredBuildingsLabel",
    layerCoveredBuildingsBaseLabel: "layerCoveredBuildingsBaseLabel",
    layerCoveredLabel: "layerCoveredLabel",
    countRangeLabel: "countRangeLabel",
    assumePost1992ShelteredLabel: "assumePost1992ShelteredLabel",
    assumeOver3FloorsShelteredLabel: "assumeOver3FloorsShelteredLabel",
    assumeEducationSheltersLabel: "assumeEducationSheltersLabel",
    assumePublicSheltersLabel: "assumePublicSheltersLabel",
    assumptionsHasShelterTitle: "assumptionsHasShelterTitle",
    assumptionsNeighborsTitle: "assumptionsNeighborsTitle",
  };
  for (const [id, key] of Object.entries(textMap)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (id.startsWith("step")) {
      el.innerHTML = t(key);
    } else {
      el.textContent = t(key);
    }
  }

  metricGraphBtn.textContent = t("metricGraphBtn");
  metricEuclideanBtn.textContent = t("metricEuclideanBtn");
  modeExactBtn.textContent = t("modeExactBtn");
  modeClusterBtn.textContent = t("modeClusterBtn");
  updateTopographyLegendScale();

  openGuideBtn.setAttribute("aria-label", t("infoAriaLabel"));
  closeGuideBtn.setAttribute("aria-label", t("closeHelpAriaLabel"));
  document.querySelector(".guide-tabs")?.setAttribute("aria-label", t("guideTabsAriaLabel"));
  document.querySelectorAll('.mode-toggle[role="group"]')?.[0]?.setAttribute("aria-label", t("distanceMetricLabel"));
  document.querySelectorAll('.mode-toggle[role="group"]')?.[1]?.setAttribute("aria-label", t("placementModeLabel"));
}

function repopulateLocalizedOptions() {
  const selectedBucket = bucketSelect.value;
  const selectedBaseMap = baseMapSelect.value;

  bucketSelect.innerHTML = "";
  for (const bucket of BUCKET_OPTIONS) {
    const opt = document.createElement("option");
    opt.value = bucket.key;
    opt.textContent = getBucketLabel(bucket.key);
    bucketSelect.appendChild(opt);
  }
  bucketSelect.value = selectedBucket || FIXED_BUCKET_KEY;

  baseMapSelect.innerHTML = "";
  for (const basemap of BASE_MAP_OPTIONS) {
    const opt = document.createElement("option");
    opt.value = basemap.key;
    opt.textContent = getBaseMapLabel(basemap.key);
    baseMapSelect.appendChild(opt);
  }
  baseMapSelect.value = selectedBaseMap || "streets";
}

for (const bucket of BUCKET_OPTIONS) {
  const opt = document.createElement("option");
  opt.value = bucket.key;
  opt.textContent = getBucketLabel(bucket.key);
  bucketSelect.appendChild(opt);
}
bucketSelect.value = FIXED_BUCKET_KEY;

for (const basemap of BASE_MAP_OPTIONS) {
  const opt = document.createElement("option");
  opt.value = basemap.key;
  opt.textContent = getBaseMapLabel(basemap.key);
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
  topography: L.layerGroup().addTo(map),
  post1992Buildings: L.layerGroup().addTo(map),
  uncoveredBuildings: L.layerGroup().addTo(map),
  coveredBuildingsBase: L.layerGroup().addTo(map),
  coveredBuildings: L.layerGroup().addTo(map),
  accessibilityHeatmap: L.layerGroup(),
};

const layerVisibility = { ...LAYER_DEFAULTS };

const dataStore = {
  miguniot: null,
  miguniotSourceCrs: "EPSG:2039",
  miklatim: null,
  miklatimSourceCrs: "EPSG:2039",
  buildings: null,
  buildingsSourceCrs: "EPSG:2039",
  educationFacilities: null,
  educationFacilitiesSourceCrs: "EPSG:2039",
  publicBuildings: null,
  publicBuildingsSourceCrs: "EPSG:2039",
  coverage: null,
  contour: null,
  contourSourceCrs: "EPSG:3857",
  contourSegments: [],
  contourElevationRange: { min: null, max: null },
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

function featureToLatLng(feature, sourceCrs = "EPSG:2039") {
  if (feature?.geometry?.type === "Point") {
    return geometryToLatLng(feature, sourceCrs);
  }
  const geometry = geometryToWgs(feature?.geometry, sourceCrs);
  if (!geometry) return null;
  const bounds = L.geoJSON({ type: "Feature", geometry, properties: {} }).getBounds();
  if (!bounds.isValid()) return null;
  const center = bounds.getCenter();
  return [center.lat, center.lng];
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

function getCoveragePointLatLng(coverage, idx) {
  if (Number.isFinite(coverage?.lat) && Number.isFinite(coverage?.lon)) {
    return L.latLng(coverage.lat, coverage.lon);
  }
  const buildingFeature = buildingFeatureByIndex.get(Number(idx));
  if (!buildingFeature) return null;
  const bounds = L.geoJSON(buildingFeature).getBounds();
  return bounds.isValid() ? bounds.getCenter() : null;
}

function getAccessibilityGridColor(score) {
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  const red = [200, 20, 20];
  const yellow = [239, 178, 0];
  const green = [20, 165, 65];
  const t = clamp01(score);
  if (t < 0.5) {
    const p = t / 0.5;
    return [lerp(red[0], yellow[0], p), lerp(red[1], yellow[1], p), lerp(red[2], yellow[2], p)];
  }
  const p = (t - 0.5) / 0.5;
  return [lerp(yellow[0], green[0], p), lerp(yellow[1], green[1], p), lerp(yellow[2], green[2], p)];
}

function percentile(sortedValues, percentileValue) {
  if (!sortedValues.length) return null;
  const boundedPercentile = Math.max(0, Math.min(1, percentileValue));
  const pos = (sortedValues.length - 1) * boundedPercentile;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sortedValues[lower];
  const fraction = pos - lower;
  return sortedValues[lower] * (1 - fraction) + sortedValues[upper] * fraction;
}

function getDistanceNormalizationMaxMeters() {
  const distances = [];
  for (const coverage of coverageByIndex.values()) {
    const distance = Number(coverage?.nearest_shelter_distance_m);
    if (Number.isFinite(distance) && distance >= 0) distances.push(distance);
  }
  if (!distances.length) return 1;
  distances.sort((a, b) => a - b);
  const p90 = percentile(distances, 0.9);
  return Number.isFinite(p90) && p90 > 0 ? p90 : distances[distances.length - 1] || 1;
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

function assumptionsEqual(a, b) {
  return (
    Boolean(a?.post1992Sheltered) === Boolean(b?.post1992Sheltered) &&
    Boolean(a?.over3FloorsSheltered) === Boolean(b?.over3FloorsSheltered) &&
    Boolean(a?.educationShelters) === Boolean(b?.educationShelters) &&
    Boolean(a?.publicShelters) === Boolean(b?.publicShelters)
  );
}

function scenarioMatchesAssumptions(entry, assumptions) {
  const scenarioAssumptions = entry?.assumptions || {};
  return assumptionsEqual(scenarioAssumptions, assumptions);
}

function getCurrentScenarioBasePath() {
  return currentScenarioKey ? `${SCENARIO_BASE}/${currentScenarioKey}` : NETWORK_BASE;
}

function syncAssumptionInputs() {
  if (assumePost1992Sheltered) assumePost1992Sheltered.checked = Boolean(currentAssumptions.post1992Sheltered);
  if (assumeOver3FloorsSheltered) {
    assumeOver3FloorsSheltered.checked = Boolean(currentAssumptions.over3FloorsSheltered);
  }
  if (assumeEducationShelters) assumeEducationShelters.checked = Boolean(currentAssumptions.educationShelters);
  if (assumePublicShelters) assumePublicShelters.checked = Boolean(currentAssumptions.publicShelters);
}

function readAssumptionsFromInputs() {
  return {
    post1992Sheltered: Boolean(assumePost1992Sheltered?.checked),
    over3FloorsSheltered: Boolean(assumeOver3FloorsSheltered?.checked),
    educationShelters: Boolean(assumeEducationShelters?.checked),
    publicShelters: Boolean(assumePublicShelters?.checked),
  };
}

async function loadScenarioManifest() {
  try {
    const payload = await fetchJson(`${NETWORK_BASE}/scenario_manifest.json`);
    if (Array.isArray(payload?.scenarios)) {
      scenarioManifest = payload.scenarios;
      const defaultScenario = scenarioManifest.find((entry) => entry.key === payload?.defaultScenarioKey);
      if (defaultScenario?.assumptions) {
        currentAssumptions = { ...DEFAULT_ASSUMPTIONS, ...defaultScenario.assumptions };
      }
    }
  } catch (_error) {
    scenarioManifest = [];
  }
}

function resolveScenarioKey(assumptions) {
  const matched = scenarioManifest.find((entry) => scenarioMatchesAssumptions(entry, assumptions));
  return matched?.key || null;
}

function setScenarioForAssumptions(assumptions) {
  currentAssumptions = { ...assumptions };
  currentScenarioKey = resolveScenarioKey(currentAssumptions);
  syncAssumptionInputs();
}

async function ensureScenarioDataLoaded() {
  const scenarioKey = currentScenarioKey || "__legacy__";
  if (scenarioDataCache[scenarioKey]) {
    const cached = scenarioDataCache[scenarioKey];
    dataStore.coverageByMetric = cached.coverageByMetric;
    dataStore.optimalByMetricModeBucket = cached.optimalByMetricModeBucket;
    dataStore.shelterCoveragesByMetricModeBucket = cached.shelterCoveragesByMetricModeBucket;
    return;
  }

  const basePath = getCurrentScenarioBasePath();
  const coverageByMetric = {};
  const optimalByMetricModeBucket = {};

  for (const metric of DISTANCE_METRIC_OPTIONS) {
    coverageByMetric[metric.key] = await fetchJson(`${basePath}/building_coverage_network_${metric.key}.json`);
  }

  for (const metric of DISTANCE_METRIC_OPTIONS) {
    optimalByMetricModeBucket[metric.key] = {};
    for (const mode of PLACEMENT_OPTIONS) {
      optimalByMetricModeBucket[metric.key][mode.key] = {};
      for (const bucket of BUCKET_OPTIONS) {
        optimalByMetricModeBucket[metric.key][mode.key][bucket.key] = await fetchJson(
          `${basePath}/optimal_meguniot_${metric.key}_${mode.key}_${bucket.key}.json`,
        );
      }
    }
  }

  const scenarioPayload = {
    coverageByMetric,
    optimalByMetricModeBucket,
    shelterCoveragesByMetricModeBucket: {},
  };
  scenarioDataCache[scenarioKey] = scenarioPayload;
  dataStore.coverageByMetric = scenarioPayload.coverageByMetric;
  dataStore.optimalByMetricModeBucket = scenarioPayload.optimalByMetricModeBucket;
  dataStore.shelterCoveragesByMetricModeBucket = scenarioPayload.shelterCoveragesByMetricModeBucket;
}

async function ensureBucketAuxData(bucketKey = getActiveBucketKey()) {
  if (!dataStore.shelterCoveragesByMetricModeBucket[currentDistanceMetric]?.[currentPlacementMode]?.[bucketKey]) {
    const basePath = getCurrentScenarioBasePath();
    const payload = await fetchJson(
      `${basePath}/shelter_coverages_${currentDistanceMetric}_${currentPlacementMode}_${bucketKey}.json`,
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
    countRange.value = "0";
    countRange.dataset.initialized = "true";
  }
  if (Number(countRange.value) > maxRecommendations) {
    countRange.value = String(maxRecommendations);
  }
  if (countLabel) {
    const modeLabel = currentPlacementMode === "cluster" ? t("clusterAreas") : t("shelters");
    countLabel.textContent = t("countRangeLabelDynamic", modeLabel, maxRecommendations);
  }
}

function resetAddedSheltersToZero() {
  countRange.value = "0";
  countValue.textContent = "0";
}

function setAccessibilityHeatmap(enabled) {
  accessibilityHeatmapEnabled = enabled;
  layerVisibility.accessibilityHeatmap = enabled;
  if (accessibilityHeatmapToggle) accessibilityHeatmapToggle.checked = enabled;
  accessibilityHeatmapHint?.classList.toggle("hidden", !enabled);
  coverageInspectHint?.classList.toggle("hidden", enabled);
}

function setDrawerOpen(panel, open) {
  if (!panel) return;
  const toggle = panel.querySelector(":scope > .drawer-toggle");
  const content = panel.querySelector(":scope > .drawer-content");
  if (!toggle || !content) return;
  panel.classList.toggle("is-open", open);
  content.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
}

function wireDrawerToggles() {
  const drawerPanels = document.querySelectorAll(".drawer-panel");
  for (const panel of drawerPanels) {
    const toggle = panel.querySelector(":scope > .drawer-toggle");
    if (!toggle) continue;
    const startsOpen = panel.classList.contains("is-open");
    setDrawerOpen(panel, startsOpen);
    toggle.addEventListener("click", () => {
      const isOpen = panel.classList.contains("is-open");
      setDrawerOpen(panel, !isOpen);
    });
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
    layer.bindPopup(covered ? t("buildingPopupCovered", idx) : t("buildingPopupUncovered", idx));
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
    layer.bindPopup(t("buildingPost1992Popup"));
    layer.addTo(layers.post1992Buildings);
  }
}

function renderAccessibilityHeatmap() {
  layers.accessibilityHeatmap.clearLayers();
  if (!accessibilityHeatmapEnabled) return;
  const zoom = map.getZoom();
  const cellSize = ACCESSIBILITY_GRID_CELL_SIZE_PX;
  const buckets = new Map();
  const distanceMaxMeters = getDistanceNormalizationMaxMeters();

  for (const [idx, coverage] of coverageByIndex.entries()) {
    const distanceMeters = Number(coverage?.nearest_shelter_distance_m);
    if (!Number.isFinite(distanceMeters) || distanceMeters < 0) continue;
    const normalizedDistance = Math.max(0, Math.min(1, distanceMeters / distanceMaxMeters));
    const score = 1 - normalizedDistance; // 1 = close (green), 0 = far (red)
    const point = getCoveragePointLatLng(coverage, idx);
    if (!point) continue;
    const projected = map.project(point, zoom);
    const cellX = Math.floor(projected.x / cellSize);
    const cellY = Math.floor(projected.y / cellSize);
    const key = `${cellX}:${cellY}`;
    const existing = buckets.get(key) || { cellX, cellY, scoreSum: 0, count: 0 };
    existing.scoreSum += score;
    existing.count += 1;
    buckets.set(key, existing);
  }

  for (const cell of buckets.values()) {
    const score = cell.count ? cell.scoreSum / cell.count : 0;
    const [r, g, b] = getAccessibilityGridColor(score);
    const northWest = map.unproject(L.point(cell.cellX * cellSize, cell.cellY * cellSize), zoom);
    const southEast = map.unproject(
      L.point((cell.cellX + 1) * cellSize, (cell.cellY + 1) * cellSize),
      zoom,
    );
    L.rectangle(L.latLngBounds(northWest, southEast), {
      stroke: false,
      fill: true,
      fillColor: `rgb(${r}, ${g}, ${b})`,
      fillOpacity: 0.86,
      interactive: false,
    }).addTo(layers.accessibilityHeatmap);
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
  const contourStatus =
    dataStore.contourSourceCrs === baseProjection || dataStore.contourSourceCrs === "EPSG:4326"
      ? "aligned (converted safely to WGS84 for Leaflet)"
      : "reprojected from local CRS; small datum-related offsets are possible";
  console.info(
    `[CRS check] contour: source=${dataStore.contourSourceCrs}, base=${baseProjection} -> ${contourStatus}`,
  );
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

function closeElevationLabelPopup() {
  if (!elevationLabelPopup) return;
  map.closePopup(elevationLabelPopup);
  elevationLabelPopup = null;
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

function getContourElevation(feature) {
  return getFirstNumericProperty(feature?.properties, ["HEIGHT", "height", "ELEV", "elev", "elevation"]);
}

function getContourColorByElevation(height, { min, max }) {
  if (!Number.isFinite(height) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return null;
  }
  const ratio = Math.max(0, Math.min(1, (height - min) / (max - min)));
  const hue = 230 - ratio * 215;
  return `hsl(${hue}, 88%, 58%)`;
}

function updateTopographyLegendScale() {
  if (!legendTopographyScaleBarEl) return;
  const { min, max } = dataStore.contourElevationRange || {};
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    legendTopographyScaleBarEl.style.background =
      "linear-gradient(90deg, hsl(230, 88%, 58%) 0%, hsl(15, 88%, 58%) 100%)";
    if (legendTopographyScaleLowEl) legendTopographyScaleLowEl.textContent = t("legendTopographyScaleLow");
    if (legendTopographyScaleHighEl) legendTopographyScaleHighEl.textContent = t("legendTopographyScaleHigh");
    return;
  }
  const stops = [0, 0.2, 0.4, 0.6, 0.8, 1]
    .map((ratio) => {
      const sampleHeight = min + (max - min) * ratio;
      const color = getContourColorByElevation(sampleHeight, { min, max }) || "hsl(230, 88%, 58%)";
      return `${color} ${Math.round(ratio * 100)}%`;
    })
    .join(", ");
  legendTopographyScaleBarEl.style.background = `linear-gradient(90deg, ${stops})`;

  const unit = currentLanguage === "he" ? " מ'" : "m";
  if (legendTopographyScaleLowEl) {
    legendTopographyScaleLowEl.textContent = `${t("legendTopographyScaleLow")} ${Math.round(min)}${unit}`;
  }
  if (legendTopographyScaleHighEl) {
    legendTopographyScaleHighEl.textContent = `${t("legendTopographyScaleHigh")} ${Math.round(max)}${unit}`;
  }
}

function contourStyleForElevation(height) {
  const hasHeight = Number.isFinite(height);
  const isMajor = hasHeight && Math.abs(height % 50) < 0.0001;
  const gradientColor = getContourColorByElevation(height, dataStore.contourElevationRange);
  const color = gradientColor || (isMajor ? "#8fc2ff" : "#6ea9f7");
  return {
    color,
    weight: isMajor ? 1.75 : 1.15,
    opacity: isMajor ? 0.9 : 0.72,
    lineCap: "round",
    lineJoin: "round",
    dashArray: null,
    interactive: true,
  };
}

function buildContourSegments() {
  const features = Array.isArray(dataStore.contour?.features) ? dataStore.contour.features : [];
  const segments = [];
  const elevations = [];
  for (const feature of features) {
    const elevation = getContourElevation(feature);
    if (Number.isFinite(elevation)) elevations.push(elevation);
    const coords = feature?.geometry?.coordinates;
    if (!coords) continue;
    const pushSegments = (lineCoords) => {
      if (!Array.isArray(lineCoords) || lineCoords.length < 2) return;
      for (let i = 1; i < lineCoords.length; i += 1) {
        const a = lineCoords[i - 1];
        const b = lineCoords[i];
        if (!Array.isArray(a) || !Array.isArray(b) || a.length < 2 || b.length < 2) continue;
        segments.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], elevation });
      }
    };
    if (feature?.geometry?.type === "LineString") {
      pushSegments(coords);
    } else if (feature?.geometry?.type === "MultiLineString") {
      for (const lineCoords of coords) pushSegments(lineCoords);
    }
  }
  dataStore.contourSegments = segments;
  dataStore.contourElevationRange = {
    min: elevations.length ? Math.min(...elevations) : null,
    max: elevations.length ? Math.max(...elevations) : null,
  };
  updateTopographyLegendScale();
}

function pointToSegmentDistanceSq(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const lenSq = vx * vx + vy * vy;
  if (!lenSq) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / lenSq));
  const projX = ax + t * vx;
  const projY = ay + t * vy;
  const dx = px - projX;
  const dy = py - projY;
  return dx * dx + dy * dy;
}

function estimateElevationAtLatLng(latlng) {
  if (!dataStore.contourSegments.length) return null;
  const [x, y] = proj4("EPSG:4326", dataStore.contourSourceCrs, [latlng.lng, latlng.lat]);
  let bestElevation = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  for (const segment of dataStore.contourSegments) {
    const dSq = pointToSegmentDistanceSq(x, y, segment.ax, segment.ay, segment.bx, segment.by);
    if (dSq < bestDistanceSq) {
      bestDistanceSq = dSq;
      bestElevation = segment.elevation;
    }
  }
  return Number.isFinite(bestElevation) ? Math.round(bestElevation) : null;
}

function isTopographyVisibleForInteraction() {
  return layerVisibility.topography && !accessibilityHeatmapEnabled && map.hasLayer(layers.topography);
}

function handleMapClickForElevation(event) {
  if (!isTopographyVisibleForInteraction()) return;
  const target = event?.originalEvent?.target;
  if (target?.closest?.(".leaflet-interactive")) return;
  const elevation = estimateElevationAtLatLng(event.latlng);
  if (!Number.isFinite(elevation)) return;
  closeElevationLabelPopup();
  elevationLabelPopup = L.popup({
    closeButton: false,
    autoClose: true,
    offset: [0, -6],
    className: "elevation-click-popup",
  })
    .setLatLng(event.latlng)
    .setContent(t("mapClickElevationPopup", elevation))
    .openOn(map);
}

function renderContourLayer() {
  layers.topography.clearLayers();
  const contourFeatures = Array.isArray(dataStore.contour?.features) ? dataStore.contour.features : [];
  if (!contourFeatures.length) return;

  const features = contourFeatures
    .map((feature) => {
      const geometry = geometryToWgs(feature?.geometry, dataStore.contourSourceCrs);
      if (!geometry) return null;
      return {
        type: "Feature",
        properties: feature?.properties || {},
        geometry,
      };
    })
    .filter(Boolean);

  L.geoJSON(
    { type: "FeatureCollection", features },
    {
      style: (feature) => contourStyleForElevation(getContourElevation(feature)),
      onEachFeature: (feature, layer) => {
        const elevation = getContourElevation(feature);
        if (Number.isFinite(elevation)) {
          layer.bindPopup(t("contourPopup", elevation));
        }
      },
    },
  ).addTo(layers.topography);
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
    marker.bindPopup(t("existingMegunitPopup"));
    marker.on("click", () =>
      selectShelter(
        {
          kind: "existing",
          id: shelterId,
          lat: latLng[0],
          lon: latLng[1],
          label: t("existingMegunitLabel"),
        },
      ),
    );
    marker.addTo(layers.existingMeguniot);
  }

  for (const feature of mikFeatures) {
    const latLng = geometryToLatLng(feature, dataStore.miklatimSourceCrs);
    if (!latLng) continue;
    const shelterId = shelterIdCounter++;
    const marker = L.marker(latLng, { icon: existingIcon });
    marker.bindPopup(t("existingMiklatPopup"));
    marker.on("click", () =>
      selectShelter(
        {
          kind: "existing",
          id: shelterId,
          lat: latLng[0],
          lon: latLng[1],
          label: t("existingMiklatLabel"),
        },
      ),
    );
    marker.addTo(layers.existingMiklatim);
  }

  if (currentAssumptions.educationShelters) {
    const educationFeatures = Array.isArray(dataStore.educationFacilities?.features)
      ? dataStore.educationFacilities.features
      : [];
    for (const feature of educationFeatures) {
      const latLng = featureToLatLng(feature, dataStore.educationFacilitiesSourceCrs);
      if (!latLng) continue;
      const shelterId = shelterIdCounter++;
      const marker = L.marker(latLng, { icon: existingIcon });
      marker.bindPopup(t("existingMiklatPopup"));
      marker.on("click", () =>
        selectShelter({
          kind: "existing",
          id: shelterId,
          lat: latLng[0],
          lon: latLng[1],
          label: t("existingMiklatLabel"),
        }),
      );
      marker.addTo(layers.existingMiklatim);
    }
  }

  if (currentAssumptions.publicShelters) {
    const publicFeatures = Array.isArray(dataStore.publicBuildings?.features)
      ? dataStore.publicBuildings.features
      : [];
    for (const feature of publicFeatures) {
      const latLng = featureToLatLng(feature, dataStore.publicBuildingsSourceCrs);
      if (!latLng) continue;
      const shelterId = shelterIdCounter++;
      const marker = L.marker(latLng, { icon: existingIcon });
      marker.bindPopup(t("existingMiklatPopup"));
      marker.on("click", () =>
        selectShelter({
          kind: "existing",
          id: shelterId,
          lat: latLng[0],
          lon: latLng[1],
          label: t("existingMiklatLabel"),
        }),
      );
      marker.addTo(layers.existingMiklatim);
    }
  }
}

function renderRecommended() {
  layers.recommended.clearLayers();
  const rows = recommendationsForCurrentView();
  const modeLabel = currentPlacementMode === "cluster" ? t("modeLabelCluster") : t("modeLabelExact");
  for (const rec of rows) {
    const shelterId = rec.shelter_id ?? rec.candidate_id ?? rec.building_idx;
    const fullCount = (rec.covered_building_indices || []).length;
    const marginalCount = rec.newly_covered_buildings ?? fullCount;
    const marker = L.marker([rec.lat, rec.lon], { icon: recommendedIcon });
    if (isClusterMode()) {
      marker.bindPopup(t("clusterPopup", rec.rank, modeLabel, rec.candidate_source || "cluster_ensemble_kmeans"));
    } else {
      marker.bindPopup(
        t("recommendedPopup", rec.rank, modeLabel, rec.candidate_source || "building", fullCount, marginalCount),
      );
    }
    marker.on("click", () =>
      selectShelter(
        {
          kind: "recommended",
          id: shelterId,
          lat: rec.lat,
          lon: rec.lon,
          label: t("recommendedLabel", rec.rank),
        },
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
  for (let mi = 0; mi < matches.length; mi++) {
    const { shelter, coverage: match } = matches[mi];
    const color = colors[mi % colors.length];
    const style = { color, weight: 2, fillColor: color, fillOpacity: 0.7, opacity: 1 };
    const indices = Array.isArray(match.covered_building_indices) ? match.covered_building_indices : [];

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

function selectShelter(shelter) {
  selectedShelters = [shelter];
  renderSelectedShelterCoverage();
  flyToSelectedShelterView();
  renderStats();
}

function applyLayerVisibility() {
  if (accessibilityHeatmapEnabled) {
    const standardLayers = [
      layers.existingMeguniot,
      layers.existingMiklatim,
      layers.recommended,
      layers.topography,
      layers.post1992Buildings,
      layers.uncoveredBuildings,
      layers.coveredBuildingsBase,
      layers.coveredBuildings,
    ];
    for (const layer of standardLayers) {
      map.removeLayer(layer);
    }
    if (!map.hasLayer(layers.accessibilityHeatmap)) {
      map.addLayer(layers.accessibilityHeatmap);
    }
    return;
  }

  map.removeLayer(layers.accessibilityHeatmap);
  const bindings = [
    ["meguniot", layers.existingMeguniot],
    ["miklatim", layers.existingMiklatim],
    ["recommended", layers.recommended],
    ["topography", layers.topography],
    ["post1992Buildings", layers.post1992Buildings],
    ["uncoveredBuildings", layers.uncoveredBuildings],
    ["coveredBuildingsBase", layers.coveredBuildingsBase],
    ["covered", layers.coveredBuildings],
  ];
  for (const [key, layer] of bindings) {
    if (layerVisibility[key]) map.addLayer(layer);
    else map.removeLayer(layer);
  }
  if (!isTopographyVisibleForInteraction()) {
    closeElevationLabelPopup();
  }
}

function renderStats() {
  const bucketData = getCurrentBucketData();
  if (!bucketData) {
    statsEl.textContent = t("loadingData");
    return;
  }
  if (accessibilityHeatmapEnabled) {
    statsEl.innerHTML = t("accessibilityStats");
    return;
  }
  const stats = bucketData.statistics;
  const shown = recommendationsForCurrentView();
  const minuteLabel = getBucketLabel(getActiveBucketKey());
  const metricLabel =
    currentDistanceMetric === "euclidean" ? t("metricLabelEuclidean") : t("metricLabelGraph");

  if (isClusterMode()) {
    statsEl.innerHTML = t("clusterStats", shown.length, metricLabel);
    return;
  }

  const marginalCoverage = shown.reduce((sum, row) => sum + row.newly_covered_buildings, 0);
  const uncoveredNow = Number(stats.currently_uncovered) || 0;
  const remainingUncovered = Math.max(0, uncoveredNow - marginalCoverage);
  const modeLabel = t("exactModeLabel", metricLabel);
  const coveragePhrase =
    currentDistanceMetric === "euclidean"
      ? t("coveragePhraseEuclidean")
      : t("coveragePhraseGraph", minuteLabel);

  statsEl.innerHTML = t(
    "exactStats",
    modeLabel,
    uncoveredNow,
    coveragePhrase,
    shown.length,
    marginalCoverage,
    remainingUncovered,
  );
}

async function refreshView() {
  await ensureBucketAuxData(getActiveBucketKey());
  updateSliderBounds();
  countValue.textContent = countRange.value;
  renderExistingCoverageBuildings();
  renderAccessibilityHeatmap();
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
  guideContent.classList.toggle("methods-body", currentGuideTab === "methods");
  guideContent.setAttribute("dir", currentLanguage === "he" ? "rtl" : "ltr");
  guideContent.innerHTML = currentGuideTab === "usage" ? t("guideUsageHtml") : t("guideMethodsHtml");
  guideTitle.textContent =
    currentGuideTab === "usage" ? t("guideTitleUsage") : t("guideTitleMethods");
}

function setGuideLanguage(lang, { refreshMap = true } = {}) {
  currentLanguage = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = "ltr";
  appRoot?.classList.toggle("lang-he-ui", lang === "he");
  guideCard.classList.toggle("lang-he", lang === "he");
  for (const toggle of languageToggles) {
    toggle.checked = lang === "he";
  }
  for (const label of langLabelEnEls) {
    label.classList.toggle("active-lang-label", lang === "en");
  }
  for (const label of langLabelHeEls) {
    label.classList.toggle("active-lang-label", lang === "he");
  }
  guideTabUsage.textContent = t("guideUsageTab");
  guideTabMethods.textContent = t("guideMethodsTab");
  guideTabUsage.setAttribute("aria-label", t("guideUsageTabAria"));
  guideTabMethods.setAttribute("aria-label", t("guideMethodsTabAria"));
  applyStaticTranslations();
  repopulateLocalizedOptions();
  updateSliderBounds();
  if (refreshMap) {
    renderExistingShelters();
    renderContourLayer();
    renderExistingCoverageBuildings();
    renderAccessibilityHeatmap();
    renderRecommended();
    renderSelectedShelterCoverage();
    renderStats();
    applyLayerVisibility();
  }
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
  await loadScenarioManifest();
  setScenarioForAssumptions(currentAssumptions);
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
  dataStore.educationFacilities = await fetchJson(`${DATA_BASE}/Education_Facilities.geojson`);
  dataStore.educationFacilitiesSourceCrs = normalizeCrsName(
    dataStore.educationFacilities?.crs?.properties?.name || "",
  );
  dataStore.publicBuildings = await fetchJson(`${DATA_BASE}/Public_Buildings.geojson`);
  dataStore.publicBuildingsSourceCrs = normalizeCrsName(
    dataStore.publicBuildings?.crs?.properties?.name || "",
  );
  dataStore.contour = await fetchJson(`${DATA_BASE}/contour.geojson`);
  dataStore.contourSourceCrs = normalizeCrsName(
    dataStore.contour?.crs?.properties?.name || "",
  );
  buildContourSegments();
  await ensureScenarioDataLoaded();
  dataStore.coverage = dataStore.coverageByMetric[currentDistanceMetric];

  coverageByIndex.clear();
  coverageById.clear();
  for (const b of dataStore.coverage.buildings || []) {
    coverageByIndex.set(Number(b.building_idx), b);
    coverageById.set(Number(b.id), b);
  }
  buildBuildingFeatureIndex();

}

function setDistanceMetric(metricKey) {
  if (!DISTANCE_METRIC_OPTIONS.find((m) => m.key === metricKey)) return;
  if (accessibilityHeatmapEnabled) setAccessibilityHeatmap(false);
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
  if (accessibilityHeatmapEnabled) setAccessibilityHeatmap(false);
  currentPlacementMode = modeKey;
  modeExactBtn?.classList.toggle("active-toggle", modeKey === "exact");
  modeClusterBtn?.classList.toggle("active-toggle", modeKey === "cluster");
  bucketControls?.classList.add("hidden-control");
  if (bucketSelect) {
    bucketSelect.disabled = true;
  }
  clearSelection();
  void refreshView();
}

async function applyAssumptions(nextAssumptions) {
  setScenarioForAssumptions(nextAssumptions);
  await ensureScenarioDataLoaded();
  dataStore.coverage = dataStore.coverageByMetric[currentDistanceMetric] || null;
  coverageByIndex.clear();
  coverageById.clear();
  for (const b of dataStore.coverage?.buildings || []) {
    coverageByIndex.set(Number(b.building_idx), b);
    coverageById.set(Number(b.id), b);
  }
  buildBuildingFeatureIndex();
  resetAddedSheltersToZero();
  clearSelection();
  await refreshView();
  renderExistingShelters();
  applyLayerVisibility();
}

function wireEvents() {
  bucketSelect.addEventListener("change", () => {
    if (accessibilityHeatmapEnabled) setAccessibilityHeatmap(false);
    clearSelection();
    void refreshView();
  });
  countRange.addEventListener("input", () => {
    if (accessibilityHeatmapEnabled) setAccessibilityHeatmap(false);
    void refreshView();
  });
  metricGraphBtn?.addEventListener("click", () => setDistanceMetric("graph"));
  metricEuclideanBtn?.addEventListener("click", () => setDistanceMetric("euclidean"));
  modeExactBtn?.addEventListener("click", () => setPlacementMode("exact"));
  modeClusterBtn?.addEventListener("click", () => setPlacementMode("cluster"));
  baseMapSelect?.addEventListener("change", () => setBaseMap(baseMapSelect.value));
  map.on("click", handleMapClickForElevation);
  map.on("zoomend moveend", () => {
    if (!accessibilityHeatmapEnabled) return;
    renderAccessibilityHeatmap();
    applyLayerVisibility();
  });

  downloadCsvBtn.addEventListener("click", () => {
    if (accessibilityHeatmapEnabled) setAccessibilityHeatmap(false);
    const rows = recommendationsForCurrentView();
    const activeBucket = getActiveBucketKey();
    const label = activeBucket;
    const suffix = isClusterMode() ? "clusters" : label;
    downloadBlob(
      toCsv(rows),
      `recommended_meguniot_${currentDistanceMetric}_${currentPlacementMode}_${suffix}.csv`,
      "text/csv;charset=utf-8",
    );
  });

  downloadGeojsonBtn.addEventListener("click", () => {
    if (accessibilityHeatmapEnabled) setAccessibilityHeatmap(false);
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
    const label = activeBucket;
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
    [layerTopography, "topography"],
    [layerPost1992Buildings, "post1992Buildings"],
    [layerUncoveredBuildings, "uncoveredBuildings"],
    [layerCoveredBuildingsBase, "coveredBuildingsBase"],
    [layerCovered, "covered"],
  ];
  for (const [checkbox, key] of layerCheckboxMap) {
    checkbox.checked = layerVisibility[key];
    checkbox.addEventListener("change", () => {
      layerVisibility[key] = checkbox.checked;
      if (key === "topography" && !checkbox.checked) closeElevationLabelPopup();
      applyLayerVisibility();
    });
  }
  if (accessibilityHeatmapToggle) {
    accessibilityHeatmapToggle.checked = accessibilityHeatmapEnabled;
  }
  setAccessibilityHeatmap(accessibilityHeatmapEnabled);

  accessibilityHeatmapToggle?.addEventListener("change", () => {
    const enabled = accessibilityHeatmapToggle.checked;
    setAccessibilityHeatmap(enabled);
    if (enabled) resetAddedSheltersToZero();
    clearSelection();
    renderAccessibilityHeatmap();
    renderStats();
    applyLayerVisibility();
    if (!enabled) {
      void refreshView();
    }
  });

  const assumptionInputs = [
    assumePost1992Sheltered,
    assumeOver3FloorsSheltered,
    assumeEducationShelters,
    assumePublicShelters,
  ].filter(Boolean);
  for (const input of assumptionInputs) {
    input.addEventListener("change", () => {
      void applyAssumptions(readAssumptionsFromInputs());
    });
  }

  openGuideBtn.addEventListener("click", () => guideModal.classList.remove("hidden"));
  closeGuideBtn.addEventListener("click", () => guideModal.classList.add("hidden"));
  guideModal.addEventListener("click", (e) => {
    if (e.target === guideModal) guideModal.classList.add("hidden");
  });
  for (const toggle of languageToggles) {
    toggle.addEventListener("change", () => {
      setGuideLanguage(toggle.checked ? "he" : "en");
    });
  }
  guideTabUsage.addEventListener("click", () => setGuideTab("usage"));
  guideTabMethods.addEventListener("click", () => setGuideTab("methods"));
  wireDrawerToggles();
}

setBaseMap(baseMapSelect.value || "streets");
setGuideLanguage("he", { refreshMap: false });
setGuideTab("usage");

loadAllData()
  .then(() => {
    wireEvents();
    renderExistingShelters();
    renderContourLayer();
    reportProjectionStatus();
    setPlacementMode("exact");
    setGuideLanguage(currentLanguage);
  })
  .catch((err) => {
    console.error(err);
    statsEl.textContent = t("errorLoadingData", err.message);
  });
