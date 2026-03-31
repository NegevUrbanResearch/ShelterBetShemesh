const BUCKET_OPTIONS = [{ key: "5min", seconds: 300 }];
const DISTANCE_METRIC_OPTIONS = [{ key: "euclidean" }];
const PLACEMENT_OPTIONS = [{ key: "exact" }];
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
const BUILDING_USE_TYPES = [2, 4];
const WEIGHTED_ALLOWED_BUILDING_USE_TYPES = [2];
const WEIGHTING_DISABLED_BUILDING_USE_TYPES = [4];
const I18N = {
  en: {
    appTitle: "Access to Shelter - Beit Shemesh",
    appSubtitle: "Municipal shelter accessibility planning",
    infoAriaLabel: "Info",
    closeHelpAriaLabel: "Close help",
    guideTabsAriaLabel: "Guide sections",
    mobileControlsBtn: "Controls",
    prototypeBanner: "Prototype",
    mobilePanelTitle: "Map controls",
    mobileCloseAriaLabel: "Close controls",
    step1Title: '<span class="step-chip">1</span><span class="step-title-text">Inspect coverage</span>',
    step0Title: '<span class="step-chip">1</span><span class="step-title-text">Assumptions</span>',
    step3Title: '<span class="step-chip">2</span><span class="step-title-text">Add shelters</span>',
    step4Title: '<span class="step-chip">3</span><span class="step-title-text">Local impact</span>',
    heatmapToggleLabel: "Heatmap",
    accessibilityHeatmapHint: "Green = closer/covered | Red = farther/uncovered",
    distanceMetricLabel: "Distance",
    placementModeLabel: "Placement",
    timeBucketLabel: "Time bucket",
    downloadCsv: "Download CSV",
    downloadGeojson: "Download GeoJSON",
    coverageInspectHint: "Click a shelter marker to see local impact.",
    legendTitle: "Map legend",
    legendExisting: "Existing shelters (meguniot + miklatim)",
    legendMeguniot: "Existing meguniot",
    legendMiklatim: "Existing miklatim",
    legendEducationShelters: "Educational facilities",
    legendPublicShelters: "Public buildings",
    legendRecommended: "Recommended shelters",
    legendPost1992: "Assumed sheltered by rules",
    legendUncovered: "Uncovered buildings (existing conditions)",
    legendCoveredBase: "Buildings covered by existing shelters",
    legendNotRelevant: "Not relevant for selected building-type criteria",
    legendCoveredSelected: "Covered by selected shelter",
    legendTopography: "Topography contour lines",
    legendTopographyScaleTitle: "",
    legendTopographyScaleLow: "Low",
    legendTopographyScaleHigh: "High",
    layersSummary: "Manage layers",
    layersModalTitle: "Manage layers",
    baseMapLabel: "Base map",
    layerMeguniotLabel: "Existing meguniot",
    layerMiklatimLabel: "Existing miklatim",
    layerRecommendedLabel: "Recommended meguniot",
    layerTopographyLabel: "Topography (contours)",
    layerPost1992BuildingsLabel: "Assumed sheltered by rules",
    layerNotRelevantBuildingsLabel: "Not relevant by building type",
    layerUncoveredBuildingsLabel: "Uncovered buildings",
    layerCoveredBuildingsBaseLabel: "Covered buildings",
    layerCoveredLabel: "Covered by selected shelter",
    metricEuclideanBtn: "Euclidean",
    modeExactBtn: "Exact",
    countRangeLabel: "Recommended shelters",
    assumptionsHasShelterTitle: "Has Shelter",
    assumptionsNeighborsTitle: "Shelter Neighbors",
    assumePost1992ShelteredLabel: "Built in/after 1995",
    assumeOver3FloorsShelteredLabel: "Above 3 floors",
    assumeEducationSheltersLabel: "Educational facilities",
    assumePublicSheltersLabel: "Public buildings",
    assumptionsPlacementTitle: "Placement",
    assumptionsWeightingTitle: "Weighting",
    assumptionsBuildingTypesTitle: "Building types",
    buildingTypesSelectAllLabel: "Select all",
    buildingTypesDeselectAllLabel: "Deselect all",
    buildingTypesAllSelectedLabel: "All building types",
    buildingTypesMoreSelectedLabel: (extraCount) => `+${extraCount} more`,
    buildingTypesCountLabel: (selectedCount, totalCount) => `${selectedCount}/${totalCount}`,
    buildingTypesNoneSelectedLabel: "No building types selected",
    buildingFilterAllLabel: "All",
    assumeOnlyPublicLandLabel: "Only place on public land",
    assumeWholeSettlementLabel: "Place shelters in whole settlement",
    assumeWeightByBuildingsLabel: "Select shelters by number of buildings",
    assumeWeightByPopulationLabel: "Weight by # residents",
    weightingBuildingTypeRestrictionNotice:
      "Resident weighting is on. Non-residential building category is turned off automatically.",
    weightingBuildingTypeRestrictionDisabledHint: "Can't use with resident weighting",
    assumeBuildingUseType2Label: "Residential (incl. mixed use)",
    assumeBuildingUseType4Label: "Non-residential (public + commercial)",
    countRangeLabelDynamic: (modeLabel, maxRecommendations) =>
      `Recommended ${modeLabel} (max ${maxRecommendations})`,
    clusterAreas: "cluster areas",
    shelters: "shelters",
    bucketLabel_5min: "5-minute",
    baseMap_streets: "Streets (OpenStreetMap)",
    baseMap_satellite: "Satellite (Esri World Imagery)",
    baseMap_light: "Light (Carto Positron)",
    loadingTitle: "Preparing shelter map",
    loadingData: "Loading data...",
    loadingStageManifest: "Loading scenario definitions...",
    loadingStageCoreLayers: "Loading shelters and buildings...",
    loadingStageNeighborLayers: "Loading neighboring shelter layers...",
    loadingStageTerrain: "Loading topography contours...",
    loadingStageCoverage: "Calculating coverage indexes...",
    loadingStageFinalizing: "Finalizing map view...",
    accessibilityStats:
      "Accessibility heatmap mode is active. <strong>Green</strong> areas are closer and covered, while <strong>red</strong> areas are farther and/or uncovered.",
    metricLabelEuclidean: "default method",
    metricLabelGraph: "graph walking",
    clusterStats: (shownLength, _metricLabel) =>
      `Cluster placement mode is showing <strong>${shownLength}</strong> recommended cluster centers from the top <strong>150 KMeans fits</strong>. These markers represent general recommended areas for shelter placement.`,
    exactModeLabel: (_metricLabel) => "current analysis mode",
    coveragePhraseEuclidean: "within 100m straight-line distance",
    coveragePhraseGraph: (minuteLabel) => `within ${minuteLabel} walking distance`,
    exactStats: (_modeLabel, uncoveredNow, _coveragePhrase, shownLength, marginalCoverage, remainingUncovered) =>
      `There are <strong>${uncoveredNow}</strong> residential buildings currently without shelter coverage. You have added <strong>${shownLength}</strong> shelters that would <strong>newly cover</strong> about <strong>${marginalCoverage}</strong> additional buildings. There remain <strong>${remainingUncovered}</strong> uncovered buildings.`,
    statsNoBuildingTypes:
      "No building types are selected, so no target buildings are included in this analysis and no new shelters are suggested.",
    buildingPopupCovered: (idx) => `<strong>Building #${idx}</strong><br>Covered by existing shelters`,
    buildingPopupUncovered: (idx) => `<strong>Building #${idx}</strong><br>Uncovered by existing shelters`,
    buildingAssumedShelteredPopup:
      "<strong>Building assumed as already sheltered</strong><br>Shown as not requiring new shelter coverage in this analysis",
    buildingPost1992Popup:
      "<strong>Building built in/after 1995</strong><br>Shown as not requiring new shelter coverage in this analysis",
    existingMegunitPopup: "<strong>Existing megunit</strong>",
    existingMegunitLabel: "Existing megunit",
    existingMiklatPopup: "<strong>Existing miklat</strong>",
    existingMiklatLabel: "Existing miklat",
    contourPopup: (heightMeters) => `<strong>Contour</strong><br>Elevation: ${heightMeters}m`,
    mapClickElevationPopup: (heightMeters) => `<strong>Approx elevation</strong><br>${heightMeters}m`,
    buildingPopupTitle: (idx) => `Building #${idx}`,
    buildingPopupStatusCovered: "Covered by existing shelters",
    buildingPopupStatusUncovered: "Uncovered by existing shelters",
    buildingPopupStatusAssumed: "Excluded from target buildings by assumptions",
    buildingPopupStatusNotRelevant: "Not relevant for selected building-type criteria",
    buildingPopupTypeLabel: "Building type",
    buildingPopupTypeStoryLabel: "Type story",
    buildingPopupTypeUnknown: "Unknown",
    buildingPopupTypeStory_2: "Residential (including mixed use)",
    buildingPopupTypeStory_4: "Non-residential (public + commercial)",
    buildingPopupMetaLabel: "Metadata",
    buildingPopupAssumptionsLabel: "Assumption effects",
    buildingPopupBuildYear: "Build year",
    buildingPopupFloors: "Floors",
    buildingPopupApartments: "Apartments",
    buildingAssumptionPost1992: "Excluded by post-1995 sheltered assumption",
    buildingAssumptionOver3Floors: "Excluded by over-3-floors sheltered assumption",
    buildingAssumptionTypeFiltered: "Excluded by selected building types",
    buildingAssumptionNoTypes: "No building types are selected",
    buildingAssumptionWeightIgnored: "Excluded from population weighting for this type",
    buildingAssumptionWeightFull: "Weighted in population mode",
    buildingAssumptionNone: "No assumption filters currently affect this building",
    buildingTypesCriteriaLabel: "Building-type criteria",
    buildingTypesCriteriaNone: "No building types selected",
    buildingNotRelevantHoverTitle: "Not relevant for selected building-type criteria",
    buildingNotRelevantHoverCriteriaPrefix: "Criteria",
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
        <li><strong>1.</strong> Set assumptions and choose target building categories.</li>
        <li><strong>2.</strong> Add recommended shelters with the slider to test different intervention sizes.</li>
        <li><strong>3.</strong> Inspect updated statistics, then click shelters on the map to explore local coverage change.</li>
        <li><strong>4.</strong> Use legend <strong>Layers</strong> to manage map visibility and base map context.</li>
      </ul>
    </div>
  `,
    guideMethodsHtml: `
    <div class="guide-block">
      <h3>Methodology</h3>
      <ul>
        <li><strong>0.</strong> The process applies the configured shelter and exclusion rules to define target buildings.</li>
        <li><strong>1.</strong> Building and shelter layers are harmonized to a shared map coordinate system.</li>
        <li><strong>2.</strong> Existing accessibility is computed for each building using the project's fixed distance method.</li>
        <li><strong>3.</strong> Candidate shelters are ranked by additional coverage and published as recommended locations.</li>
        <li><strong>4.</strong> Statistics and map layers update interactively as you change shelter count.</li>
      </ul>
    </div>
  `,
    errorLoadingData: (message) => `Error loading data: ${message}`,
    errorMissingScenarioAnalysis: (scenarioKey) =>
      `Missing analysis output for scenario "${scenarioKey}". Please generate this scenario and try again.`,
  },
  he: {
    appTitle: "עיר מקלט - בית שמש",
    appSubtitle: "תכנון נגישות למרחבים מוגנים בעיר",
    infoAriaLabel: "מידע",
    closeHelpAriaLabel: "סגירת עזרה",
    guideTabsAriaLabel: "לשוניות מדריך",
    mobileControlsBtn: "פקדים",
    prototypeBanner: "טיוטה",
    mobilePanelTitle: "פקדי מפה",
    mobileCloseAriaLabel: "סגירת פקדים",
    step1Title: '<span class="step-chip">1</span><span class="step-title-text">בדיקת כיסוי</span>',
    step0Title: '<span class="step-chip">1</span><span class="step-title-text">הנחות</span>',
    step3Title: '<span class="step-chip">2</span><span class="step-title-text">הוספת מיגוניות</span>',
    step4Title: '<span class="step-chip">3</span><span class="step-title-text">השפעה מקומית</span>',
    heatmapToggleLabel: "בדיקת כיסוי (מפת חום)",
    accessibilityHeatmapHint: "ירוק = קרוב/מכוסה | אדום = רחוק/ללא כיסוי",
    distanceMetricLabel: "מרחק",
    placementModeLabel: "מיקום",
    timeBucketLabel: "חלון זמן",
    downloadCsv: "הורדת CSV",
    downloadGeojson: "הורדת GeoJSON",
    coverageInspectHint: "לחצו על מיגונית במפה כדי לראות השפעה מקומית.",
    legendTitle: "מקרא מפה",
    legendExisting: "מיגון קיים (מיגוניות + מקלטים)",
    legendMeguniot: "מיגוניות קיימות",
    legendMiklatim: "מקלטים קיימים",
    legendEducationShelters: "מוסדות חינוך",
    legendPublicShelters: "מבני ציבור",
    legendRecommended: "מיגון מוצע",
    legendPost1992: "מבנים שמוגדרים כממוגנים לפי הכללים",
    legendUncovered: "מבנים ללא פתרון מיגון",
    legendCoveredBase: "מבנים מכוסים על ידי מיגון קיים",
    legendNotRelevant: "מבנים שאינם נכללים בבדיקה",
    legendCoveredSelected: "מכוסים על ידי מיגונית שנבחרה",
    legendTopography: "קווי גובה טופוגרפיים",
    legendTopographyScaleTitle: "",
    legendTopographyScaleLow: "נמוך",
    legendTopographyScaleHigh: "גבוה",
    layersSummary: "ניהול שכבות",
    layersModalTitle: "ניהול שכבות",
    baseMapLabel: "מפת בסיס",
    layerMeguniotLabel: "מיגוניות קיימות",
    layerMiklatimLabel: "מקלטים קיימים",
    layerRecommendedLabel: "מיגון מוצע",
    layerTopographyLabel: "טופוגרפיה (קווי גובה)",
    layerPost1992BuildingsLabel: "מבנים שמוגדרים כממוגנים לפי הכללים",
    layerNotRelevantBuildingsLabel: "מבנים שאינם נכללים בבדיקה",
    layerUncoveredBuildingsLabel: "מבנים ללא פתרון מיגון",
    layerCoveredBuildingsBaseLabel: "מבנים מכוסים",
    layerCoveredLabel: "מכוסים על ידי מיגונית שנבחרה",
    metricGraphBtn: "מרחק הליכה",
    metricEuclideanBtn: "אוקלידי",
    modeExactBtn: "מדויק",
    modeClusterBtn: "אשכול",
    countRangeLabel: "מיגון מוצע",
    assumptionsHasShelterTitle: "מבנים שכוללים מיגון",
    assumptionsNeighborsTitle: "מקלטים ציבוריים נגישים",
    assumePost1992ShelteredLabel: "נבנה מ-1995 ואילך",
    assumeOver3FloorsShelteredLabel: "מעל 3 קומות",
    assumeEducationSheltersLabel: "מוסדות חינוך",
    assumePublicSheltersLabel: "מבני ציבור",
    assumptionsPlacementTitle: "מיקום",
    assumptionsWeightingTitle: "שקלול",
    assumptionsBuildingTypesTitle: "סוגי מבנים",
    buildingTypesSelectAllLabel: "בחר הכל",
    buildingTypesDeselectAllLabel: "נקה הכל",
    buildingTypesAllSelectedLabel: "כל סוגי המבנים",
    buildingTypesMoreSelectedLabel: (extraCount) => `+${extraCount} נוספים`,
    buildingTypesCountLabel: (selectedCount, totalCount) => `${selectedCount}/${totalCount}`,
    buildingTypesNoneSelectedLabel: "לא נבחרו סוגי מבנים",
    buildingFilterAllLabel: "הכל",
    assumeOnlyPublicLandLabel: "פתרונות מיגון חדש רק בשטחים ציבוריים",
    assumeWholeSettlementLabel: "מיקום מיגוניות בכל היישוב",
    assumeWeightByBuildingsLabel: "בחירת מיגוניות לפי מספר מבנים",
    assumeWeightByPopulationLabel: "שקלול תוצאות לפי מספר יח״ד ",
    weightingBuildingTypeRestrictionNotice:
      "שקלול לפי תושבים פעיל. קטגוריית לא-למגורים כבויה אוטומטית.",
    weightingBuildingTypeRestrictionDisabledHint: "לא ניתן לשימוש עם שקלול לפי תושבים",
    assumeBuildingUseType2Label: "מגורים (כולל שימוש מעורב)",
    assumeBuildingUseType4Label: "לא למגורים (ציבורי + מסחרי)",
    countRangeLabelDynamic: (modeLabel, maxRecommendations) => `מיגון מוצע (${modeLabel}, מקסימום ${maxRecommendations})`,
    clusterAreas: "אזורי אשכול",
    shelters: "מיגוניות",
    bucketLabel_5min: "5 דקות",
    baseMap_streets: "רחובות (OpenStreetMap)",
    baseMap_satellite: "לוויין (Esri World Imagery)",
    baseMap_light: "בהיר (Carto Positron)",
    loadingTitle: "מכין את מפת המיגון",
    loadingData: "טוען נתונים...",
    loadingStageManifest: "טוען הגדרות תרחישים...",
    loadingStageCoreLayers: "טוען שכבות מיגון ומבנים...",
    loadingStageNeighborLayers: "טוען שכבות מיגון שכנים...",
    loadingStageTerrain: "טוען קווי גובה...",
    loadingStageCoverage: "מחשב אינדקסי כיסוי...",
    loadingStageFinalizing: "מסיים את תצוגת המפה...",
    accessibilityStats:
      "מצב מפת חום לנגישות פעיל. אזורים <strong>ירוקים</strong> קרובים ומכוסים, ואזורים <strong>אדומים</strong> רחוקים יותר ו/או ללא כיסוי.",
    metricLabelEuclidean: "שיטת ברירת המחדל",
    metricLabelGraph: "מרחק הליכה ברשת הדרכים",
    clusterStats: (shownLength, _metricLabel) =>
      `מצב מיקום באשכולות מציג <strong>${shownLength}</strong> מרכזי אשכול מומלצים מתוך <strong>150 התאמות KMeans מובילות</strong>. הסמנים מייצגים אזורים כלליים מומלצים למיקום מיגוניות.`,
    exactModeLabel: (_metricLabel) => "מצב הניתוח הנוכחי",
    coveragePhraseEuclidean: "בטווח של 100 מ' בקו אווירי",
    coveragePhraseGraph: (minuteLabel) => `בטווח הליכה של ${minuteLabel}`,
    exactStats: (_modeLabel, uncoveredNow, _coveragePhrase, shownLength, marginalCoverage, _remainingUncovered) =>
      `קיימים <strong>${uncoveredNow}</strong> מבני מגורים ללא פתרונות מיגון נגישים<br>נוספו <strong>${shownLength}</strong> פתרונות מיגון שעשויות לתת מענה ל<strong>${marginalCoverage}</strong> מבנים נוספים`,
    statsNoBuildingTypes:
      "לא נבחרו סוגי מבנים, לכן אין מבני יעד בניתוח זה ולא מוצעות מיגוניות חדשות.",
    buildingPopupCovered: (idx) => `<strong>מבנה #${idx}</strong><br>מכוסה על ידי מיגון קיים`,
    buildingPopupUncovered: (idx) => `<strong>מבנה #${idx}</strong><br>ללא כיסוי על ידי מיגון קיים`,
    buildingAssumedShelteredPopup:
      "<strong>מבנה שהוגדר כממוגן לפי הנחות</strong><br>מוצג כלא נדרש לכיסוי מיגון חדש בניתוח זה",
    buildingPost1992Popup:
      "<strong>מבנה שנבנה מ-1995 ואילך</strong><br>מוצג כלא נדרש לכיסוי מיגון חדש בניתוח זה",
    existingMegunitPopup: "<strong>מיגונית קיימת</strong>",
    existingMegunitLabel: "מיגונית קיימת",
    existingMiklatPopup: "<strong>מקלט קיים</strong>",
    existingMiklatLabel: "מקלט קיים",
    contourPopup: (heightMeters) => `<strong>קו גובה</strong><br>גובה: ${heightMeters} מ'`,
    mapClickElevationPopup: (heightMeters) => `<strong>גובה משוער</strong><br>${heightMeters} מ'`,
    buildingPopupTitle: (idx) => `מבנה #${idx}`,
    buildingPopupStatusCovered: "מכוסה על ידי מיגון קיים",
    buildingPopupStatusUncovered: "ללא כיסוי על ידי מיגון קיים",
    buildingPopupStatusAssumed: "הוחרג ממבני היעד לפי הנחות",
    buildingPopupStatusNotRelevant: "לא רלוונטי לקריטריוני סוג המבנה שנבחרו",
    buildingPopupTypeLabel: "סוג מבנה",
    buildingPopupTypeStoryLabel: "פירוש הסיווג",
    buildingPopupTypeUnknown: "לא ידוע",
    buildingPopupTypeStory_1: "מבנה ציבור, ככל הנראה ללא שימוש למגורים",
    buildingPopupTypeStory_2: "שימוש מעורב, ככל הנראה מגורים יחד עם שימוש נוסף",
    buildingPopupTypeStory_3: "מגורים",
    buildingPopupTypeStory_4: "מסחרי/פרטי ללא מגורים",
    buildingPopupMetaLabel: "מטא-דאטה",
    buildingPopupAssumptionsLabel: "השפעת ההנחות",
    buildingPopupBuildYear: "שנת בנייה",
    buildingPopupFloors: "קומות",
    buildingPopupApartments: "דירות",
    buildingAssumptionPost1992: "הוחרג לפי הנחת מבנים ממוגנים מ-1995 ואילך",
    buildingAssumptionOver3Floors: "הוחרג לפי הנחת מבנים ממוגנים מעל 3 קומות",
    buildingAssumptionTypeFiltered: "הוחרג לפי סינון סוגי המבנים שנבחרו",
    buildingAssumptionNoTypes: "לא נבחרו סוגי מבנים",
    buildingAssumptionWeightIgnored: "לא נכלל בשקלול אוכלוסייה עבור סוג זה",
    buildingAssumptionWeightPartial: "נכלל חלקית בשקלול אוכלוסייה",
    buildingAssumptionWeightFull: "נכלל במלואו בשקלול אוכלוסייה",
    buildingAssumptionNone: "אין הנחות פעילות שמשפיעות כרגע על מבנה זה",
    buildingTypesCriteriaLabel: "קריטריון סוגי מבנים",
    buildingTypesCriteriaNone: "לא נבחרו סוגי מבנים",
    buildingNotRelevantHoverTitle: "לא רלוונטי לקריטריוני סוגי המבנים שנבחרו",
    buildingNotRelevantHoverCriteriaPrefix: "קריטריון",
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
        <li><strong>1.</strong> מגדירים הנחות ובוחרים את סוגי המבנים לניתוח.</li>
        <li><strong>2.</strong> מוסיפים מיגוניות מומלצות באמצעות הסליידר כדי לבדוק תרחישי התערבות שונים.</li>
        <li><strong>3.</strong> בודקים את הסטטיסטיקה המתעדכנת כדי להבין את השפעת ההוספה על הכיסוי.</li>
        <li><strong>4.</strong> משתמשים באזור <strong>שכבות</strong> שבמקרא כדי לשלוט בתצוגה ובמפת הבסיס.</li>
      </ul>
    </div>
  `,
    guideMethodsHtml: `
    <div class="guide-block" dir="rtl">
      <h3>מתודולוגיה</h3>
      <ul>
        <li><strong>0.</strong> התהליך מיישם את כללי המיגון וההחרגה שהוגדרו כדי לקבוע את מבני היעד.</li>
        <li><strong>1.</strong> שכבות המבנים והמיגון מיושרות למערכת קואורדינטות משותפת במפה.</li>
        <li><strong>2.</strong> הנגישות הקיימת מחושבת לכל בניין לפי שיטת המרחק הקבועה של המערכת.</li>
        <li><strong>3.</strong> מועמדים למיגון מדורגים לפי תוספת כיסוי ומוצגים כמיקומים מומלצים.</li>
        <li><strong>4.</strong> הסטטיסטיקה והשכבות מתעדכנות אינטראקטיבית כאשר משנים את כמות המיגוניות.</li>
      </ul>
    </div>
  `,
    errorLoadingData: (message) => `שגיאה בטעינת נתונים: ${message}`,
    errorMissingScenarioAnalysis: (scenarioKey) =>
      `חסרים קבצי ניתוח עבור התרחיש "${scenarioKey}". יש לייצר את התרחיש ואז לנסות שוב.`,
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
  onlyPublicLand: true,
  weightByPopulation: false,
  buildingUseTypes: [2, 4],
};
const LAYER_DEFAULTS = {
  meguniot: true,
  miklatim: true,
  recommended: true,
  topography: true,
  post1992Buildings: true,
  notRelevantBuildings: true,
  uncoveredBuildings: true,
  coveredBuildingsBase: true,
  covered: true,
  accessibilityHeatmap: false,
};
const UNIFIED_COVERED_PALETTE = {
  markerStroke: "#1f6f2f",
  markerFill: "#52b36a",
  buildingStroke: "#237b35",
  buildingFill: "#74c989",
  areaStroke: "#28843a",
  areaFill: "#8fd8a1",
};

const SELECTED_HIGHLIGHT_PALETTE = {
  markerStroke: "#1d4ed8",
  markerFill: "#3b82f6",
  buildingStroke: "#2563eb",
  buildingFill: "#60a5fa",
  areaStroke: "#3b82f6",
  areaFill: "#93c5fd",
};

proj4.defs(
  "EPSG:2039",
  "+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +towgs84=-24.0024,-17.1032,-17.8444,-0.33077,-1.85269,1.66969,5.4248 +units=m +no_defs +type=crs",
);

const bucketSelect = document.getElementById("bucketSelect");
const appRoot = document.getElementById("app");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingTitleEl = document.getElementById("loadingTitle");
const loadingMessageEl = document.getElementById("loadingMessage");
const bucketControls = document.getElementById("bucketControls");
const coverageDisplayControls = document.getElementById("coverageDisplayControls");
const countRange = document.getElementById("countRange");
const countValue = document.getElementById("countValue");
const countLabel = document.querySelector('label[for="countRange"]');
const statsEl = document.getElementById("stats");
const downloadCsvBtn = document.getElementById("downloadCsv");
const downloadGeojsonBtn = document.getElementById("downloadGeojson");
const metricEuclideanBtn = document.getElementById("metricEuclideanBtn");
const modeExactBtn = document.getElementById("modeExactBtn");
const baseMapSelect = document.getElementById("baseMapSelect");
const assumePost1992Sheltered = document.getElementById("assumePost1992Sheltered");
const assumeOver3FloorsSheltered = document.getElementById("assumeOver3FloorsSheltered");
const assumeEducationShelters = document.getElementById("assumeEducationShelters");
const assumePublicShelters = document.getElementById("assumePublicShelters");
const assumeOnlyPublicLand = document.getElementById("assumeOnlyPublicLand");
const assumeWholeSettlement = document.getElementById("assumeWholeSettlement");
const assumeWeightByBuildings = document.getElementById("assumeWeightByBuildings");
const assumeWeightByPopulation = document.getElementById("assumeWeightByPopulation");
const buildingFilterResidential = document.getElementById("buildingFilterResidential");
const buildingFilterNonResidential = document.getElementById("buildingFilterNonResidential");
const buildingFilterNonResidentialControl = document.getElementById("buildingFilterNonResidentialControl");

const layerMeguniot = document.getElementById("layerMeguniot");
const layerMiklatim = document.getElementById("layerMiklatim");
const layerRecommended = document.getElementById("layerRecommended");
const layerTopography = document.getElementById("layerTopography");
const layerPost1992Buildings = document.getElementById("layerPost1992Buildings");
const layerNotRelevantBuildings = document.getElementById("layerNotRelevantBuildings");
const layerUncoveredBuildings = document.getElementById("layerUncoveredBuildings");
const layerCoveredBuildingsBase = document.getElementById("layerCoveredBuildingsBase");
const layerCovered = document.getElementById("layerCovered");
const openLayersModalBtn = document.getElementById("openLayersModalBtn");
const layersModal = document.getElementById("layersModal");
const closeLayersModalBtn = document.getElementById("closeLayersModalBtn");
const accessibilityHeatmapToggle = document.getElementById("accessibilityHeatmapToggle");
const accessibilityHeatmapHint = document.getElementById("accessibilityHeatmapHint");
const legendTopographyScaleLowEl = document.getElementById("legendTopographyScaleLow");
const legendTopographyScaleHighEl = document.getElementById("legendTopographyScaleHigh");
const legendTopographyScaleBarEl = document.getElementById("legendTopographyScaleBar");
const legendRowMeguniot = document.getElementById("legendRowMeguniot");
const legendRowMiklatim = document.getElementById("legendRowMiklatim");
const legendRowEducationShelters = document.getElementById("legendRowEducationShelters");
const legendRowPublicShelters = document.getElementById("legendRowPublicShelters");
const legendRowRecommended = document.getElementById("legendRowRecommended");
const legendRowTopography = document.getElementById("legendRowTopography");
const legendRowCoveredBase = document.getElementById("legendRowCoveredBase");
const legendRowNotRelevant = document.getElementById("legendRowNotRelevant");
const legendRowUncovered = document.getElementById("legendRowUncovered");
const legendRowCoveredSelected = document.getElementById("legendRowCoveredSelected");

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
const controlStack = document.querySelector(".control-stack");
const mobileControlsBtn = document.getElementById("mobileControlsBtn");
const mobilePanelBackdrop = document.getElementById("mobilePanelBackdrop");
const mobilePanelTitle = document.getElementById("mobilePanelTitle");
const mobilePanelCloseBtn = document.getElementById("mobilePanelCloseBtn");
const mobileViewport = window.matchMedia("(max-width: 900px)");

let currentLanguage = "he";
let currentGuideTab = "usage";
let currentDistanceMetric = "euclidean";
let currentPlacementMode = "exact";
let accessibilityHeatmapEnabled = false;
let mobilePanelConfigured = false;
let elevationLabelPopup = null;
let scenarioManifest = [];
let scenarioDataCache = {};
let currentScenarioKey = null;
let currentAssumptions = { ...DEFAULT_ASSUMPTIONS };
let lastMissingScenarioPopupKey = null;
let weightingRestrictionNoticeTimer = null;

function t(key, ...args) {
  const value = I18N[currentLanguage]?.[key];
  if (typeof value === "function") return value(...args);
  return value ?? key;
}

function setLoadingStatus(messageKeyOrText) {
  if (loadingTitleEl) loadingTitleEl.textContent = t("loadingTitle");
  if (!loadingMessageEl) return;
  const knownI18nKey =
    typeof messageKeyOrText === "string" &&
    Object.prototype.hasOwnProperty.call(I18N[currentLanguage] || {}, messageKeyOrText);
  loadingMessageEl.textContent = knownI18nKey ? t(messageKeyOrText) : String(messageKeyOrText ?? "");
}

function showWeightingRestrictionNotice(message, options = {}) {
  let noticeEl = document.getElementById("weightingRestrictionNotice");
  if (!noticeEl) {
    noticeEl = document.createElement("div");
    noticeEl.id = "weightingRestrictionNotice";
    noticeEl.className = "weighting-restriction-notice hidden";
    document.body.appendChild(noticeEl);
  }
  const isBlocking = Boolean(options?.isBlocking);
  const prefix = isBlocking ? "⛔ " : "";
  noticeEl.textContent = `${prefix}${String(message || "")}`;
  noticeEl.classList.remove("hidden");
  noticeEl.classList.add("is-visible");
  if (weightingRestrictionNoticeTimer) window.clearTimeout(weightingRestrictionNoticeTimer);
  weightingRestrictionNoticeTimer = window.setTimeout(() => {
    noticeEl.classList.remove("is-visible");
    noticeEl.classList.add("hidden");
  }, 2600);
}

function updateBuildingTypeWeightingState() {
  const weightingEnabled = Boolean(currentAssumptions.weightByPopulation);
  const disabledHint = t("weightingBuildingTypeRestrictionDisabledHint");
  if (buildingFilterNonResidential) {
    buildingFilterNonResidential.disabled = weightingEnabled;
    buildingFilterNonResidential.title = weightingEnabled ? disabledHint : "";
    if (weightingEnabled) buildingFilterNonResidential.checked = false;
  }
}

function isMissingScenarioAnalysisError(error) {
  const status = Number(error?.status);
  const path = typeof error?.path === "string" ? error.path : "";
  return status === 404 && path.includes("/scenarios/");
}

function extractScenarioKeyFromPath(path) {
  if (typeof path !== "string") return null;
  const marker = "/scenarios/";
  const markerIdx = path.indexOf(marker);
  if (markerIdx < 0) return null;
  const after = path.slice(markerIdx + marker.length);
  const [scenarioKey] = after.split("/");
  return scenarioKey || null;
}

function handleScenarioUiError(error) {
  console.error(error);
  const message = t("errorLoadingData", error?.message || String(error));
  if (statsEl) statsEl.textContent = message;
  if (!isMissingScenarioAnalysisError(error)) return;
  const scenarioKey = extractScenarioKeyFromPath(error?.path) || currentScenarioKey || "__legacy__";
  const popupKey = `${scenarioKey}|${String(error?.path || "")}`;
  if (lastMissingScenarioPopupKey === popupKey) return;
  lastMissingScenarioPopupKey = popupKey;
  window.alert(t("errorMissingScenarioAnalysis", scenarioKey));
}

function hideLoadingOverlay() {
  if (!loadingOverlay) return;
  loadingOverlay.classList.add("is-hidden");
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
    legendMeguniot: "legendMeguniot",
    legendMiklatim: "legendMiklatim",
    legendEducationShelters: "legendEducationShelters",
    legendPublicShelters: "legendPublicShelters",
    legendRecommended: "legendRecommended",
    legendPost1992: "legendPost1992",
    legendUncovered: "legendUncovered",
    legendCoveredBase: "legendCoveredBase",
    legendNotRelevant: "legendNotRelevant",
    legendCoveredSelected: "legendCoveredSelected",
    legendTopography: "legendTopography",
    legendTopographyScaleTitle: "legendTopographyScaleTitle",
    legendTopographyScaleLow: "legendTopographyScaleLow",
    legendTopographyScaleHigh: "legendTopographyScaleHigh",
    layersSummary: "layersSummary",
    layersModalTitle: "layersModalTitle",
    baseMapLabel: "baseMapLabel",
    layerMeguniotLabel: "layerMeguniotLabel",
    layerMiklatimLabel: "layerMiklatimLabel",
    layerRecommendedLabel: "layerRecommendedLabel",
    layerTopographyLabel: "layerTopographyLabel",
    layerPost1992BuildingsLabel: "layerPost1992BuildingsLabel",
    layerNotRelevantBuildingsLabel: "layerNotRelevantBuildingsLabel",
    layerUncoveredBuildingsLabel: "layerUncoveredBuildingsLabel",
    layerCoveredBuildingsBaseLabel: "layerCoveredBuildingsBaseLabel",
    layerCoveredLabel: "layerCoveredLabel",
    countRangeLabel: "countRangeLabel",
    assumePost1992ShelteredLabel: "assumePost1992ShelteredLabel",
    assumeOver3FloorsShelteredLabel: "assumeOver3FloorsShelteredLabel",
    assumeEducationSheltersLabel: "assumeEducationSheltersLabel",
    assumePublicSheltersLabel: "assumePublicSheltersLabel",
    assumeOnlyPublicLandLabel: "assumeOnlyPublicLandLabel",
    assumeWholeSettlementLabel: "assumeWholeSettlementLabel",
    assumeWeightByBuildingsLabel: "assumeWeightByBuildingsLabel",
    assumeWeightByPopulationLabel: "assumeWeightByPopulationLabel",
    assumptionsBuildingTypesTitle: "assumptionsBuildingTypesTitle",
    buildingFilterAllLabel: "buildingFilterAllLabel",
    assumeBuildingUseType2Label: "assumeBuildingUseType2Label",
    assumeBuildingUseType4Label: "assumeBuildingUseType4Label",
    assumptionsHasShelterTitle: "assumptionsHasShelterTitle",
    assumptionsNeighborsTitle: "assumptionsNeighborsTitle",
    assumptionsPlacementTitle: "assumptionsPlacementTitle",
    assumptionsWeightingTitle: "assumptionsWeightingTitle",
    prototypeBanner: "prototypeBanner",
    mobilePanelTitle: "mobilePanelTitle",
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
  updateBuildingTypeWeightingState();

  if (metricEuclideanBtn) metricEuclideanBtn.textContent = t("metricEuclideanBtn");
  if (modeExactBtn) modeExactBtn.textContent = t("modeExactBtn");

  openGuideBtn.setAttribute("aria-label", t("infoAriaLabel"));
  closeGuideBtn.setAttribute("aria-label", t("closeHelpAriaLabel"));
  mobileControlsBtn?.setAttribute("aria-label", t("mobileControlsBtn"));
  mobilePanelCloseBtn?.setAttribute("aria-label", t("mobileCloseAriaLabel"));
  if (mobileControlsBtn) mobileControlsBtn.textContent = t("mobileControlsBtn");
  if (mobilePanelTitle) mobilePanelTitle.textContent = t("mobilePanelTitle");
  document.querySelector(".guide-tabs")?.setAttribute("aria-label", t("guideTabsAriaLabel"));
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
  baseMapSelect.value = selectedBaseMap || "light";
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
baseMapSelect.value = "light";

const map = L.map("map", { preferCanvas: true, zoomControl: false }).setView([31.745, 34.99], 15);
L.control.zoom({ position: "bottomright" }).addTo(map);
const baseMapLayers = new Map();
let currentBaseMapLayer = null;

const layers = {
  existingMeguniot: L.layerGroup().addTo(map),
  existingMiklatim: L.layerGroup().addTo(map),
  recommended: L.layerGroup().addTo(map),
  topography: L.layerGroup().addTo(map),
  post1992Buildings: L.layerGroup().addTo(map),
  notRelevantBuildings: L.layerGroup().addTo(map),
  uncoveredBuildings: L.layerGroup().addTo(map),
  coveredBuildingsBase: L.layerGroup().addTo(map),
  selectedShelterArea: L.layerGroup().addTo(map),
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
const matchedSourceBuildingFeatureIndexes = new Set();
const targetBuildingOrderIndexBySourceIdx = new Map();

const existingIcon = L.icon({
  iconUrl: "assets/existing.svg",
  iconSize: [20, 24],
  iconAnchor: [10, 24],
  popupAnchor: [0, -22],
  className: "custom-icon",
});
const existingMiklatIcon = L.icon({
  iconUrl: "assets/existing-green.svg",
  iconSize: [20, 24],
  iconAnchor: [10, 24],
  popupAnchor: [0, -22],
  className: "custom-icon",
});
const existingEducationIcon = L.icon({
  iconUrl: "assets/existing-purple.svg",
  iconSize: [20, 24],
  iconAnchor: [10, 24],
  popupAnchor: [0, -22],
  className: "custom-icon",
});
const existingPublicIcon = L.icon({
  iconUrl: "assets/existing-brown.svg",
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

function isBuiltInOrAfter1992(feature) {
  const props = feature?.properties || {};
  const before1992Raw =
    props.Before_199 ??
    props.Before_1992 ??
    props.before_1992 ??
    props.before1992 ??
    props.lifney_1992;
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
  // Missing/unknown years are treated as pre-1992 for assumption filtering.
  const isBefore1992 = !Number.isFinite(year) || year <= 1991;
  return !isBefore1992;
}

function isOver3FloorsOrApartments(feature) {
  const props = feature?.properties || {};
  const over3Raw =
    props.more_tha_3 ??
    props.more_than_3_floors ??
    props.more_than_3_floors_or_2_apartments ??
    props.over_3_floors;
  if (over3Raw !== null && over3Raw !== undefined && over3Raw !== "") {
    return toBoolish(over3Raw);
  }
  const floors = getFirstNumericProperty(props, ["Floors", "floors", "komot", "Floor_Number"]);
  const apartments = getFirstNumericProperty(props, [
    "Apartments",
    "apartments",
    "units",
    "diyot",
    "dirhot",
    "deyrot",
    "Apartment_Number",
  ]);
  return (Number.isFinite(floors) && floors > 3) || (Number.isFinite(apartments) && apartments > 3);
}

function getBuildingUseType(feature) {
  const props = feature?.properties || {};
  const raw = props["שימוש"] ?? props.use ?? props.USE ?? props.shimush;
  const asNum = Number(raw);
  if ([2, 3].includes(asNum)) return 2;
  if ([1, 4].includes(asNum)) return 4;
  return 4;
}

function getBuildingUseLabelAndStory(useType) {
  if (!useType) {
    return {
      label: t("buildingPopupTypeUnknown"),
      story: "",
    };
  }
  const labelByType = {
    2: t("assumeBuildingUseType2Label"),
    4: t("assumeBuildingUseType4Label"),
  };
  return {
    label: labelByType[useType] || t("buildingPopupTypeUnknown"),
    story: t(`buildingPopupTypeStory_${useType}`),
  };
}

function getSelectedBuildingTypeLabels() {
  return normalizeBuildingUseTypes(currentAssumptions.buildingUseTypes).map((typeValue) => {
    if (typeValue === 2) return t("assumeBuildingUseType2Label");
    return t("assumeBuildingUseType4Label");
  });
}

function getBuildingTypesCriteriaText() {
  const labels = getSelectedBuildingTypeLabels();
  if (!labels.length) return t("buildingTypesCriteriaNone");
  return labels.join(", ");
}

function isRelevantBySelectedBuildingTypes(feature) {
  const selectedTypes = normalizeBuildingUseTypes(currentAssumptions.buildingUseTypes);
  if (!selectedTypes.length) return false;
  const useType = getBuildingUseType(feature);
  if (!useType) return false;
  return selectedTypes.includes(useType);
}

function isTargetBuildingFeature(feature) {
  let exempt = false;
  if (currentAssumptions.post1992Sheltered) exempt = exempt || isBuiltInOrAfter1992(feature);
  if (currentAssumptions.over3FloorsSheltered) exempt = exempt || isOver3FloorsOrApartments(feature);
  return !exempt;
}

function isCoverageTargetBuildingFeature(feature) {
  return isRelevantBySelectedBuildingTypes(feature) && isTargetBuildingFeature(feature);
}

function buildBuildingPopupHtml(feature, idx, statusKey, coverage) {
  const props = feature?.properties || {};
  const useType = getBuildingUseType(feature);
  const useInfo = getBuildingUseLabelAndStory(useType);
  const buildYear =
    Number(coverage?.build_year) ||
    getFirstNumericProperty(props, ["BuildYear", "build_year", "year_built", "year", "shnat_bnia", "shnat_bnaya"]);
  const floors =
    Number(coverage?.floors) || getFirstNumericProperty(props, ["Floors", "floors", "komot", "Floor_Number"]);
  const apartments =
    Number(coverage?.apartments) ||
    getFirstNumericProperty(props, ["Apartments", "apartments", "units", "diyot", "dirhot", "deyrot", "Apartment_Number"]);

  const selectedTypes = normalizeBuildingUseTypes(currentAssumptions.buildingUseTypes);
  const assumptionEffects = [];
  if (currentAssumptions.post1992Sheltered && isBuiltInOrAfter1992(feature)) {
    assumptionEffects.push(t("buildingAssumptionPost1992"));
  }
  if (currentAssumptions.over3FloorsSheltered && isOver3FloorsOrApartments(feature)) {
    assumptionEffects.push(t("buildingAssumptionOver3Floors"));
  }
  if (!selectedTypes.length) {
    assumptionEffects.push(t("buildingAssumptionNoTypes"));
  } else if (useType && !selectedTypes.includes(useType)) {
    assumptionEffects.push(t("buildingAssumptionTypeFiltered"));
  }
  if (currentAssumptions.weightByPopulation) {
    if (useType === 2) assumptionEffects.push(t("buildingAssumptionWeightFull"));
    else assumptionEffects.push(t("buildingAssumptionWeightIgnored"));
  }
  if (!assumptionEffects.length) {
    assumptionEffects.push(t("buildingAssumptionNone"));
  }

  const metaRows = [
    [t("buildingPopupTypeLabel"), useInfo.label],
    [t("buildingPopupBuildYear"), Number.isFinite(buildYear) && buildYear > 0 ? String(buildYear) : t("buildingPopupTypeUnknown")],
    [t("buildingPopupFloors"), Number.isFinite(floors) && floors > 0 ? String(floors) : t("buildingPopupTypeUnknown")],
    [t("buildingPopupApartments"), Number.isFinite(apartments) && apartments >= 0 ? String(apartments) : t("buildingPopupTypeUnknown")],
  ];
  if (statusKey === "buildingPopupStatusNotRelevant") {
    metaRows.push([t("buildingTypesCriteriaLabel"), getBuildingTypesCriteriaText()]);
  }
  return `
    <div class="shelter-selection-card" dir="${currentLanguage === "he" ? "rtl" : "ltr"}">
      <div class="shelter-selection-title">${escapeHtml(t("buildingPopupTitle", idx))}</div>
      <div class="shelter-selection-kicker">${escapeHtml(t(statusKey))}</div>
      <div class="shelter-selection-meta">
        <div class="shelter-selection-meta-title">${escapeHtml(t("buildingPopupMetaLabel"))}</div>
        ${metaRows
          .map(
            ([label, value]) =>
              `<div class="shelter-selection-meta-row"><span class="shelter-selection-meta-label">${escapeHtml(label)}</span><span class="shelter-selection-meta-value">${escapeHtml(value)}</span></div>`,
          )
          .join("")}
        ${
          useInfo.story
            ? `<div class="shelter-selection-meta-row"><span class="shelter-selection-meta-label">${escapeHtml(
                t("buildingPopupTypeStoryLabel"),
              )}</span><span class="shelter-selection-meta-value">${escapeHtml(useInfo.story)}</span></div>`
            : ""
        }
      </div>
      <div class="shelter-selection-meta">
        <div class="shelter-selection-meta-title">${escapeHtml(t("buildingPopupAssumptionsLabel"))}</div>
        ${assumptionEffects
          .map(
            (effect) =>
              `<div class="shelter-selection-meta-row"><span class="shelter-selection-meta-value">${escapeHtml(effect)}</span></div>`,
          )
          .join("")}
      </div>
    </div>
  `;
}

function isAssumedShelteredFeature(feature) {
  if (currentAssumptions.post1992Sheltered && isBuiltInOrAfter1992(feature)) return true;
  if (currentAssumptions.over3FloorsSheltered && isOver3FloorsOrApartments(feature)) return true;
  return false;
}

function createBuildingLayer(feature, style, radius = 3) {
  return L.geoJSON(feature, {
    interactive: true,
    style: () => style,
    pointToLayer: (_feature, latlng) =>
      L.circleMarker(latlng, {
        radius,
        color: style.color,
        weight: style.weight,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
        opacity: style.opacity ?? 1,
        interactive: true,
      }),
  });
}

function createShelterMarkerWithPalette(latLng, icon = existingIcon) {
  return L.marker(latLng, { icon });
}

function addShelterSourceBuildingLayer(targetLayer, feature, sourceCrs, palette) {
  const geometry = geometryToWgs(feature?.geometry, sourceCrs);
  if (!geometry || !palette || !targetLayer) return;
  const sourceFeature = { type: "Feature", geometry, properties: feature?.properties || {} };
  const style = {
    color: palette.buildingStroke,
    weight: 1.6,
    fillColor: palette.buildingFill,
    fillOpacity: 0.34,
    opacity: 0.96,
  };
  createBuildingLayer(sourceFeature, style, 4).addTo(targetLayer);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toDisplayValue(value, maxLen = 90) {
  if (value === null || value === undefined) return "";
  const normalized = String(value).replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (["-", "—", "N/A", "n/a", "null", "undefined"].includes(normalized)) return "";
  return normalized.length > maxLen ? `${normalized.slice(0, maxLen - 1)}…` : normalized;
}

function getPropertyValue(properties, keys, maxLen = 90) {
  if (!properties) return "";
  for (const key of keys) {
    if (!(key in properties)) continue;
    const value = toDisplayValue(properties[key], maxLen);
    if (value) return value;
  }
  return "";
}

function getPopupLabels() {
  if (currentLanguage === "he") {
    return {
      titleExistingMegunit: "מיגונית קיימת",
      titleExistingMiklat: "מקלט קיים",
      titleEducation: "הנחה: מיגון שכנים | מוסד חינוך",
      titlePublic: "הנחה: מיגון שכנים | מבנה ציבור",
      titleRecommended: "מיקום מומלץ",
      id: "מזהה",
      address: "כתובת",
      area: "שטח",
      use: "שימוש",
      ownership: "בעלות",
      contact: "איש קשר",
      phone: "טלפון",
      utilities: "תשתיות",
      notes: "הערות",
      institution: "שם מוסד",
      framework: "סוג מסגרת",
      status: "סטטוס",
      supervision: "פיקוח",
      sector: "מגזר",
      stage: "שלב חינוך",
      location: "מיקום",
      rank: "דירוג",
      mode: "מצב",
      source: "מקור",
      newlyCovered: "כיסוי חדש",
      coveredBuildings: "מבנים מכוסים",
      coveredHousingUnits: "יחידות דיור מכוסות",
      metadata: "פרטי מיגונית",
      buildingsSuffix: "מבנים",
      housingUnitsSuffix: "יחידות דיור",
      yes: "כן",
      no: "לא",
      unknown: "לא ידוע",
    };
  }
  return {
    titleExistingMegunit: "Existing Megunit",
    titleExistingMiklat: "Existing Miklat",
    titleEducation: "Assumption: Shelter Neighbors | Education Facility",
    titlePublic: "Assumption: Shelter Neighbors | Public Building",
    titleRecommended: "Recommended Shelter",
    id: "ID",
    address: "Address",
    area: "Area",
    use: "Use",
    ownership: "Ownership",
    contact: "Contact",
    phone: "Phone",
    utilities: "Utilities",
    notes: "Notes",
    institution: "Institution",
    framework: "Framework",
    status: "Status",
    supervision: "Supervision",
    sector: "Sector",
    stage: "Education stage",
    location: "Location",
    rank: "Rank",
    mode: "Mode",
    source: "Source",
    newlyCovered: "Newly covered",
    coveredBuildings: "Covered buildings",
    coveredHousingUnits: "Covered housing units",
    metadata: "Shelter details",
    buildingsSuffix: "buildings",
    housingUnitsSuffix: "housing units",
    yes: "Yes",
    no: "No",
    unknown: "Unknown",
  };
}

function getBuildingApartmentsForCoverageIndex(buildingIdx) {
  const normalizedIdx = Number(buildingIdx);
  if (!Number.isFinite(normalizedIdx)) return null;
  const coverage = coverageByIndex.get(normalizedIdx);
  const coverageApartments = Number(coverage?.apartments);
  if (Number.isFinite(coverageApartments) && coverageApartments >= 0) return coverageApartments;
  const feature = buildingFeatureByIndex.get(normalizedIdx);
  return getFirstNumericProperty(feature?.properties, [
    "Apartments",
    "apartments",
    "units",
    "diyot",
    "dirhot",
    "deyrot",
    "Apartment_Number",
  ]);
}

function getCoveredHousingUnitsByIndices(indices) {
  if (!Array.isArray(indices)) return null;
  let total = 0;
  for (const idx of indices) {
    const apartments = Number(getBuildingApartmentsForCoverageIndex(idx));
    if (!Number.isFinite(apartments) || apartments < 0) continue;
    total += apartments;
  }
  return total;
}

function buildCoverageStatsFromCoverageMatch(match, fallbackCoveredIndices = null) {
  const coveredIndices = Array.isArray(match?.covered_building_indices)
    ? match.covered_building_indices
    : Array.isArray(fallbackCoveredIndices)
      ? fallbackCoveredIndices
      : [];
  const coveredBuildingsCountRaw = Number(match?.covered_buildings_count);
  const coveredBuildingsCount = Number.isFinite(coveredBuildingsCountRaw) ? coveredBuildingsCountRaw : coveredIndices.length;
  return {
    coveredBuildingsCount,
    coveredHousingUnits: getCoveredHousingUnitsByIndices(coveredIndices),
  };
}

function renderShelterSelectionPopup(title, coverageStats, rows = []) {
  const labels = getPopupLabels();
  const coveredBuildingsCount = Number(coverageStats?.coveredBuildingsCount);
  const coveredHousingUnits = Number(coverageStats?.coveredHousingUnits);
  const numberFormatter = new Intl.NumberFormat(currentLanguage === "he" ? "he-IL" : "en-US");
  const housingUnitsRow =
    Number.isFinite(coveredHousingUnits) && coveredHousingUnits >= 0
      ? [
          {
            label: labels.coveredHousingUnits,
            value: `${numberFormatter.format(coveredHousingUnits)} ${labels.housingUnitsSuffix}`,
          },
        ]
      : [];
  const metaRows = [...housingUnitsRow, ...rows]
    .filter((row) => row?.label && row?.value)
    .map(
      (row) =>
        `<div class="shelter-selection-meta-row"><span class="shelter-selection-meta-label">${escapeHtml(row.label)}</span><span class="shelter-selection-meta-value">${escapeHtml(row.value)}</span></div>`,
    )
    .join("");
  const countDisplay = Number.isFinite(coveredBuildingsCount)
    ? `${numberFormatter.format(coveredBuildingsCount)} ${labels.buildingsSuffix}`
    : labels.unknown;
  return `
    <div class="shelter-selection-card" dir="${currentLanguage === "he" ? "rtl" : "ltr"}">
      <div class="shelter-selection-title">${escapeHtml(title)}</div>
      <div class="shelter-selection-kicker">${escapeHtml(labels.coveredBuildings)}</div>
      <div class="shelter-selection-count">${escapeHtml(countDisplay)}</div>
      ${metaRows ? `<div class="shelter-selection-meta"><div class="shelter-selection-meta-title">${escapeHtml(labels.metadata)}</div>${metaRows}</div>` : ""}
    </div>
  `;
}

function getUtilitiesSummary(properties) {
  const water = getPropertyValue(properties, ["water", "WATER"]);
  const electricity = getPropertyValue(properties, ["chashmal", "electricity", "ELECTRICITY"]);
  const toilets = getPropertyValue(properties, ["sherutim", "toilets", "TOILETS"]);
  const parts = [];
  if (water) parts.push(`water: ${water}`);
  if (electricity) parts.push(`electricity: ${electricity}`);
  if (toilets) parts.push(`toilets: ${toilets}`);
  if (!parts.length) return "";
  if (currentLanguage === "he") {
    return parts
      .map((part) =>
        part
          .replace("water: ", "מים: ")
          .replace("electricity: ", "חשמל: ")
          .replace("toilets: ", "שירותים: "),
      )
      .join(" | ");
  }
  return parts.join(" | ");
}

function getPublicFallbackRows(properties) {
  if (!properties) return [];
  const excludedKeyParts = [
    "fid",
    "id",
    "objectid",
    "shape_leng",
    "shape_len",
    "shape_area",
    "globalid",
    "created",
    "updated",
    "lat",
    "lon",
    "x",
    "y",
    "code",
  ];
  const rows = [];
  for (const [rawKey, rawValue] of Object.entries(properties)) {
    const key = String(rawKey || "").trim();
    const lowered = key.toLowerCase();
    if (!key) continue;
    if (excludedKeyParts.some((part) => lowered.includes(part))) continue;
    const value = toDisplayValue(rawValue);
    if (!value) continue;
    rows.push({ label: key, value });
    if (rows.length >= 4) break;
  }
  return rows;
}

function buildShelterPopupData(sourceKind, feature, shelterId) {
  const properties = feature?.properties || {};
  const labels = getPopupLabels();
  if (sourceKind === "miguniot") {
    return {
      title: labels.titleExistingMegunit,
      rows: [{ label: labels.id, value: getPropertyValue(properties, ["OBJECTID", "FID", "Id"]) || String(shelterId) }],
    };
  }
  if (sourceKind === "miklatim") {
    return {
      title: labels.titleExistingMiklat,
      rows: [
        { label: labels.id, value: getPropertyValue(properties, ["mis_miklat", "num", "FID", "Id"]) || String(shelterId) },
        { label: labels.address, value: getPropertyValue(properties, ["ctovet", "address", "ADDRESS"]) },
        { label: labels.area, value: getPropertyValue(properties, ["shetach", "area", "AREA"]) },
        { label: labels.use, value: getPropertyValue(properties, ["bshimush", "use", "USE"]) },
        { label: labels.ownership, value: getPropertyValue(properties, ["baalut", "owner", "ownership"]) },
        { label: labels.contact, value: getPropertyValue(properties, ["ish_kesher", "contact", "CONTACT"], 110) },
        { label: labels.phone, value: getPropertyValue(properties, ["telephone", "phone", "PHONE"]) },
        { label: labels.utilities, value: getUtilitiesSummary(properties) },
        { label: labels.notes, value: getPropertyValue(properties, ["hearot", "notes", "NOTES"], 120) },
      ],
    };
  }
  if (sourceKind === "education") {
    return {
      title: labels.titleEducation,
      rows: [
        {
          label: labels.institution,
          value: getPropertyValue(properties, ["SHEM_MOSAD", "shem_mosad", "NAME", "name"], 120),
        },
        {
          label: labels.framework,
          value: getPropertyValue(properties, ["TEUR_SUG_M", "TEUR_TAT_S", "SUG_MISGER", "type"], 120),
        },
        { label: labels.status, value: getPropertyValue(properties, ["TEUR_STATU", "status", "CODE_STATU"]) },
        { label: labels.supervision, value: getPropertyValue(properties, ["TEUR_PIKOH", "supervision"]) },
        { label: labels.sector, value: getPropertyValue(properties, ["TEUR_MIGZA", "sector"]) },
        { label: labels.stage, value: getPropertyValue(properties, ["TEUR_SHLAV", "SHLAV_CHIN"]) },
        {
          label: labels.location,
          value: getPropertyValue(properties, ["ISV_SHEM_I", "SHEM_RASHU", "city", "CITY"]),
        },
      ],
    };
  }
  const defaultPublicRows = [
    {
      label: labels.institution,
      value: getPropertyValue(
        properties,
        ["SHEM_MOSAD", "SHEM", "shem", "NAME", "name", "building_name", "BUILDING_NAME"],
        120,
      ),
    },
    { label: labels.address, value: getPropertyValue(properties, ["ctovet", "KTOVET", "address", "ADDRESS"], 120) },
    {
      label: labels.use,
      value: getPropertyValue(properties, ["TEUR_SUG_M", "TEUR_TAT_S", "purpose", "usage", "USAGE"], 120),
    },
  ];
  const fallbackRows = getPublicFallbackRows(properties);
  return { title: labels.titlePublic, rows: [...defaultPublicRows, ...fallbackRows] };
}

function getShelterCoverageStats(shelterKind, shelterId, fallbackCoveredIndices = null) {
  const payload = getCurrentShelterCoveragePayload();
  const allCoverages = Array.isArray(payload?.coverages) ? payload.coverages : [];
  const match = allCoverages.find((coverage) => {
    return coverage?.shelter_kind === shelterKind && Number(coverage?.shelter_id) === Number(shelterId);
  });
  if (!match) {
    if (!Array.isArray(fallbackCoveredIndices)) return null;
    return buildCoverageStatsFromCoverageMatch(null, fallbackCoveredIndices);
  }
  return buildCoverageStatsFromCoverageMatch(match, fallbackCoveredIndices);
}

function getCoveragePointLatLng(coverage, idx) {
  if (Number.isFinite(coverage?.lat) && Number.isFinite(coverage?.lon)) {
    return L.latLng(coverage.lat, coverage.lon);
  }
  const buildingFeature = buildingFeatureByIndex.get(Number(idx));
  return getFeatureCenterLatLng(buildingFeature);
}

function getFeatureCenterLatLng(feature) {
  if (!feature) return null;
  const bounds = L.geoJSON(feature).getBounds();
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

function getAccessibilityDistanceScore(distanceMeters, normalizationMaxMeters) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return null;
  const softYellowDistance = 100;
  const normalizedMax = Number.isFinite(normalizationMaxMeters) && normalizationMaxMeters > 0 ? normalizationMaxMeters : 1;
  const redDistance = Math.max(softYellowDistance + 1, Math.min(260, normalizedMax));
  if (distanceMeters <= softYellowDistance) {
    const progress = distanceMeters / softYellowDistance;
    return 1 - 0.5 * progress;
  }
  if (distanceMeters >= redDistance) return 0;
  const progress = (distanceMeters - softYellowDistance) / (redDistance - softYellowDistance);
  return 0.5 * (1 - progress);
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
  return false;
}

function getActiveBucketKey() {
  return FIXED_BUCKET_KEY;
}

function getCurrentBucketData() {
  const bucketKey = getActiveBucketKey();
  return dataStore.optimalByMetricModeBucket?.[currentDistanceMetric]?.[currentPlacementMode]?.[bucketKey];
}

function assumptionsEqual(a, b) {
  const normalizeTypes = (raw) => {
    const incoming = Array.isArray(raw) ? raw : [];
    const normalized = incoming
      .map((v) => Number(v))
      .filter((v) => BUILDING_USE_TYPES.includes(v));
    const dedupedSorted = Array.from(new Set(normalized)).sort((x, y) => x - y);
    return dedupedSorted;
  };
  const aTypes = normalizeTypes(a?.buildingUseTypes);
  const bTypes = normalizeTypes(b?.buildingUseTypes);
  return (
    Boolean(a?.post1992Sheltered) === Boolean(b?.post1992Sheltered) &&
    Boolean(a?.over3FloorsSheltered) === Boolean(b?.over3FloorsSheltered) &&
    Boolean(a?.educationShelters) === Boolean(b?.educationShelters) &&
    Boolean(a?.publicShelters) === Boolean(b?.publicShelters) &&
    Boolean(a?.onlyPublicLand) === Boolean(b?.onlyPublicLand) &&
    Boolean(a?.weightByPopulation) === Boolean(b?.weightByPopulation) &&
    aTypes.length === bTypes.length &&
    aTypes.every((value, idx) => value === bTypes[idx])
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
  if (assumeOnlyPublicLand) assumeOnlyPublicLand.checked = Boolean(currentAssumptions.onlyPublicLand);
  if (assumeWholeSettlement) assumeWholeSettlement.checked = !Boolean(currentAssumptions.onlyPublicLand);
  if (assumeWeightByBuildings) assumeWeightByBuildings.checked = !Boolean(currentAssumptions.weightByPopulation);
  if (assumeWeightByPopulation) assumeWeightByPopulation.checked = Boolean(currentAssumptions.weightByPopulation);
  setSelectedBuildingUseTypesInUi(normalizeBuildingUseTypes(currentAssumptions.buildingUseTypes));
  updateBuildingTypeWeightingState();
}

function readAssumptionsFromInputs() {
  const selectedTypes = getSelectedBuildingUseTypesFromUi();
  const onlyPublicLand = assumeOnlyPublicLand
    ? Boolean(assumeOnlyPublicLand.checked)
    : !Boolean(assumeWholeSettlement?.checked);
  const weightByPopulation = assumeWeightByPopulation
    ? Boolean(assumeWeightByPopulation.checked)
    : !Boolean(assumeWeightByBuildings?.checked);
  return {
    post1992Sheltered: Boolean(assumePost1992Sheltered?.checked),
    over3FloorsSheltered: Boolean(assumeOver3FloorsSheltered?.checked),
    educationShelters: Boolean(assumeEducationShelters?.checked),
    publicShelters: Boolean(assumePublicShelters?.checked),
    onlyPublicLand,
    weightByPopulation,
    buildingUseTypes: selectedTypes,
  };
}

function normalizeBuildingUseTypes(rawTypes) {
  const normalized = (Array.isArray(rawTypes) ? rawTypes : [])
    .map((v) => Number(v))
    .filter((v) => BUILDING_USE_TYPES.includes(v));
  const dedupedSorted = Array.from(new Set(normalized)).sort((a, b) => a - b);
  return dedupedSorted;
}

function setSelectedBuildingUseTypesInUi(selectedTypes) {
  const selectedSet = new Set(selectedTypes);
  if (buildingFilterResidential) buildingFilterResidential.checked = selectedSet.has(2);
  if (buildingFilterNonResidential) buildingFilterNonResidential.checked = selectedSet.has(4);
  updateBuildingTypeWeightingState();
}

function getSelectedBuildingUseTypesFromUi() {
  const selected = [];
  if (buildingFilterResidential?.checked) selected.push(2);
  if (buildingFilterNonResidential?.checked) selected.push(4);
  return selected;
}

function enforceWeightingBuildingTypeRule(nextAssumptions) {
  const normalized = {
    ...DEFAULT_ASSUMPTIONS,
    ...nextAssumptions,
    buildingUseTypes: normalizeBuildingUseTypes(nextAssumptions?.buildingUseTypes),
  };
  if (!normalized.weightByPopulation) return normalized;
  const allowed = normalized.buildingUseTypes.filter((v) => WEIGHTED_ALLOWED_BUILDING_USE_TYPES.includes(v));
  normalized.buildingUseTypes = allowed;
  return normalized;
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
  currentAssumptions = enforceWeightingBuildingTypeRule(assumptions);
  currentScenarioKey = resolveScenarioKey(currentAssumptions);
  lastMissingScenarioPopupKey = null;
  syncAssumptionInputs();
}

function hasNoSelectedBuildingTypes() {
  return normalizeBuildingUseTypes(currentAssumptions.buildingUseTypes).length === 0;
}

function buildEmptyScenarioPayload() {
  const coverageByMetric = {};
  const optimalByMetricModeBucket = {};
  const shelterCoveragesByMetricModeBucket = {};
  for (const metric of DISTANCE_METRIC_OPTIONS) {
    coverageByMetric[metric.key] = {
      distance_metric: metric.key,
      buildings: [],
      assumptions: { ...currentAssumptions },
    };
    optimalByMetricModeBucket[metric.key] = {};
    shelterCoveragesByMetricModeBucket[metric.key] = {};
    for (const mode of PLACEMENT_OPTIONS) {
      optimalByMetricModeBucket[metric.key][mode.key] = {};
      shelterCoveragesByMetricModeBucket[metric.key][mode.key] = {};
      for (const bucket of BUCKET_OPTIONS) {
        optimalByMetricModeBucket[metric.key][mode.key][bucket.key] = {
          distance_metric: metric.key,
          placement_mode: mode.key,
          time_bucket: bucket.key,
          time_seconds: bucket.seconds,
          proposed_meguniot: [],
          statistics: {
            currently_uncovered: 0,
            additional_covered_by_proposed: 0,
            final_uncovered: 0,
          },
        };
        shelterCoveragesByMetricModeBucket[metric.key][mode.key][bucket.key] = {
          distance_metric: metric.key,
          placement_mode: mode.key,
          time_bucket: bucket.key,
          time_seconds: bucket.seconds,
          coverages: [],
        };
      }
    }
  }
  return {
    coverageByMetric,
    optimalByMetricModeBucket,
    shelterCoveragesByMetricModeBucket,
  };
}

async function ensureScenarioDataLoaded() {
  if (hasNoSelectedBuildingTypes()) {
    const emptyKey = "__empty__";
    if (!scenarioDataCache[emptyKey]) {
      scenarioDataCache[emptyKey] = buildEmptyScenarioPayload();
    }
    const cachedEmpty = scenarioDataCache[emptyKey];
    dataStore.coverageByMetric = cachedEmpty.coverageByMetric;
    dataStore.optimalByMetricModeBucket = cachedEmpty.optimalByMetricModeBucket;
    dataStore.shelterCoveragesByMetricModeBucket = cachedEmpty.shelterCoveragesByMetricModeBucket;
    return;
  }
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

function getAddedCoverageBuildingIndexes() {
  const coveredIndexes = new Set();
  for (const rec of recommendationsForCurrentView()) {
    const indices = Array.isArray(rec?.covered_building_indices) ? rec.covered_building_indices : [];
    for (const idx of indices) {
      coveredIndexes.add(Number(idx));
    }
  }
  return coveredIndexes;
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
  if (accessibilityHeatmapToggle) {
    accessibilityHeatmapToggle.setAttribute("aria-pressed", String(enabled));
    accessibilityHeatmapToggle.classList.toggle("is-active", enabled);
  }
  accessibilityHeatmapHint?.classList.toggle("hidden", !enabled);
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

function isMobileViewport() {
  return mobileViewport.matches;
}

function setMobileControlPanelOpen(open) {
  if (!controlStack) return;
  const shouldOpen = isMobileViewport() ? Boolean(open) : true;
  controlStack.classList.toggle("mobile-open", shouldOpen);
  mobilePanelBackdrop?.classList.toggle("hidden", !shouldOpen);
  appRoot?.classList.toggle("mobile-controls-open", shouldOpen);
  if (mobileControlsBtn) {
    mobileControlsBtn.setAttribute("aria-expanded", String(shouldOpen));
  }
}

function configureMobilePanelDefaults() {
  if (mobilePanelConfigured || !controlStack) return;
  const drawerPanels = controlStack.querySelectorAll(".drawer-panel");
  for (const panel of drawerPanels) {
    const startsOpen = panel.classList.contains("is-open");
    setDrawerOpen(panel, startsOpen);
  }
  mobilePanelConfigured = true;
}

function syncMobileUiState() {
  if (isMobileViewport()) {
    mobileControlsBtn?.classList.remove("hidden-control");
    mobilePanelBackdrop?.classList.remove("hidden-control");
    mobilePanelCloseBtn?.parentElement?.classList.remove("hidden-control");
    configureMobilePanelDefaults();
    setMobileControlPanelOpen(false);
    return;
  }
  mobileControlsBtn?.classList.add("hidden-control");
  mobilePanelBackdrop?.classList.add("hidden-control");
  mobilePanelCloseBtn?.parentElement?.classList.add("hidden-control");
  setMobileControlPanelOpen(true);
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
  matchedSourceBuildingFeatureIndexes.clear();
  targetBuildingOrderIndexBySourceIdx.clear();
  const features = Array.isArray(dataStore.buildings?.features) ? dataStore.buildings.features : [];
  const idKeys = ["building_idx", "OBJECTID", "objectid", "id", "ID"];
  const orderedTargetFeatures = [];
  for (let sourceIdx = 0; sourceIdx < features.length; sourceIdx += 1) {
    const feature = features[sourceIdx];
    if (!isCoverageTargetBuildingFeature(feature)) continue;
    const geometry = geometryToWgs(feature?.geometry, dataStore.buildingsSourceCrs);
    if (!geometry) continue;
    const targetOrderIdx = orderedTargetFeatures.length;
    targetBuildingOrderIndexBySourceIdx.set(sourceIdx, targetOrderIdx);
    orderedTargetFeatures.push({
      sourceIdx,
      feature: {
        type: "Feature",
        geometry,
        properties: { ...(feature.properties || {}) },
      },
    });
  }

  for (let sourceIdx = 0; sourceIdx < features.length; sourceIdx += 1) {
    const feature = features[sourceIdx];
    if (!isCoverageTargetBuildingFeature(feature)) continue;
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
    matchedSourceBuildingFeatureIndexes.add(sourceIdx);
  }

  // Fallback for datasets without a stable shared ID:
  // reproduce backend target filtering and map by ordered row index.
  if (buildingFeatureByIndex.size < coverageByIndex.size) {
    for (const idx of coverageByIndex.keys()) {
      const numericIdx = Number(idx);
      if (buildingFeatureByIndex.has(numericIdx)) continue;
      const mapped = orderedTargetFeatures[numericIdx];
      if (!mapped?.feature) continue;
      buildingFeatureByIndex.set(numericIdx, {
        ...mapped.feature,
        properties: { ...(mapped.feature.properties || {}), building_idx: numericIdx },
      });
      matchedSourceBuildingFeatureIndexes.add(mapped.sourceIdx);
    }
  }
}

function renderExistingCoverageBuildings() {
  layers.post1992Buildings.clearLayers();
  layers.notRelevantBuildings.clearLayers();
  layers.uncoveredBuildings.clearLayers();
  layers.coveredBuildingsBase.clearLayers();
  const bucket = getActiveBucketKey();
  const addedCoverageBuildingIndexes = getAddedCoverageBuildingIndexes();
  const uncoveredStyle = {
    color: "#e53935",
    weight: 1.4,
    fillColor: "#ef5350",
    fillOpacity: 0.4,
    opacity: 0.95,
  };
  const coveredStyle = {
    color: "#237b35",
    weight: 1.5,
    fillColor: "#74c989",
    fillOpacity: 0.5,
    opacity: 0.98,
  };
  const excludedStyle = {
    color: "#6f7882",
    weight: 1.15,
    fillColor: "#98a1ab",
    fillOpacity: 0.34,
    opacity: 0.92,
  };
  const addNotRelevantBuilding = (featureForRender, renderIdx) => {
    const notRelevantLayer = createBuildingLayer(featureForRender, excludedStyle, 2.2);
    notRelevantLayer.bindPopup(
      buildBuildingPopupHtml(featureForRender, renderIdx, "buildingPopupStatusNotRelevant", null),
      {
        className: "shelter-selection-popup",
      },
    );
    const criteriaText = escapeHtml(getBuildingTypesCriteriaText());
    notRelevantLayer.bindTooltip(
      `${escapeHtml(t("buildingNotRelevantHoverTitle"))}<br>${escapeHtml(t("buildingNotRelevantHoverCriteriaPrefix"))}: ${criteriaText}`,
      {
        sticky: true,
        direction: "top",
      },
    );
    notRelevantLayer.addTo(layers.notRelevantBuildings);
  };

  for (const [idx, coverage] of coverageByIndex.entries()) {
    const feature = buildingFeatureByIndex.get(Number(idx));
    const covered = Boolean(coverage?.[`covered_${bucket}`]) || addedCoverageBuildingIndexes.has(Number(idx));
    if (feature) {
      if (!isRelevantBySelectedBuildingTypes(feature)) {
        addNotRelevantBuilding(feature, idx);
        continue;
      }
      if (isAssumedShelteredFeature(feature)) {
        const layer = createBuildingLayer(feature, coveredStyle, 2.5);
        layer.bindPopup(buildBuildingPopupHtml(feature, idx, "buildingPopupStatusAssumed", coverage), {
          className: "shelter-selection-popup",
        });
        layer.addTo(layers.coveredBuildingsBase);
        continue;
      }
      const layer = createBuildingLayer(feature, covered ? coveredStyle : uncoveredStyle, 2.5);
      layer.bindPopup(
        buildBuildingPopupHtml(
          feature,
          idx,
          covered ? "buildingPopupStatusCovered" : "buildingPopupStatusUncovered",
          coverage,
        ),
        { className: "shelter-selection-popup" },
      );
      layer.addTo(covered ? layers.coveredBuildingsBase : layers.uncoveredBuildings);
      continue;
    }
    if (Number.isFinite(coverage?.lat) && Number.isFinite(coverage?.lon)) {
      const fallbackLayer = L.circleMarker([coverage.lat, coverage.lon], {
        radius: 2.5,
        color: covered ? coveredStyle.color : uncoveredStyle.color,
        weight: covered ? coveredStyle.weight : uncoveredStyle.weight,
        fillColor: covered ? coveredStyle.fillColor : uncoveredStyle.fillColor,
        fillOpacity: covered ? coveredStyle.fillOpacity : uncoveredStyle.fillOpacity,
        opacity: covered ? coveredStyle.opacity : uncoveredStyle.opacity,
      });
      fallbackLayer.bindPopup(covered ? t("buildingPopupCovered", idx) : t("buildingPopupUncovered", idx));
      fallbackLayer.addTo(covered ? layers.coveredBuildingsBase : layers.uncoveredBuildings);
    }
  }

  const sourceFeatures = Array.isArray(dataStore.buildings?.features) ? dataStore.buildings.features : [];
  const idKeys = ["building_idx", "OBJECTID", "objectid", "id", "ID"];
  for (let sourceIdx = 0; sourceIdx < sourceFeatures.length; sourceIdx += 1) {
    const feature = sourceFeatures[sourceIdx];
    if (matchedSourceBuildingFeatureIndexes.has(sourceIdx)) continue;
    const featureId = getFeatureNumericId(feature, idKeys);
    if (featureId !== null && coverageById.has(Number(featureId))) continue;
    const geometry = geometryToWgs(feature?.geometry, dataStore.buildingsSourceCrs);
    if (!geometry) continue;
    const featureForRender = { type: "Feature", geometry, properties: feature?.properties || {} };
    const renderIdx = getFeatureNumericId(feature, idKeys) ?? sourceIdx;
    if (!isRelevantBySelectedBuildingTypes(feature)) {
      addNotRelevantBuilding(featureForRender, renderIdx);
      continue;
    }
    if (isAssumedShelteredFeature(feature)) {
      const assumedLayer = createBuildingLayer(featureForRender, coveredStyle, 2.5);
      assumedLayer.bindPopup(buildBuildingPopupHtml(featureForRender, renderIdx, "buildingPopupStatusAssumed", null), {
        className: "shelter-selection-popup",
      });
      assumedLayer.addTo(layers.coveredBuildingsBase);
      continue;
    }
    const targetOrderIdx = targetBuildingOrderIndexBySourceIdx.get(sourceIdx);
    const coveredByAddedShelters =
      Number.isFinite(targetOrderIdx) && addedCoverageBuildingIndexes.has(Number(targetOrderIdx));
    const fallbackStyle = coveredByAddedShelters ? coveredStyle : uncoveredStyle;
    const fallbackStatusKey = coveredByAddedShelters
      ? "buildingPopupStatusCovered"
      : "buildingPopupStatusUncovered";
    const fallbackLayer = createBuildingLayer(featureForRender, fallbackStyle, 2.5);
    fallbackLayer.bindPopup(buildBuildingPopupHtml(featureForRender, renderIdx, fallbackStatusKey, null), {
      className: "shelter-selection-popup",
    });
    fallbackLayer.addTo(coveredByAddedShelters ? layers.coveredBuildingsBase : layers.uncoveredBuildings);
  }
}

function renderAccessibilityHeatmap() {
  layers.accessibilityHeatmap.clearLayers();
  if (!accessibilityHeatmapEnabled) return;
  const zoom = map.getZoom();
  const cellSize = ACCESSIBILITY_GRID_CELL_SIZE_PX;
  const buckets = new Map();
  const bucket = getActiveBucketKey();
  const distanceMaxMeters = getDistanceNormalizationMaxMeters();
  const addScoreToBuckets = (point, score) => {
    if (!point || !Number.isFinite(score)) return;
    const clampedScore = Math.max(0, Math.min(1, score));
    const projected = map.project(point, zoom);
    const cellX = Math.floor(projected.x / cellSize);
    const cellY = Math.floor(projected.y / cellSize);
    const key = `${cellX}:${cellY}`;
    const existing = buckets.get(key) || { cellX, cellY, minScore: 1 };
    existing.minScore = Math.min(existing.minScore, clampedScore);
    buckets.set(key, existing);
  };

  for (const [idx, coverage] of coverageByIndex.entries()) {
    const distanceMeters = Number(coverage?.nearest_shelter_distance_m);
    const distanceScore = getAccessibilityDistanceScore(distanceMeters, distanceMaxMeters);
    if (!Number.isFinite(distanceScore)) continue;
    const covered = Boolean(coverage?.[`covered_${bucket}`]);
    const score = covered ? Math.max(0.5, distanceScore) : Math.min(0.5, distanceScore);
    const point = getCoveragePointLatLng(coverage, idx);
    addScoreToBuckets(point, score);
  }

  const sourceFeatures = Array.isArray(dataStore.buildings?.features) ? dataStore.buildings.features : [];
  for (let sourceIdx = 0; sourceIdx < sourceFeatures.length; sourceIdx += 1) {
    if (matchedSourceBuildingFeatureIndexes.has(sourceIdx)) continue;
    const sourceFeature = sourceFeatures[sourceIdx];
    if (!isRelevantBySelectedBuildingTypes(sourceFeature)) continue;
    if (!isAssumedShelteredFeature(sourceFeature)) continue;
    const geometry = geometryToWgs(sourceFeature?.geometry, dataStore.buildingsSourceCrs);
    if (!geometry) continue;
    const featureForRender = {
      type: "Feature",
      geometry,
      properties: sourceFeature?.properties || {},
    };
    const point = getFeatureCenterLatLng(featureForRender);
    addScoreToBuckets(point, 1);
  }

  for (const cell of buckets.values()) {
    const score = Number.isFinite(cell.minScore) ? cell.minScore : 0;
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
      fillOpacity: 1,
      interactive: false,
    }).addTo(layers.accessibilityHeatmap);
  }
}

function normalizeCrsName(rawName) {
  if (!rawName) return "EPSG:2039";
  const normalized = String(rawName).toUpperCase();
  if (normalized.includes("CRS84") || normalized.includes("WGS84")) return "EPSG:4326";
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
  selectedShelters = [];
  layers.selectedShelterArea.clearLayers();
  layers.coveredBuildings.clearLayers();
}

function closeElevationLabelPopup() {
  if (!elevationLabelPopup) return;
  map.closePopup(elevationLabelPopup);
  elevationLabelPopup = null;
}

function getCurrentShelterCoveragePayload() {
  const bucket = getActiveBucketKey();
  return dataStore.shelterCoveragesByMetricModeBucket?.[currentDistanceMetric]?.[currentPlacementMode]?.[bucket];
}

function getSelectedCoverageMatches() {
  if (!selectedShelters.length) return [];
  const payload = getCurrentShelterCoveragePayload();
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

function getSelectionPalette(shelter) {
  return SELECTED_HIGHLIGHT_PALETTE;
}

function convexHull(points) {
  if (!Array.isArray(points) || points.length < 3) return [];
  const deduped = [];
  const seen = new Set();
  for (const point of points) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const key = `${x.toFixed(7)}:${y.toFixed(7)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push([x, y]);
  }
  if (deduped.length < 3) return [];
  deduped.sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const point of deduped) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }
  const upper = [];
  for (let i = deduped.length - 1; i >= 0; i -= 1) {
    const point = deduped[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function getIsochronePolygonLatLngs(match, shelter) {
  const coveredIndices = Array.isArray(match?.covered_building_indices) ? match.covered_building_indices : [];
  const hullInput = [[Number(shelter?.lon), Number(shelter?.lat)]];
  for (const idx of coveredIndices) {
    const point = getCoveragePointLatLng(coverageByIndex.get(Number(idx)), idx);
    if (!point) continue;
    hullInput.push([point.lng, point.lat]);
  }
  const hull = convexHull(hullInput);
  return hull.map(([lng, lat]) => [lat, lng]);
}

function getContourElevation(feature) {
  return getFirstNumericProperty(feature?.properties, ["HEIGHT", "height", "ELEV", "elev", "elevation"]);
}

function contourStyleForElevation(height) {
  const hasHeight = Number.isFinite(height);
  const isMajor = hasHeight && Math.abs(height % 50) < 0.0001;
  return {
    color: isMajor ? "#aeb9ca" : "#9aa8bc",
    weight: isMajor ? 0.85 : 0.5,
    opacity: isMajor ? 0.78 : 0.56,
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
    const latLng = featureToLatLng(feature, dataStore.miguniotSourceCrs);
    if (!latLng) continue;
    const shelterId = shelterIdCounter++;
    const marker = L.marker(latLng, { icon: existingIcon });
    marker.bindPopup(
      () => {
        const popup = buildShelterPopupData("miguniot", feature, shelterId);
        const coverageStats = getShelterCoverageStats("existing", shelterId);
        return renderShelterSelectionPopup(popup.title, coverageStats, popup.rows);
      },
      { className: "shelter-selection-popup" },
    );
    marker.on("click", () =>
      selectShelter(
        {
          kind: "existing",
          id: shelterId,
          lat: latLng[0],
          lon: latLng[1],
          sourceKind: "megunit",
          label: t("existingMegunitLabel"),
        },
      ),
    );
    marker.addTo(layers.existingMeguniot);
  }

  for (const feature of mikFeatures) {
    const latLng = featureToLatLng(feature, dataStore.miklatimSourceCrs);
    if (!latLng) continue;
    const shelterId = shelterIdCounter++;
    const marker = createShelterMarkerWithPalette(latLng, existingMiklatIcon);
    marker.bindPopup(
      () => {
        const popup = buildShelterPopupData("miklatim", feature, shelterId);
        const coverageStats = getShelterCoverageStats("existing", shelterId);
        return renderShelterSelectionPopup(popup.title, coverageStats, popup.rows);
      },
      { className: "shelter-selection-popup" },
    );
    marker.on("click", () =>
      selectShelter(
        {
          kind: "existing",
          id: shelterId,
          lat: latLng[0],
          lon: latLng[1],
          sourceKind: "miklat",
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
      addShelterSourceBuildingLayer(layers.existingMiklatim, feature, dataStore.educationFacilitiesSourceCrs, UNIFIED_COVERED_PALETTE);
      const marker = createShelterMarkerWithPalette(latLng, existingEducationIcon);
      marker.bindPopup(
        () => {
          const popup = buildShelterPopupData("education", feature, shelterId);
          const coverageStats = getShelterCoverageStats("existing", shelterId);
          return renderShelterSelectionPopup(popup.title, coverageStats, popup.rows);
        },
        { className: "shelter-selection-popup" },
      );
      marker.on("click", () =>
        selectShelter({
          kind: "existing",
          id: shelterId,
          lat: latLng[0],
          lon: latLng[1],
          sourceKind: "education",
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
      addShelterSourceBuildingLayer(layers.existingMiklatim, feature, dataStore.publicBuildingsSourceCrs, UNIFIED_COVERED_PALETTE);
      const marker = createShelterMarkerWithPalette(latLng, existingPublicIcon);
      marker.bindPopup(
        () => {
          const popup = buildShelterPopupData("public", feature, shelterId);
          const coverageStats = getShelterCoverageStats("existing", shelterId);
          return renderShelterSelectionPopup(popup.title, coverageStats, popup.rows);
        },
        { className: "shelter-selection-popup" },
      );
      marker.on("click", () =>
        selectShelter({
          kind: "existing",
          id: shelterId,
          lat: latLng[0],
          lon: latLng[1],
          sourceKind: "public",
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
  const modeLabel = t("modeLabelExact");
  const labels = getPopupLabels();
  for (const rec of rows) {
    const shelterId = rec.shelter_id ?? rec.candidate_id ?? rec.building_idx;
    const fullCount = (rec.covered_building_indices || []).length;
    const marginalCount = rec.newly_covered_buildings ?? fullCount;
    const marker = L.marker([rec.lat, rec.lon], { icon: recommendedIcon });
    marker.bindPopup(
      () => {
        const coverageStats = getShelterCoverageStats("recommended", shelterId, rec.covered_building_indices) || {
          coveredBuildingsCount: fullCount,
          coveredHousingUnits: getCoveredHousingUnitsByIndices(rec.covered_building_indices),
        };
        return renderShelterSelectionPopup(labels.titleRecommended, coverageStats, [
          { label: labels.rank, value: String(rec.rank) },
          { label: labels.mode, value: modeLabel },
          { label: labels.source, value: rec.candidate_source || "building" },
          { label: labels.newlyCovered, value: `${marginalCount} ${labels.buildingsSuffix}` },
        ]);
      },
      { className: "shelter-selection-popup" },
    );
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
  layers.selectedShelterArea.clearLayers();
  layers.coveredBuildings.clearLayers();
  if (!selectedShelters.length) return;

  const payload = getCurrentShelterCoveragePayload();
  const matches = getSelectedCoverageMatches();
  if (!matches.length) return;

  const euclideanRadius = Number(payload?.euclidean_access_radius_m);
  const graphFallbackRadius = Number(payload?.emergency_crossing_radius_m) > 0
    ? Number(payload.emergency_crossing_radius_m) * 2.5
    : 55;

  for (let mi = 0; mi < matches.length; mi++) {
    const { shelter, coverage: match } = matches[mi];
    const palette = getSelectionPalette(shelter);
    const buildingStyle = {
      color: palette.buildingStroke,
      weight: 2,
      fillColor: palette.buildingFill,
      fillOpacity: 0.68,
      opacity: 1,
    };
    const areaBaseStyle = {
      color: palette.areaStroke,
      weight: 2,
      fillColor: palette.areaFill,
      fillOpacity: 0.16,
      opacity: 0.96,
      interactive: false,
    };
    if (currentDistanceMetric === "euclidean" && Number.isFinite(euclideanRadius) && euclideanRadius > 0) {
      L.circle([shelter.lat, shelter.lon], {
        ...areaBaseStyle,
        radius: euclideanRadius,
      }).addTo(layers.selectedShelterArea);
    } else {
      const isochroneLatLngs = getIsochronePolygonLatLngs(match, shelter);
      if (isochroneLatLngs.length >= 3) {
        L.polygon(isochroneLatLngs, areaBaseStyle).addTo(layers.selectedShelterArea);
      } else {
        L.circle([shelter.lat, shelter.lon], {
          ...areaBaseStyle,
          radius: graphFallbackRadius,
        }).addTo(layers.selectedShelterArea);
      }
    }

    const indices = Array.isArray(match.covered_building_indices) ? match.covered_building_indices : [];

    for (const idx of indices) {
      const buildingFeature = buildingFeatureByIndex.get(Number(idx));
      if (buildingFeature) {
        createBuildingLayer(buildingFeature, buildingStyle, 4).addTo(layers.coveredBuildings);
        continue;
      }
      const b = coverageByIndex.get(Number(idx));
      if (!b) continue;
      L.circleMarker([b.lat, b.lon], {
        radius: 4,
        color: buildingStyle.color,
        fillColor: buildingStyle.fillColor,
        fillOpacity: buildingStyle.fillOpacity,
        weight: buildingStyle.weight,
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

function setLegendRowVisibility(rowEl, isVisible) {
  if (!rowEl) return;
  rowEl.classList.toggle("hidden", !isVisible);
}

function updateLegendVisibility() {
  const showMeguniot = !accessibilityHeatmapEnabled && Boolean(layerVisibility.meguniot);
  const showMiklatim = !accessibilityHeatmapEnabled && Boolean(layerVisibility.miklatim);
  const showEducationShelters = showMiklatim && Boolean(currentAssumptions.educationShelters);
  const showPublicShelters = showMiklatim && Boolean(currentAssumptions.publicShelters);
  const showRecommended = !accessibilityHeatmapEnabled && Boolean(layerVisibility.recommended);
  const showTopography = !accessibilityHeatmapEnabled && Boolean(layerVisibility.topography);
  const showCoveredBase = !accessibilityHeatmapEnabled && Boolean(layerVisibility.coveredBuildingsBase);
  const showNotRelevant = !accessibilityHeatmapEnabled && Boolean(layerVisibility.notRelevantBuildings);
  const showUncovered = !accessibilityHeatmapEnabled && Boolean(layerVisibility.uncoveredBuildings);
  const showCoveredSelected = !accessibilityHeatmapEnabled && Boolean(layerVisibility.covered);

  setLegendRowVisibility(legendRowMeguniot, showMeguniot);
  setLegendRowVisibility(legendRowMiklatim, showMiklatim);
  setLegendRowVisibility(legendRowEducationShelters, showEducationShelters);
  setLegendRowVisibility(legendRowPublicShelters, showPublicShelters);
  setLegendRowVisibility(legendRowRecommended, showRecommended);
  setLegendRowVisibility(legendRowTopography, showTopography);
  setLegendRowVisibility(legendRowCoveredBase, showCoveredBase);
  setLegendRowVisibility(legendRowNotRelevant, showNotRelevant);
  setLegendRowVisibility(legendRowUncovered, showUncovered);
  setLegendRowVisibility(legendRowCoveredSelected, showCoveredSelected);
}

function applyLayerVisibility() {
  if (accessibilityHeatmapEnabled) {
    const standardLayers = [
      layers.existingMeguniot,
      layers.existingMiklatim,
      layers.recommended,
      layers.topography,
      layers.post1992Buildings,
      layers.notRelevantBuildings,
      layers.uncoveredBuildings,
      layers.coveredBuildingsBase,
      layers.selectedShelterArea,
      layers.coveredBuildings,
    ];
    for (const layer of standardLayers) {
      map.removeLayer(layer);
    }
    if (!map.hasLayer(layers.accessibilityHeatmap)) {
      map.addLayer(layers.accessibilityHeatmap);
    }
    updateLegendVisibility();
    return;
  }

  map.removeLayer(layers.accessibilityHeatmap);
  const bindings = [
    ["meguniot", layers.existingMeguniot],
    ["miklatim", layers.existingMiklatim],
    ["recommended", layers.recommended],
    ["topography", layers.topography],
    ["post1992Buildings", layers.post1992Buildings],
    ["notRelevantBuildings", layers.notRelevantBuildings],
    ["uncoveredBuildings", layers.uncoveredBuildings],
    ["coveredBuildingsBase", layers.coveredBuildingsBase],
  ];
  for (const [key, layer] of bindings) {
    if (layerVisibility[key]) map.addLayer(layer);
    else map.removeLayer(layer);
  }
  if (layerVisibility.covered) {
    map.addLayer(layers.selectedShelterArea);
    map.addLayer(layers.coveredBuildings);
  } else {
    map.removeLayer(layers.selectedShelterArea);
    map.removeLayer(layers.coveredBuildings);
  }
  if (!isTopographyVisibleForInteraction()) {
    closeElevationLabelPopup();
  }
  updateLegendVisibility();
}

function renderStats() {
  if (hasNoSelectedBuildingTypes()) {
    statsEl.textContent = t("statsNoBuildingTypes");
    return;
  }
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

  const marginalCoverage = shown.reduce((sum, row) => sum + row.newly_covered_buildings, 0);
  const uncoveredNow = Number(stats.currently_uncovered) || 0;
  const remainingUncovered = Math.max(0, uncoveredNow - marginalCoverage);

  statsEl.innerHTML = t(
    "exactStats",
    "",
    uncoveredNow,
    "",
    shown.length,
    marginalCoverage,
    remainingUncovered,
  );
}

async function refreshView() {
  try {
    await ensureBucketAuxData(getActiveBucketKey());
    updateSliderBounds();
    countValue.textContent = countRange.value;
    renderExistingCoverageBuildings();
    renderAccessibilityHeatmap();
    renderRecommended();
    renderSelectedShelterCoverage();
    renderStats();
    applyLayerVisibility();
  } catch (error) {
    handleScenarioUiError(error);
  }
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    const error = new Error(`Failed to fetch ${path}: ${response.status}`);
    error.path = path;
    error.status = response.status;
    throw error;
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
  setLoadingStatus("loadingData");
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

async function loadAllData(reportLoadingStep = () => {}) {
  reportLoadingStep("loadingStageManifest");
  await loadScenarioManifest();
  setScenarioForAssumptions(currentAssumptions);
  reportLoadingStep("loadingStageCoreLayers");
  dataStore.miguniot = await fetchJson(`${DATA_BASE}/Miguniot.geojson`);
  dataStore.miguniotSourceCrs = normalizeCrsName(
    dataStore.miguniot?.crs?.properties?.name || "",
  );
  dataStore.miklatim = await fetchJson(`${DATA_BASE}/Miklatim.geojson`);
  dataStore.miklatimSourceCrs = normalizeCrsName(
    dataStore.miklatim?.crs?.properties?.name || "",
  );
  dataStore.buildings = await fetchJson(`${DATA_BASE}/updated_all_buildings_data_with_use.geojson`);
  dataStore.buildingsSourceCrs = normalizeCrsName(
    dataStore.buildings?.crs?.properties?.name || "",
  );
  reportLoadingStep("loadingStageNeighborLayers");
  dataStore.educationFacilities = await fetchJson(`${DATA_BASE}/Education_Facilities.geojson`);
  dataStore.educationFacilitiesSourceCrs = normalizeCrsName(
    dataStore.educationFacilities?.crs?.properties?.name || "",
  );
  dataStore.publicBuildings = await fetchJson(`${DATA_BASE}/buildings_on_מבני_ציבור.geojson`);
  dataStore.publicBuildingsSourceCrs = normalizeCrsName(
    dataStore.publicBuildings?.crs?.properties?.name || "",
  );
  reportLoadingStep("loadingStageTerrain");
  dataStore.contour = await fetchJson(`${DATA_BASE}/contour.geojson`);
  dataStore.contourSourceCrs = normalizeCrsName(
    dataStore.contour?.crs?.properties?.name || "",
  );
  buildContourSegments();
  reportLoadingStep("loadingStageCoverage");
  await ensureScenarioDataLoaded();
  dataStore.coverage = dataStore.coverageByMetric[currentDistanceMetric];

  coverageByIndex.clear();
  coverageById.clear();
  for (const b of dataStore.coverage.buildings || []) {
    coverageByIndex.set(Number(b.building_idx), b);
    coverageById.set(Number(b.id), b);
  }
  buildBuildingFeatureIndex();
  reportLoadingStep("loadingStageFinalizing");
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
  metricEuclideanBtn?.classList.toggle("active-toggle", metricKey === "euclidean");
  clearSelection();
  void refreshView();
}

function setPlacementMode(modeKey) {
  if (!PLACEMENT_OPTIONS.find((m) => m.key === modeKey)) return;
  if (accessibilityHeatmapEnabled) setAccessibilityHeatmap(false);
  currentPlacementMode = modeKey;
  modeExactBtn?.classList.toggle("active-toggle", modeKey === "exact");
  bucketControls?.classList.add("hidden-control");
  if (bucketSelect) {
    bucketSelect.disabled = true;
  }
  clearSelection();
  void refreshView();
}

async function applyAssumptions(nextAssumptions) {
  try {
    const previousWeightingEnabled = Boolean(currentAssumptions.weightByPopulation);
    const nextWeightingEnabled = Boolean(nextAssumptions?.weightByPopulation);
    const nextBuildingUseTypes = normalizeBuildingUseTypes(nextAssumptions?.buildingUseTypes);
    const adjustedAssumptions = {
      ...nextAssumptions,
      buildingUseTypes: nextBuildingUseTypes,
    };
    if (previousWeightingEnabled && !nextWeightingEnabled) {
      const restoredTypes = Array.from(
        new Set([...nextBuildingUseTypes, ...WEIGHTING_DISABLED_BUILDING_USE_TYPES]),
      ).sort((a, b) => a - b);
      adjustedAssumptions.buildingUseTypes = restoredTypes;
    }
    setScenarioForAssumptions(adjustedAssumptions);
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
  } catch (error) {
    handleScenarioUiError(error);
  }
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
    const suffix = label;
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
      properties: {
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
    const suffix = label;
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
    [layerNotRelevantBuildings, "notRelevantBuildings"],
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
  setAccessibilityHeatmap(accessibilityHeatmapEnabled);

  accessibilityHeatmapToggle?.addEventListener("click", () => {
    const enabled = !accessibilityHeatmapEnabled;
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
    assumeOnlyPublicLand,
    assumeWholeSettlement,
    assumeWeightByBuildings,
    assumeWeightByPopulation,
  ].filter(Boolean);
  for (const input of assumptionInputs) {
    input.addEventListener("change", () => {
      void applyAssumptions(readAssumptionsFromInputs());
    });
  }
  buildingFilterResidential?.addEventListener("change", () => {
    void applyAssumptions(readAssumptionsFromInputs());
  });
  buildingFilterNonResidential?.addEventListener("change", () => {
    if (buildingFilterNonResidential.disabled) {
      buildingFilterNonResidential.checked = false;
      showWeightingRestrictionNotice(t("weightingBuildingTypeRestrictionDisabledHint"), { isBlocking: true });
    }
    void applyAssumptions(readAssumptionsFromInputs());
  });
  buildingFilterNonResidentialControl?.addEventListener("click", (event) => {
    if (!buildingFilterNonResidential?.disabled) return;
    event.preventDefault();
    showWeightingRestrictionNotice(t("weightingBuildingTypeRestrictionDisabledHint"), { isBlocking: true });
  });
  assumeWeightByPopulation?.addEventListener("change", () => {
    if (!assumeWeightByPopulation.checked) return;
    showWeightingRestrictionNotice(t("weightingBuildingTypeRestrictionNotice"));
  });

  openGuideBtn.addEventListener("click", () => guideModal.classList.remove("hidden"));
  closeGuideBtn.addEventListener("click", () => guideModal.classList.add("hidden"));
  guideModal.addEventListener("click", (e) => {
    if (e.target === guideModal) guideModal.classList.add("hidden");
  });
  openLayersModalBtn?.addEventListener("click", () => layersModal?.classList.remove("hidden"));
  closeLayersModalBtn?.addEventListener("click", () => layersModal?.classList.add("hidden"));
  layersModal?.addEventListener("click", (e) => {
    if (e.target === layersModal) layersModal.classList.add("hidden");
  });
  for (const toggle of languageToggles) {
    toggle.addEventListener("change", () => {
      setGuideLanguage(toggle.checked ? "he" : "en");
    });
  }
  guideTabUsage.addEventListener("click", () => setGuideTab("usage"));
  guideTabMethods.addEventListener("click", () => setGuideTab("methods"));
  wireDrawerToggles();
  syncMobileUiState();
  mobileViewport.addEventListener("change", syncMobileUiState);
  mobileControlsBtn?.addEventListener("click", () => {
    const isOpen = controlStack?.classList.contains("mobile-open");
    setMobileControlPanelOpen(!isOpen);
  });
  mobilePanelCloseBtn?.addEventListener("click", () => setMobileControlPanelOpen(false));
  mobilePanelBackdrop?.addEventListener("click", () => setMobileControlPanelOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      layersModal?.classList.add("hidden");
    }
    if (event.key === "Escape" && isMobileViewport()) {
      setMobileControlPanelOpen(false);
    }
  });
}

setBaseMap(baseMapSelect.value || "light");
setGuideLanguage("he", { refreshMap: false });
setGuideTab("usage");
setLoadingStatus("loadingData");

const loadingOverlayStartMs = Date.now();
loadAllData((stepKey) => setLoadingStatus(stepKey))
  .then(async () => {
    wireEvents();
    renderExistingShelters();
    renderContourLayer();
    reportProjectionStatus();
    setPlacementMode("exact");
    setGuideLanguage(currentLanguage);
    const elapsed = Date.now() - loadingOverlayStartMs;
    const minVisibleMs = 700;
    if (elapsed < minVisibleMs) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, minVisibleMs - elapsed);
      });
    }
    hideLoadingOverlay();
  })
  .catch((err) => {
    handleScenarioUiError(err);
    const message = t("errorLoadingData", err.message);
    statsEl.textContent = message;
    setLoadingStatus(message);
  });
