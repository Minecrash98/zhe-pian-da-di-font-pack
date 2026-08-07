(function () {
  "use strict";

  var defaults = {
    line1: "直到群友变成",
    line2: "一只小猪",
    subtitle: "Till We All Turn into Little Piggies",
    canvasSize: "1600x743",
    canvasRatioMode: "1600x743",
    backgroundMode: "checker",
    fontStyle: "playful",
    irregularity: 58,
    advancedLayerMode: false,
    lineGap: 110,
    subtitleGap: 100,
    artworkScale: 100,
    artworkX: 50,
    artworkY: 50,
    artworkRotation: 0,
    outline: true,
    titleShadowEnabled: true,
    titleShadowColor: "#4b3020",
    titleShadowOpacity: 28,
    titleShadowOffsetY: 3,
    titleShadowBlur: 5,
    primaryColor: "#0962b5",
    accentColor: "#fcc641",
    skyColor: "#44a5db",
    exportScale: 2,
    overlayScale: 100,
    overlayX: 50,
    overlayY: 50,
    overlayRotation: 0,
    overlayOpacity: 100,
    overlayLayer: "background",
    overlayLocked: false,
    gifQuality: "balanced",
    glyphAdjustments: {},
    seed: 147
  };

  function cloneGlyphAdjustments(source) {
    var clone = {};
    Object.keys(source || {}).forEach(function (lineId) {
      clone[lineId] = {};
      Object.keys(source[lineId] || {}).forEach(function (glyphIndex) {
        clone[lineId][glyphIndex] = Object.assign(
          {},
          source[lineId][glyphIndex]
        );
      });
    });
    return clone;
  }

  function createState(overrides) {
    var next = Object.assign({}, defaults, overrides || {});
    next.glyphAdjustments = cloneGlyphAdjustments(
      overrides && overrides.glyphAdjustments
        ? overrides.glyphAdjustments
        : defaults.glyphAdjustments
    );
    return next;
  }

  var state = createState();
  var renderFrame = 0;
  var toastTimer = 0;
  var logoFontsReady = null;
  var vectorEngineReady = null;
  var styleEngine = window.LetteringStyleEngine || null;
  var selectedOfficialAsset = null;
  var officialAssetCategory = "characters";
  var gifPreviewTimer = 0;
  var gifFrameCache = Object.create(null);
  var gifDecoder = window.GifuctJS || null;
  var localGifLimits = {
    maxBytes: 15 * 1024 * 1024,
    maxFrames: 60,
    maxSourcePixels: 6000000,
    maxSourceSide: 3200,
    mobileSourcePixels: 3000000,
    mobileSourceSide: 2400,
    desktopFramePixels: 18000000,
    mobileFramePixels: 10000000
  };
  var angelinaAssets = window.ANGELINA_ASSETS || {
    characters: [],
    decorations: []
  };
  var textLayerDefinitions = [
    {
      id: "text-line-1",
      textKey: "line1",
      name: "第一行中文",
      thumbnail: "1",
      lineIndex: 0,
      x: 50,
      y: 36,
      scale: 100,
      rotation: 0,
      opacity: 100
    },
    {
      id: "text-line-2",
      textKey: "line2",
      name: "第二行中文",
      thumbnail: "2",
      lineIndex: 1,
      x: 50,
      y: 68,
      scale: 100,
      rotation: 0,
      opacity: 100
    },
    {
      id: "text-subtitle",
      textKey: "subtitle",
      name: "英文小字",
      thumbnail: "EN",
      lineIndex: 2,
      x: 50,
      y: 87,
      scale: 100,
      rotation: 0,
      opacity: 100
    }
  ];
  var decorationLayerDefinition = {
    id: "star-decorations",
    type: "decoration",
    sourceType: "generated-stars",
    name: "星星装饰",
    thumbnail: "✦",
    x: 50,
    y: 50,
    scale: 100,
    rotation: 0,
    opacity: 100,
    starCount: 30,
    showJDecorations: true,
    layoutSeed: 147
  };
  var letteringGroupDefinition = {
    id: "lettering-group",
    type: "lettering-group",
    sourceType: "lettering-group",
    name: "字标组合",
    thumbnail: "T✦",
    x: 50,
    y: 50,
    scale: 100,
    rotation: 0,
    opacity: 100,
    starCount: 30,
    showJDecorations: true,
    layoutSeed: 147
  };
  var layerSequence = 0;
  var textLayerStore = Object.create(null);
  var decorationLayerStore = null;
  var letteringGroupStore = null;

  function createDefaultDecorationLayer() {
    return {
      id: decorationLayerDefinition.id,
      type: decorationLayerDefinition.type,
      sourceType: decorationLayerDefinition.sourceType,
      name: decorationLayerDefinition.name,
      thumbnail: decorationLayerDefinition.thumbnail,
      x: decorationLayerDefinition.x,
      y: decorationLayerDefinition.y,
      scale: decorationLayerDefinition.scale,
      rotation: decorationLayerDefinition.rotation,
      opacity: decorationLayerDefinition.opacity,
      starCount: decorationLayerDefinition.starCount,
      showJDecorations: decorationLayerDefinition.showJDecorations,
      layoutSeed: decorationLayerDefinition.layoutSeed,
      defaultX: decorationLayerDefinition.x,
      defaultY: decorationLayerDefinition.y,
      defaultScale: decorationLayerDefinition.scale,
      defaultRotation: decorationLayerDefinition.rotation,
      defaultOpacity: decorationLayerDefinition.opacity,
      visible: true,
      locked: false
    };
  }

  function createDefaultLetteringGroupLayer() {
    return {
      id: letteringGroupDefinition.id,
      type: letteringGroupDefinition.type,
      sourceType: letteringGroupDefinition.sourceType,
      name: letteringGroupDefinition.name,
      thumbnail: letteringGroupDefinition.thumbnail,
      x: letteringGroupDefinition.x,
      y: letteringGroupDefinition.y,
      scale: letteringGroupDefinition.scale,
      rotation: letteringGroupDefinition.rotation,
      opacity: letteringGroupDefinition.opacity,
      starCount: letteringGroupDefinition.starCount,
      showJDecorations: letteringGroupDefinition.showJDecorations,
      layoutSeed: letteringGroupDefinition.layoutSeed,
      defaultX: letteringGroupDefinition.x,
      defaultY: letteringGroupDefinition.y,
      defaultScale: letteringGroupDefinition.scale,
      defaultRotation: letteringGroupDefinition.rotation,
      defaultOpacity: letteringGroupDefinition.opacity,
      visible: true,
      locked: false,
      lastIndex: 0
    };
  }

  function createDefaultTextLayers() {
    textLayerStore = Object.create(null);
    textLayerDefinitions.forEach(function (definition) {
      textLayerStore[definition.id] = {
        id: definition.id,
        type: "text",
        textKey: definition.textKey,
        name: definition.name,
        thumbnail: definition.thumbnail,
        lineIndex: definition.lineIndex,
        x: definition.x,
        y: definition.y,
        scale: definition.scale,
        rotation: definition.rotation,
        opacity: definition.opacity,
        defaultX: definition.x,
        defaultY: definition.y,
        defaultScale: definition.scale,
        defaultRotation: definition.rotation,
        defaultOpacity: definition.opacity,
        visible: true,
        locked: false,
        advancedActive: true,
        lastIndex: 0
      };
    });
    decorationLayerStore = createDefaultDecorationLayer();
    letteringGroupStore = createDefaultLetteringGroupLayer();
    return [letteringGroupStore];
  }

  var layers = createDefaultTextLayers();
  var activeLayerId = "lettering-group";
  var draggedLayerId = "";
  var animationStartedAt = performance.now();
  var activeDragTarget = "lettering-group";
  var activeColorTarget = "primaryColor";
  var canvasSelectionVisible = false;
  var canvasDragging = false;
  var canvasDragStart = null;
  var canvasHandleDrag = null;
  var lastPreviewResult = null;
  var canvasStageResizeObserver = null;
  var localAssetDbPromise = null;
  var fontLoadingPercent = 0;
  var fontLoadingHideTimer = 0;
  var localUploadStatusTimer = 0;
  var initialFontLoadingError = null;
  var cacheRefreshInProgress = false;
  var pendingSaveFile = null;
  var pendingSaveBlob = null;
  var pendingSaveFilename = "";
  var pendingSaveObjectUrl = "";
  var pendingSaveDataUrl = "";
  var pendingSaveDimensions = "";
  var pendingSaveGeneration = 0;
  var saveAssistReturnFocus = null;
  var activeEditorSection = "text";
  var stackedEditorQuery = window.matchMedia("(max-width: 900px)");
  var expandedLayerId = activeLayerId;
  var undoStack = [];
  var redoStack = [];
  var historyPresent = null;
  var historyTimer = 0;
  var historySuspended = false;
  var aboutReturnFocus = null;
  var welcomeCloseTimer = 0;
  var activeGlyphTarget = null;

  var elements = {
    appShell: document.querySelector(".app-shell"),
    workspace: document.querySelector(".workspace"),
    editorSectionNav: document.getElementById("editorSectionNav"),
    editorSectionTabs: document.querySelectorAll("[data-editor-tab]"),
    editorSectionPanels: document.querySelectorAll("[data-editor-panel]"),
    layerPanel: document.getElementById("layerPanel"),
    canvas: document.getElementById("logoCanvas"),
    canvasStage: document.getElementById("canvasStage"),
    canvasFrame: document.getElementById("canvasFrame"),
    canvasCornerLabel: document.getElementById("canvasCornerLabel"),
    canvasSelection: document.getElementById("canvasSelection"),
    canvasSelectionLabel: document.getElementById("canvasSelectionLabel"),
    canvasSelectionDeleteButton: document.getElementById(
      "canvasSelectionDeleteButton"
    ),
    canvasRotationHandle: document.getElementById("canvasRotationHandle"),
    canvasScaleHandle: document.getElementById("canvasScaleHandle"),
    canvasResetButton: document.getElementById("canvasResetButton"),
    layerList: document.getElementById("layerList"),
    layerCount: document.getElementById("layerCount"),
    textLayerToggleButtons: document.querySelectorAll(
      "[data-text-layer-toggle]"
    ),
    textLayerFields: document.querySelectorAll("[data-text-layer-field]"),
    activeLayerSummary: document.getElementById("activeLayerSummary"),
    undoButton: document.getElementById("undoButton"),
    redoButton: document.getElementById("redoButton"),
    mobileUndoButton: document.getElementById("mobileUndoButton"),
    mobileRedoButton: document.getElementById("mobileRedoButton"),
    mobileHistoryToolbar: document.getElementById("mobileHistoryToolbar"),
    layerPropertiesSection: document.getElementById("layerPropertiesSection"),
    selectedLayerPreview: document.getElementById("selectedLayerPreview"),
    selectedLayerType: document.getElementById("selectedLayerType"),
    selectedLayerName: document.getElementById("selectedLayerName"),
    selectedLayerScale: document.getElementById("selectedLayerScale"),
    selectedLayerScaleValue: document.getElementById("selectedLayerScaleValue"),
    selectedLayerX: document.getElementById("selectedLayerX"),
    selectedLayerXValue: document.getElementById("selectedLayerXValue"),
    selectedLayerY: document.getElementById("selectedLayerY"),
    selectedLayerYValue: document.getElementById("selectedLayerYValue"),
    selectedLayerRotation: document.getElementById("selectedLayerRotation"),
    selectedLayerRotationValue: document.getElementById("selectedLayerRotationValue"),
    selectedLayerOpacity: document.getElementById("selectedLayerOpacity"),
    selectedLayerOpacityValue: document.getElementById("selectedLayerOpacityValue"),
    selectedLayerVisibilityButton: document.getElementById(
      "selectedLayerVisibilityButton"
    ),
    selectedLayerLockButton: document.getElementById("selectedLayerLockButton"),
    selectedLayerResetButton: document.getElementById("selectedLayerResetButton"),
    selectedLayerDeleteButton: document.getElementById("selectedLayerDeleteButton"),
    decorationLayerControls: document.getElementById("decorationLayerControls"),
    selectedStarCount: document.getElementById("selectedStarCount"),
    selectedStarCountValue: document.getElementById("selectedStarCountValue"),
    selectedJDecorations: document.getElementById("selectedJDecorations"),
    randomizeStarsButton: document.getElementById("randomizeStarsButton"),
    groupLayerControls: document.getElementById("groupLayerControls"),
    selectedGroupLineGap: document.getElementById("selectedGroupLineGap"),
    selectedGroupLineGapValue: document.getElementById(
      "selectedGroupLineGapValue"
    ),
    selectedGroupSubtitleGap: document.getElementById(
      "selectedGroupSubtitleGap"
    ),
    selectedGroupSubtitleGapValue: document.getElementById(
      "selectedGroupSubtitleGapValue"
    ),
    selectedGroupStarCount: document.getElementById(
      "selectedGroupStarCount"
    ),
    selectedGroupStarCountValue: document.getElementById(
      "selectedGroupStarCountValue"
    ),
    selectedGroupJDecorations: document.getElementById(
      "selectedGroupJDecorations"
    ),
    randomizeGroupStarsButton: document.getElementById(
      "randomizeGroupStarsButton"
    ),
    textControlsSection: document.getElementById("textControlsSection"),
    assetLibrarySection: document.getElementById("assetLibrarySection"),
    controlPanel: document.querySelector(".control-panel"),
    line1: document.getElementById("line1"),
    line2: document.getElementById("line2"),
    subtitle: document.getElementById("subtitle"),
    line1Count: document.getElementById("line1Count"),
    line2Count: document.getElementById("line2Count"),
    subtitleCount: document.getElementById("subtitleCount"),
    glyphFineTuneCard: document.getElementById("glyphFineTuneCard"),
    glyphFineTuneEmpty: document.getElementById("glyphFineTuneEmpty"),
    glyphFineTuneEditor: document.getElementById("glyphFineTuneEditor"),
    glyphTargetCharacter: document.getElementById("glyphTargetCharacter"),
    glyphTargetLabel: document.getElementById("glyphTargetLabel"),
    glyphTargetHint: document.getElementById("glyphTargetHint"),
    glyphTargetProgress: document.getElementById("glyphTargetProgress"),
    previousGlyphButton: document.getElementById("previousGlyphButton"),
    nextGlyphButton: document.getElementById("nextGlyphButton"),
    glyphResetButton: document.getElementById("glyphResetButton"),
    glyphResetAllButton: document.getElementById("glyphResetAllButton"),
    glyphScale: document.getElementById("glyphScale"),
    glyphScaleValue: document.getElementById("glyphScaleValue"),
    glyphOffsetX: document.getElementById("glyphOffsetX"),
    glyphOffsetXValue: document.getElementById("glyphOffsetXValue"),
    glyphOffsetY: document.getElementById("glyphOffsetY"),
    glyphOffsetYValue: document.getElementById("glyphOffsetYValue"),
    glyphRotation: document.getElementById("glyphRotation"),
    glyphRotationValue: document.getElementById("glyphRotationValue"),
    advancedLayerMode: document.getElementById("advancedLayerMode"),
    layerModeDescription: document.getElementById("layerModeDescription"),
    layerModeStatus: document.getElementById("layerModeStatus"),
    canvasSize: document.getElementById("canvasSize"),
    canvasRatioPicker: document.getElementById("canvasRatioPicker"),
    autoCanvasRatioButton: document.getElementById("autoCanvasRatioButton"),
    autoCanvasRatioShape: document.getElementById("autoCanvasRatioShape"),
    artworkScale: document.getElementById("artworkScale"),
    artworkScaleValue: document.getElementById("artworkScaleValue"),
    artworkX: document.getElementById("artworkX"),
    artworkXValue: document.getElementById("artworkXValue"),
    artworkY: document.getElementById("artworkY"),
    artworkYValue: document.getElementById("artworkYValue"),
    artworkRotation: document.getElementById("artworkRotation"),
    artworkRotationValue: document.getElementById("artworkRotationValue"),
    resetArtworkButton: document.getElementById("resetArtworkButton"),
    selectedTextLayerName: document.getElementById("selectedTextLayerName"),
    titleShadowEnabled: document.getElementById("titleShadowEnabled"),
    titleShadowControls: document.getElementById("titleShadowControls"),
    titleShadowColor: document.getElementById("titleShadowColor"),
    titleShadowColorValue: document.getElementById("titleShadowColorValue"),
    shadowColorPreview: document.getElementById("shadowColorPreview"),
    shadowColorHexInput: document.getElementById("shadowColorHexInput"),
    shadowColorHue: document.getElementById("shadowColorHue"),
    shadowColorHueValue: document.getElementById("shadowColorHueValue"),
    shadowColorSaturation: document.getElementById("shadowColorSaturation"),
    shadowColorSaturationValue: document.getElementById(
      "shadowColorSaturationValue"
    ),
    shadowColorLightness: document.getElementById("shadowColorLightness"),
    shadowColorLightnessValue: document.getElementById(
      "shadowColorLightnessValue"
    ),
    titleShadowOpacity: document.getElementById("titleShadowOpacity"),
    titleShadowOpacityValue: document.getElementById("titleShadowOpacityValue"),
    titleShadowOffsetY: document.getElementById("titleShadowOffsetY"),
    titleShadowOffsetYValue: document.getElementById("titleShadowOffsetYValue"),
    titleShadowBlur: document.getElementById("titleShadowBlur"),
    titleShadowBlurValue: document.getElementById("titleShadowBlurValue"),
    canvasActiveObjectName: document.getElementById("canvasActiveObjectName"),
    outline: document.getElementById("outline"),
    primaryColor: document.getElementById("primaryColor"),
    primaryColorValue: document.getElementById("primaryColorValue"),
    accentColor: document.getElementById("accentColor"),
    accentColorValue: document.getElementById("accentColorValue"),
    skyColor: document.getElementById("skyColor"),
    skyColorValue: document.getElementById("skyColorValue"),
    colorTargetButtons: document.querySelectorAll("[data-color-target]"),
    colorPresetButtons: document.querySelectorAll("[data-color-preset]"),
    palettePresetButtons: document.querySelectorAll("[data-palette]"),
    colorEditorTargetLabel: document.getElementById(
      "colorEditorTargetLabel"
    ),
    colorEditorPreview: document.getElementById("colorEditorPreview"),
    colorHexInput: document.getElementById("colorHexInput"),
    colorHue: document.getElementById("colorHue"),
    colorHueValue: document.getElementById("colorHueValue"),
    colorSaturation: document.getElementById("colorSaturation"),
    colorSaturationValue: document.getElementById("colorSaturationValue"),
    colorLightness: document.getElementById("colorLightness"),
    colorLightnessValue: document.getElementById("colorLightnessValue"),
    overlayFile: document.getElementById("overlayFile"),
    imageLayerTitle: document.getElementById("imageLayerTitle"),
    officialAssetsSummaryHint: document.getElementById(
      "officialAssetsSummaryHint"
    ),
    assetCategoryTabs: document.getElementById("assetCategoryTabs"),
    assetCategoryButtons: document.querySelectorAll(
      "[data-asset-category]"
    ),
    officialAssetsHint: document.getElementById("officialAssetsHint"),
    officialAssetGrid: document.getElementById("officialAssetGrid"),
    customUploadBlock: document.getElementById("customUploadBlock"),
    localUploadStatus: document.getElementById("localUploadStatus"),
    overlayHint: document.getElementById("overlayHint"),
    overlayControls: document.getElementById("overlayControls"),
    overlayFileCard: document.getElementById("overlayFileCard"),
    overlayThumbnail: document.getElementById("overlayThumbnail"),
    overlayPlaceholder: document.getElementById("overlayPlaceholder"),
    overlayFileName: document.getElementById("overlayFileName"),
    overlayFileMeta: document.getElementById("overlayFileMeta"),
    overlayScale: document.getElementById("overlayScale"),
    overlayScaleValue: document.getElementById("overlayScaleValue"),
    overlayX: document.getElementById("overlayX"),
    overlayXValue: document.getElementById("overlayXValue"),
    overlayY: document.getElementById("overlayY"),
    overlayYValue: document.getElementById("overlayYValue"),
    overlayRotation: document.getElementById("overlayRotation"),
    overlayRotationValue: document.getElementById("overlayRotationValue"),
    overlayOpacity: document.getElementById("overlayOpacity"),
    overlayOpacityValue: document.getElementById("overlayOpacityValue"),
    overlayLayer: document.getElementById("overlayLayer"),
    overlayLockButton: document.getElementById("overlayLockButton"),
    removeOverlayButton: document.getElementById("removeOverlayButton"),
    resetOverlayButton: document.getElementById("resetOverlayButton"),
    exportScale: document.getElementById("exportScale"),
    gifQuality: document.getElementById("gifQuality"),
    imageQualityControl: document.getElementById("imageQualityControl"),
    gifQualityControl: document.getElementById("gifQualityControl"),
    exportTitle: document.getElementById("exportTitle"),
    exportDescription: document.getElementById("exportDescription"),
    renderStatus: document.getElementById("renderStatus"),
    canvasCompatibilityNotice: document.getElementById(
      "canvasCompatibilityNotice"
    ),
    downloadButton: document.getElementById("downloadButton"),
    downloadButtonIcon: document.getElementById("downloadButtonIcon"),
    downloadButtonLabel: document.getElementById("downloadButtonLabel"),
    cacheRefreshButton: document.getElementById("cacheRefreshButton"),
    mobileCacheRefreshButton: document.getElementById(
      "mobileCacheRefreshButton"
    ),
    cacheRefreshLabel: document.getElementById("cacheRefreshLabel"),
    aboutButton: document.getElementById("aboutButton"),
    aboutDialog: document.getElementById("aboutDialog"),
    aboutBackdrop: document.getElementById("aboutBackdrop"),
    aboutCloseButton: document.getElementById("aboutCloseButton"),
    welcomeDialog: document.getElementById("welcomeDialog"),
    welcomeStartButton: document.getElementById("welcomeStartButton"),
    welcomeBrowserTip: document.getElementById("welcomeBrowserTip"),
    resetButton: document.getElementById("resetButton"),
    saveAssist: document.getElementById("saveAssist"),
    saveAssistCard: document.getElementById("saveAssistCard"),
    saveAssistTitle: document.getElementById("saveAssistTitle"),
    saveAssistDescription: document.getElementById("saveAssistDescription"),
    saveAssistBackdrop: document.getElementById("saveAssistBackdrop"),
    saveAssistCloseButton: document.getElementById("saveAssistCloseButton"),
    systemSaveButton: document.getElementById("systemSaveButton"),
    openSavedImageButton: document.getElementById("openSavedImageButton"),
    saveImagePreview: document.getElementById("saveImagePreview"),
    savedImagePreview: document.getElementById("savedImagePreview"),
    closeSavedImageButton: document.getElementById("closeSavedImageButton"),
    toast: document.getElementById("toast"),
    toastText: document.getElementById("toastText"),
    fontLoadingPopover: document.getElementById("fontLoadingPopover"),
    fontLoadingLabel: document.getElementById("fontLoadingLabel"),
    fontLoadingPercent: document.getElementById("fontLoadingPercent"),
    fontLoadingTrack: document.getElementById("fontLoadingTrack"),
    fontLoadingBar: document.getElementById("fontLoadingBar")
  };

  var examples = [
    {
      line1: "直到25块变成",
      line2: "一个5块",
      subtitle: "Till 25 Turns into 5"
    },
    {
      line1: "直到群友变成",
      line2: "一只小猪",
      subtitle: "Till We All Turn into Little Piggies"
    },
    {
      line1: "直到所有盲盒",
      line2: "变成单领",
      subtitle: "Till Every Blind Box Becomes a Solo Pick"
    },
    {
      line1: "直到余量变成",
      line2: "团长包尾",
      subtitle: "Till the Group Leader Takes the Rest"
    }
  ];

  function splitGraphemes(text) {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      var segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      return Array.from(segmenter.segment(text), function (item) {
        return item.segment;
      });
    }
    return Array.from(text);
  }

  function graphemeCount(text) {
    return splitGraphemes(text).length;
  }

  var neutralGlyphAdjustment = {
    char: "",
    x: 0,
    y: 0,
    scale: 100,
    rotation: 0
  };

  function normalizedGlyphAdjustment(value, character) {
    value = value || neutralGlyphAdjustment;
    return {
      char: character || value.char || "",
      x: clamp(Number(value.x) || 0, -150, 150),
      y: clamp(Number(value.y) || 0, -150, 150),
      scale: clamp(Number(value.scale) || 100, 30, 250),
      rotation: clamp(Number(value.rotation) || 0, -180, 180)
    };
  }

  function glyphAdjustmentIsNeutral(value) {
    return Boolean(
      value &&
        Number(value.x) === 0 &&
        Number(value.y) === 0 &&
        Number(value.scale) === 100 &&
        Number(value.rotation) === 0
    );
  }

  function glyphAdjustmentFor(lineId, glyphIndex, character) {
    var lineAdjustments =
      state.glyphAdjustments && state.glyphAdjustments[lineId];
    var stored = lineAdjustments && lineAdjustments[String(glyphIndex)];
    if (!stored || stored.char !== character) {
      return normalizedGlyphAdjustment(null, character);
    }
    return normalizedGlyphAdjustment(stored, character);
  }

  function glyphEditorItems() {
    var items = [];
    textLayerDefinitions.forEach(function (definition) {
      if (state.advancedLayerMode && !getLayer(definition.id)) {
        return;
      }
      var characters = splitGraphemes(state[definition.textKey] || "");
      var visibleCharacters = characters.filter(function (character) {
        return Boolean(character.trim());
      });
      var visibleIndex = 0;
      characters.forEach(function (character, glyphIndex) {
        if (!character.trim()) {
          return;
        }
        visibleIndex += 1;
        items.push({
          lineId: definition.id,
          lineName: definition.name,
          textKey: definition.textKey,
          char: character,
          glyphIndex: glyphIndex,
          linePosition: visibleIndex,
          lineCount: visibleCharacters.length
        });
      });
    });
    return items;
  }

  function resolveActiveGlyphTarget(items) {
    items = items || glyphEditorItems();
    if (!items.length) {
      activeGlyphTarget = null;
      return { items: items, item: null, index: -1 };
    }

    var activeIndex = -1;
    if (activeGlyphTarget) {
      activeIndex = items.findIndex(function (item) {
        return (
          item.lineId === activeGlyphTarget.lineId &&
          item.glyphIndex === activeGlyphTarget.glyphIndex &&
          item.char === activeGlyphTarget.char
        );
      });
      if (activeIndex < 0) {
        activeIndex = items.findIndex(function (item) {
          return (
            item.lineId === activeGlyphTarget.lineId &&
            item.glyphIndex === activeGlyphTarget.glyphIndex
          );
        });
      }
    }
    if (activeIndex < 0) {
      activeIndex = 0;
    }

    var item = items[activeIndex];
    activeGlyphTarget = {
      lineId: item.lineId,
      glyphIndex: item.glyphIndex,
      char: item.char
    };
    return { items: items, item: item, index: activeIndex };
  }

  function glyphAdjustmentCount() {
    return Object.keys(state.glyphAdjustments || {}).reduce(
      function (total, lineId) {
        return total + Object.keys(state.glyphAdjustments[lineId] || {}).length;
      },
      0
    );
  }

  function formatSignedValue(value, suffix) {
    var number = Number(value) || 0;
    return (number > 0 ? "+" : "") + number + (suffix || "");
  }

  function updateGlyphEditorInterface() {
    if (!elements.glyphFineTuneCard) {
      return;
    }
    var resolved = resolveActiveGlyphTarget();
    var item = resolved.item;
    var empty = !item;
    elements.glyphFineTuneEmpty.hidden = !empty;
    elements.glyphFineTuneEditor.hidden = empty;
    if (empty) {
      return;
    }

    var adjustment = glyphAdjustmentFor(
      item.lineId,
      item.glyphIndex,
      item.char
    );
    var adjusted = !glyphAdjustmentIsNeutral(adjustment);
    elements.glyphTargetCharacter.textContent = item.char;
    elements.glyphTargetLabel.textContent =
      item.lineName +
      " · 第 " +
      item.linePosition +
      " / " +
      item.lineCount +
      " 字";
    elements.glyphTargetHint.textContent =
      "当前微调“" + item.char + "” · " + (adjusted ? "已调整" : "默认位置");
    elements.glyphTargetProgress.value =
      resolved.index + 1 + " / " + resolved.items.length;
    elements.previousGlyphButton.disabled = resolved.index <= 0;
    elements.nextGlyphButton.disabled =
      resolved.index >= resolved.items.length - 1;
    elements.glyphResetButton.disabled = !adjusted;
    elements.glyphResetAllButton.disabled = glyphAdjustmentCount() === 0;

    elements.glyphScale.value = adjustment.scale;
    elements.glyphOffsetX.value = adjustment.x;
    elements.glyphOffsetY.value = adjustment.y;
    elements.glyphRotation.value = adjustment.rotation;
    updateRangeProgress(elements.glyphScale);
    updateRangeProgress(elements.glyphOffsetX);
    updateRangeProgress(elements.glyphOffsetY);
    updateRangeProgress(elements.glyphRotation);
    elements.glyphScaleValue.value = adjustment.scale + "%";
    elements.glyphOffsetXValue.value = formatSignedValue(adjustment.x, "%");
    elements.glyphOffsetYValue.value = formatSignedValue(adjustment.y, "%");
    elements.glyphRotationValue.value = formatSignedValue(
      adjustment.rotation,
      "°"
    );
  }

  function moveActiveGlyphTarget(delta) {
    var resolved = resolveActiveGlyphTarget();
    if (!resolved.item) {
      return;
    }
    var nextIndex = clamp(
      resolved.index + delta,
      0,
      resolved.items.length - 1
    );
    var next = resolved.items[nextIndex];
    activeGlyphTarget = {
      lineId: next.lineId,
      glyphIndex: next.glyphIndex,
      char: next.char
    };
    updateGlyphEditorInterface();
  }

  function setCurrentGlyphAdjustment(property, value) {
    var resolved = resolveActiveGlyphTarget();
    var item = resolved.item;
    if (!item) {
      return;
    }
    var adjustment = glyphAdjustmentFor(
      item.lineId,
      item.glyphIndex,
      item.char
    );
    adjustment[property] = Number(value);
    adjustment = normalizedGlyphAdjustment(adjustment, item.char);

    var nextAdjustments = cloneGlyphAdjustments(state.glyphAdjustments);
    var lineAdjustments = nextAdjustments[item.lineId] || {};
    if (glyphAdjustmentIsNeutral(adjustment)) {
      delete lineAdjustments[String(item.glyphIndex)];
    } else {
      lineAdjustments[String(item.glyphIndex)] = adjustment;
    }
    if (Object.keys(lineAdjustments).length) {
      nextAdjustments[item.lineId] = lineAdjustments;
    } else {
      delete nextAdjustments[item.lineId];
    }
    state.glyphAdjustments = nextAdjustments;
    updateGlyphEditorInterface();
    scheduleRender();
    scheduleHistoryCapture();
  }

  function resetCurrentGlyphAdjustment(notifyUser) {
    var resolved = resolveActiveGlyphTarget();
    var item = resolved.item;
    if (!item) {
      return;
    }
    var nextAdjustments = cloneGlyphAdjustments(state.glyphAdjustments);
    if (nextAdjustments[item.lineId]) {
      delete nextAdjustments[item.lineId][String(item.glyphIndex)];
      if (!Object.keys(nextAdjustments[item.lineId]).length) {
        delete nextAdjustments[item.lineId];
      }
    }
    state.glyphAdjustments = nextAdjustments;
    updateGlyphEditorInterface();
    scheduleRender();
    scheduleHistoryCapture();
    if (notifyUser) {
      showToast("“" + item.char + "”已恢复默认位置");
    }
  }

  function resetAllGlyphAdjustments(notifyUser) {
    if (!glyphAdjustmentCount()) {
      return;
    }
    state.glyphAdjustments = {};
    updateGlyphEditorInterface();
    scheduleRender();
    scheduleHistoryCapture();
    if (notifyUser) {
      showToast("已清除全部逐字微调");
    }
  }

  function pruneGlyphAdjustmentsForLine(lineId, text) {
    var current = state.glyphAdjustments[lineId];
    if (!current) {
      return;
    }
    var characters = splitGraphemes(text || "");
    var nextLine = {};
    Object.keys(current).forEach(function (glyphIndex) {
      var index = Number(glyphIndex);
      var character = characters[index];
      if (
        character &&
        character.trim() &&
        current[glyphIndex].char === character
      ) {
        nextLine[glyphIndex] = Object.assign({}, current[glyphIndex]);
      }
    });
    var nextAdjustments = cloneGlyphAdjustments(state.glyphAdjustments);
    if (Object.keys(nextLine).length) {
      nextAdjustments[lineId] = nextLine;
    } else {
      delete nextAdjustments[lineId];
    }
    state.glyphAdjustments = nextAdjustments;
  }

  function setFontLoadingProgress(value) {
    if (
      !elements.fontLoadingPopover ||
      elements.fontLoadingPopover.classList.contains("is-error")
    ) {
      return;
    }
    var next = Math.round(clamp(Number(value) || 0, 0, 100));
    next = Math.max(fontLoadingPercent, next);
    if (next === fontLoadingPercent && next !== 0) {
      return;
    }
    fontLoadingPercent = next;
    elements.fontLoadingPercent.textContent = next + "%";
    elements.fontLoadingBar.style.width = next + "%";
    elements.fontLoadingTrack.setAttribute("aria-valuenow", String(next));
    elements.fontLoadingTrack.setAttribute(
      "aria-valuetext",
      "大地加载中 " + next + "%"
    );
  }

  function showFontLoadingError(error) {
    if (!elements.fontLoadingPopover) {
      return;
    }
    initialFontLoadingError = initialFontLoadingError || error || new Error(
      "Unable to load lettering resources"
    );
    window.clearTimeout(fontLoadingHideTimer);
    elements.fontLoadingLabel.textContent = "字形资源加载失败，请刷新重试";
    elements.fontLoadingPercent.textContent = "";
    elements.fontLoadingPopover.classList.remove("is-complete", "is-hidden");
    elements.fontLoadingPopover.classList.add("is-error");
    elements.fontLoadingTrack.setAttribute(
      "aria-valuetext",
      "字形资源加载失败，请刷新重试"
    );
    elements.canvas.removeAttribute("aria-busy");
  }

  function finishFontLoading() {
    if (
      !elements.fontLoadingPopover ||
      initialFontLoadingError ||
      elements.fontLoadingPopover.classList.contains("is-complete")
    ) {
      return;
    }
    window.clearTimeout(fontLoadingHideTimer);
    setFontLoadingProgress(100);
    elements.fontLoadingLabel.textContent = "大地加载完成~";
    elements.fontLoadingPopover.classList.add("is-complete");
    elements.fontLoadingTrack.setAttribute(
      "aria-valuetext",
      "大地字体资源加载完成"
    );
    elements.canvas.removeAttribute("aria-busy");
    fontLoadingHideTimer = window.setTimeout(function () {
      elements.fontLoadingPopover.classList.add("is-hidden");
      elements.fontLoadingPopover.setAttribute("aria-hidden", "true");
    }, 900);
  }

  function finishInitialFontLoading() {
    Promise.all([
      vectorEngineReady || Promise.resolve(null),
      logoFontsReady || Promise.resolve(null)
    ])
      .then(function () {
        if (
          initialFontLoadingError ||
          !styleEngine ||
          !styleEngine.isReady()
        ) {
          showFontLoadingError(initialFontLoadingError);
          return false;
        }

        setFontLoadingProgress(96);
        return new Promise(function (resolve, reject) {
          scheduleRender();
          requestAnimationFrame(function () {
            if (!styleEngine.whenAtlasReady) {
              resolve(true);
              return;
            }
            styleEngine.whenAtlasReady().then(function (loaded) {
              if (loaded === false) {
                // A failed individual glyph can still be rendered with the
                // browser font fallback. Keep the editor usable instead of
                // treating one small image request as a full font-pack error.
                console.warn("Some initial atlas glyphs used font fallback.");
              }
              resolve(true);
            }, reject);
          });
        });
      })
      .then(function (readyToShow) {
        if (!readyToShow) {
          return;
        }
        setFontLoadingProgress(99);
        scheduleRender();
        requestAnimationFrame(finishFontLoading);
        window.setTimeout(finishFontLoading, 250);
      })
      .catch(function (error) {
        console.warn("Lettering resources did not finish loading.", error);
        showFontLoadingError(error);
      });
  }

  function dimensionsFromValue(value) {
    var parts = String(value).split("x");
    var width = Number(parts[0]) || 1600;
    var height = Number(parts[1]) || 900;
    return { width: width, height: height };
  }

  function anchorFixedViewport(resetPanel) {
    var stackedWorkspace = window.matchMedia("(max-width: 900px)").matches;
    if (!stackedWorkspace) {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    if (resetPanel && elements.controlPanel) {
      elements.controlPanel.scrollTop = 0;
    }
  }

  function anchorFixedViewportAfterLayout(resetPanel) {
    anchorFixedViewport(resetPanel);
    requestAnimationFrame(function () {
      anchorFixedViewport(resetPanel);
    });
  }

  function setEditorSection(section, options) {
    options = options || {};
    var allowed = [
      "text",
      "layout",
      "color",
      "assets",
      "layers",
      "export",
      "properties"
    ];
    if (allowed.indexOf(section) < 0) {
      section = "text";
    }
    if (section === "layers" && !stackedEditorQuery.matches) {
      section = "properties";
    }

    activeEditorSection = section;
    elements.workspace.dataset.editorSection = section;
    document.body.dataset.activeEditorSection = section;
    elements.editorSectionTabs.forEach(function (button) {
      var active = button.dataset.editorTab === section;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    elements.editorSectionPanels.forEach(function (panel) {
      panel.hidden = panel.dataset.editorPanel !== section;
    });

    if (options.resetScroll !== false) {
      elements.controlPanel.scrollTop = 0;
    }
    requestAnimationFrame(function () {
      refreshCanvasGeometry();
    });
  }

  function activateEditorSection(section) {
    setEditorSection(section);
  }

  function normalizeEditorSectionForViewport() {
    if (!stackedEditorQuery.matches && activeEditorSection === "layers") {
      setEditorSection("properties", { resetScroll: false });
    } else {
      requestAnimationFrame(refreshCanvasGeometry);
    }
    renderLayerList();
  }

  function canvasRatioSourceImage() {
    var active = getActiveLayer();
    if (active && active.sourceType === "upload") {
      return active.image;
    }
    var upload = layers.find(function (layer) {
      return layer.sourceType === "upload";
    });
    return upload ? upload.image : null;
  }

  function canvasSizeFromOverlayImage() {
    var sourceImage = canvasRatioSourceImage();
    var dimensions = imageDimensions(sourceImage);
    if (!dimensions.width || !dimensions.height) {
      return defaults.canvasSize;
    }
    var ratio = clamp(
      dimensions.width / dimensions.height,
      0.2,
      5
    );
    var width;
    var height;
    if (ratio >= 1) {
      width = 1600;
      height = Math.max(320, Math.round(width / ratio));
    } else {
      height = 1600;
      width = Math.max(320, Math.round(height * ratio));
    }
    return width + "x" + height;
  }

  function updateAutoCanvasRatioShape() {
    if (!elements.autoCanvasRatioShape) {
      return;
    }
    var sourceImage = canvasRatioSourceImage();
    var dimensions = imageDimensions(sourceImage);
    if (!dimensions.width || !dimensions.height) {
      elements.autoCanvasRatioShape.style.removeProperty("width");
      elements.autoCanvasRatioShape.style.removeProperty("height");
      return;
    }
    var ratio = clamp(
      dimensions.width / dimensions.height,
      0.28,
      3.8
    );
    var width;
    var height;
    if (ratio >= 1) {
      width = 28;
      height = Math.max(8, width / ratio);
    } else {
      height = 22;
      width = Math.max(8, height * ratio);
    }
    elements.autoCanvasRatioShape.style.width = width + "px";
    elements.autoCanvasRatioShape.style.height = height + "px";
  }

  function updateCanvasRatioInterface() {
    if (!elements.canvasRatioPicker) {
      return;
    }
    var hasImage = Boolean(canvasRatioSourceImage());
    elements.autoCanvasRatioButton.disabled = !hasImage;
    elements.canvasRatioPicker
      .querySelectorAll(".canvas-ratio-option")
      .forEach(function (button) {
        var active = button.dataset.canvasMode === state.canvasRatioMode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-checked", String(active));
        button.tabIndex = button.disabled ? -1 : 0;
      });
    updateAutoCanvasRatioShape();
  }

  function setCanvasRatioMode(mode) {
    if (mode === "auto") {
      if (!canvasRatioSourceImage()) {
        return;
      }
      state.canvasRatioMode = "auto";
      state.canvasSize = canvasSizeFromOverlayImage();
    } else {
      state.canvasRatioMode = mode;
      state.canvasSize = mode;
    }
    elements.canvasSize.value = state.canvasSize;
    updateCanvasRatioInterface();
    scheduleRender();
    scheduleHistoryCapture();
  }

  function fitCanvasFrame(dimensions) {
    if (!elements.canvasStage || !elements.canvasFrame) {
      return;
    }
    var stageStyle = window.getComputedStyle(elements.canvasStage);
    var horizontalPadding =
      (parseFloat(stageStyle.paddingLeft) || 0) +
      (parseFloat(stageStyle.paddingRight) || 0);
    var verticalPadding =
      (parseFloat(stageStyle.paddingTop) || 0) +
      (parseFloat(stageStyle.paddingBottom) || 0);
    var availableWidth =
      elements.canvasStage.clientWidth - horizontalPadding;
    var availableHeight =
      elements.canvasStage.clientHeight - verticalPadding;
    if (!availableWidth || !availableHeight) {
      return;
    }

    var ratio = dimensions.width / dimensions.height;
    var fittedWidth = availableWidth;
    var fittedHeight = fittedWidth / ratio;
    if (fittedHeight > availableHeight) {
      fittedHeight = availableHeight;
      fittedWidth = fittedHeight * ratio;
    }

    elements.canvasFrame.style.width = Math.max(1, Math.floor(fittedWidth)) + "px";
    elements.canvasFrame.style.height = Math.max(1, Math.floor(fittedHeight)) + "px";
  }

  function hashString(text) {
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    var value = seed >>> 0;
    return function () {
      value += 0x6d2b79f5;
      var result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) {
      return bytes + " B";
    }
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + " KB";
    }
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function imageDimensions(image) {
    if (!image) {
      return { width: 0, height: 0 };
    }
    return {
      width: Number(image.naturalWidth || image.videoWidth || image.width) || 0,
      height: Number(image.naturalHeight || image.videoHeight || image.height) || 0
    };
  }

  function nextLayerId() {
    layerSequence += 1;
    return "layer-" + Date.now().toString(36) + "-" + layerSequence.toString(36);
  }

  function getLayer(layerId) {
    return layers.find(function (layer) {
      return layer.id === layerId;
    }) || null;
  }

  function getActiveLayer() {
    return getLayer(activeLayerId) || layers[0] || null;
  }

  function isTextLayer(layer) {
    return Boolean(layer && layer.type === "text");
  }

  function isDecorationLayer(layer) {
    return Boolean(layer && layer.type === "decoration");
  }

  function isLetteringGroupLayer(layer) {
    return Boolean(layer && layer.type === "lettering-group");
  }

  function isGeneratedDecorationOwner(layer) {
    return isDecorationLayer(layer) || isLetteringGroupLayer(layer);
  }

  function isArtworkLayer(layer) {
    return (
      isTextLayer(layer) ||
      isDecorationLayer(layer) ||
      isLetteringGroupLayer(layer)
    );
  }

  function decorationLayerHasContent(layer) {
    return Boolean(
      isGeneratedDecorationOwner(layer) &&
        ((Number(layer.starCount) || 0) > 0 || layer.showJDecorations !== false)
    );
  }

  function isImageLayer(layer) {
    return Boolean(layer && (layer.type === "image" || layer.type === "gif"));
  }

  function getTextLayer(layerId) {
    return textLayerStore[layerId] || null;
  }

  function getDecorationLayer() {
    return decorationLayerStore;
  }

  function getLetteringGroupLayer() {
    return letteringGroupStore;
  }

  function getActiveTextLayer() {
    var active = getActiveLayer();
    if (isTextLayer(active)) {
      return active;
    }
    return layers.find(isTextLayer) || null;
  }

  function getImageLayers() {
    return layers.filter(isImageLayer);
  }

  function getAnimatedLayers() {
    return layers.filter(function (layer) {
      return (
        layer.type === "gif" &&
        layer.visible &&
        layer.frames &&
        layer.frames.length
      );
    });
  }

  function hasAnimatedLayers() {
    return layers.some(function (layer) {
      return layer.type === "gif" && layer.visible;
    });
  }

  function layerTypeLabel(layer) {
    if (isLetteringGroupLayer(layer)) {
      return "文字与星星组合图层";
    }
    if (layer.type === "text") {
      return layer.textKey === "subtitle" ? "英文文字图层" : "中文文字图层";
    }
    if (isDecorationLayer(layer)) {
      return "星星装饰图层";
    }
    if (layer.type === "gif") {
      return "动态 GIF 图层";
    }
    if (layer.sourceType === "official-decoration") {
      return "官方装饰图层";
    }
    if (layer.sourceType === "official-static") {
      return "官方贴纸图层";
    }
    return "本地图片图层";
  }

  function layerFrameDelay(layer, index) {
    var delays = layer && layer.frameDelays;
    if (delays && Number(delays[index]) > 0) {
      return Math.max(20, Number(delays[index]));
    }
    return Math.max(20, Number(layer && layer.frameDelay) || 200);
  }

  function layerAnimationDuration(layer) {
    if (!layer || !layer.frames || !layer.frames.length) {
      return 0;
    }
    if (Number(layer.animationDuration) > 0) {
      return Number(layer.animationDuration);
    }
    return layer.frames.reduce(function (duration, frame, index) {
      return duration + layerFrameDelay(layer, index);
    }, 0);
  }

  function layerMinimumFrameDelay(layer) {
    if (!layer || !layer.frames || !layer.frames.length) {
      return 200;
    }
    return layer.frames.reduce(function (smallest, frame, index) {
      return Math.min(smallest, layerFrameDelay(layer, index));
    }, 1000);
  }

  function frameIndexAtElapsedTime(layer, elapsed) {
    if (!layer || !layer.frames || !layer.frames.length) {
      return 0;
    }
    var duration = Math.max(20, layerAnimationDuration(layer));
    var position = Math.max(0, Number(elapsed) || 0) % duration;
    for (var index = 0; index < layer.frames.length; index += 1) {
      var delay = layerFrameDelay(layer, index);
      if (position < delay) {
        return index;
      }
      position -= delay;
    }
    return layer.frames.length - 1;
  }

  function imageForLayer(layer, time, forcedImages) {
    if (!layer) {
      return null;
    }
    if (forcedImages && forcedImages[layer.id]) {
      return forcedImages[layer.id];
    }
    if (layer.type === "gif" && layer.frames && layer.frames.length) {
      var clock = time == null ? performance.now() : Number(time);
      if (!Number.isFinite(clock)) {
        clock = performance.now();
      }
      var elapsed = Math.max(0, clock - animationStartedAt);
      var frameIndex = frameIndexAtElapsedTime(layer, elapsed);
      return layer.frames[frameIndex];
    }
    return layer.image || null;
  }

  function syncActiveLayerFromControls() {
    var layer = getActiveLayer();
    if (!layer) {
      return;
    }
    if (isArtworkLayer(layer)) {
      layer.scale = Number(elements.artworkScale.value);
      layer.x = Number(elements.artworkX.value);
      layer.y = Number(elements.artworkY.value);
      layer.rotation = Number(elements.artworkRotation.value);
      state.artworkScale = layer.scale;
      state.artworkX = layer.x;
      state.artworkY = layer.y;
      state.artworkRotation = layer.rotation;
      return;
    }
    if (!isImageLayer(layer) || !elements.overlayScale) {
      return;
    }
    layer.scale = Number(elements.overlayScale.value);
    layer.x = Number(elements.overlayX.value);
    layer.y = Number(elements.overlayY.value);
    layer.rotation = Number(elements.overlayRotation.value);
    layer.opacity = Number(elements.overlayOpacity.value);
    layer.locked = Boolean(state.overlayLocked);
  }

  function syncLayerControls(layer) {
    if (!layer) {
      selectedOfficialAsset = null;
      state.overlayLocked = false;
      activeDragTarget = "";
      updateTextTransformInterface(null);
      syncSelectedLayerControls(null);
      return;
    }

    if (isArtworkLayer(layer)) {
      selectedOfficialAsset = null;
      state.overlayLocked = false;
      state.artworkScale = layer.scale;
      state.artworkX = layer.x;
      state.artworkY = layer.y;
      state.artworkRotation = layer.rotation;
      activeDragTarget = layer.id;
      elements.artworkScale.value = layer.scale;
      elements.artworkX.value = layer.x;
      elements.artworkY.value = layer.y;
      elements.artworkRotation.value = layer.rotation;
      updateTextTransformInterface(
        isTextLayer(layer) || isLetteringGroupLayer(layer) ? layer : null
      );
      syncSelectedLayerControls(layer);
      return;
    }

    selectedOfficialAsset = layer.officialAsset || null;
    state.overlayScale = layer.scale;
    state.overlayX = layer.x;
    state.overlayY = layer.y;
    state.overlayRotation = layer.rotation;
    state.overlayOpacity = layer.opacity;
    state.overlayLayer = "foreground";
    state.overlayLocked = Boolean(layer.locked);
    activeDragTarget = layer.id;

    elements.overlayScale.value = layer.scale;
    elements.overlayX.value = layer.x;
    elements.overlayY.value = layer.y;
    elements.overlayRotation.value = layer.rotation;
    elements.overlayOpacity.value = layer.opacity;
    elements.overlayLayer.value = "foreground";
    updateTextTransformInterface(null);
    syncSelectedLayerControls(layer);
  }

  function layerIconMarkup(name) {
    var icons = {
      eye:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>',
      "eye-off":
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.2 7.9C3.1 9 2.5 10.2 2.5 12c0 0 3.5 6 9.5 6 1.6 0 3-.4 4.2-1"></path><path d="M8.2 6.7A9.2 9.2 0 0 1 12 6c6 0 9.5 6 9.5 6a14 14 0 0 1-2 2.6"></path><path d="m3 3 18 18"></path></svg>',
      lock:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>',
      unlock:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M16 10V7a4 4 0 0 0-7.5-2"></path></svg>',
      up:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5"></path></svg>',
      down:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"></path></svg>',
      copy:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>',
      trash:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="m9 7 .7-3h4.6l.7 3"></path><path d="m6.5 7 .8 13h9.4l.8-13"></path><path d="M10 11v5M14 11v5"></path></svg>',
      reset:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7v5h5"></path><path d="M5.2 12a7 7 0 1 1 2 5"></path></svg>'
    };
    return icons[name] || "";
  }

  function syncSelectedLayerControls(layer) {
    if (!elements.layerPropertiesSection) {
      return;
    }
    var hasLayer = Boolean(layer);
    [
      elements.selectedLayerScale,
      elements.selectedLayerX,
      elements.selectedLayerY,
      elements.selectedLayerRotation,
      elements.selectedLayerOpacity,
      elements.selectedLayerVisibilityButton,
      elements.selectedLayerLockButton,
      elements.selectedLayerResetButton,
      elements.selectedLayerDeleteButton,
      elements.selectedStarCount,
      elements.selectedJDecorations,
      elements.randomizeStarsButton,
      elements.selectedGroupLineGap,
      elements.selectedGroupSubtitleGap,
      elements.selectedGroupStarCount,
      elements.selectedGroupJDecorations,
      elements.randomizeGroupStarsButton
    ].forEach(function (control) {
      if (control) {
        control.disabled = !hasLayer;
      }
    });
    if (!layer) {
      elements.decorationLayerControls.hidden = true;
      elements.groupLayerControls.hidden = true;
      elements.selectedLayerName.textContent = "未选择图层";
      elements.selectedLayerType.textContent = "请从图层列表选择";
      elements.selectedLayerPreview.textContent = "—";
      return;
    }

    elements.selectedLayerName.textContent = layer.name;
    elements.selectedLayerType.textContent = layerTypeLabel(layer);
    elements.decorationLayerControls.hidden = !isDecorationLayer(layer);
    elements.groupLayerControls.hidden = !isLetteringGroupLayer(layer);
    elements.selectedLayerPreview.replaceChildren();
    if (isArtworkLayer(layer)) {
      elements.selectedLayerPreview.textContent = layer.thumbnail || "T";
    } else {
      var preview = document.createElement("img");
      preview.alt = "";
      preview.src = layer.thumbnailSrc || layer.objectUrl || "";
      elements.selectedLayerPreview.appendChild(preview);
    }

    elements.selectedLayerScale.min = isArtworkLayer(layer) ? "20" : "5";
    elements.selectedLayerScale.value = layer.scale;
    elements.selectedLayerX.value = layer.x;
    elements.selectedLayerY.value = layer.y;
    elements.selectedLayerRotation.value = layer.rotation;
    elements.selectedLayerOpacity.value = Number.isFinite(layer.opacity)
      ? layer.opacity
      : 100;
    elements.selectedLayerScaleValue.textContent = layer.scale + "%";
    elements.selectedLayerXValue.textContent = layer.x + "%";
    elements.selectedLayerYValue.textContent = layer.y + "%";
    elements.selectedLayerRotationValue.textContent = layer.rotation + "°";
    elements.selectedLayerOpacityValue.textContent =
      (Number.isFinite(layer.opacity) ? layer.opacity : 100) + "%";
    updateRange(
      elements.selectedLayerScale,
      elements.selectedLayerScaleValue,
      "%"
    );
    updateRange(elements.selectedLayerX, elements.selectedLayerXValue, "%");
    updateRange(elements.selectedLayerY, elements.selectedLayerYValue, "%");
    updateRange(
      elements.selectedLayerRotation,
      elements.selectedLayerRotationValue,
      "°"
    );
    updateRange(
      elements.selectedLayerOpacity,
      elements.selectedLayerOpacityValue,
      "%"
    );
    if (isDecorationLayer(layer)) {
      layer.starCount = clamp(
        Number.isFinite(layer.starCount)
          ? Math.round(layer.starCount)
          : decorationLayerDefinition.starCount,
        0,
        60
      );
      layer.showJDecorations = layer.showJDecorations !== false;
      elements.selectedStarCount.value = layer.starCount;
      elements.selectedStarCountValue.value = String(layer.starCount);
      elements.selectedJDecorations.checked = layer.showJDecorations;
      updateRange(
        elements.selectedStarCount,
        elements.selectedStarCountValue,
        ""
      );
    }
    if (isLetteringGroupLayer(layer)) {
      state.lineGap = clamp(
        Number.isFinite(Number(state.lineGap))
          ? Number(state.lineGap)
          : defaults.lineGap,
        0,
        220
      );
      state.subtitleGap = clamp(
        Number.isFinite(Number(state.subtitleGap))
          ? Number(state.subtitleGap)
          : defaults.subtitleGap,
        -150,
        400
      );
      layer.starCount = clamp(
        Number.isFinite(layer.starCount)
          ? Math.round(layer.starCount)
          : letteringGroupDefinition.starCount,
        0,
        60
      );
      layer.showJDecorations = layer.showJDecorations !== false;
      elements.selectedGroupLineGap.value = state.lineGap;
      elements.selectedGroupSubtitleGap.value = state.subtitleGap;
      elements.selectedGroupStarCount.value = layer.starCount;
      elements.selectedGroupJDecorations.checked = layer.showJDecorations;
      updateRange(
        elements.selectedGroupLineGap,
        elements.selectedGroupLineGapValue,
        "%"
      );
      updateRange(
        elements.selectedGroupSubtitleGap,
        elements.selectedGroupSubtitleGapValue,
        "%"
      );
      updateRange(
        elements.selectedGroupStarCount,
        elements.selectedGroupStarCountValue,
        ""
      );
    }

    var transformLocked = Boolean(layer.locked);
    [
      elements.selectedLayerScale,
      elements.selectedLayerX,
      elements.selectedLayerY,
      elements.selectedLayerRotation,
      elements.selectedLayerOpacity,
      elements.selectedLayerResetButton,
      elements.selectedStarCount,
      elements.selectedJDecorations,
      elements.randomizeStarsButton,
      elements.selectedGroupLineGap,
      elements.selectedGroupSubtitleGap,
      elements.selectedGroupStarCount,
      elements.selectedGroupJDecorations,
      elements.randomizeGroupStarsButton
    ].forEach(function (control) {
      control.disabled = transformLocked;
    });
    elements.selectedLayerVisibilityButton.innerHTML =
      layerIconMarkup(layer.visible ? "eye" : "eye-off") +
      "<span>" + (layer.visible ? "隐藏图层" : "显示图层") + "</span>";
    elements.selectedLayerVisibilityButton.setAttribute(
      "aria-pressed",
      String(layer.visible)
    );
    elements.selectedLayerLockButton.innerHTML =
      layerIconMarkup(layer.locked ? "lock" : "unlock") +
      "<span>" + (layer.locked ? "解锁图层" : "锁定图层") + "</span>";
    elements.selectedLayerLockButton.setAttribute(
      "aria-pressed",
      String(layer.locked)
    );
    elements.selectedLayerDeleteButton.textContent = isTextLayer(layer)
      ? "停用文字图层"
      : isDecorationLayer(layer)
        ? "隐藏星星装饰"
        : isLetteringGroupLayer(layer)
          ? "隐藏字标组合"
        : "删除图层";
  }

  function updateLayerModeInterface() {
    var advanced = Boolean(state.advancedLayerMode);
    elements.advancedLayerMode.checked = advanced;
    elements.layerModeStatus.textContent = advanced ? "已拆分" : "组合";
    elements.layerModeDescription.textContent = advanced
      ? "三行文字与星星已拆成 4 个可独立调整的图层"
      : "当前把三行文字与星星作为一个组合图层";
    document.body.dataset.advancedLayerMode = String(advanced);
  }

  function updateLayerActionState() {
    var layer = getActiveLayer();
    elements.layerCount.value = layers.length;
    elements.activeLayerSummary.textContent = layer ? layer.name : "未选择";
    updateLayerModeInterface();
    updateTextLayerToggleInterface();
  }

  function updateTextTransformInterface(layer) {
    var activeText =
      isTextLayer(layer) || isLetteringGroupLayer(layer) ? layer : null;
    [
      elements.artworkScale,
      elements.artworkX,
      elements.artworkY,
      elements.artworkRotation,
      elements.resetArtworkButton
    ].forEach(function (control) {
      if (control) {
        control.disabled = !activeText || activeText.locked;
      }
    });
    if (elements.selectedTextLayerName) {
      elements.selectedTextLayerName.textContent = activeText
        ? activeText.name + " · 大小与位置"
        : "请先选择文字或组合图层";
    }
  }

  function updateTextLayerToggleInterface() {
    if (!elements.textLayerToggleButtons) {
      return;
    }
    elements.textLayerToggleButtons.forEach(function (button) {
      var simpleMode = !state.advancedLayerMode;
      var active = simpleMode
        ? true
        : Boolean(getLayer(button.dataset.textLayerToggle));
      button.classList.toggle("active", active);
      button.classList.toggle("is-mode-locked", simpleMode);
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-disabled", String(simpleMode));
      var status = button.querySelector("b");
      if (status) {
        status.textContent = simpleMode
          ? "组合内"
          : active
            ? "已启用"
            : "未启用";
      }
      var field = document.querySelector(
        '[data-text-layer-field="' + button.dataset.textLayerToggle + '"]'
      );
      if (field) {
        field.classList.toggle("is-disabled", !simpleMode && !active);
        var input = field.querySelector("input");
        if (input) {
          input.disabled = !simpleMode && !active;
        }
      }
    });
  }

  function createInlineLayerProperties(layer) {
    var wrapper = document.createElement("div");
    var locked = Boolean(layer.locked);
    var opacity = Number.isFinite(layer.opacity) ? layer.opacity : 100;
    wrapper.className = "layer-inline-properties";
    wrapper.dataset.inlineLayerId = layer.id;
    wrapper.innerHTML =
      '<label><span>大小 <output>' +
      layer.scale +
      '%</output></span><input type="range" min="' +
      (isArtworkLayer(layer) ? "20" : "5") +
      '" max="240" value="' +
      layer.scale +
      '" data-layer-property="scale"' +
      (locked ? " disabled" : "") +
      "></label>" +
      '<label><span>左右 <output>' +
      layer.x +
      '%</output></span><input type="range" min="0" max="100" value="' +
      layer.x +
      '" data-layer-property="x"' +
      (locked ? " disabled" : "") +
      "></label>" +
      '<label><span>上下 <output>' +
      layer.y +
      '%</output></span><input type="range" min="0" max="100" value="' +
      layer.y +
      '" data-layer-property="y"' +
      (locked ? " disabled" : "") +
      "></label>" +
      '<label><span>旋转 <output>' +
      layer.rotation +
      '°</output></span><input type="range" min="-180" max="180" value="' +
      layer.rotation +
      '" data-layer-property="rotation"' +
      (locked ? " disabled" : "") +
      "></label>" +
      '<label class="wide"><span>透明度 <output>' +
      opacity +
      '%</output></span><input type="range" min="0" max="100" value="' +
      opacity +
      '" data-layer-property="opacity"' +
      (locked ? " disabled" : "") +
      "></label>" +
      '<button type="button" data-layer-action="reset"' +
      (locked ? " disabled" : "") +
      ">" +
      layerIconMarkup("reset") +
      "<span>恢复默认位置</span></button>";
    if (isDecorationLayer(layer)) {
      wrapper.insertAdjacentHTML(
        "afterbegin",
        '<p class="inline-decoration-heading"><span aria-hidden="true">✦</span> 装饰内容</p>' +
          '<label class="wide"><span>星星数量 <output>' +
          layer.starCount +
          '</output></span><input type="range" min="0" max="60" step="1" value="' +
          layer.starCount +
          '" data-decoration-property="starCount"' +
          (locked ? " disabled" : "") +
          "></label>" +
          '<label class="wide inline-decoration-toggle"><span><span>显示 J 型图案</span><input type="checkbox" data-decoration-property="showJDecorations"' +
          (layer.showJDecorations !== false ? " checked" : "") +
          (locked ? " disabled" : "") +
          "></span></label>" +
          '<button type="button" data-layer-action="randomize-stars"' +
          (locked ? " disabled" : "") +
          '><span aria-hidden="true">✦</span><span>随机星星位置</span></button>'
      );
    }
    if (isLetteringGroupLayer(layer)) {
      wrapper.insertAdjacentHTML(
        "afterbegin",
        '<p class="inline-decoration-heading"><span aria-hidden="true">T✦</span> 组合内容</p>' +
          '<label class="wide"><span>一二行间距 <output>' +
          state.lineGap +
          '%</output></span><input type="range" min="0" max="220" step="5" value="' +
          state.lineGap +
          '" data-group-property="lineGap"' +
          (locked ? " disabled" : "") +
          "></label>" +
          '<label class="wide"><span>二三行间距 <output>' +
          state.subtitleGap +
          '%</output></span><input type="range" min="-150" max="400" step="5" value="' +
          state.subtitleGap +
          '" data-group-property="subtitleGap"' +
          (locked ? " disabled" : "") +
          "></label>" +
          '<label class="wide"><span>星星数量 <output>' +
          layer.starCount +
          '</output></span><input type="range" min="0" max="60" step="1" value="' +
          layer.starCount +
          '" data-decoration-property="starCount"' +
          (locked ? " disabled" : "") +
          "></label>" +
          '<label class="wide inline-decoration-toggle"><span><span>显示 J 型图案</span><input type="checkbox" data-decoration-property="showJDecorations"' +
          (layer.showJDecorations !== false ? " checked" : "") +
          (locked ? " disabled" : "") +
          "></span></label>" +
          '<button type="button" data-layer-action="randomize-stars"' +
          (locked ? " disabled" : "") +
          '><span aria-hidden="true">✦</span><span>随机星星位置</span></button>'
      );
    }
    wrapper.querySelectorAll("[data-layer-property]").forEach(function (input) {
      var output = input.parentElement.querySelector("output");
      updateRange(
        input,
        output,
        input.dataset.layerProperty === "rotation" ? "°" : "%"
      );
    });
    wrapper
      .querySelectorAll('[data-decoration-property="starCount"]')
      .forEach(function (input) {
        updateRange(input, input.parentElement.querySelector("output"), "");
      });
    wrapper.querySelectorAll("[data-group-property]").forEach(function (input) {
      updateRange(input, input.parentElement.querySelector("output"), "%");
    });
    return wrapper;
  }

  function clearLayerDropIndicators() {
    if (!elements.layerList) {
      return;
    }
    elements.layerList.querySelectorAll(".layer-item").forEach(function (item) {
      item.classList.remove("drop-before", "drop-after", "dragging");
    });
  }

  function reorderLayer(dragId, targetId, placeAbove) {
    if (!dragId || dragId === targetId) {
      return;
    }
    var dragged = getLayer(dragId);
    var target = getLayer(targetId);
    if (!dragged || !target) {
      return;
    }
    var nextLayers = layers.filter(function (layer) {
      return layer.id !== dragId;
    });
    var targetIndex = nextLayers.indexOf(target);
    nextLayers.splice(targetIndex + (placeAbove ? 1 : 0), 0, dragged);
    layers = nextLayers;
    renderLayerList();
    scheduleRender();
    scheduleHistoryCapture();
  }

  function renderLayerList() {
    if (!elements.layerList) {
      return;
    }
    var fragment = document.createDocumentFragment();
    layers
      .slice()
      .reverse()
      .forEach(function (layer) {
        var item = document.createElement("div");
        var handle = document.createElement("span");
        var thumbnail = document.createElement("span");
        var copy = document.createElement("span");
        var name = document.createElement("strong");
        var type = document.createElement("small");
        var visibility = document.createElement("button");
        var lock = document.createElement("button");
        var actions = document.createElement("span");
        var layerIndex = layers.indexOf(layer);

        item.className = "layer-item";
        item.dataset.layerId = layer.id;
        item.draggable = !stackedEditorQuery.matches;
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(layer.id === activeLayerId));
        item.classList.toggle("active", layer.id === activeLayerId);
        item.classList.toggle("is-hidden", !layer.visible);
        item.classList.toggle("is-expanded", layer.id === expandedLayerId);

        handle.className = "layer-drag-handle";
        handle.textContent = "⋮⋮";
        handle.setAttribute("aria-hidden", "true");

        thumbnail.className = "layer-thumbnail";
        if (isArtworkLayer(layer)) {
          thumbnail.textContent = layer.thumbnail || "T";
        } else {
          var image = document.createElement("img");
          image.alt = "";
          image.src = layer.thumbnailSrc || layer.objectUrl || "";
          thumbnail.appendChild(image);
          if (layer.type === "gif") {
            var badge = document.createElement("i");
            badge.textContent = "GIF";
            thumbnail.appendChild(badge);
          }
        }

        copy.className = "layer-copy";
        name.textContent = layer.name;
        type.textContent = layerTypeLabel(layer);
        copy.appendChild(name);
        copy.appendChild(type);

        visibility.type = "button";
        visibility.className = "layer-inline-button";
        visibility.dataset.layerAction = "visibility";
        visibility.title = layer.visible ? "隐藏图层" : "显示图层";
        visibility.setAttribute("aria-label", visibility.title);
        visibility.innerHTML = layerIconMarkup(
          layer.visible ? "eye" : "eye-off"
        );

        lock.type = "button";
        lock.className = "layer-inline-button";
        lock.dataset.layerAction = "lock";
        lock.title = layer.locked ? "解锁图层" : "锁定图层";
        lock.setAttribute("aria-label", lock.title);
        lock.innerHTML = layerIconMarkup(layer.locked ? "lock" : "unlock");

        actions.className = "layer-entry-actions";
        [
          {
            action: "move-up",
            label: "上移一层",
            icon: "up",
            disabled: layerIndex === layers.length - 1
          },
          {
            action: "move-down",
            label: "下移一层",
            icon: "down",
            disabled: layerIndex === 0
          },
          {
            action: "duplicate",
            label: "复制图层",
            icon: "copy",
            hidden: !isImageLayer(layer)
          },
          {
            action: "delete",
            label: isTextLayer(layer)
              ? "停用文字图层"
              : isDecorationLayer(layer)
                ? "隐藏星星装饰"
                : "删除图层",
            icon: "trash",
            danger: true,
            hidden:
              isDecorationLayer(layer) || isLetteringGroupLayer(layer)
          }
        ].forEach(function (config) {
          if (config.hidden) {
            return;
          }
          var button = document.createElement("button");
          button.type = "button";
          button.dataset.layerAction = config.action;
          button.title = config.label;
          button.setAttribute("aria-label", config.label + "：" + layer.name);
          button.innerHTML =
            layerIconMarkup(config.icon) +
            '<span class="visually-hidden">' +
            config.label +
            "</span>";
          button.disabled = Boolean(config.disabled);
          button.classList.toggle("danger", Boolean(config.danger));
          actions.appendChild(button);
        });

        item.appendChild(handle);
        item.appendChild(thumbnail);
        item.appendChild(copy);
        item.appendChild(visibility);
        item.appendChild(lock);
        item.appendChild(actions);
        if (stackedEditorQuery.matches && layer.id === expandedLayerId) {
          item.appendChild(createInlineLayerProperties(layer));
        }
        fragment.appendChild(item);
      });
    elements.layerList.replaceChildren(fragment);
    updateLayerActionState();
  }

  function selectLayer(layerId, options) {
    options = options || {};
    var layer = getLayer(layerId);
    if (!layer) {
      return;
    }
    syncActiveLayerFromControls();
    activeLayerId = layer.id;
    expandedLayerId = layer.id;
    syncLayerControls(layer);
    canvasSelectionVisible = options.showSelection !== false;
    renderLayerList();
    updateOverlayInterface();
    updateDragTargetInterface();
    updateCanvasSelection(lastPreviewResult);
    if (options.syncEditorSection !== false && !stackedEditorQuery.matches) {
      setEditorSection("properties", { resetScroll: false });
    }
    if (options.render !== false) {
      scheduleRender();
    }
  }

  function addLayer(layer, options) {
    options = options || {};
    var firstTextIndex = layers.findIndex(function (item) {
      return isArtworkLayer(item);
    });
    if (options.belowArtwork && firstTextIndex >= 0) {
      layers.splice(firstTextIndex, 0, layer);
    } else {
      layers.push(layer);
    }
    selectLayer(layer.id, { showSelection: true, render: false });
    startGifPreviewLoop();
    scheduleRender();
    scheduleHistoryCapture();
  }

  function removeLayer(layerId, notifyUser) {
    var layer = getLayer(layerId);
    if (!layer) {
      return;
    }
    if (isDecorationLayer(layer)) {
      setLayerVisibility(layer, false);
      if (notifyUser) {
        showToast("星星装饰已隐藏，可在图层栏重新显示");
      }
      return;
    }
    if (isLetteringGroupLayer(layer)) {
      setLayerVisibility(layer, false);
      if (notifyUser) {
        showToast("字标组合已隐藏，可在图层栏重新显示");
      }
      return;
    }
    var index = layers.indexOf(layer);
    layers.splice(index, 1);
    if (isTextLayer(layer)) {
      layer.lastIndex = index;
      layer.advancedActive = false;
    }
    var next = layers[Math.min(index, layers.length - 1)] || layers[0] || null;
    activeLayerId = next ? next.id : "";
    expandedLayerId = activeLayerId;
    syncLayerControls(next);
    canvasSelectionVisible = Boolean(next && !next.locked);
    updateEditorModeInterface();
    updateOverlayInterface();
    if (next && !stackedEditorQuery.matches) {
      setEditorSection("properties", { resetScroll: false });
    }
    startGifPreviewLoop();
    scheduleRender();
    scheduleHistoryCapture();
    if (notifyUser) {
      showToast(
        isTextLayer(layer)
          ? layer.name + "已停用，可随时重新启用"
          : "图层已删除"
      );
    }
  }

  function setTextLayerActive(layerId, enabled, notifyUser) {
    var layer = getTextLayer(layerId);
    if (!layer) {
      return;
    }
    var active = Boolean(getLayer(layerId));
    if (enabled === active) {
      if (enabled) {
        selectLayer(layerId);
      }
      return;
    }
    if (!enabled) {
      removeLayer(layerId, notifyUser);
      return;
    }
    layer.visible = true;
    layer.advancedActive = true;
    var insertAt = clamp(
      Number.isFinite(layer.lastIndex) ? layer.lastIndex : layers.length,
      0,
      layers.length
    );
    layers.splice(insertAt, 0, layer);
    selectLayer(layer.id, { showSelection: true, render: false });
    scheduleRender();
    scheduleHistoryCapture();
    if (notifyUser) {
      showToast(layer.name + "已启用");
    }
  }

  function copyGeneratedDecorationSettings(source, target) {
    if (!source || !target) {
      return;
    }
    target.starCount = clamp(
      Math.round(Number(source.starCount) || 0),
      0,
      60
    );
    target.showJDecorations = source.showJDecorations !== false;
    target.layoutSeed = Number.isFinite(source.layoutSeed)
      ? source.layoutSeed >>> 0
      : decorationLayerDefinition.layoutSeed;
  }

  function setAdvancedLayerMode(enabled, notifyUser) {
    enabled = Boolean(enabled);
    if (enabled === Boolean(state.advancedLayerMode)) {
      updateLayerModeInterface();
      return;
    }

    syncActiveLayerFromControls();
    var group = getLetteringGroupLayer();
    var decoration = getDecorationLayer();
    var nextActive = null;

    if (enabled) {
      var groupIndex = layers.indexOf(group);
      if (groupIndex < 0) {
        groupIndex = clamp(group.lastIndex || 0, 0, layers.length);
      }
      group.lastIndex = groupIndex;
      copyGeneratedDecorationSettings(group, decoration);
      layers = layers.filter(function (layer) {
        return !isLetteringGroupLayer(layer);
      });
      var advancedLayers = [
        decoration,
        textLayerStore["text-subtitle"],
        textLayerStore["text-line-2"],
        textLayerStore["text-line-1"]
      ].filter(function (layer) {
        return !isTextLayer(layer) || layer.advancedActive !== false;
      });
      layers.splice.apply(layers, [groupIndex, 0].concat(advancedLayers));
      nextActive =
        getLayer("text-line-1") ||
        getLayer("text-line-2") ||
        getLayer("text-subtitle") ||
        decoration;
    } else {
      textLayerDefinitions.forEach(function (definition) {
        var textLayer = getTextLayer(definition.id);
        textLayer.advancedActive = Boolean(getLayer(definition.id));
      });
      copyGeneratedDecorationSettings(decoration, group);
      var coreIndices = layers
        .map(function (layer, index) {
          return isTextLayer(layer) || isDecorationLayer(layer) ? index : -1;
        })
        .filter(function (index) {
          return index >= 0;
        });
      var insertAt = coreIndices.length
        ? Math.min.apply(null, coreIndices)
        : clamp(group.lastIndex || 0, 0, layers.length);
      layers = layers.filter(function (layer) {
        return !isTextLayer(layer) && !isDecorationLayer(layer);
      });
      group.lastIndex = clamp(insertAt, 0, layers.length);
      layers.splice(group.lastIndex, 0, group);
      nextActive = group;
    }

    state.advancedLayerMode = enabled;
    activeLayerId = nextActive ? nextActive.id : "";
    expandedLayerId = activeLayerId;
    syncLayerControls(nextActive);
    canvasSelectionVisible = Boolean(nextActive && !nextActive.locked);
    renderLayerList();
    updateOverlayInterface();
    updateDragTargetInterface();
    scheduleRender();
    scheduleHistoryCapture();
    if (notifyUser) {
      showToast(
        enabled
          ? "已拆分为 3 个文字图层和 1 个星星图层"
          : "已合并为一个字标组合图层"
      );
    }
  }

  function moveLayer(layerId, delta) {
    var layer = getLayer(layerId);
    var index = layers.indexOf(layer);
    var nextIndex = clamp(index + delta, 0, layers.length - 1);
    if (index < 0 || index === nextIndex) {
      return;
    }
    layers.splice(index, 1);
    layers.splice(nextIndex, 0, layer);
    renderLayerList();
    scheduleRender();
    scheduleHistoryCapture();
  }

  function duplicateActiveLayer() {
    syncActiveLayerFromControls();
    var layer = getActiveLayer();
    if (!isImageLayer(layer)) {
      return;
    }
    var duplicate = Object.assign({}, layer, {
      id: nextLayerId(),
      name: layer.name + " 副本",
      x: clamp(layer.x + 4, 0, 100),
      y: clamp(layer.y + 4, 0, 100),
      frames: layer.frames ? layer.frames.slice() : [],
      frameDelays: layer.frameDelays ? layer.frameDelays.slice() : []
    });
    var index = layers.indexOf(layer);
    layers.splice(index + 1, 0, duplicate);
    selectLayer(duplicate.id);
    scheduleHistoryCapture();
    showToast("图层已复制");
  }

  function openLocalAssetDb() {
    if (!window.indexedDB) {
      return Promise.reject(new Error("IndexedDB is unavailable"));
    }
    if (!localAssetDbPromise) {
      localAssetDbPromise = new Promise(function (resolve, reject) {
        var request = window.indexedDB.open("star-lettering-local-assets", 1);
        request.onupgradeneeded = function () {
          var db = request.result;
          if (!db.objectStoreNames.contains("assets")) {
            db.createObjectStore("assets");
          }
        };
        request.onsuccess = function () {
          resolve(request.result);
        };
        request.onerror = function () {
          reject(request.error || new Error("Unable to open local asset cache"));
        };
      }).catch(function (error) {
        localAssetDbPromise = null;
        throw error;
      });
    }
    return localAssetDbPromise;
  }

  function deleteCachedOverlay() {
    return openLocalAssetDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction("assets", "readwrite");
        transaction.objectStore("assets").delete("overlay-image");
        transaction.oncomplete = resolve;
        transaction.onerror = function () {
          reject(transaction.error || new Error("Unable to clear overlay cache"));
        };
      });
    });
  }

  function resetArtworkTransform() {
    var layer = getActiveLayer();
    if (!isArtworkLayer(layer)) {
      return;
    }
    layer.scale = layer.defaultScale;
    layer.x = layer.defaultX;
    layer.y = layer.defaultY;
    layer.rotation = layer.defaultRotation;
    layer.opacity = Number.isFinite(layer.defaultOpacity)
      ? layer.defaultOpacity
      : 100;
    state.artworkScale = layer.scale;
    state.artworkX = layer.x;
    state.artworkY = layer.y;
    state.artworkRotation = layer.rotation;
    if (elements.artworkScale) {
      elements.artworkScale.value = state.artworkScale;
      elements.artworkX.value = state.artworkX;
      elements.artworkY.value = state.artworkY;
      elements.artworkRotation.value = state.artworkRotation;
    }
    syncSelectedLayerControls(layer);
  }

  function updateDragTargetInterface() {
    var activeLayer = getActiveLayer();
    var locked = Boolean(activeLayer && activeLayer.locked);
    activeDragTarget = activeLayer ? activeLayer.id : "";
    if (elements.canvasActiveObjectName) {
      elements.canvasActiveObjectName.textContent = activeLayer
        ? activeLayer.name
        : "未选择";
    }
    elements.canvasResetButton.disabled = !activeLayer || locked;
    elements.canvasFrame.classList.toggle(
      "active-overlay-locked",
      locked
    );
    elements.canvas.setAttribute(
      "title",
      !activeLayer
        ? "选择一个图层后可在画布内调整"
        : locked
          ? activeLayer.name + "已锁定"
          : "拖动" + activeLayer.name
    );
  }

  function setDragTarget(target) {
    var layer = getLayer(target) || getActiveLayer();
    activeDragTarget = layer ? layer.id : "";
    updateDragTargetInterface();
    updateCanvasSelection(lastPreviewResult);
  }

  function setOverlayLocked(locked, notifyUser) {
    var layer = getActiveLayer();
    if (!isImageLayer(layer)) {
      return;
    }
    layer.locked = Boolean(locked);
    state.overlayLocked = layer.locked;
    canvasDragging = false;
    canvasDragStart = null;
    canvasHandleDrag = null;
    elements.canvasFrame.classList.remove("dragging", "manipulating");
    canvasSelectionVisible = !layer.locked;
    updateOverlayInterface();
    setDragTarget(layer.id);
    renderLayerList();
    scheduleRender();
    scheduleHistoryCapture();
    if (notifyUser) {
      showToast(state.overlayLocked ? "图片已锁定" : "图片已解锁");
    }
  }

  function resetOverlayTransform() {
    state.overlayScale = defaults.overlayScale;
    state.overlayX = defaults.overlayX;
    state.overlayY = defaults.overlayY;
    state.overlayRotation = defaults.overlayRotation;
    state.overlayOpacity = defaults.overlayOpacity;
    state.overlayLayer = defaults.overlayLayer;
    if (elements.overlayScale) {
      elements.overlayScale.value = state.overlayScale;
      elements.overlayX.value = state.overlayX;
      elements.overlayY.value = state.overlayY;
      elements.overlayRotation.value = state.overlayRotation;
      elements.overlayOpacity.value = state.overlayOpacity;
      elements.overlayLayer.value = state.overlayLayer;
    }
    var layer = getActiveLayer();
    if (isImageLayer(layer)) {
      layer.scale = Number.isFinite(layer.defaultScale)
        ? layer.defaultScale
        : state.overlayScale;
      layer.x = Number.isFinite(layer.defaultX) ? layer.defaultX : state.overlayX;
      layer.y = Number.isFinite(layer.defaultY) ? layer.defaultY : state.overlayY;
      layer.rotation = Number.isFinite(layer.defaultRotation)
        ? layer.defaultRotation
        : state.overlayRotation;
      layer.opacity = Number.isFinite(layer.defaultOpacity)
        ? layer.defaultOpacity
        : state.overlayOpacity;
      syncLayerControls(layer);
    }
  }

  function resetLayerTransform(layer) {
    if (!layer || layer.locked) {
      return;
    }
    if (isArtworkLayer(layer)) {
      resetArtworkTransform();
    } else {
      resetOverlayTransform();
    }
    syncSelectedLayerControls(layer);
    renderLayerList();
    updateCanvasSelection(lastPreviewResult);
    scheduleRender();
    scheduleHistoryCapture();
  }

  function setLayerProperty(layer, property, value, output) {
    if (!layer || layer.locked) {
      return;
    }
    var ranges = {
      scale: [isArtworkLayer(layer) ? 20 : 5, 240],
      x: [0, 100],
      y: [0, 100],
      rotation: [-180, 180],
      opacity: [0, 100]
    };
    if (!ranges[property]) {
      return;
    }
    var next = clamp(Number(value), ranges[property][0], ranges[property][1]);
    layer[property] = next;
    if (output) {
      output.textContent =
        next + (property === "rotation" ? "°" : "%");
    }
    syncLayerControls(layer);
    updateCanvasSelection(lastPreviewResult);
    scheduleRender();
    scheduleHistoryCapture();
  }

  function setDecorationLayerProperty(layer, property, value, output) {
    if (!isGeneratedDecorationOwner(layer) || layer.locked) {
      return;
    }
    if (property === "starCount") {
      layer.starCount = clamp(Math.round(Number(value) || 0), 0, 60);
      if (output) {
        output.textContent = String(layer.starCount);
      }
    } else if (property === "showJDecorations") {
      layer.showJDecorations = Boolean(value);
    } else {
      return;
    }
    if (layer.id === activeLayerId) {
      syncSelectedLayerControls(layer);
    }
    scheduleRender();
    scheduleHistoryCapture();
  }

  function setGroupLayerProperty(layer, property, value, output) {
    if (!isLetteringGroupLayer(layer) || layer.locked) {
      return;
    }
    var ranges = {
      lineGap: [0, 220],
      subtitleGap: [-150, 400]
    };
    if (!ranges[property]) {
      return;
    }
    var next = clamp(Number(value), ranges[property][0], ranges[property][1]);
    state[property] = next;
    if (output) {
      output.textContent = next + "%";
    }
    syncSelectedLayerControls(layer);
    scheduleRender();
    scheduleHistoryCapture();
  }

  function nextDecorationSeed(previousSeed) {
    var next = 0;
    if (window.crypto && window.crypto.getRandomValues) {
      var values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      next = values[0] >>> 0;
    } else {
      next =
        (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    }
    if (next === (previousSeed >>> 0)) {
      next = (next + 0x9e3779b9) >>> 0;
    }
    return next;
  }

  function randomizeStarPositions(layer, notifyUser) {
    if (!isGeneratedDecorationOwner(layer) || layer.locked) {
      return;
    }
    layer.layoutSeed = nextDecorationSeed(layer.layoutSeed || 0);
    scheduleRender();
    scheduleHistoryCapture();
    if (notifyUser) {
      showToast("星星位置已重新随机");
    }
  }

  function setLayerLocked(layer, locked, notifyUser) {
    if (!layer) {
      return;
    }
    if (isImageLayer(layer)) {
      setOverlayLocked(locked, notifyUser);
    } else {
      layer.locked = Boolean(locked);
      canvasDragging = false;
      canvasDragStart = null;
      canvasHandleDrag = null;
      canvasSelectionVisible = !layer.locked;
      elements.canvasFrame.classList.remove("dragging", "manipulating");
      syncLayerControls(layer);
      renderLayerList();
      updateDragTargetInterface();
      updateCanvasSelection(lastPreviewResult);
      scheduleRender();
      if (notifyUser) {
        showToast(
          layer.name + (layer.locked ? "已锁定" : "已解锁")
        );
      }
    }
    scheduleHistoryCapture();
  }

  function setLayerVisibility(layer, visible) {
    if (!layer) {
      return;
    }
    layer.visible = Boolean(visible);
    if (!layer.visible && layer.id === activeLayerId) {
      hideCanvasSelection();
    }
    syncSelectedLayerControls(layer);
    renderLayerList();
    updateOverlayInterface();
    startGifPreviewLoop();
    scheduleRender();
    scheduleHistoryCapture();
  }

  function findOfficialCharacter(id) {
    return angelinaAssets.characters.find(function (asset) {
      return asset.id === id;
    });
  }

  function findOfficialDecoration(id) {
    return angelinaAssets.decorations.find(function (asset) {
      return asset.id === id;
    });
  }

  function characterAssetSource(id) {
    return "./assets/angelina/static/" + id + ".png";
  }

  function characterThumbnailSource(id) {
    return "./assets/angelina/thumbs/" + id + ".webp";
  }

  function decorationAssetSource(id) {
    return "./assets/angelina/decorations/" + id + ".png";
  }

  function frameAssetSource(id, index) {
    return (
      "./assets/angelina/frames/" +
      id +
      "/" +
      String(index).padStart(2, "0") +
      ".webp"
    );
  }

  function stopGifPreviewLoop() {
    window.clearTimeout(gifPreviewTimer);
    gifPreviewTimer = 0;
  }

  function startGifPreviewLoop() {
    stopGifPreviewLoop();
    if (
      !getAnimatedLayers().length ||
      document.hidden ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    var tick = function () {
      scheduleRender();
      gifPreviewTimer = window.setTimeout(tick, 80);
    };
    gifPreviewTimer = window.setTimeout(tick, 80);
  }

  function renderOfficialAssetGrid() {
    if (!elements.officialAssetGrid) {
      return;
    }
    var assets =
      officialAssetCategory === "decorations"
        ? angelinaAssets.decorations
        : angelinaAssets.characters;
    var kind =
      officialAssetCategory === "decorations"
        ? "decoration"
        : officialAssetCategory === "animations"
          ? "animation"
          : "character";
    var fragment = document.createDocumentFragment();

    assets.forEach(function (asset) {
      var button = document.createElement("button");
      var thumb = document.createElement("span");
      var image = document.createElement("img");
      var label = document.createElement("span");
      button.type = "button";
      button.className = "official-asset-button";
      button.dataset.assetKind = kind;
      button.dataset.assetId = asset.id;
      button.setAttribute(
        "aria-label",
        "添加" + (kind === "animation" ? "动态贴纸 " : "素材 ") + asset.name
      );
      if (
        selectedOfficialAsset &&
        selectedOfficialAsset.kind === kind &&
        selectedOfficialAsset.id === asset.id
      ) {
        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");
      } else {
        button.setAttribute("aria-pressed", "false");
      }

      thumb.className = "official-asset-thumb";
      image.loading = "lazy";
      image.decoding = "async";
      image.alt = "";
      image.src =
        kind === "decoration"
          ? decorationAssetSource(asset.id)
          : characterThumbnailSource(asset.id);
      thumb.appendChild(image);
      button.appendChild(thumb);

      if (kind === "animation") {
        var badge = document.createElement("i");
        badge.className = "official-asset-gif-badge";
        badge.textContent = asset.frameCount + " 帧";
        badge.setAttribute("aria-hidden", "true");
        button.appendChild(badge);
      }

      label.textContent = asset.name;
      button.appendChild(label);
      fragment.appendChild(button);
    });

    elements.officialAssetGrid.replaceChildren(fragment);
  }

  function updateEditorModeInterface() {
    var gifMode = hasAnimatedLayers();
    document.body.dataset.editorMode = "layers";
    elements.assetCategoryButtons.forEach(function (button) {
      var active = button.dataset.assetCategory === officialAssetCategory;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    elements.customUploadBlock.hidden = false;
    elements.imageQualityControl.hidden = gifMode;
    elements.gifQualityControl.hidden = !gifMode;
    elements.imageLayerTitle.textContent = "添加图层";
    elements.officialAssetsSummaryHint.textContent =
      "贴纸、GIF 与装饰均可叠加";
    elements.officialAssetsHint.textContent =
      "每点一次都会新建一个独立图层，可重复添加。";
    elements.overlayHint.textContent =
      "选择任意图片图层后，可在画布中直接移动、缩放和旋转。";
    elements.exportTitle.textContent = gifMode ? "导出动态作品" : "保存作品";
    elements.downloadButtonIcon.textContent = gifMode ? "▶" : "↓";
    elements.downloadButtonLabel.textContent = gifMode
      ? "保存 GIF"
      : "保存图片";
    renderOfficialAssetGrid();
    renderLayerList();
  }

  function loadOfficialAsset(kind, id, options) {
    options = options || {};
    var gifMode = kind === "animation";
    var asset =
      kind === "decoration"
        ? findOfficialDecoration(id)
        : findOfficialCharacter(id);
    if (!asset) {
      showToast("这份素材暂时无法使用");
      return;
    }

    var source =
      kind === "decoration"
        ? decorationAssetSource(id)
        : gifMode
          ? frameAssetSource(id, 1)
          : characterAssetSource(id);
    var image = new Image();
    elements.officialAssetGrid.classList.add("is-loading");
    elements.officialAssetGrid.setAttribute("aria-busy", "true");
    image.decoding = "async";
    image.onload = function () {
      var layer = {
        id: nextLayerId(),
        type: gifMode ? "gif" : "image",
        sourceType:
          kind === "decoration"
            ? "official-decoration"
            : gifMode
              ? "official-gif"
              : "official-static",
        name: asset.name,
        image: image,
        frames: gifMode ? [image] : [],
        frameDelay: gifMode ? asset.frameDelay : 0,
        officialAsset: { kind: kind, id: id },
        thumbnailSrc:
          kind === "decoration" ? source : characterThumbnailSource(id),
        objectUrl: "",
        bytes: 0,
        scale: kind === "character" || gifMode ? 36 : 28,
        x: kind === "character" || gifMode ? 78 : 50,
        y: kind === "character" || gifMode ? 54 : 50,
        rotation: 0,
        opacity: 100,
        defaultScale: kind === "character" || gifMode ? 36 : 28,
        defaultX: kind === "character" || gifMode ? 78 : 50,
        defaultY: kind === "character" || gifMode ? 54 : 50,
        defaultRotation: 0,
        defaultOpacity: 100,
        visible: true,
        locked: false
      };
      officialAssetCategory =
        kind === "decoration"
          ? "decorations"
          : gifMode
            ? "animations"
            : "characters";
      elements.officialAssetGrid.classList.remove("is-loading");
      elements.officialAssetGrid.removeAttribute("aria-busy");
      addLayer(layer);
      updateEditorModeInterface();
      updateCanvasRatioInterface();
      if (gifMode) {
        loadGifFrameImages(asset)
          .then(function (images) {
            if (!getLayer(layer.id)) {
              return;
            }
            layer.frames = images;
            layer.image = images[0];
            if (activeLayerId === layer.id) {
              syncLayerControls(layer);
            }
            scheduleRender();
            startGifPreviewLoop();
          })
          .catch(function (error) {
            console.warn("Could not prepare the GIF preview frames.", error);
            showToast("动态预览加载失败，可刷新后重试");
          });
      }
      if (!options.silent) {
        showToast(gifMode ? "动态贴纸已添加为新图层" : "素材已添加为新图层");
      }
      anchorFixedViewportAfterLayout(false);
    };
    image.onerror = function () {
      elements.officialAssetGrid.classList.remove("is-loading");
      elements.officialAssetGrid.removeAttribute("aria-busy");
      showToast("素材加载失败，请刷新后重试");
    };
    image.src = source;
  }

  function setLocalUploadBusy(busy) {
    if (!elements.customUploadBlock || !elements.overlayFile) {
      return;
    }
    window.clearTimeout(localUploadStatusTimer);
    elements.customUploadBlock.classList.toggle("is-loading", Boolean(busy));
    elements.overlayFile.disabled = Boolean(busy);
    if (busy) {
      elements.customUploadBlock.setAttribute("aria-busy", "true");
    } else {
      elements.customUploadBlock.removeAttribute("aria-busy");
      if (elements.localUploadStatus && !elements.localUploadStatus.hidden) {
        localUploadStatusTimer = window.setTimeout(function () {
          elements.localUploadStatus.hidden = true;
        }, 3600);
      }
    }
  }

  function setLocalUploadMessage(message) {
    if (!elements.localUploadStatus) {
      return;
    }
    window.clearTimeout(localUploadStatusTimer);
    elements.localUploadStatus.textContent = message || "";
    elements.localUploadStatus.hidden = !message;
  }

  function localGifError(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function readFileAsArrayBuffer(file) {
    if (file && typeof file.arrayBuffer === "function") {
      return file.arrayBuffer();
    }
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () {
        reject(localGifError("GIF_READ_FAILED", "浏览器没能读出这个文件"));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function localGifOutputSize(width, height, frameCount) {
    var mobile = isMobileSaveBrowser();
    var framePixelBudget = mobile
      ? localGifLimits.mobileFramePixels
      : localGifLimits.desktopFramePixels;
    var maxSide = mobile ? 900 : 1200;
    var scale = Math.min(
      1,
      maxSide / Math.max(width, height),
      Math.sqrt(framePixelBudget / Math.max(1, width * height * frameCount))
    );
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
      compressed: scale < 0.995
    };
  }

  function decodeLocalGifFrames(arrayBuffer, onProgress) {
    if (
      !gifDecoder ||
      typeof gifDecoder.parseGIF !== "function" ||
      typeof gifDecoder.decompressFrame !== "function"
    ) {
      return Promise.reject(
        localGifError(
          "GIF_DECODER_UNAVAILABLE",
          "GIF 解码组件没有加载，请刷新后再试"
        )
      );
    }

    var parsedGif;
    try {
      parsedGif = gifDecoder.parseGIF(arrayBuffer);
    } catch (error) {
      return Promise.reject(
        localGifError("GIF_PARSE_FAILED", "文件不是有效的 GIF，或文件已经损坏")
      );
    }

    var width = Number(parsedGif && parsedGif.lsd && parsedGif.lsd.width) || 0;
    var height = Number(parsedGif && parsedGif.lsd && parsedGif.lsd.height) || 0;
    var sourcePixels = width * height;
    var mobile = isMobileSaveBrowser();
    var maxSourcePixels = mobile
      ? localGifLimits.mobileSourcePixels
      : localGifLimits.maxSourcePixels;
    var maxSourceSide = mobile
      ? localGifLimits.mobileSourceSide
      : localGifLimits.maxSourceSide;
    var rawFrames = (parsedGif.frames || []).filter(function (frame) {
      return Boolean(frame && frame.image);
    });

    if (!width || !height || !rawFrames.length) {
      return Promise.reject(
        localGifError("GIF_EMPTY", "GIF 中没有可用的画面")
      );
    }
    if (
      Math.max(width, height) > maxSourceSide ||
      sourcePixels > maxSourcePixels
    ) {
      return Promise.reject(
        localGifError(
          "GIF_DIMENSIONS_TOO_LARGE",
          "GIF 原始尺寸过大，请先缩小到 " + maxSourceSide + " px 长边以内"
        )
      );
    }
    if (rawFrames.length > localGifLimits.maxFrames) {
      return Promise.reject(
        localGifError(
          "GIF_TOO_MANY_FRAMES",
          "GIF 有 " + rawFrames.length + " 帧，实验功能目前最多支持 60 帧"
        )
      );
    }

    var invalidFrame = rawFrames.some(function (frame) {
      var descriptor = frame.image && frame.image.descriptor;
      var frameWidth = Number(descriptor && descriptor.width) || 0;
      var frameHeight = Number(descriptor && descriptor.height) || 0;
      return (
        !frameWidth ||
        !frameHeight ||
        Math.max(frameWidth, frameHeight) > maxSourceSide ||
        frameWidth * frameHeight > maxSourcePixels
      );
    });
    if (invalidFrame) {
      return Promise.reject(
        localGifError("GIF_FRAME_TOO_LARGE", "GIF 中包含尺寸异常的帧")
      );
    }

    var outputSize = localGifOutputSize(width, height, rawFrames.length);
    var compositeCanvas = document.createElement("canvas");
    compositeCanvas.width = width;
    compositeCanvas.height = height;
    var compositeContext = compositeCanvas.getContext("2d");
    var patchCanvas = document.createElement("canvas");
    var patchContext = patchCanvas.getContext("2d");
    if (!compositeContext || !patchContext) {
      return Promise.reject(
        localGifError("GIF_CANVAS_UNAVAILABLE", "当前浏览器无法建立 GIF 画布")
      );
    }

    var frames = [];
    var frameDelays = [];
    var frameIndex = 0;
    var previousDisposal = 0;
    var previousDimensions = null;
    var previousRestore = null;

    function applyPreviousDisposal() {
      if (previousDisposal === 2 && previousDimensions) {
        compositeContext.clearRect(
          previousDimensions.left,
          previousDimensions.top,
          previousDimensions.width,
          previousDimensions.height
        );
      } else if (previousDisposal === 3 && previousRestore) {
        compositeContext.putImageData(previousRestore, 0, 0);
      }
    }

    function decodeNextFrame() {
      if (frameIndex >= rawFrames.length) {
        return Promise.resolve({
          frames: frames,
          frameDelays: frameDelays,
          duration: frameDelays.reduce(function (total, delay) {
            return total + delay;
          }, 0),
          width: width,
          height: height,
          outputWidth: outputSize.width,
          outputHeight: outputSize.height,
          compressed: outputSize.compressed
        });
      }

      var decodedFrame;
      try {
        decodedFrame = gifDecoder.decompressFrame(
          rawFrames[frameIndex],
          parsedGif.gct,
          true
        );
      } catch (error) {
        return Promise.reject(
          localGifError(
            "GIF_DECODE_FAILED",
            "第 " + (frameIndex + 1) + " 帧解码失败"
          )
        );
      }
      if (!decodedFrame || !decodedFrame.patch || !decodedFrame.dims) {
        return Promise.reject(
          localGifError("GIF_DECODE_FAILED", "GIF 帧数据不完整")
        );
      }

      applyPreviousDisposal();
      var restoreBeforeFrame = null;
      if (Number(decodedFrame.disposalType) === 3) {
        try {
          restoreBeforeFrame = compositeContext.getImageData(0, 0, width, height);
        } catch (error) {
          restoreBeforeFrame = null;
        }
      }

      var dimensions = decodedFrame.dims;
      patchCanvas.width = dimensions.width;
      patchCanvas.height = dimensions.height;
      var patchImageData = patchContext.createImageData(
        dimensions.width,
        dimensions.height
      );
      patchImageData.data.set(decodedFrame.patch);
      patchContext.putImageData(patchImageData, 0, 0);
      compositeContext.drawImage(
        patchCanvas,
        Number(dimensions.left) || 0,
        Number(dimensions.top) || 0
      );

      var outputCanvas = document.createElement("canvas");
      outputCanvas.width = outputSize.width;
      outputCanvas.height = outputSize.height;
      var outputContext = outputCanvas.getContext("2d");
      if (!outputContext) {
        return Promise.reject(
          localGifError("GIF_CANVAS_UNAVAILABLE", "当前浏览器无法生成 GIF 帧")
        );
      }
      outputContext.drawImage(
        compositeCanvas,
        0,
        0,
        outputSize.width,
        outputSize.height
      );
      frames.push(outputCanvas);
      frameDelays.push(clamp(Number(decodedFrame.delay) || 100, 20, 4000));

      previousDisposal = Number(decodedFrame.disposalType) || 0;
      previousDimensions = {
        left: Number(dimensions.left) || 0,
        top: Number(dimensions.top) || 0,
        width: Number(dimensions.width) || 0,
        height: Number(dimensions.height) || 0
      };
      previousRestore = restoreBeforeFrame;
      decodedFrame.patch = null;
      decodedFrame.pixels = null;
      frameIndex += 1;
      if (onProgress) {
        onProgress(frameIndex / rawFrames.length);
      }

      if (frameIndex % 3 === 0) {
        return new Promise(function (resolve) {
          window.setTimeout(resolve, 0);
        }).then(decodeNextFrame);
      }
      return decodeNextFrame();
    }

    return decodeNextFrame();
  }

  function loadLocalGifFile(file, options) {
    options = options || {};
    var fileName = options.name || file.name || "本地 GIF";
    if (file.size > localGifLimits.maxBytes) {
      var tooLargeMessage = "GIF 不能超过 15 MB";
      setLocalUploadMessage("未添加 " + fileName + "：" + tooLargeMessage);
      showToast(tooLargeMessage);
      elements.overlayFile.value = "";
      return Promise.resolve(null);
    }

    setLocalUploadMessage("正在解析 " + fileName + "…");
    return readFileAsArrayBuffer(file)
      .then(function (arrayBuffer) {
        return decodeLocalGifFrames(arrayBuffer, function (progress) {
          setLocalUploadMessage(
            "正在解析 " + fileName + " · " + Math.round(progress * 100) + "%"
          );
        });
      })
      .then(function (decoded) {
        var wasFirstImage = getImageLayers().length === 0;
        var objectUrl = URL.createObjectURL(file);
        var layer = {
          id: nextLayerId(),
          type: "gif",
          sourceType: "upload",
          name: fileName,
          image: decoded.frames[0],
          frames: decoded.frames,
          frameDelay: decoded.frameDelays[0] || 100,
          frameDelays: decoded.frameDelays,
          animationDuration: decoded.duration,
          officialAsset: null,
          thumbnailSrc: objectUrl,
          objectUrl: objectUrl,
          bytes: options.size || file.size || 0,
          originalWidth: decoded.width,
          originalHeight: decoded.height,
          decodedWidth: decoded.outputWidth,
          decodedHeight: decoded.outputHeight,
          locallyCompressed: decoded.compressed,
          experimental: true,
          scale: 100,
          x: 50,
          y: 50,
          rotation: 0,
          opacity: 100,
          defaultScale: 100,
          defaultX: 50,
          defaultY: 50,
          defaultRotation: 0,
          defaultOpacity: 100,
          visible: true,
          locked: false
        };
        animationStartedAt = performance.now();
        addLayer(layer, { belowArtwork: true });
        if (wasFirstImage && options.followRatio !== false) {
          state.canvasRatioMode = "auto";
          state.canvasSize = canvasSizeFromOverlayImage();
          elements.canvasSize.value = state.canvasSize;
        }
        elements.overlayFile.value = "";
        updateOverlayInterface();
        updateCanvasRatioInterface();
        scheduleRender();
        startGifPreviewLoop();
        var resultMessage =
          "GIF 已添加 · " + decoded.frames.length + " 帧" +
          (decoded.compressed
            ? " · 已压缩到 " + decoded.outputWidth + " × " + decoded.outputHeight
            : "");
        setLocalUploadMessage(resultMessage);
        if (!options.silent) {
          showToast(resultMessage);
        }
        anchorFixedViewportAfterLayout(false);
        return layer;
      })
      .catch(function (error) {
        var message = error && error.message
          ? error.message
          : "这个 GIF 暂时无法解码";
        console.warn("Could not decode a local GIF.", error);
        elements.overlayFile.value = "";
        setLocalUploadMessage("GIF 未添加：" + message);
        showToast("GIF 未添加：" + message);
        return null;
      });
  }

  function loadOverlayFile(file, options) {
    options = options || {};
    if (!file) {
      return Promise.resolve(null);
    }
    var gifType = /^image\/gif$/i.test(file.type || "");
    var gifName = /\.gif$/i.test(options.name || file.name || "");
    if (gifType || gifName) {
      return loadLocalGifFile(file, options);
    }
    var supportedType = /^(image\/png|image\/jpeg|image\/webp)$/i.test(
      file.type || ""
    );
    var supportedName = /\.(png|jpe?g|webp)$/i.test(
      options.name || file.name || ""
    );
    if (!supportedType && !supportedName) {
      showToast("请选择 PNG、JPG、WebP 或 GIF 图片");
      elements.overlayFile.value = "";
      return Promise.resolve(null);
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast("图片不能超过 25 MB");
      elements.overlayFile.value = "";
      return Promise.resolve(null);
    }

    setLocalUploadMessage(
      "正在添加 " + (options.name || file.name || "这张图片") + "…"
    );
    var objectUrl = URL.createObjectURL(file);
    return new Promise(function (resolve) {
      var image = new Image();
      image.decoding = "async";
      image.onload = function () {
        var wasFirstImage = getImageLayers().length === 0;
        var layer = {
          id: nextLayerId(),
          type: "image",
          sourceType: "upload",
          name: options.name || file.name || "这张图片",
          image: image,
          frames: [],
          frameDelay: 0,
          officialAsset: null,
          thumbnailSrc: objectUrl,
          objectUrl: objectUrl,
          bytes: options.size || file.size || 0,
          scale: 100,
          x: 50,
          y: 50,
          rotation: 0,
          opacity: 100,
          defaultScale: 100,
          defaultX: 50,
          defaultY: 50,
          defaultRotation: 0,
          defaultOpacity: 100,
          visible: true,
          locked: false
        };
        addLayer(layer, { belowArtwork: true });
        if (wasFirstImage && options.followRatio !== false) {
          state.canvasRatioMode = "auto";
          state.canvasSize = canvasSizeFromOverlayImage();
          elements.canvasSize.value = state.canvasSize;
        }
        elements.overlayFile.value = "";
        updateOverlayInterface();
        updateCanvasRatioInterface();
        scheduleRender();
        if (!options.silent) {
          showToast("图片已添加为新图层");
        }
        setLocalUploadMessage("图片已添加为新图层");
        anchorFixedViewportAfterLayout(false);
        resolve(layer);
      };
      image.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        elements.overlayFile.value = "";
        showToast("无法读取这张图片");
        setLocalUploadMessage("图片未添加：浏览器无法读取这个文件");
        resolve(null);
      };
      image.src = objectUrl;
    });
  }

  function restoreCachedOverlay() {
    deleteCachedOverlay().catch(function (error) {
      console.warn("Could not clear the legacy single-image cache.", error);
    });
  }

  function updateOverlayInterface() {
    if (!elements.overlayControls) {
      return;
    }
    var layer = getActiveLayer();
    var hasImage = isImageLayer(layer);
    var activeImage = hasImage ? imageForLayer(layer) : null;
    var activeDimensions = imageDimensions(activeImage);
    var locked = hasImage && layer.locked;
    if (hasImage) {
      syncLayerControls(layer);
    }
    elements.overlayControls.hidden = !hasImage;
    elements.overlayControls.classList.toggle("is-locked", locked);
    elements.removeOverlayButton.disabled = !hasImage;
    elements.overlayThumbnail.hidden = !hasImage;
    elements.overlayPlaceholder.hidden = hasImage;
    elements.canvasFrame.classList.toggle("has-overlay", getImageLayers().length > 0);
    elements.canvasFrame.classList.toggle("dragging", canvasDragging);
    elements.overlayLockButton.disabled = !hasImage;
    elements.overlayLockButton.setAttribute(
      "aria-pressed",
      String(hasImage ? layer.locked : true)
    );
    var lockAction = !hasImage
      ? "上传图片后可锁定"
      : locked
        ? "解锁图片"
        : "锁定图片";
    elements.overlayLockButton.setAttribute("aria-label", lockAction);
    elements.overlayLockButton.title = lockAction;
    [
      elements.overlayScale,
      elements.overlayX,
      elements.overlayY,
      elements.overlayRotation,
      elements.overlayOpacity,
      elements.overlayLayer,
      elements.resetOverlayButton
    ].forEach(function (control) {
      control.disabled = locked;
    });
    updateDragTargetInterface();

    if (hasImage) {
      elements.overlayFileName.textContent = layer.name;
      elements.overlayThumbnail.src = layer.thumbnailSrc || layer.objectUrl || "";
      var officialCharacter =
        layer.officialAsset &&
        (layer.officialAsset.kind === "character" ||
          layer.officialAsset.kind === "animation")
          ? findOfficialCharacter(layer.officialAsset.id)
          : null;
      if (layer.type === "gif" && officialCharacter) {
        elements.overlayFileMeta.textContent =
          "动态贴纸 · " + officialCharacter.frameCount + " 帧 · 循环播放";
      } else if (layer.type === "gif" && layer.sourceType === "upload") {
        var sourceWidth = layer.originalWidth || activeDimensions.width;
        var sourceHeight = layer.originalHeight || activeDimensions.height;
        elements.overlayFileMeta.textContent =
          "实验性 GIF · " +
          layer.frames.length +
          " 帧 · " +
          sourceWidth +
          " × " +
          sourceHeight +
          " px · " +
          formatFileSize(layer.bytes || 0) +
          (layer.locallyCompressed
            ? " · 预览优化至 " + activeDimensions.width + " × " + activeDimensions.height
            : "");
      } else if (layer.sourceType === "official-decoration") {
        elements.overlayFileMeta.textContent =
          activeDimensions.width +
          " × " +
          activeDimensions.height +
          " px · 官方装饰";
      } else if (layer.sourceType === "official-static") {
        elements.overlayFileMeta.textContent =
          activeDimensions.width +
          " × " +
          activeDimensions.height +
          " px · 官方贴纸";
      } else {
        elements.overlayFileMeta.textContent =
          activeDimensions.width +
          " × " +
          activeDimensions.height +
          " px · " +
          formatFileSize(layer.bytes || 0);
      }
    } else {
      elements.overlayFileName.textContent = layer
        ? "当前选中：" + layer.name
        : "还没有选中图层";
      elements.overlayFileMeta.textContent =
        getImageLayers().length
          ? "在左侧选择图片图层即可调整"
          : "可继续添加贴纸、GIF 或本地图片";
    }

    updateRange(elements.overlayScale, elements.overlayScaleValue, "%");
    updateRange(elements.overlayX, elements.overlayXValue, "%");
    updateRange(elements.overlayY, elements.overlayYValue, "%");
    updateRange(
      elements.overlayRotation,
      elements.overlayRotationValue,
      "°"
    );
    updateRange(elements.overlayOpacity, elements.overlayOpacityValue, "%");
    updateCanvasRatioInterface();
  }

  function drawOverlayImage(ctx, width, height, image, layer) {
    layer = layer || getActiveLayer();
    image = image || imageForLayer(layer);
    var dimensions = imageDimensions(image);
    if (!dimensions.width || !dimensions.height) {
      return;
    }
    var drawWidth = width * ((layer.scale || 100) / 100);
    var drawHeight =
      drawWidth * (dimensions.height / dimensions.width);
    var centerX = width * ((layer.x == null ? 50 : layer.x) / 100);
    var centerY = height * ((layer.y == null ? 50 : layer.y) / 100);

    ctx.save();
    ctx.globalAlpha = clamp((layer.opacity == null ? 100 : layer.opacity) / 100, 0, 1);
    ctx.translate(centerX, centerY);
    ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);
    ctx.drawImage(
      image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
    ctx.restore();
  }

  function drawLayerRange(ctx, width, height, start, end, time, forcedImages) {
    layers.slice(start, end).forEach(function (layer) {
      if (!isImageLayer(layer) || !layer.visible) {
        return;
      }
      drawOverlayImage(
        ctx,
        width,
        height,
        imageForLayer(layer, time, forcedImages),
        layer
      );
    });
  }

  function textBaseScale(width, height) {
    var fittedBaseScale = width / height >= 1.98 ? 0.88 : 0.94;
    return fittedBaseScale;
  }

  function textLayerScale(layer, width, height) {
    return textBaseScale(width, height) * clamp(layer.scale / 100, 0.2, 2.2);
  }

  function applyTextLayerTransform(ctx, width, height, layer, entry) {
    var scale = textLayerScale(layer, width, height);
    var bounds = entry.bounds;
    var localCenterX = (bounds.left + bounds.right) / 2;
    var localCenterY = (bounds.top + bounds.bottom) / 2;
    ctx.translate(
      width * (layer.x / 100),
      height * (layer.y / 100)
    );
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-localCenterX, -localCenterY);
  }

  function textLayerGeometry(layer, entry, width, height) {
    if (!layer || !entry) {
      return null;
    }
    var scale = textLayerScale(layer, width, height);
    return {
      centerX: width * (layer.x / 100),
      centerY: height * (layer.y / 100),
      width: (entry.bounds.right - entry.bounds.left) * scale,
      height: (entry.bounds.bottom - entry.bounds.top) * scale,
      angle: layer.rotation,
      label:
        layer.name +
        " · " +
        Math.round(layer.scale) +
        "% · " +
        Math.round(layer.rotation) +
        "°"
    };
  }

  function letteringGroupScale(layer, width, height) {
    return (
      textBaseScale(width, height) *
      clamp(layer.scale / 100, 0.2, 2.2)
    );
  }

  function applyLetteringGroupTransform(ctx, width, height, layer) {
    var scale = letteringGroupScale(layer, width, height);
    ctx.translate(width * (layer.x / 100), height * (layer.y / 100));
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);
  }

  function letteringGroupGeometry(layer, bounds, width, height) {
    if (!layer || !bounds) {
      return null;
    }
    var scale = letteringGroupScale(layer, width, height);
    var boundsCenterX = (bounds.left + bounds.right) / 2;
    var boundsCenterY = (bounds.top + bounds.bottom) / 2;
    var offsetX = (boundsCenterX - width / 2) * scale;
    var offsetY = (boundsCenterY - height / 2) * scale;
    var radians = (layer.rotation * Math.PI) / 180;
    return {
      centerX:
        width * (layer.x / 100) +
        offsetX * Math.cos(radians) -
        offsetY * Math.sin(radians),
      centerY:
        height * (layer.y / 100) +
        offsetX * Math.sin(radians) +
        offsetY * Math.cos(radians),
      width: (bounds.right - bounds.left) * scale,
      height: (bounds.bottom - bounds.top) * scale,
      angle: layer.rotation,
      label:
        layer.name +
        " · " +
        Math.round(layer.scale) +
        "% · " +
        Math.round(layer.rotation) +
        "°"
    };
  }

  function decorationLayerGeometry(layer, width, height) {
    if (!layer) {
      return null;
    }
    var scale = clamp(layer.scale / 100, 0.2, 2.4);
    return {
      centerX: width * (layer.x / 100),
      centerY: height * (layer.y / 100),
      width: width * scale,
      height: height * scale,
      angle: layer.rotation,
      label:
        layer.name +
        " · " +
        Math.round(layer.scale) +
        "% · " +
        Math.round(layer.rotation) +
        "°"
    };
  }

  function normalizeRotation(value) {
    var normalized = ((value + 180) % 360 + 360) % 360 - 180;
    return normalized === -180 ? 180 : normalized;
  }

  function canvasObjectGeometry(target, result) {
    if (!result) {
      return null;
    }
    var width = result.width;
    var height = result.height;

    var layer = getLayer(target);
    if (isLetteringGroupLayer(layer)) {
      if (layer.locked || !layer.visible) {
        return null;
      }
      return letteringGroupGeometry(
        layer,
        result.groupBounds || result.artworkBounds,
        width,
        height
      );
    }
    if (isDecorationLayer(layer)) {
      if (layer.locked || !layer.visible) {
        return null;
      }
      return decorationLayerGeometry(layer, width, height);
    }
    if (isImageLayer(layer)) {
      var layerImage = imageForLayer(layer);
      var layerImageDimensions = imageDimensions(layerImage);
      if (
        !layer ||
        layer.locked ||
        !layer.visible ||
        !layerImageDimensions.width ||
        !layerImageDimensions.height
      ) {
        return null;
      }
      var overlayWidth = width * (layer.scale / 100);
      return {
        centerX: width * (layer.x / 100),
        centerY: height * (layer.y / 100),
        width: overlayWidth,
        height:
          overlayWidth *
          (layerImageDimensions.height / layerImageDimensions.width),
        angle: layer.rotation,
        label:
          layer.name + " · " +
          Math.round(layer.scale) +
          "% · " +
          Math.round(layer.rotation) +
          "°"
      };
    }

    if (!isTextLayer(layer) || !layer.visible || layer.locked) {
      return null;
    }
    return textLayerGeometry(
      layer,
      result.textLayouts && result.textLayouts[layer.id],
      width,
      height
    );
  }

  function pointHitsCanvasObject(x, y, geometry, padding) {
    if (!geometry) {
      return false;
    }
    var radians = (-geometry.angle * Math.PI) / 180;
    var deltaX = x - geometry.centerX;
    var deltaY = y - geometry.centerY;
    var localX = deltaX * Math.cos(radians) - deltaY * Math.sin(radians);
    var localY = deltaX * Math.sin(radians) + deltaY * Math.cos(radians);
    return (
      Math.abs(localX) <= geometry.width / 2 + padding &&
      Math.abs(localY) <= geometry.height / 2 + padding
    );
  }

  function canvasTargetAtPointer(event, result) {
    if (!result) {
      return null;
    }
    var rect = elements.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }
    var x = ((event.clientX - rect.left) / rect.width) * result.width;
    var y = ((event.clientY - rect.top) / rect.height) * result.height;
    var padding = Math.min(result.width, result.height) * 0.012;
    var targets = layers
      .slice()
      .reverse()
      .filter(function (layer) {
        return layer.visible && !layer.locked;
      })
      .map(function (layer) {
        return layer.id;
      });

    for (var i = 0; i < targets.length; i += 1) {
      var target = targets[i];
      if (
        pointHitsCanvasObject(
          x,
          y,
          canvasObjectGeometry(target, result),
          padding
        )
      ) {
        return target;
      }
    }
    return null;
  }

  function hideCanvasSelection() {
    canvasSelectionVisible = false;
    if (elements.canvasSelection) {
      elements.canvasSelection.hidden = true;
    }
  }

  function updateCanvasSelection(result) {
    if (!elements.canvasSelection || !result || !canvasSelectionVisible) {
      if (elements.canvasSelection) {
        elements.canvasSelection.hidden = true;
      }
      return;
    }

    var geometry = canvasObjectGeometry(activeDragTarget, result);
    if (!geometry) {
      hideCanvasSelection();
      return;
    }

    var canvasRect = elements.canvas.getBoundingClientRect();
    var frameRect = elements.canvasFrame.getBoundingClientRect();
    if (!canvasRect.width || !canvasRect.height) {
      hideCanvasSelection();
      return;
    }

    var scaleX = canvasRect.width / result.width;
    var scaleY = canvasRect.height / result.height;
    var displayWidth = Math.max(36, geometry.width * scaleX);
    var displayHeight = Math.max(28, geometry.height * scaleY);
    var centerX =
      canvasRect.left - frameRect.left + geometry.centerX * scaleX;
    var centerY =
      canvasRect.top - frameRect.top + geometry.centerY * scaleY;

    elements.canvasSelection.hidden = false;
    elements.canvasSelection.style.left = centerX - displayWidth / 2 + "px";
    elements.canvasSelection.style.top = centerY - displayHeight / 2 + "px";
    elements.canvasSelection.style.width = displayWidth + "px";
    elements.canvasSelection.style.height = displayHeight + "px";
    elements.canvasSelection.style.transform =
      "rotate(" + geometry.angle + "deg)";
    elements.canvasSelectionLabel.style.transform =
      "rotate(" + -geometry.angle + "deg)";
    if (elements.canvasSelectionDeleteButton) {
      elements.canvasSelectionDeleteButton.style.transform =
        "rotate(" + -geometry.angle + "deg)";
    }
    elements.canvasSelectionLabel.textContent = geometry.label;
    elements.canvasSelection.setAttribute("aria-label", geometry.label);
  }

  function beginCanvasHandleDrag(event, mode) {
    if (event.button !== 0) {
      return;
    }
    readStateFromControls();
    var layer = getLayer(activeDragTarget) || getActiveLayer();
    if (!layer || layer.locked) {
      return;
    }
    var geometry = canvasObjectGeometry(layer.id, lastPreviewResult);
    if (!geometry || !lastPreviewResult) {
      return;
    }

    var rect = elements.canvas.getBoundingClientRect();
    var centerX =
      rect.left + (geometry.centerX / lastPreviewResult.width) * rect.width;
    var centerY =
      rect.top + (geometry.centerY / lastPreviewResult.height) * rect.height;
    var deltaX = event.clientX - centerX;
    var deltaY = event.clientY - centerY;

    canvasHandleDrag = {
      mode: mode,
      target: layer.id,
      pointerId: event.pointerId,
      element: event.currentTarget,
      centerX: centerX,
      centerY: centerY,
      startDistance: Math.max(1, Math.hypot(deltaX, deltaY)),
      startAngle: Math.atan2(deltaY, deltaX),
      startScale: layer.scale,
      startRotation: layer.rotation
    };

    elements.canvasFrame.classList.add("manipulating");
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    event.stopPropagation();
  }

  function moveCanvasHandle(event) {
    if (!canvasHandleDrag || event.pointerId !== canvasHandleDrag.pointerId) {
      return;
    }
    var deltaX = event.clientX - canvasHandleDrag.centerX;
    var deltaY = event.clientY - canvasHandleDrag.centerY;

    var layer = getLayer(canvasHandleDrag.target);
    if (!layer || layer.locked) {
      return;
    }

    if (canvasHandleDrag.mode === "scale") {
      var distance = Math.max(1, Math.hypot(deltaX, deltaY));
      var min = isImageLayer(layer) ? 5 : 20;
      var max = isImageLayer(layer) ? 200 : 220;
      var scale = clamp(
        Math.round(
          canvasHandleDrag.startScale *
            (distance / canvasHandleDrag.startDistance)
        ),
        min,
        max
      );
      layer.scale = scale;
      if (isImageLayer(layer)) {
        state.overlayScale = scale;
        elements.overlayScale.value = scale;
        updateRange(elements.overlayScale, elements.overlayScaleValue, "%");
      } else {
        state.artworkScale = scale;
        elements.artworkScale.value = scale;
        updateRange(elements.artworkScale, elements.artworkScaleValue, "%");
      }
    } else {
      var angle = Math.atan2(deltaY, deltaX);
      var angleDelta = angle - canvasHandleDrag.startAngle;
      if (angleDelta > Math.PI) {
        angleDelta -= Math.PI * 2;
      } else if (angleDelta < -Math.PI) {
        angleDelta += Math.PI * 2;
      }
      var rotation = normalizeRotation(
        canvasHandleDrag.startRotation + (angleDelta * 180) / Math.PI
      );
      rotation = event.shiftKey
        ? Math.round(rotation / 15) * 15
        : Math.round(rotation);
      layer.rotation = rotation;
      if (isImageLayer(layer)) {
        state.overlayRotation = rotation;
        elements.overlayRotation.value = rotation;
        updateRange(
          elements.overlayRotation,
          elements.overlayRotationValue,
          "°"
        );
      } else {
        state.artworkRotation = rotation;
        elements.artworkRotation.value = rotation;
        updateRange(
          elements.artworkRotation,
          elements.artworkRotationValue,
          "°"
        );
      }
    }

    syncSelectedLayerControls(layer);
    scheduleRender();
    event.preventDefault();
    event.stopPropagation();
  }

  function finishCanvasHandleDrag(event) {
    if (!canvasHandleDrag || event.pointerId !== canvasHandleDrag.pointerId) {
      return;
    }
    var handle = canvasHandleDrag.element;
    canvasHandleDrag = null;
    elements.canvasFrame.classList.remove("manipulating");
    if (
      handle.hasPointerCapture &&
      handle.hasPointerCapture(event.pointerId)
    ) {
      handle.releasePointerCapture(event.pointerId);
    }
    syncSelectedLayerControls(getActiveLayer());
    renderLayerList();
    scheduleHistoryCapture();
    event.preventDefault();
    event.stopPropagation();
  }

  function moveCanvasTargetFromPointer(event) {
    if (!canvasDragStart) {
      return;
    }
    var layer = getLayer(canvasDragStart.target);
    if (!layer || layer.locked) {
      return;
    }
    var rect = elements.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }
    var x = clamp(
      canvasDragStart.x + ((event.clientX - canvasDragStart.clientX) / rect.width) * 100,
      0,
      100
    );
    var y = clamp(
      canvasDragStart.y + ((event.clientY - canvasDragStart.clientY) / rect.height) * 100,
      0,
      100
    );
    x = Math.round(x * 10) / 10;
    y = Math.round(y * 10) / 10;

    layer.x = x;
    layer.y = y;
    if (isImageLayer(layer)) {
      state.overlayX = x;
      state.overlayY = y;
      elements.overlayX.value = state.overlayX;
      elements.overlayY.value = state.overlayY;
      updateRange(elements.overlayX, elements.overlayXValue, "%");
      updateRange(elements.overlayY, elements.overlayYValue, "%");
    } else {
      state.artworkX = x;
      state.artworkY = y;
      elements.artworkX.value = state.artworkX;
      elements.artworkY.value = state.artworkY;
      updateRange(elements.artworkX, elements.artworkXValue, "%");
      updateRange(elements.artworkY, elements.artworkYValue, "%");
    }
    syncSelectedLayerControls(layer);
    scheduleRender();
  }

  function hexToRgb(hex) {
    var clean = String(hex).replace("#", "");
    if (clean.length === 3) {
      clean = clean
        .split("")
        .map(function (char) {
          return char + char;
        })
        .join("");
    }
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }

  function rgbToHex(rgb) {
    function channel(value) {
      return Math.round(clamp(value, 0, 255))
        .toString(16)
        .padStart(2, "0");
    }
    return "#" + channel(rgb.r) + channel(rgb.g) + channel(rgb.b);
  }

  function mixColor(colorA, colorB, amount) {
    var a = hexToRgb(colorA);
    var b = hexToRgb(colorB);
    return rgbToHex({
      r: a.r + (b.r - a.r) * amount,
      g: a.g + (b.g - a.g) * amount,
      b: a.b + (b.b - a.b) * amount
    });
  }

  function rgba(hex, alpha) {
    var color = hexToRgb(hex);
    return (
      "rgba(" +
      color.r +
      "," +
      color.g +
      "," +
      color.b +
      "," +
      alpha +
      ")"
    );
  }

  function normalizeHexColor(value) {
    var clean = String(value || "").trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(clean)) {
      clean = clean
        .split("")
        .map(function (character) {
          return character + character;
        })
        .join("");
    }
    return /^[0-9a-f]{6}$/i.test(clean) ? "#" + clean.toLowerCase() : null;
  }

  function rgbToHsl(rgb) {
    var r = rgb.r / 255;
    var g = rgb.g / 255;
    var b = rgb.b / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var lightness = (max + min) / 2;
    var saturation = 0;
    var hue = 0;

    if (max !== min) {
      var delta = max - min;
      saturation =
        lightness > 0.5
          ? delta / (2 - max - min)
          : delta / (max + min);
      if (max === r) {
        hue = (g - b) / delta + (g < b ? 6 : 0);
      } else if (max === g) {
        hue = (b - r) / delta + 2;
      } else {
        hue = (r - g) / delta + 4;
      }
      hue /= 6;
    }

    return {
      h: Math.round(hue * 360),
      s: Math.round(saturation * 100),
      l: Math.round(lightness * 100)
    };
  }

  function hslToRgb(hsl) {
    var hue = (((Number(hsl.h) || 0) % 360) + 360) % 360 / 360;
    var saturation = clamp(Number(hsl.s) || 0, 0, 100) / 100;
    var lightness = clamp(Number(hsl.l) || 0, 0, 100) / 100;

    if (saturation === 0) {
      var gray = lightness * 255;
      return { r: gray, g: gray, b: gray };
    }

    function hueChannel(p, q, value) {
      if (value < 0) {
        value += 1;
      }
      if (value > 1) {
        value -= 1;
      }
      if (value < 1 / 6) {
        return p + (q - p) * 6 * value;
      }
      if (value < 1 / 2) {
        return q;
      }
      if (value < 2 / 3) {
        return p + (q - p) * (2 / 3 - value) * 6;
      }
      return p;
    }

    var q =
      lightness < 0.5
        ? lightness * (1 + saturation)
        : lightness + saturation - lightness * saturation;
    var p = 2 * lightness - q;
    return {
      r: hueChannel(p, q, hue + 1 / 3) * 255,
      g: hueChannel(p, q, hue) * 255,
      b: hueChannel(p, q, hue - 1 / 3) * 255
    };
  }

  function colorTargetLabel(target) {
    return {
      primaryColor: "主色",
      accentColor: "点缀色",
      skyColor: "辅色"
    }[target] || "颜色";
  }

  function setColorValue(target, value, render) {
    var normalized = normalizeHexColor(value);
    if (!normalized || !elements[target]) {
      return false;
    }
    state[target] = normalized;
    elements[target].value = normalized;
    updateColorInterface();
    if (render !== false) {
      scheduleRender();
      scheduleHistoryCapture();
    }
    return true;
  }

  function setActiveColorTarget(target, focusButton) {
    if (!elements[target]) {
      return;
    }
    activeColorTarget = target;
    updateColorInterface();
    if (focusButton) {
      var button = Array.from(elements.colorTargetButtons).find(function (item) {
        return item.dataset.colorTarget === target;
      });
      if (button) {
        button.focus();
      }
    }
  }

  function updateShadowColorInterface() {
    if (!elements.titleShadowColor || !elements.shadowColorHexInput) {
      return;
    }
    var color =
      normalizeHexColor(elements.titleShadowColor.value) || "#000000";
    var hsl = rgbToHsl(hexToRgb(color));
    elements.titleShadowColorValue.textContent = color.toUpperCase();
    elements.shadowColorPreview.style.backgroundColor = color;
    elements.shadowColorHexInput.value = color.toUpperCase();
    elements.shadowColorHue.value = hsl.h;
    elements.shadowColorSaturation.value = hsl.s;
    elements.shadowColorLightness.value = hsl.l;
    updateRange(elements.shadowColorHue, elements.shadowColorHueValue, "°");
    updateRange(
      elements.shadowColorSaturation,
      elements.shadowColorSaturationValue,
      "%"
    );
    updateRange(
      elements.shadowColorLightness,
      elements.shadowColorLightnessValue,
      "%"
    );
    elements.shadowColorSaturation.style.background =
      "linear-gradient(90deg, hsl(" +
      hsl.h +
      ", 0%, " +
      hsl.l +
      "%), hsl(" +
      hsl.h +
      ", 100%, " +
      hsl.l +
      "%))";
    elements.shadowColorLightness.style.background =
      "linear-gradient(90deg, #000, hsl(" +
      hsl.h +
      ", " +
      hsl.s +
      "%, 50%), #fff)";
  }

  function updateColorInterface() {
    updateShadowColorInterface();
    if (!elements.colorTargetButtons || !elements.colorHexInput) {
      return;
    }
    elements.colorTargetButtons.forEach(function (button) {
      var target = button.dataset.colorTarget;
      var color = normalizeHexColor(elements[target].value) || "#000000";
      var active = target === activeColorTarget;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      var swatch = button.querySelector("[data-color-swatch]");
      if (swatch) {
        swatch.style.backgroundColor = color;
      }
      var output = elements[target + "Value"];
      if (output) {
        output.textContent = color.toUpperCase();
      }
    });

    var activeColor =
      normalizeHexColor(elements[activeColorTarget].value) || "#000000";
    var hsl = rgbToHsl(hexToRgb(activeColor));
    elements.colorEditorTargetLabel.textContent = colorTargetLabel(
      activeColorTarget
    );
    elements.colorEditorPreview.style.backgroundColor = activeColor;
    elements.colorHexInput.value = activeColor.toUpperCase();
    elements.colorHue.value = hsl.h;
    elements.colorSaturation.value = hsl.s;
    elements.colorLightness.value = hsl.l;
    updateRange(elements.colorHue, elements.colorHueValue, "°");
    updateRange(
      elements.colorSaturation,
      elements.colorSaturationValue,
      "%"
    );
    updateRange(elements.colorLightness, elements.colorLightnessValue, "%");
    elements.colorSaturation.style.background =
      "linear-gradient(90deg, hsl(" +
      hsl.h +
      ", 0%, " +
      hsl.l +
      "%), hsl(" +
      hsl.h +
      ", 100%, " +
      hsl.l +
      "%))";
    elements.colorLightness.style.background =
      "linear-gradient(90deg, #000, hsl(" +
      hsl.h +
      ", " +
      hsl.s +
      "%, 50%), #fff)";

    elements.colorPresetButtons.forEach(function (button) {
      button.style.backgroundColor = button.dataset.colorPreset;
    });
    elements.palettePresetButtons.forEach(function (button) {
      var colors = button.dataset.palette.split(",");
      button.querySelectorAll("b").forEach(function (swatch, index) {
        swatch.style.backgroundColor = colors[index] || "transparent";
      });
    });
  }

  function updateColorFromHslControls() {
    var color = rgbToHex(
      hslToRgb({
        h: Number(elements.colorHue.value),
        s: Number(elements.colorSaturation.value),
        l: Number(elements.colorLightness.value)
      })
    );
    setColorValue(activeColorTarget, color);
  }

  function updateShadowColorFromHslControls() {
    var color = rgbToHex(
      hslToRgb({
        h: Number(elements.shadowColorHue.value),
        s: Number(elements.shadowColorSaturation.value),
        l: Number(elements.shadowColorLightness.value)
      })
    );
    setColorValue("titleShadowColor", color);
  }

  function isHan(character) {
    return /[\u3400-\u9fff\uf900-\ufaff]/.test(character);
  }

  function isMostlyLatin(text) {
    var chars = splitGraphemes(text).filter(function (char) {
      return char.trim();
    });
    if (!chars.length) {
      return false;
    }
    var hanCount = chars.filter(isHan).length;
    return hanCount / chars.length < 0.35;
  }

  function getFontConfig(style, text) {
    var latin = isMostlyLatin(text);
    if (style === "rounded") {
      return {
        family: latin
          ? '"Arial Rounded MT Bold", "Trebuchet MS", "Segoe UI", sans-serif'
          : '"YouYuan", "幼圆", "Microsoft YaHei UI", "Arial Rounded MT Bold", sans-serif',
        weight: 800,
        rotationMultiplier: 0.5,
        widthJitter: 0.55,
        heightJitter: 0.55
      };
    }
    if (style === "poster") {
      return {
        family: latin
          ? '"Arial Black", Impact, "Trebuchet MS", sans-serif'
          : '"Microsoft YaHei UI", "Microsoft JhengHei", "SimHei", sans-serif',
        weight: 900,
        rotationMultiplier: 0.28,
        widthJitter: 0.25,
        heightJitter: 0.35
      };
    }
    return {
      family: latin
        ? '"LogoHandEN", "Kalam", "Segoe Print", "Trebuchet MS", sans-serif'
        : '"LogoDesignedCN", "LogoSkeletonCN", "LogoHandCN", "YouYuan", "幼圆", "Microsoft YaHei UI", sans-serif',
      weight: latin ? 700 : 400,
      rotationMultiplier: 1,
      widthJitter: latin ? 0.72 : 1,
      heightJitter: latin ? 0.72 : 1
    };
  }

  function availableTitleFontFamily(family) {
    if (!styleEngine || styleEngine.isReady() || initialFontLoadingError) {
      return family;
    }
    // The atlas is the normal title renderer. While its index is still loading,
    // avoid making Canvas start multi-megabyte fallback font downloads that may
    // never be needed. If the atlas itself fails, the original family is used.
    return String(family).replace(
      /"Logo(?:DesignedCN|SkeletonCN|HandCN|HandEN)"\s*,?\s*/g,
      ""
    );
  }

  function makeGlyphLayout(ctx, text, fontSize, options) {
    var chars = splitGraphemes(text);
    var config = getFontConfig(options.style, text);
    var template = styleEngine ? styleEngine.getTemplate(options.style) : null;
    var vectorReady = Boolean(styleEngine && styleEngine.isReady() && template);
    var random = mulberry32(options.seed);
    var amount = options.irregularity / 100;
    var latin = isMostlyLatin(text);
    var tracking = fontSize *
      (template
        ? latin
          ? template.metrics.trackingLatin
          : template.metrics.trackingHan
        : latin
          ? 0.015
          : 0.006);
    var firstVisibleFound = false;
    var visibleOrder = -1;
    var visibleIndexes = [];

    chars.forEach(function (char, index) {
      if (char.trim()) {
        visibleIndexes.push(index);
      }
    });
    var lastVisibleIndex = visibleIndexes.length
      ? visibleIndexes[visibleIndexes.length - 1]
      : -1;

    ctx.font =
      config.weight +
      " " +
      fontSize +
      "px " +
      availableTitleFontFamily(config.family);
    ctx.textBaseline = "alphabetic";

    var glyphs = chars.map(function (char, index) {
      var whitespace = !char.trim();
      if (!whitespace) {
        visibleOrder += 1;
      }
      var fontKey = vectorReady
        ? styleEngine.chooseFontKey(
            char,
            index,
            text,
            template,
            options.seed,
            options.lineIndex || 0,
            options.atlasMode
          )
        : null;
      var atlasGlyph = Boolean(
        fontKey && fontKey.indexOf("atlas:") === 0
      );
      var naturalWidth = vectorReady
        ? styleEngine.measureGlyph(char, fontSize, fontKey, template)
        : ctx.measureText(char).width;
      if (whitespace) {
        naturalWidth = Math.max(naturalWidth, fontSize * 0.28);
      }

      var widthJitter = template
        ? atlasGlyph
          ? 0.018
          : template.glyph.widthJitter
        : 0.18 * config.widthJitter;
      var heightJitter = template
        ? atlasGlyph
          ? 0.018
          : template.glyph.heightJitter
        : 0.2 * config.heightJitter;
      var rotationLimit = template
        ? atlasGlyph
          ? 0.018
          : template.glyph.rotation
        : 0.11 * config.rotationMultiplier;
      var baselineJitter = template
        ? atlasGlyph
          ? 0.012
          : template.glyph.baselineJitter
        : 0.08 * config.rotationMultiplier;

      var scaleX = whitespace
        ? 1
        : 1 + (random() - 0.5) * widthJitter * amount;
      var scaleY = whitespace
        ? 1
        : 1 + (random() - 0.45) * heightJitter * amount;
      var rotation =
        whitespace
          ? 0
          : (random() - 0.5) * rotationLimit * amount;
      var yOffset =
        whitespace
          ? 0
          : (random() - 0.5) * fontSize * baselineJitter * amount;

      if (!whitespace && !firstVisibleFound) {
        firstVisibleFound = true;
        if (template && isHan(char) && !atlasGlyph) {
          scaleX *= 1 + (template.glyph.firstScaleX - 1) * amount;
          scaleY *= 1 + (template.glyph.firstScaleY - 1) * amount;
          yOffset -= fontSize * 0.065 * amount;
        } else if (options.style === "playful" && isHan(char)) {
          scaleX += 0.2 * amount;
          scaleY += 0.38 * amount;
          yOffset -= fontSize * 0.085 * amount;
        }
      }

      if (!whitespace && template && !atlasGlyph && index === lastVisibleIndex) {
        scaleX *= 1 + (template.glyph.lastScaleX - 1) * amount;
      }
      if (!whitespace && template && !atlasGlyph && options.lineIndex === 1) {
        scaleX *= template.glyph.lineTwoScale;
      }

      var patterns =
        !whitespace && !atlasGlyph && template && template.positionPatterns
          ? template.positionPatterns[String(options.lineIndex || 0)]
          : null;
      var positionRule = patterns && patterns.length
        ? patterns[visibleOrder % patterns.length]
        : null;
      if (positionRule) {
        scaleX *= 1 + ((positionRule.scaleX || 1) - 1) * amount;
        scaleY *= 1 + ((positionRule.scaleY || 1) - 1) * amount;
        rotation += (positionRule.rotation || 0) * amount;
        yOffset += fontSize * (positionRule.y || 0) * amount;
      }

      var hasNext = index < chars.length - 1;
      var gapAfter = hasNext ? (whitespace ? tracking * 0.4 : tracking) : 0;
      var advance = naturalWidth * scaleX + gapAfter;
      return {
        char: char,
        index: index,
        fontKey: fontKey,
        naturalWidth: naturalWidth,
        scaleX: scaleX,
        scaleY: scaleY,
        rotation: rotation,
        yOffset: yOffset,
        advance: advance,
        whitespace: whitespace,
        warpAmount: amount,
        seed: options.seed
      };
    });

    var totalWidth = glyphs.reduce(function (sum, glyph) {
      return sum + glyph.advance;
    }, 0);

    return {
      text: text,
      glyphs: glyphs,
      totalWidth: totalWidth,
      fontSize: fontSize,
      config: config,
      tracking: tracking,
      template: template,
      lineId: options.lineId || "",
      lineIndex: options.lineIndex || 0
    };
  }

  function prepareGlyphLine(ctx, text, y, maxWidth, maxFontSize, options) {
    var low = 8;
    var high = maxFontSize;
    var best = makeGlyphLayout(ctx, text, low, options);

    for (var i = 0; i < 18; i += 1) {
      var middle = (low + high) / 2;
      var candidate = makeGlyphLayout(ctx, text, middle, options);
      if (candidate.totalWidth <= maxWidth) {
        best = candidate;
        low = middle;
      } else {
        high = middle;
      }
    }

    best.y = y;
    best.maxWidth = maxWidth;
    best.left = -best.totalWidth / 2;
    best.right = best.totalWidth / 2;
    best.top = y - best.fontSize * 1.04;
    best.bottom = y + best.fontSize * 0.28;
    return best;
  }

  function measureSubtitleLayout(ctx, text) {
    var characters = splitGraphemes(text);
    var prefix = "";
    var prefixWidth = 0;
    var glyphs = characters.map(function (character, index) {
      prefix += character;
      var nextWidth = ctx.measureText(prefix).width;
      var glyphWidth = ctx.measureText(character).width;
      var glyph = {
        char: character,
        index: index,
        offset: nextWidth - glyphWidth,
        width: glyphWidth,
        advance: nextWidth - prefixWidth,
        whitespace: !character.trim()
      };
      prefixWidth = nextWidth;
      return glyph;
    });
    return {
      glyphs: glyphs,
      totalWidth: prefixWidth
    };
  }

  function prepareSubtitle(
    ctx,
    text,
    y,
    maxWidth,
    maxFontSize
  ) {
    var family =
      '"LogoScriptEN", "Princess Sofia", "Segoe Print", "Bradley Hand ITC", "Comic Sans MS", "KaiTi", "楷体", cursive';
    var latin = isMostlyLatin(text);
    var weight = latin ? 400 : 600;
    var low = 8;
    var high = maxFontSize;
    var bestSize = low;
    var bestWidth = 0;
    var bestLayout = null;

    for (var i = 0; i < 18; i += 1) {
      var middle = (low + high) / 2;
      ctx.font = weight + " " + middle + "px " + family;
      var layout = measureSubtitleLayout(ctx, text);
      var width = layout.totalWidth;
      if (width <= maxWidth) {
        bestSize = middle;
        bestWidth = width;
        bestLayout = layout;
        low = middle;
      } else {
        high = middle;
      }
    }

    ctx.font = weight + " " + bestSize + "px " + family;
    bestLayout = measureSubtitleLayout(ctx, text);
    bestWidth = bestLayout.totalWidth;
    return {
      text: text,
      y: y,
      fontSize: bestSize,
      totalWidth: bestWidth,
      left: -bestWidth / 2,
      right: bestWidth / 2,
      top: y - bestSize * 1.05,
      bottom: y + bestSize * 0.48,
      family: family,
      weight: weight,
      tracking: 0,
      glyphs: bestLayout.glyphs,
      lineId: "text-subtitle"
    };
  }

  function globalRect(line, centerX, padding) {
    return {
      left: centerX + line.left - padding,
      right: centerX + line.right + padding,
      top: line.top - padding,
      bottom: line.bottom + padding
    };
  }

  function measureArtworkBounds(titleLines, subtitle, width, height) {
    var items = titleLines.slice();
    if (subtitle) {
      items.push(subtitle);
    }
    if (!items.length) {
      return null;
    }

    var centerX = width / 2;
    var base = Math.min(width, height);
    var paddingX = base * 0.035;
    var paddingY = base * 0.03;
    return {
      left:
        items.reduce(function (lowest, item) {
          return Math.min(lowest, centerX + item.left);
        }, width) - paddingX,
      right:
        items.reduce(function (highest, item) {
          return Math.max(highest, centerX + item.right);
        }, 0) + paddingX,
      top:
        items.reduce(function (highest, item) {
          return Math.min(highest, item.top);
        }, height) - paddingY,
      bottom:
        items.reduce(function (lowest, item) {
          return Math.max(lowest, item.bottom);
        }, 0) + paddingY
    };
  }

  function pointTouchesRect(x, y, radius, rect) {
    return !(
      x + radius < rect.left ||
      x - radius > rect.right ||
      y + radius < rect.top ||
      y - radius > rect.bottom
    );
  }

  function drawStar(ctx, x, y, outerRadius, color, points, outlined, rotation) {
    var innerRadius = outerRadius * (points === 5 ? 0.44 : 0.52);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation || -Math.PI / 2);
    ctx.beginPath();
    for (var i = 0; i < points * 2; i += 1) {
      var radius = i % 2 === 0 ? outerRadius : innerRadius;
      var angle = (Math.PI * i) / points;
      var px = Math.cos(angle) * radius;
      var py = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.lineJoin = "round";
    if (outlined) {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, outerRadius * 0.13);
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSparkle(ctx, x, y, radius, color, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation || 0);
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.quadraticCurveTo(radius * 0.18, -radius * 0.18, radius, 0);
    ctx.quadraticCurveTo(radius * 0.18, radius * 0.18, 0, radius);
    ctx.quadraticCurveTo(-radius * 0.18, radius * 0.18, -radius, 0);
    ctx.quadraticCurveTo(-radius * 0.18, -radius * 0.18, 0, -radius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawRing(ctx, x, y, radius, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, radius * 0.16);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + radius * 0.08, y - radius * 0.03, radius * 0.35, 0, Math.PI * 1.72);
    ctx.stroke();
    ctx.restore();
  }

  function drawDotCluster(ctx, x, y, radius, color, random) {
    ctx.save();
    ctx.fillStyle = color;
    for (var i = 0; i < 4; i += 1) {
      var angle = random() * Math.PI * 2;
      var distance = radius * (0.28 + random() * 0.85);
      var dotRadius = radius * (0.07 + random() * 0.08);
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        dotRadius,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRandomizedStars(
    ctx,
    width,
    height,
    exclusionRects,
    seed,
    requestedCount
  ) {
    var count = clamp(Math.round(Number(requestedCount) || 0), 0, 60);
    if (!count) {
      return;
    }

    var random = mulberry32((seed >>> 0) ^ 0xa71f23d);
    var base = Math.min(width, height);
    var palette = [
      state.primaryColor,
      state.skyColor,
      state.accentColor,
      mixColor(state.primaryColor, "#ffffff", 0.38)
    ];
    var placed = [];
    var minimumGap = base * (count > 44 ? 0.004 : 0.009);

    for (var index = 0; index < count; index += 1) {
      var point = null;
      for (var attempt = 0; attempt < 90; attempt += 1) {
        var x = width * (0.025 + random() * 0.95);
        var y = height * (0.045 + random() * 0.79);
        var radius = base * (0.007 + Math.pow(random(), 2) * 0.031);
        if ((x < width * 0.16 || x > width * 0.84) && random() > 0.58) {
          radius *= 1.2;
        }
        var blockedByText = exclusionRects.some(function (rect) {
          return pointTouchesRect(x, y, radius * 1.35, rect);
        });
        var blockedByStar = placed.some(function (placedPoint) {
          return (
            Math.hypot(x - placedPoint.x, y - placedPoint.y) <
            radius + placedPoint.radius + minimumGap
          );
        });
        if (!blockedByText && !blockedByStar) {
          point = { x: x, y: y, radius: radius };
          break;
        }
      }
      if (!point) {
        for (var fallbackAttempt = 0; fallbackAttempt < 120; fallbackAttempt += 1) {
          var fallbackX = width * (0.02 + random() * 0.96);
          var fallbackY = height * (0.04 + random() * 0.8);
          var fallbackRadius = base * (0.006 + random() * 0.012);
          var fallbackBlocked = exclusionRects.some(function (rect) {
            return pointTouchesRect(
              fallbackX,
              fallbackY,
              fallbackRadius * 1.2,
              rect
            );
          });
          if (!fallbackBlocked) {
            point = {
              x: fallbackX,
              y: fallbackY,
              radius: fallbackRadius
            };
            break;
          }
        }
      }
      if (!point) {
        point = {
          x: width * (0.04 + random() * 0.92),
          y: height * (0.04 + random() * 0.8),
          radius: base * 0.006
        };
      }

      placed.push(point);
      var color = palette[Math.floor(random() * palette.length)];
      var type = random();
      var rotation = random() * Math.PI * 2;
      if (type < 0.42) {
        drawStar(
          ctx,
          point.x,
          point.y,
          point.radius,
          color,
          random() > 0.32 ? 5 : 6,
          random() > 0.68,
          rotation
        );
      } else if (type < 0.72) {
        drawSparkle(
          ctx,
          point.x,
          point.y,
          point.radius * 0.9,
          color,
          rotation
        );
      } else if (type < 0.86) {
        drawRing(ctx, point.x, point.y, point.radius * 0.75, color);
      } else {
        drawDotCluster(
          ctx,
          point.x,
          point.y,
          point.radius * 1.05,
          color,
          random
        );
      }
    }
  }

  function drawSideCurl(ctx, x, y, size, direction, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(direction, 1);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2.2, size * 0.065);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-size, size * 0.1);
    ctx.bezierCurveTo(
      -size * 0.52,
      size * 0.72,
      size * 0.4,
      size * 0.55,
      size * 0.23,
      size * 0.02
    );
    ctx.bezierCurveTo(
      size * 0.12,
      -size * 0.34,
      -size * 0.35,
      -size * 0.2,
      -size * 0.12,
      size * 0.08
    );
    ctx.stroke();
    ctx.restore();
  }

  function drawJPatternDecorations(ctx, width, height, seed) {
    var random = mulberry32((seed >>> 0) ^ 0x6cc918);
    var base = Math.min(width, height);
    var color = mixColor(state.primaryColor, "#00101d", 0.08);
    var leftSize = base * (0.078 + random() * 0.025);
    var rightSize = base * (0.078 + random() * 0.025);
    drawSideCurl(
      ctx,
      width * (0.09 + random() * 0.045),
      height * (0.56 + random() * 0.15),
      leftSize,
      1,
      color
    );
    drawSideCurl(
      ctx,
      width * (0.91 - random() * 0.045),
      height * (0.56 + random() * 0.15),
      rightSize,
      -1,
      color
    );
  }

  function drawGlyphLine(ctx, line, centerX, options) {
    options = options || {};
    var shadowPass = Boolean(options.shadowPass);
    var x = centerX - line.totalWidth / 2;
    var titleInk = shadowPass ? state.titleShadowColor : state.primaryColor;
    var outlineColor = mixColor(state.skyColor, "#ffffff", 0.75);
    var useVector = Boolean(
      styleEngine &&
        styleEngine.isReady() &&
        line.template &&
        line.template.vector
    );

    ctx.save();
    if (shadowPass) {
      ctx.globalAlpha = clamp(state.titleShadowOpacity / 100, 0, 1);
      var shadowBlur = Math.max(0, state.titleShadowBlur) * (options.pixelScale || 1);
      ctx.filter = shadowBlur > 0 ? "blur(" + shadowBlur + "px)" : "none";
    }

    ctx.font =
      line.config.weight +
      " " +
      line.fontSize +
      "px " +
      availableTitleFontFamily(line.config.family);
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    line.glyphs.forEach(function (glyph) {
      if (glyph.whitespace) {
        x += glyph.advance;
        return;
      }

      var glyphWidth = glyph.naturalWidth * glyph.scaleX;
      var adjustment = glyphAdjustmentFor(
        line.lineId,
        glyph.index,
        glyph.char
      );
      var adjustmentScale = adjustment.scale / 100;
      ctx.save();
      ctx.translate(
        x + glyphWidth / 2 + line.fontSize * (adjustment.x / 100),
        line.y +
          glyph.yOffset +
          line.fontSize * (adjustment.y / 100) +
          (shadowPass ? state.titleShadowOffsetY : 0)
      );
      ctx.rotate(glyph.rotation + (adjustment.rotation * Math.PI) / 180);
      ctx.scale(
        glyph.scaleX * adjustmentScale,
        glyph.scaleY * adjustmentScale
      );
      ctx.textAlign = "left";

      var vectorDrawn = useVector
        ? styleEngine.drawGlyph(ctx, glyph, {
            template: line.template,
            fontSize: line.fontSize,
            outline: shadowPass ? false : state.outline,
            outlineColor: rgba(outlineColor, 0.96),
            fillStyle: titleInk,
            solidColor: titleInk
          })
        : false;
      var atlasState =
        useVector &&
        glyph.fontKey &&
        glyph.fontKey.indexOf("atlas:") === 0 &&
        styleEngine.atlasGlyphState
          ? styleEngine.atlasGlyphState(glyph.fontKey)
          : "unavailable";
      var waitingForAtlas = atlasState === "idle" || atlasState === "loading";

      if (!vectorDrawn && !waitingForAtlas) {
        if (!shadowPass && state.outline) {
          ctx.strokeStyle = rgba(outlineColor, 0.95);
          ctx.lineWidth = Math.max(2.1, line.fontSize * 0.014);
          ctx.strokeText(glyph.char, -glyph.naturalWidth / 2, 0);
        }

        ctx.fillStyle = titleInk;
        ctx.fillText(glyph.char, -glyph.naturalWidth / 2, 0);
      }
      ctx.restore();
      x += glyph.advance;
    });
    ctx.restore();
  }

  function glyphAnchors(line, centerX) {
    var x = centerX - line.totalWidth / 2;
    var anchors = [];
    line.glyphs.forEach(function (glyph) {
      if (!glyph.whitespace) {
        var width = glyph.naturalWidth * glyph.scaleX;
        anchors.push({
          glyph: glyph,
          left: x,
          right: x + width,
          center: x + width / 2,
          top: line.y - line.fontSize * glyph.scaleY * 0.9 + glyph.yOffset,
          baseline: line.y + glyph.yOffset,
          bottom: line.y + line.fontSize * glyph.scaleY * 0.18 + glyph.yOffset
        });
      }
      x += glyph.advance;
    });
    return anchors;
  }

  function drawFlowerBadge(ctx, x, y, radius, color, outlineColor, rotation) {
    ctx.save();
    drawStar(ctx, x, y, radius * 1.13, outlineColor, 6, false, rotation);
    drawStar(ctx, x, y, radius, color, 6, false, rotation);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.29, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAttachedGlyphGrammar(ctx, line, centerX, lineIndex) {
    var template = line.template;
    if (
      !template ||
      !template.attachments ||
      !template.attachments.enabled ||
      !template.attachments.topFlowers
    ) {
      return;
    }

    var anchors = glyphAnchors(line, centerX);
    if (!anchors.length) {
      return;
    }

    var amount = state.irregularity / 100;
    var size = line.fontSize;
    var main = state.primaryColor;
    var outlineColor = mixColor(state.skyColor, "#ffffff", 0.76);
    if (amount > 0.3 && anchors.length > 2) {
      var primaryIndex = lineIndex === 0
        ? Math.min(anchors.length - 2, Math.max(1, Math.floor(anchors.length * 0.66)))
        : Math.min(anchors.length - 1, Math.max(1, Math.floor(anchors.length * 0.3)));
      var primaryAnchor = anchors[primaryIndex];
      drawFlowerBadge(
        ctx,
        primaryAnchor.center + size * 0.04,
        primaryAnchor.top - size * 0.075,
        size * (lineIndex === 0 ? 0.115 : 0.105),
        main,
        outlineColor,
        -0.12
      );

      if (lineIndex > 0 && anchors.length > 4 && amount > 0.56) {
        var secondaryAnchor = anchors[Math.min(anchors.length - 2, Math.floor(anchors.length * 0.74))];
        drawFlowerBadge(
          ctx,
          secondaryAnchor.center + size * 0.16,
          secondaryAnchor.top + size * 0.13,
          size * 0.083,
          main,
          outlineColor,
          0.17
        );
      }
    }
  }

  function drawSubtitle(ctx, subtitle, centerX) {
    var color = mixColor(state.primaryColor, "#00101d", 0.11);
    var adjustedGlyphs = (subtitle.glyphs || []).filter(function (glyph) {
      return !glyph.whitespace && !glyphAdjustmentIsNeutral(
        glyphAdjustmentFor(subtitle.lineId, glyph.index, glyph.char)
      );
    });
    var useAdjustedGlyphs = adjustedGlyphs.length > 0;
    ctx.save();
    ctx.font =
      subtitle.weight + " " + subtitle.fontSize + "px " + subtitle.family;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    ctx.lineJoin = "round";

    function drawAdjustedGlyphs() {
      var startX = centerX - subtitle.totalWidth / 2;
      subtitle.glyphs.forEach(function (glyph) {
        if (glyph.whitespace) {
          return;
        }
        var adjustment = glyphAdjustmentFor(
          subtitle.lineId,
          glyph.index,
          glyph.char
        );
        var adjustmentScale = adjustment.scale / 100;
        ctx.save();
        ctx.translate(
          startX +
            glyph.offset +
            glyph.width / 2 +
            subtitle.fontSize * (adjustment.x / 100),
          subtitle.y + subtitle.fontSize * (adjustment.y / 100)
        );
        ctx.rotate((adjustment.rotation * Math.PI) / 180);
        ctx.scale(adjustmentScale, adjustmentScale);
        if (state.outline) {
          ctx.strokeText(glyph.char, 0, 0);
        }
        ctx.fillText(glyph.char, 0, 0);
        ctx.restore();
      });
    }

    ctx.strokeStyle = rgba(mixColor(state.skyColor, "#ffffff", 0.83), 0.86);
    ctx.lineWidth = Math.max(1.3, subtitle.fontSize * 0.024);
    ctx.fillStyle = color;
    if (useAdjustedGlyphs) {
      drawAdjustedGlyphs();
    } else {
      if (state.outline) {
        ctx.strokeText(subtitle.text, centerX, subtitle.y);
      }
      ctx.fillText(subtitle.text, centerX, subtitle.y);
    }
    ctx.restore();
  }

  function drawSubtitleFlourish(ctx, subtitle, centerX, width, seed) {
    var random = mulberry32(seed ^ 0x51e1d5);
    var start = centerX + subtitle.left;
    var end = centerX + subtitle.right;
    var y = subtitle.y;
    var size = subtitle.fontSize;
    var color = state.primaryColor;

    drawSparkle(
      ctx,
      start - size * 0.55,
      y - size * 0.24,
      size * 0.24,
      color,
      random() * 0.4
    );
    drawSparkle(
      ctx,
      end + size * 0.57,
      y - size * 0.22,
      size * 0.2,
      color,
      random() * 0.4
    );

    ctx.save();
    ctx.strokeStyle = rgba(color, 0.82);
    ctx.lineWidth = Math.max(1.6, size * 0.032);
    ctx.lineCap = "round";
    ctx.beginPath();
    var underlineStart = start + subtitle.totalWidth * 0.34;
    var underlineEnd = Math.min(end - subtitle.totalWidth * 0.05, width * 0.86);
    ctx.moveTo(underlineStart, y + size * 0.36);
    ctx.bezierCurveTo(
      underlineStart + (underlineEnd - underlineStart) * 0.27,
      y + size * 0.46,
      underlineStart + (underlineEnd - underlineStart) * 0.73,
      y + size * 0.46,
      underlineEnd,
      y + size * 0.29
    );
    ctx.stroke();
    ctx.restore();

    drawDotCluster(
      ctx,
      start - size * 0.08,
      y + size * 0.38,
      size * 0.26,
      state.skyColor,
      random
    );
  }

  function textLayoutBounds(layout, kind, width, height) {
    var base = Math.min(width, height);
    var paddingX = base * (kind === "subtitle" ? 0.024 : 0.04);
    var paddingY = base * (kind === "subtitle" ? 0.022 : 0.035);
    return {
      left: layout.left - paddingX,
      right: layout.right + paddingX,
      top: layout.top - paddingY,
      bottom: layout.bottom + paddingY
    };
  }

  function geometryAxisAlignedRect(geometry, padding) {
    var radians = (geometry.angle * Math.PI) / 180;
    var halfWidth =
      (Math.abs(Math.cos(radians)) * geometry.width +
        Math.abs(Math.sin(radians)) * geometry.height) /
      2;
    var halfHeight =
      (Math.abs(Math.sin(radians)) * geometry.width +
        Math.abs(Math.cos(radians)) * geometry.height) /
      2;
    return {
      left: geometry.centerX - halfWidth - padding,
      right: geometry.centerX + halfWidth + padding,
      top: geometry.centerY - halfHeight - padding,
      bottom: geometry.centerY + halfHeight + padding
    };
  }

  function movePreparedTextLayout(layout, nextY) {
    if (!layout) {
      return;
    }
    var delta = nextY - layout.y;
    layout.y += delta;
    layout.top += delta;
    layout.bottom += delta;
  }

  function arrangeGroupedTextLayouts(textLayouts, width, height) {
    var line1Entry = textLayouts["text-line-1"] || null;
    var line2Entry = textLayouts["text-line-2"] || null;
    var subtitleEntry = textLayouts["text-subtitle"] || null;
    var titleEntries = [line1Entry, line2Entry].filter(Boolean);
    var referenceRatio = width / height >= 1.98;

    if (line1Entry && line2Entry) {
      var firstLineY =
        height *
        (subtitleEntry
          ? referenceRatio
            ? 0.36
            : 0.33
          : referenceRatio
            ? 0.42
            : 0.38);
      var secondLineY =
        height *
        (subtitleEntry
          ? referenceRatio
            ? 0.69
            : 0.63
          : referenceRatio
            ? 0.73
            : 0.67);
      var lineMidpoint = (firstLineY + secondLineY) / 2;
      var responsiveLineGap = Math.min(
        secondLineY - firstLineY,
        width * 0.18
      );
      var scaledHalfGap =
        (responsiveLineGap / 2) *
        clamp(state.lineGap / 100, 0, 2.2);
      movePreparedTextLayout(
        line1Entry.layout,
        lineMidpoint - scaledHalfGap
      );
      movePreparedTextLayout(
        line2Entry.layout,
        lineMidpoint + scaledHalfGap
      );
    } else if (titleEntries.length) {
      movePreparedTextLayout(
        titleEntries[0].layout,
        height * (subtitleEntry ? 0.5 : 0.55)
      );
    }

    if (subtitleEntry) {
      if (titleEntries.length) {
        var titleBottom = titleEntries.reduce(function (lowest, entry) {
          return Math.max(lowest, entry.layout.bottom);
        }, 0);
        var subtitleGapUnit = Math.min(width, height);
        var subtitleGapScale = clamp(state.subtitleGap / 100, -1.5, 4);
        var minimumSubtitleGap = -subtitleGapUnit * 0.03;
        var subtitleGapStep = subtitleGapUnit * 0.04;
        var effectiveSubtitleGap =
          minimumSubtitleGap + subtitleGapStep * subtitleGapScale;
        var defaultSubtitleGap = minimumSubtitleGap + subtitleGapStep;
        var titleShift = -(effectiveSubtitleGap - defaultSubtitleGap) / 2;
        titleEntries.forEach(function (entry) {
          movePreparedTextLayout(
            entry.layout,
            entry.layout.y + titleShift
          );
        });
        movePreparedTextLayout(
          subtitleEntry.layout,
          titleBottom + titleShift + effectiveSubtitleGap +
            subtitleEntry.layout.fontSize * 1.05
        );
      } else {
        movePreparedTextLayout(subtitleEntry.layout, height * 0.56);
      }
    }

    Object.keys(textLayouts).forEach(function (layerId) {
      var entry = textLayouts[layerId];
      entry.bounds = textLayoutBounds(
        entry.layout,
        entry.kind,
        width,
        height
      );
    });

    var titleLayouts = titleEntries.map(function (entry) {
      return entry.layout;
    });
    var subtitleLayout = subtitleEntry ? subtitleEntry.layout : null;
    var groupBounds = measureArtworkBounds(
      titleLayouts,
      subtitleLayout,
      width,
      height
    );
    var exclusionRects = Object.keys(textLayouts).map(function (layerId) {
      var entry = textLayouts[layerId];
      return globalRect(
        entry.layout,
        width / 2,
        Math.min(width, height) * (entry.kind === "subtitle" ? 0.01 : 0.014)
      );
    });

    return {
      titleLayouts: titleLayouts,
      subtitle: subtitleLayout,
      bounds: groupBounds,
      exclusionRects: exclusionRects
    };
  }

  function drawGroupedTextEntry(ctx, width, entry, pixelScale) {
    if (!entry) {
      return;
    }
    if (entry.kind === "subtitle") {
      drawSubtitle(ctx, entry.layout, width / 2);
      drawSubtitleFlourish(
        ctx,
        entry.layout,
        width / 2,
        width,
        entry.seed
      );
      return;
    }
    if (state.titleShadowEnabled && state.titleShadowOpacity > 0) {
      drawGlyphLine(ctx, entry.layout, width / 2, {
        shadowPass: true,
        pixelScale: pixelScale
      });
    }
    drawGlyphLine(ctx, entry.layout, width / 2);
    drawAttachedGlyphGrammar(
      ctx,
      entry.layout,
      width / 2,
      entry.layout.lineIndex
    );
  }

  function drawLetteringGroupLayer(
    ctx,
    width,
    height,
    layer,
    textLayouts,
    groupLayout,
    pixelScale
  ) {
    if (!layer || !groupLayout) {
      return;
    }
    ctx.save();
    ctx.globalAlpha = clamp(
      (Number.isFinite(layer.opacity) ? layer.opacity : 100) / 100,
      0,
      1
    );
    applyLetteringGroupTransform(ctx, width, height, layer);
    drawRandomizedStars(
      ctx,
      width,
      height,
      groupLayout.exclusionRects,
      layer.layoutSeed,
      layer.starCount
    );
    if (layer.showJDecorations !== false) {
      drawJPatternDecorations(ctx, width, height, layer.layoutSeed);
    }
    ["text-subtitle", "text-line-2", "text-line-1"].forEach(function (layerId) {
      drawGroupedTextEntry(ctx, width, textLayouts[layerId], pixelScale);
    });
    ctx.restore();
  }

  function drawIndependentTextLayer(
    ctx,
    width,
    height,
    layer,
    entry,
    pixelScale
  ) {
    if (!entry) {
      return;
    }
    ctx.save();
    ctx.globalAlpha = clamp(
      (Number.isFinite(layer.opacity) ? layer.opacity : 100) / 100,
      0,
      1
    );
    applyTextLayerTransform(ctx, width, height, layer, entry);

    if (entry.kind === "subtitle") {
      drawSubtitle(ctx, entry.layout, 0);
      drawSubtitleFlourish(
        ctx,
        entry.layout,
        0,
        width,
        entry.seed
      );
      ctx.restore();
      return;
    }

    if (state.titleShadowEnabled && state.titleShadowOpacity > 0) {
      drawGlyphLine(ctx, entry.layout, 0, {
        shadowPass: true,
        pixelScale: pixelScale
      });
    }
    drawGlyphLine(ctx, entry.layout, 0);
    drawAttachedGlyphGrammar(
      ctx,
      entry.layout,
      0,
      layer.lineIndex
    );
    ctx.restore();
  }

  function drawGeneratedDecorationLayer(
    ctx,
    width,
    height,
    layer,
    exclusionRects
  ) {
    var scale = clamp(layer.scale / 100, 0.2, 2.4);
    var layoutSeed = Number.isFinite(layer.layoutSeed)
      ? layer.layoutSeed >>> 0
      : decorationLayerDefinition.layoutSeed;
    ctx.save();
    ctx.globalAlpha = clamp(
      (Number.isFinite(layer.opacity) ? layer.opacity : 100) / 100,
      0,
      1
    );
    ctx.translate(width * (layer.x / 100), height * (layer.y / 100));
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);
    drawRandomizedStars(
      ctx,
      width,
      height,
      exclusionRects,
      layoutSeed,
      layer.starCount
    );
    if (layer.showJDecorations !== false) {
      drawJPatternDecorations(
        ctx,
        width,
        height,
        layoutSeed
      );
    }
    ctx.restore();
  }

  function renderArtwork(canvas, scale, options) {
    var dimensions = dimensionsFromValue(state.canvasSize);
    var width = dimensions.width;
    var height = dimensions.height;
    var pixelScale = scale || 1;
    var renderTime =
      options && options.time != null ? options.time : performance.now();
    var forcedLayerImages =
      options && options.layerImages ? options.layerImages : null;

    canvas.width = Math.round(width * pixelScale);
    canvas.height = Math.round(height * pixelScale);
    if (canvas === elements.canvas) {
      canvas.style.aspectRatio = width + " / " + height;
    }

    var ctx = null;
    try {
      ctx = canvas.getContext("2d", { alpha: true });
    } catch (error) {
      ctx = canvas.getContext("2d");
    }
    if (!ctx) {
      throw new Error("Canvas 2D context is unavailable");
    }
    ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (state.backgroundMode === "light" || state.backgroundMode === "dark") {
      ctx.fillStyle = state.backgroundMode === "light" ? "#ffffff" : "#172129";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    var line1Text = state.line1.trim();
    var line2Text = state.line2.trim();
    var subtitleText = state.subtitle.trim();
    var referenceRatio = width / height >= 1.98;
    var activeTemplate = styleEngine
      ? styleEngine.getTemplate(state.fontStyle)
      : null;
    var runtimeAtlasMode = Boolean(
      activeTemplate && activeTemplate.atlasEnabled
    );
    var textLayouts = Object.create(null);

    if (line1Text) {
      var line1Seed = (state.seed + hashString(line1Text)) ^ 0x119abc;
      var line1Layout = prepareGlyphLine(
        ctx,
        line1Text,
        0,
        width * 0.82,
        Math.min(
          height * (referenceRatio ? 0.32 : 0.235),
          width * (referenceRatio ? 0.22 : 0.17)
        ),
        {
          style: state.fontStyle,
          irregularity: state.irregularity,
          seed: line1Seed,
          lineId: "text-line-1",
          lineIndex: 0,
          atlasMode: runtimeAtlasMode
        }
      );
      textLayouts["text-line-1"] = {
        kind: "title",
        layout: line1Layout,
        bounds: textLayoutBounds(line1Layout, "title", width, height),
        seed: line1Seed
      };
    }

    if (line2Text) {
      var line2Seed = (state.seed + hashString(line2Text)) ^ 0x7a013f;
      var line2Layout = prepareGlyphLine(
        ctx,
        line2Text,
        0,
        width * 0.7,
        Math.min(
          height * (referenceRatio ? 0.37 : 0.285),
          width * (referenceRatio ? 0.23 : 0.205)
        ),
        {
          style: state.fontStyle,
          irregularity: state.irregularity,
          seed: line2Seed,
          lineId: "text-line-2",
          lineIndex: 1,
          atlasMode: runtimeAtlasMode
        }
      );
      textLayouts["text-line-2"] = {
        kind: "title",
        layout: line2Layout,
        bounds: textLayoutBounds(line2Layout, "title", width, height),
        seed: line2Seed
      };
    }

    if (subtitleText) {
      var subtitleLayout = prepareSubtitle(
        ctx,
        subtitleText,
        0,
        width * 0.76,
        Math.min(
          height * (referenceRatio ? 0.11 : 0.098),
          width * 0.063
        )
      );
      textLayouts["text-subtitle"] = {
        kind: "subtitle",
        layout: subtitleLayout,
        bounds: textLayoutBounds(subtitleLayout, "subtitle", width, height),
        seed: (state.seed + hashString(subtitleText)) ^ 0x51e1d5
      };
    }

    var groupLayer = getLayer("lettering-group");
    var groupedMode = Boolean(
      isLetteringGroupLayer(groupLayer) && !state.advancedLayerMode
    );
    var groupLayout = groupedMode
      ? arrangeGroupedTextLayouts(textLayouts, width, height)
      : null;
    if (
      groupLayout &&
      !groupLayout.bounds &&
      decorationLayerHasContent(groupLayer)
    ) {
      groupLayout.bounds = {
        left: width * 0.08,
        right: width * 0.92,
        top: height * 0.08,
        bottom: height * 0.86
      };
    }
    var visibleTextLayers = groupedMode
      ? []
      : layers.filter(function (layer) {
          return isTextLayer(layer) && layer.visible && textLayouts[layer.id];
        });
    var exclusionRects = groupedMode
      ? groupLayout.exclusionRects
      : visibleTextLayers.map(function (layer) {
          return geometryAxisAlignedRect(
            textLayerGeometry(layer, textLayouts[layer.id], width, height),
            Math.min(width, height) * 0.012
          );
        });
    function drawCompositionLayer(layer) {
      if (!layer.visible) {
        return;
      }
      if (isImageLayer(layer)) {
        drawOverlayImage(
          ctx,
          width,
          height,
          imageForLayer(layer, renderTime, forcedLayerImages),
          layer
        );
      } else if (isLetteringGroupLayer(layer)) {
        drawLetteringGroupLayer(
          ctx,
          width,
          height,
          layer,
          textLayouts,
          groupLayout,
          pixelScale
        );
      } else if (isTextLayer(layer)) {
        drawIndependentTextLayer(
          ctx,
          width,
          height,
          layer,
          textLayouts[layer.id],
          pixelScale
        );
      } else if (isDecorationLayer(layer)) {
        drawGeneratedDecorationLayer(
          ctx,
          width,
          height,
          layer,
          exclusionRects
        );
      }
    }

    layers.forEach(drawCompositionLayer);

    var groupVisible = Boolean(groupedMode && groupLayer.visible);
    var activeTitleLayouts = groupedMode
      ? groupVisible
        ? groupLayout.titleLayouts
        : []
      : visibleTextLayers
          .filter(function (layer) {
            return layer.textKey !== "subtitle";
          })
          .map(function (layer) {
            return textLayouts[layer.id].layout;
          });
    var activeSubtitleLayer = getLayer("text-subtitle");
    var activeSubtitle = groupedMode
      ? groupVisible
        ? groupLayout.subtitle
        : null
      : activeSubtitleLayer &&
          activeSubtitleLayer.visible &&
          textLayouts[activeSubtitleLayer.id]
        ? textLayouts[activeSubtitleLayer.id].layout
        : null;
    var artworkBounds = groupedMode
      ? groupLayout.bounds
      : exclusionRects.length
        ? {
            left: Math.min.apply(
              null,
              exclusionRects.map(function (rect) {
                return rect.left;
              })
            ),
            right: Math.max.apply(
              null,
              exclusionRects.map(function (rect) {
                return rect.right;
              })
            ),
            top: Math.min.apply(
              null,
              exclusionRects.map(function (rect) {
                return rect.top;
              })
            ),
            bottom: Math.max.apply(
              null,
              exclusionRects.map(function (rect) {
                return rect.bottom;
              })
            )
          }
        : null;
    var groupHasContent = Boolean(
      groupVisible &&
        (Object.keys(textLayouts).length || decorationLayerHasContent(groupLayer))
    );

    return {
      width: width,
      height: height,
      lines: activeTitleLayouts,
      subtitle: activeSubtitle,
      textLayouts: textLayouts,
      artworkBounds: artworkBounds,
      groupBounds: groupedMode ? groupLayout.bounds : null,
      isEmpty:
        !groupHasContent &&
        !visibleTextLayers.length &&
        !layers.some(function (layer) {
          return decorationLayerHasContent(layer) && layer.visible;
        }) &&
        !getImageLayers().some(function (layer) {
          return layer.visible && imageForLayer(layer, renderTime, forcedLayerImages);
        })
    };
  }

  function readStateFromControls() {
    state.line1 = elements.line1.value;
    state.line2 = elements.line2.value;
    state.subtitle = elements.subtitle.value;
    state.advancedLayerMode = elements.advancedLayerMode.checked;
    state.lineGap = Number(elements.selectedGroupLineGap.value);
    state.subtitleGap = Number(elements.selectedGroupSubtitleGap.value);
    state.canvasSize = elements.canvasSize.value;
    state.artworkScale = Number(elements.artworkScale.value);
    state.artworkX = Number(elements.artworkX.value);
    state.artworkY = Number(elements.artworkY.value);
    state.artworkRotation = Number(elements.artworkRotation.value);
    state.outline = elements.outline.checked;
    state.titleShadowEnabled = elements.titleShadowEnabled.checked;
    state.titleShadowColor = elements.titleShadowColor.value;
    state.titleShadowOpacity = Number(elements.titleShadowOpacity.value);
    state.titleShadowOffsetY = Number(elements.titleShadowOffsetY.value);
    state.titleShadowBlur = Number(elements.titleShadowBlur.value);
    state.primaryColor = elements.primaryColor.value;
    state.accentColor = elements.accentColor.value;
    state.skyColor = elements.skyColor.value;
    state.overlayScale = Number(elements.overlayScale.value);
    state.overlayX = Number(elements.overlayX.value);
    state.overlayY = Number(elements.overlayY.value);
    state.overlayRotation = Number(elements.overlayRotation.value);
    state.overlayOpacity = Number(elements.overlayOpacity.value);
    state.overlayLayer = elements.overlayLayer.value;
    state.exportScale = Number(elements.exportScale.value);
    state.gifQuality = elements.gifQuality.value;
    syncActiveLayerFromControls();
  }

  function gifQualitySettings(value) {
    if (value === "compact") {
      return { maxSide: 640, maxColors: 64, label: "轻巧" };
    }
    if (value === "high") {
      return { maxSide: 1024, maxColors: 256, label: "高清" };
    }
    return { maxSide: 800, maxColors: 128, label: "推荐" };
  }

  function gifOutputDimensions() {
    var dimensions = dimensionsFromValue(state.canvasSize);
    var settings = gifQualitySettings(state.gifQuality);
    var scale = Math.min(
      1,
      settings.maxSide / Math.max(dimensions.width, dimensions.height)
    );
    return {
      width: Math.max(1, Math.round(dimensions.width * scale)),
      height: Math.max(1, Math.round(dimensions.height * scale)),
      scale: scale,
      settings: settings
    };
  }

  function updateRangeProgress(range) {
    if (!range) {
      return;
    }
    var min = Number(range.min);
    var max = Number(range.max);
    var value = Number(range.value);
    min = Number.isFinite(min) ? min : 0;
    max = Number.isFinite(max) ? max : 100;
    value = Number.isFinite(value) ? value : min;
    var progress = max === min ? 0 : ((value - min) / (max - min)) * 100;
    progress = clamp(progress, 0, 100);
    range.style.setProperty("--range-progress", progress + "%");
  }

  function updateRange(range, output, suffix) {
    updateRangeProgress(range);
    if (output) {
      output.value = range.value + (suffix == null ? "%" : suffix);
    }
  }

  function updateBackgroundInterface() {
    document.querySelectorAll(".background-button").forEach(function (button) {
      var active = button.dataset.background === state.backgroundMode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    elements.canvasFrame.classList.remove("checker", "light", "dark");
    elements.canvasFrame.classList.add(state.backgroundMode);
  }

  function updateInterface() {
    var dimensions = dimensionsFromValue(state.canvasSize);
    var exportWidth = dimensions.width * state.exportScale;
    var exportHeight = dimensions.height * state.exportScale;

    elements.line1Count.value = graphemeCount(state.line1);
    elements.line2Count.value = graphemeCount(state.line2);
    elements.subtitleCount.value = graphemeCount(state.subtitle);
    updateGlyphEditorInterface();
    updateLayerModeInterface();
    updateRange(
      elements.selectedGroupLineGap,
      elements.selectedGroupLineGapValue,
      "%"
    );
    updateRange(
      elements.selectedGroupSubtitleGap,
      elements.selectedGroupSubtitleGapValue,
      "%"
    );
    updateRange(elements.artworkScale, elements.artworkScaleValue);
    updateRange(elements.artworkX, elements.artworkXValue);
    updateRange(elements.artworkY, elements.artworkYValue);
    updateRange(
      elements.artworkRotation,
      elements.artworkRotationValue,
      "°"
    );
    updateRange(elements.titleShadowOpacity, elements.titleShadowOpacityValue);
    updateRange(
      elements.titleShadowOffsetY,
      elements.titleShadowOffsetYValue,
      " px"
    );
    updateRange(elements.titleShadowBlur, elements.titleShadowBlurValue, " px");
    updateOverlayInterface();
    updateBackgroundInterface();

    elements.titleShadowControls.disabled = !state.titleShadowEnabled;
    updateColorInterface();
    elements.canvasCornerLabel.textContent =
      dimensions.width + " × " + dimensions.height;
    elements.canvasFrame.style.setProperty(
      "--canvas-ratio",
      dimensions.width + " / " + dimensions.height
    );
    fitCanvasFrame(dimensions);
    var animatedLayers = getAnimatedLayers();
    var gifMode = hasAnimatedLayers();
    elements.imageQualityControl.hidden = gifMode;
    elements.gifQualityControl.hidden = !gifMode;
    elements.exportTitle.textContent = gifMode ? "导出动态作品" : "保存作品";
    elements.downloadButtonIcon.textContent = gifMode ? "▶" : "↓";
    elements.downloadButtonLabel.textContent = gifMode ? "保存 GIF" : "保存图片";
    if (gifMode) {
      var gifDimensions = gifOutputDimensions();
      elements.exportDescription.textContent =
        gifDimensions.width +
        " × " +
        gifDimensions.height +
        " px · " +
        animatedLayers.length +
        " 个动态图层 · " +
        gifDimensions.settings.maxColors +
        " 色";
    } else {
      elements.exportDescription.textContent =
        exportWidth + " × " + exportHeight + " px";
    }

    // Artwork colors belong to the canvas only. The interface keeps the
    // fixed theme colors declared in CSS so light artwork palettes remain usable.

    var accessibleText = [
      getLayer("text-line-1") ? state.line1 : "",
      getLayer("text-line-2") ? state.line2 : "",
      getLayer("text-subtitle") ? state.subtitle : "",
      layers.some(function (layer) {
        return decorationLayerHasContent(layer) && layer.visible;
      })
        ? "星星装饰"
        : "",
      getImageLayers()
        .filter(function (layer) {
          return layer.visible;
        })
        .map(function (layer) {
          return layer.name;
        })
        .join("、")
    ]
      .filter(function (item) {
        return item.trim();
      })
      .join("，");
    elements.canvas.setAttribute(
      "aria-label",
      accessibleText ? "字标作品：" + accessibleText : "空白画面"
    );
  }

  function renderPreview() {
    readStateFromControls();
    updateInterface();
    var result = renderArtwork(elements.canvas, 1);
    lastPreviewResult = result;
    updateCanvasSelection(result);

    if (result.isEmpty) {
      elements.renderStatus.textContent = "写点什么，画面就会亮起来";
      return;
    }

    if (!result.lines.length && !result.subtitle && getImageLayers().length) {
      elements.renderStatus.textContent = hasAnimatedLayers()
        ? "动态图层正在循环预览"
        : "拖动图层，放到喜欢的位置";
      return;
    }

    if (hasAnimatedLayers()) {
      elements.renderStatus.textContent =
        "动态图层预览中 · " + layers.length + " 个图层共存";
      return;
    }

    var verySmall = result.lines.some(function (line) {
      return line.fontSize < 34;
    });
    var statusText = verySmall
      ? "文字有点长，已经替你收好"
      : state.fontStyle === "playful" && styleEngine && styleEngine.isReady()
        ? "手绘效果刚刚好"
        : "画面已准备好";
    elements.renderStatus.textContent = getImageLayers().length
      ? statusText + " · " + layers.length + " 个图层"
      : statusText;
  }

  function renderPreviewSafely() {
    try {
      renderPreview();
      elements.canvasStage.classList.remove("canvas-load-failed");
      if (elements.canvasCompatibilityNotice) {
        elements.canvasCompatibilityNotice.hidden = true;
      }
      return true;
    } catch (error) {
      console.error("Canvas preview could not be rendered.", error);
      elements.canvas.removeAttribute("aria-busy");
      elements.canvasStage.classList.add("canvas-load-failed");
      if (elements.canvasCompatibilityNotice) {
        elements.canvasCompatibilityNotice.hidden = false;
      }
      elements.renderStatus.textContent = "当前浏览器未能启动画布";
      return false;
    }
  }

  function scheduleRender() {
    if (renderFrame) {
      cancelAnimationFrame(renderFrame);
    }
    renderFrame = requestAnimationFrame(function () {
      renderFrame = 0;
      renderPreviewSafely();
    });
  }

  function cloneLayerForHistory(layer) {
    var clone = Object.assign({}, layer);
    clone.frames = layer.frames ? layer.frames.slice() : [];
    clone.frameDelays = layer.frameDelays ? layer.frameDelays.slice() : [];
    clone.officialAsset = layer.officialAsset
      ? Object.assign({}, layer.officialAsset)
      : null;
    return clone;
  }

  function captureHistorySnapshot() {
    readStateFromControls();
    var textLayers = {};
    Object.keys(textLayerStore).forEach(function (layerId) {
      textLayers[layerId] = cloneLayerForHistory(textLayerStore[layerId]);
    });
    return {
      state: Object.assign({}, state, {
        glyphAdjustments: cloneGlyphAdjustments(state.glyphAdjustments)
      }),
      textLayers: textLayers,
      decorationLayer: cloneLayerForHistory(decorationLayerStore),
      letteringGroup: cloneLayerForHistory(letteringGroupStore),
      layers: layers.map(cloneLayerForHistory),
      activeLayerId: activeLayerId,
      expandedLayerId: expandedLayerId,
      officialAssetCategory: officialAssetCategory
    };
  }

  function historyLayerFingerprint(layer) {
    return {
      id: layer.id,
      type: layer.type,
      sourceType: layer.sourceType || "",
      name: layer.name,
      x: layer.x,
      y: layer.y,
      scale: layer.scale,
      rotation: layer.rotation,
      opacity: Number.isFinite(layer.opacity) ? layer.opacity : 100,
      visible: layer.visible,
      locked: layer.locked,
      lastIndex: layer.lastIndex,
      advancedActive: layer.advancedActive,
      defaultX: layer.defaultX,
      defaultY: layer.defaultY,
      defaultScale: layer.defaultScale,
      defaultRotation: layer.defaultRotation,
      defaultOpacity: layer.defaultOpacity,
      starCount: layer.starCount,
      showJDecorations: layer.showJDecorations,
      layoutSeed: layer.layoutSeed,
      officialAsset: layer.officialAsset || null,
      objectUrl: layer.objectUrl || ""
    };
  }

  function historySignature(snapshot) {
    var textFingerprint = {};
    Object.keys(snapshot.textLayers)
      .sort()
      .forEach(function (layerId) {
        textFingerprint[layerId] = historyLayerFingerprint(
          snapshot.textLayers[layerId]
        );
      });
    return JSON.stringify({
      state: snapshot.state,
      textLayers: textFingerprint,
      decorationLayer: historyLayerFingerprint(snapshot.decorationLayer),
      letteringGroup: historyLayerFingerprint(snapshot.letteringGroup),
      layers: snapshot.layers.map(historyLayerFingerprint),
      activeLayerId: snapshot.activeLayerId,
      expandedLayerId: snapshot.expandedLayerId,
      officialAssetCategory: snapshot.officialAssetCategory
    });
  }

  function updateHistoryButtons() {
    if (!elements.undoButton || !elements.redoButton) {
      return;
    }
    [elements.undoButton, elements.mobileUndoButton].forEach(function (button) {
      if (!button) {
        return;
      }
      button.disabled = undoStack.length === 0;
      button.title = undoStack.length
        ? "撤回上一步（Ctrl/Cmd + Z）"
        : "没有可撤回的操作";
    });
    [elements.redoButton, elements.mobileRedoButton].forEach(function (button) {
      if (!button) {
        return;
      }
      button.disabled = redoStack.length === 0;
      button.title = redoStack.length
        ? "重做下一步（Ctrl/Cmd + Shift + Z）"
        : "没有可重做的操作";
    });
    if (elements.mobileHistoryToolbar) {
      elements.mobileHistoryToolbar.classList.toggle(
        "is-empty",
        undoStack.length === 0 && redoStack.length === 0
      );
    }
  }

  function flushHistoryCapture() {
    window.clearTimeout(historyTimer);
    historyTimer = 0;
    if (historySuspended || !historyPresent) {
      return;
    }
    var next = captureHistorySnapshot();
    if (historySignature(next) === historySignature(historyPresent)) {
      return;
    }
    undoStack.push(historyPresent);
    if (undoStack.length > 60) {
      undoStack.shift();
    }
    historyPresent = next;
    redoStack = [];
    updateHistoryButtons();
  }

  function scheduleHistoryCapture() {
    if (historySuspended || !historyPresent) {
      return;
    }
    window.clearTimeout(historyTimer);
    historyTimer = window.setTimeout(flushHistoryCapture, 260);
  }

  function restoreHistorySnapshot(snapshot) {
    historySuspended = true;
    state = createState(snapshot.state);
    textLayerStore = Object.create(null);
    Object.keys(snapshot.textLayers).forEach(function (layerId) {
      textLayerStore[layerId] = cloneLayerForHistory(
        snapshot.textLayers[layerId]
      );
    });
    var storedDecoration =
      snapshot.decorationLayer ||
      snapshot.layers.find(function (layer) {
        return isDecorationLayer(layer);
      });
    var storedGroup =
      snapshot.letteringGroup ||
      snapshot.layers.find(function (layer) {
        return isLetteringGroupLayer(layer);
      });
    decorationLayerStore = storedDecoration
      ? cloneLayerForHistory(storedDecoration)
      : createDefaultDecorationLayer();
    letteringGroupStore = storedGroup
      ? cloneLayerForHistory(storedGroup)
      : createDefaultLetteringGroupLayer();
    layers = snapshot.layers.map(function (layer) {
      if (isTextLayer(layer)) {
        return textLayerStore[layer.id];
      }
      if (isDecorationLayer(layer)) {
        return decorationLayerStore;
      }
      if (isLetteringGroupLayer(layer)) {
        return letteringGroupStore;
      }
      return cloneLayerForHistory(layer);
    });
    activeLayerId = getLayer(snapshot.activeLayerId)
      ? snapshot.activeLayerId
      : layers[0]
        ? layers[0].id
        : "";
    expandedLayerId = getLayer(snapshot.expandedLayerId)
      ? snapshot.expandedLayerId
      : activeLayerId;
    officialAssetCategory = snapshot.officialAssetCategory || "characters";
    canvasSelectionVisible = Boolean(getActiveLayer());
    applyStateToControls();
    syncLayerControls(getActiveLayer());
    updateCanvasRatioInterface();
    updateEditorModeInterface();
    renderLayerList();
    updateOverlayInterface();
    updateDragTargetInterface();
    startGifPreviewLoop();
    if (!stackedEditorQuery.matches && getActiveLayer()) {
      setEditorSection("properties", { resetScroll: false });
    }
    historySuspended = false;
    scheduleRender();
  }

  function undoHistory() {
    flushHistoryCapture();
    if (!undoStack.length || !historyPresent) {
      return;
    }
    redoStack.push(historyPresent);
    historyPresent = undoStack.pop();
    restoreHistorySnapshot(historyPresent);
    updateHistoryButtons();
    showToast("已撤回上一步");
  }

  function redoHistory() {
    flushHistoryCapture();
    if (!redoStack.length || !historyPresent) {
      return;
    }
    undoStack.push(historyPresent);
    historyPresent = redoStack.pop();
    restoreHistorySnapshot(historyPresent);
    updateHistoryButtons();
    showToast("已重做下一步");
  }

  function initializeHistory() {
    undoStack = [];
    redoStack = [];
    historyPresent = captureHistorySnapshot();
    updateHistoryButtons();
  }

  function applyStateToControls() {
    elements.line1.value = state.line1;
    elements.line2.value = state.line2;
    elements.subtitle.value = state.subtitle;
    elements.advancedLayerMode.checked = Boolean(state.advancedLayerMode);
    elements.selectedGroupLineGap.value = state.lineGap;
    elements.selectedGroupSubtitleGap.value = state.subtitleGap;
    elements.canvasSize.value = state.canvasSize;
    elements.artworkScale.value = state.artworkScale;
    elements.artworkX.value = state.artworkX;
    elements.artworkY.value = state.artworkY;
    elements.artworkRotation.value = state.artworkRotation;
    elements.outline.checked = state.outline;
    elements.titleShadowEnabled.checked = state.titleShadowEnabled;
    elements.titleShadowColor.value = state.titleShadowColor;
    elements.titleShadowOpacity.value = state.titleShadowOpacity;
    elements.titleShadowOffsetY.value = state.titleShadowOffsetY;
    elements.titleShadowBlur.value = state.titleShadowBlur;
    elements.primaryColor.value = state.primaryColor;
    elements.accentColor.value = state.accentColor;
    elements.skyColor.value = state.skyColor;
    elements.overlayScale.value = state.overlayScale;
    elements.overlayX.value = state.overlayX;
    elements.overlayY.value = state.overlayY;
    elements.overlayRotation.value = state.overlayRotation;
    elements.overlayOpacity.value = state.overlayOpacity;
    elements.overlayLayer.value = state.overlayLayer;
    elements.exportScale.value = String(state.exportScale);
    elements.gifQuality.value = state.gifQuality;
    updateEditorModeInterface();
    updateOverlayInterface();
    updateBackgroundInterface();
    updateColorInterface();
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toastText.textContent = message;
    elements.toast.classList.add("visible");
    toastTimer = window.setTimeout(function () {
      elements.toast.classList.remove("visible");
    }, 2100);
  }

  function isWelcomeDialogOpen() {
    return Boolean(
      elements.welcomeDialog &&
      !elements.welcomeDialog.hidden &&
      !elements.welcomeDialog.classList.contains("is-leaving")
    );
  }

  function openWelcomeDialog() {
    if (!elements.welcomeDialog || !elements.welcomeStartButton) {
      return;
    }
    window.clearTimeout(welcomeCloseTimer);
    elements.welcomeDialog.hidden = false;
    elements.welcomeDialog.classList.remove("is-leaving");
    elements.welcomeStartButton.disabled = false;
    document.body.classList.add("welcome-open");
    if (elements.appShell) {
      elements.appShell.setAttribute("inert", "");
    }
    requestAnimationFrame(function () {
      elements.welcomeStartButton.focus({ preventScroll: true });
    });
  }

  function finishClosingWelcomeDialog() {
    elements.welcomeDialog.hidden = true;
    elements.welcomeDialog.classList.remove("is-leaving");
    elements.welcomeStartButton.disabled = false;
    document.body.classList.remove("welcome-open");
    if (elements.appShell) {
      elements.appShell.removeAttribute("inert");
    }
    var firstEditorTab =
      elements.editorSectionTabs && elements.editorSectionTabs[0];
    if (firstEditorTab && typeof firstEditorTab.focus === "function") {
      firstEditorTab.focus({ preventScroll: true });
    }
  }

  function closeWelcomeDialog() {
    if (!isWelcomeDialogOpen()) {
      return;
    }
    elements.welcomeDialog.classList.add("is-leaving");
    elements.welcomeStartButton.disabled = true;
    window.clearTimeout(welcomeCloseTimer);
    var reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    welcomeCloseTimer = window.setTimeout(
      finishClosingWelcomeDialog,
      reducedMotion ? 0 : 240
    );
  }

  function trapWelcomeDialogFocus(event) {
    var focusable = Array.from(
      elements.welcomeDialog.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openAboutDialog() {
    if (!elements.aboutDialog) {
      return;
    }
    aboutReturnFocus = document.activeElement;
    elements.aboutDialog.hidden = false;
    document.body.classList.add("about-open");
    requestAnimationFrame(function () {
      elements.aboutCloseButton.focus();
    });
  }

  function closeAboutDialog() {
    if (!elements.aboutDialog || elements.aboutDialog.hidden) {
      return;
    }
    elements.aboutDialog.hidden = true;
    document.body.classList.remove("about-open");
    if (aboutReturnFocus && typeof aboutReturnFocus.focus === "function") {
      aboutReturnFocus.focus();
    }
    aboutReturnFocus = null;
  }

  function safeFilename(text) {
    var base = text.trim() || "我的字标";
    return base
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 32);
  }

  function setCacheRefreshLoading(loading) {
    cacheRefreshInProgress = loading;
    [elements.cacheRefreshButton, elements.mobileCacheRefreshButton].forEach(
      function (button) {
        if (!button) {
          return;
        }
        button.disabled = loading;
        button.classList.toggle("loading", loading);
        if (loading) {
          button.setAttribute("aria-busy", "true");
        } else {
          button.removeAttribute("aria-busy");
        }
      }
    );
    if (elements.cacheRefreshLabel) {
      elements.cacheRefreshLabel.textContent = loading
        ? "刷新中…"
        : "刷新缓存";
    }
  }

  function cacheRefreshUrls() {
    var urls = [
      "./assets/font-atlas/runtime-glyph-index.json?v=5",
      "./assets/fonts/LongCang-Regular.ttf",
      "./assets/fonts/ZCOOLQingKeHuangYou-Regular.ttf",
      "./assets/fonts/ZCOOLKuaiLe-Regular.ttf",
      "./assets/fonts/Kalam-Bold.ttf",
      "./assets/fonts/PrincessSofia-Regular.ttf"
    ];

    Array.prototype.forEach.call(
      document.querySelectorAll("link[href], script[src], img[src]"),
      function (node) {
        urls.push(node.href || node.src);
      }
    );

    var seen = Object.create(null);
    return urls.reduce(function (result, url) {
      try {
        var absoluteUrl = new URL(url, document.baseURI);
        if (
          absoluteUrl.origin !== window.location.origin ||
          seen[absoluteUrl.href]
        ) {
          return result;
        }
        seen[absoluteUrl.href] = true;
        result.push(absoluteUrl.href);
      } catch (error) {
        // An invalid optional resource should not prevent the cache refresh.
      }
      return result;
    }, []);
  }

  function refreshSiteCache() {
    if (cacheRefreshInProgress) {
      return;
    }
    setCacheRefreshLoading(true);
    showToast("正在重新获取字体与网站资源");

    var cleanupTasks = [];
    if (window.caches && window.caches.keys) {
      cleanupTasks.push(
        window.caches
          .keys()
          .then(function (keys) {
            return Promise.all(
              keys.map(function (key) {
                return window.caches.delete(key);
              })
            );
          })
          .catch(function (error) {
            console.warn("Unable to clear Cache Storage.", error);
          })
      );
    }
    if (
      navigator.serviceWorker &&
      navigator.serviceWorker.getRegistrations
    ) {
      cleanupTasks.push(
        navigator.serviceWorker
          .getRegistrations()
          .then(function (registrations) {
            return Promise.all(
              registrations.map(function (registration) {
                return registration.unregister();
              })
            );
          })
          .catch(function (error) {
            console.warn("Unable to unregister service workers.", error);
          })
      );
    }

    Promise.all(cleanupTasks)
      .then(function () {
        return Promise.all(
          cacheRefreshUrls().map(function (url) {
            return fetch(url, {
              cache: "reload",
              credentials: "same-origin"
            }).then(function (response) {
              if (!response.ok) {
                throw new Error("Unable to refresh resource: " + url);
              }
              return response.arrayBuffer().then(function () {
                return undefined;
              });
            });
          })
        );
      })
      .then(function () {
        elements.cacheRefreshLabel.textContent = "正在重载…";
        showToast("缓存已刷新，正在重新加载");
        var nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("cache-refresh", String(Date.now()));
        window.setTimeout(function () {
          window.location.replace(nextUrl.href);
        }, 180);
      })
      .catch(function (error) {
        console.warn("Unable to refresh site resources.", error);
        setCacheRefreshLoading(false);
        showToast("刷新失败，请检查网络后重试");
      });
  }

  function setDownloadLoading(loading) {
    elements.downloadButton.disabled = loading;
    elements.downloadButton.classList.toggle("loading", loading);
    if (loading) {
      elements.downloadButton.setAttribute("aria-busy", "true");
    } else {
      elements.downloadButton.removeAttribute("aria-busy");
      elements.downloadButtonIcon.textContent =
        hasAnimatedLayers() ? "▶" : "↓";
      elements.downloadButtonLabel.textContent =
        hasAnimatedLayers() ? "保存 GIF" : "保存图片";
    }
  }

  function setDownloadProgress(label) {
    elements.downloadButtonLabel.textContent = label;
  }

  function isMobileSaveBrowser() {
    var userAgent = navigator.userAgent || "";
    var iPadOs =
      navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    var userAgentDataMobile = Boolean(
      navigator.userAgentData && navigator.userAgentData.mobile
    );
    return (
      userAgentDataMobile ||
      iPadOs ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
        userAgent
      )
    );
  }

  function isEmbeddedMobileBrowser() {
    var userAgent = navigator.userAgent || "";
    return /MicroMessenger|MQQBrowser|QQ\/|TBS\/|Weibo|AlipayClient|DingTalk/i.test(
      userAgent
    );
  }

  function updateBrowserCompatibilityTip() {
    if (!elements.welcomeBrowserTip || !isEmbeddedMobileBrowser()) {
      return;
    }
    elements.welcomeBrowserTip.innerHTML =
      '<span aria-hidden="true">i</span>当前为应用内置浏览器；若资源或保存异常，请从右上角使用系统浏览器打开～';
  }

  function compatibleImageExportScale(dimensions, requestedScale) {
    var scale = clamp(Math.round(Number(requestedScale) || 1), 1, 3);
    var constrainedBrowser = isEmbeddedMobileBrowser();
    if (!constrainedBrowser) {
      return scale;
    }

    var maxDimension = Math.max(dimensions.width, dimensions.height);
    var pixelCount = dimensions.width * dimensions.height;
    while (
      scale > 1 &&
      (maxDimension * scale > 4096 || pixelCount * scale * scale > 12000000)
    ) {
      scale -= 1;
    }
    return scale;
  }

  function createArtworkFile(blob, filename) {
    if (typeof File !== "function") {
      return null;
    }
    try {
      return new File([blob], filename, {
        type: blob.type || "application/octet-stream",
        lastModified: Date.now()
      });
    } catch (error) {
      return null;
    }
  }

  function canShareArtworkFile(file) {
    if (!file || !navigator.share || !navigator.canShare) {
      return false;
    }
    try {
      return navigator.canShare({ files: [file] });
    } catch (error) {
      return false;
    }
  }

  function releasePendingSave(revokeDelay) {
    var objectUrl = pendingSaveObjectUrl;
    pendingSaveFile = null;
    pendingSaveBlob = null;
    pendingSaveFilename = "";
    pendingSaveObjectUrl = "";
    pendingSaveDataUrl = "";
    pendingSaveDimensions = "";
    pendingSaveGeneration += 1;
    if (objectUrl) {
      window.setTimeout(function () {
        URL.revokeObjectURL(objectUrl);
      }, revokeDelay || 0);
    }
  }

  function closeSaveAssist() {
    if (!elements.saveAssist || elements.saveAssist.hidden) {
      return;
    }
    elements.saveAssist.hidden = true;
    elements.saveAssistCard.hidden = false;
    elements.saveImagePreview.hidden = true;
    elements.savedImagePreview.removeAttribute("src");
    elements.systemSaveButton.disabled = false;
    elements.openSavedImageButton.disabled = false;
    elements.openSavedImageButton.innerHTML =
      '<span aria-hidden="true">▣</span>打开原图后长按保存';
    releasePendingSave(120000);
    if (saveAssistReturnFocus && saveAssistReturnFocus.focus) {
      saveAssistReturnFocus.focus();
    }
    saveAssistReturnFocus = null;
  }

  function showSaveAssist(blob, filename, dimensions) {
    if (pendingSaveObjectUrl) {
      releasePendingSave(120000);
    }
    pendingSaveGeneration += 1;
    pendingSaveBlob = blob;
    pendingSaveFilename = filename;
    pendingSaveFile = createArtworkFile(blob, filename);
    pendingSaveObjectUrl = URL.createObjectURL(blob);
    pendingSaveDimensions = dimensions;
    var gifFile = blob.type === "image/gif";
    elements.saveAssistTitle.textContent = gifFile
      ? "GIF 已经准备好"
      : "图片已经准备好";
    elements.saveAssistDescription.textContent = gifFile
      ? "这个浏览器可能不会自动保存 GIF，请选择一种可靠的保存方式。"
      : "这个浏览器可能不会自动保存文件，请选择一种可靠的保存方式。";
    if (isEmbeddedMobileBrowser()) {
      elements.saveAssistDescription.textContent =
        "当前为应用内置浏览器。若长按没有保存选项，请在右上角选择用系统浏览器打开。";
    }
    elements.savedImagePreview.alt = gifFile
      ? "刚刚生成的动态 GIF 作品"
      : "刚刚生成的高清字标作品";
    saveAssistReturnFocus = document.activeElement;
    elements.saveAssistCard.hidden = false;
    elements.saveImagePreview.hidden = true;
    elements.savedImagePreview.removeAttribute("src");
    elements.systemSaveButton.hidden = !canShareArtworkFile(pendingSaveFile);
    elements.systemSaveButton.disabled = false;
    elements.openSavedImageButton.disabled = false;
    elements.openSavedImageButton.innerHTML =
      '<span aria-hidden="true">▣</span>打开原图后长按保存';
    elements.saveAssist.hidden = false;
    window.requestAnimationFrame(function () {
      var firstAction = elements.systemSaveButton.hidden
        ? elements.openSavedImageButton
        : elements.systemSaveButton;
      firstAction.focus();
    });
  }

  function sharePendingArtwork() {
    var file = pendingSaveFile;
    var dimensions = pendingSaveDimensions;
    if (!canShareArtworkFile(file)) {
      elements.systemSaveButton.hidden = true;
      showToast("系统保存不可用，请打开原图保存");
      return;
    }
    elements.systemSaveButton.disabled = true;
    elements.systemSaveButton.setAttribute("aria-busy", "true");
    var sharePromise;
    try {
      sharePromise = navigator.share({
        files: [file],
        title: pendingSaveFilename
      });
    } catch (error) {
      console.warn("Unable to share artwork file.", error);
      elements.systemSaveButton.disabled = false;
      elements.systemSaveButton.removeAttribute("aria-busy");
      elements.systemSaveButton.hidden = true;
      showToast("系统保存不可用，请打开原图保存");
      return;
    }
    Promise.resolve(sharePromise)
      .then(function () {
        elements.systemSaveButton.disabled = false;
        elements.systemSaveButton.removeAttribute("aria-busy");
        closeSaveAssist();
        elements.renderStatus.textContent =
          "已交给系统保存 · " + dimensions;
        showToast("已打开系统保存 / 分享");
      })
      .catch(function (error) {
        elements.systemSaveButton.disabled = false;
        elements.systemSaveButton.removeAttribute("aria-busy");
        if (error && error.name === "AbortError") {
          return;
        }
        console.warn("Unable to share artwork file.", error);
        elements.systemSaveButton.hidden = true;
        showToast("系统保存不可用，请打开原图保存");
      });
  }

  function openPendingArtwork() {
    if (!pendingSaveObjectUrl) {
      showToast("原图已失效，请重新生成");
      closeSaveAssist();
      return;
    }
    var generation = pendingSaveGeneration;
    var previewPromise = Promise.resolve(pendingSaveObjectUrl);
    if (
      isEmbeddedMobileBrowser() &&
      pendingSaveBlob &&
      typeof FileReader === "function"
    ) {
      if (pendingSaveDataUrl) {
        previewPromise = Promise.resolve(pendingSaveDataUrl);
      } else {
        elements.openSavedImageButton.disabled = true;
        elements.openSavedImageButton.textContent = "正在准备兼容原图…";
        previewPromise = new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function () {
            resolve(typeof reader.result === "string" ? reader.result : "");
          };
          reader.onerror = function () {
            resolve("");
          };
          reader.readAsDataURL(pendingSaveBlob);
        }).then(function (dataUrl) {
          if (generation === pendingSaveGeneration && dataUrl) {
            pendingSaveDataUrl = dataUrl;
          }
          return dataUrl || pendingSaveObjectUrl;
        });
      }
    }

    previewPromise.then(function (previewUrl) {
      elements.openSavedImageButton.disabled = false;
      elements.openSavedImageButton.innerHTML =
        '<span aria-hidden="true">▣</span>打开原图后长按保存';
      if (generation !== pendingSaveGeneration || !previewUrl) {
        return;
      }
      elements.savedImagePreview.src = previewUrl;
      elements.saveAssistCard.hidden = true;
      elements.saveImagePreview.hidden = false;
      elements.renderStatus.textContent =
        "请长按原图保存 · " + pendingSaveDimensions;
      elements.closeSavedImageButton.focus();
      showToast("长按原图即可保存到相册");
    });
  }

  function startDirectDownload(blob, filename) {
    var objectUrl = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(objectUrl);
    }, 120000);
  }

  function deliverArtwork(blob, filename, dimensions) {
    if (isMobileSaveBrowser()) {
      showSaveAssist(blob, filename, dimensions);
      elements.renderStatus.textContent = "作品已生成 · " + dimensions;
      showToast("请选择一种保存方式");
    } else {
      startDirectDownload(blob, filename);
      elements.renderStatus.textContent = "下载已开始 · " + dimensions;
      showToast("下载已开始，请查看下载列表");
    }
    setDownloadLoading(false);
  }

  function waitForArtworkResources() {
    var browserFontsReady =
      document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();
    var ready = Promise.all([
      logoFontsReady || Promise.resolve(),
      vectorEngineReady || Promise.resolve(),
      browserFontsReady
    ]);
    return Promise.resolve(ready).then(function () {
      if (styleEngine && styleEngine.whenAtlasReady) {
        // Start requests for glyphs entered immediately before export.
        renderArtwork(elements.canvas, 1);
        return styleEngine.whenAtlasReady();
      }
      return undefined;
    });
  }

  function loadImageResource(source) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.decoding = "async";
      image.onload = function () {
        resolve(image);
      };
      image.onerror = function () {
        reject(new Error("Unable to load animation frame: " + source));
      };
      image.src = source;
    });
  }

  function loadGifFrameImages(asset, onProgress) {
    if (gifFrameCache[asset.id]) {
      return gifFrameCache[asset.id].then(function (images) {
        if (onProgress) {
          onProgress(1);
        }
        return images;
      });
    }
    var loaded = 0;
    var requests = [];
    for (var index = 1; index <= asset.frameCount; index += 1) {
      requests.push(
        loadImageResource(frameAssetSource(asset.id, index)).then(
          function (image) {
            loaded += 1;
            if (onProgress) {
              onProgress(loaded / asset.frameCount);
            }
            return image;
          }
        )
      );
    }
    gifFrameCache[asset.id] = Promise.all(requests).catch(function (error) {
      delete gifFrameCache[asset.id];
      throw error;
    });
    return gifFrameCache[asset.id];
  }

  function afterBrowserPaint() {
    return new Promise(function (resolve) {
      window.requestAnimationFrame(function () {
        resolve();
      });
    });
  }

  function gifTimeline(animatedLayers) {
    var step = animatedLayers.reduce(function (smallest, layer) {
      return Math.min(smallest, layerMinimumFrameDelay(layer));
    }, 250);
    var duration = animatedLayers.reduce(function (longest, layer) {
      return Math.max(longest, layerAnimationDuration(layer));
    }, step);
    duration = Math.min(4000, Math.max(step, duration));
    var frameCount = clamp(Math.ceil(duration / step), 2, 24);
    return {
      delay: Math.max(20, Math.round(duration / frameCount)),
      frameCount: frameCount
    };
  }

  function loadAllGifLayerFrames(onProgress) {
    var animatedLayers = layers.filter(function (layer) {
      return layer.type === "gif" && layer.visible;
    });
    var completed = 0;
    return Promise.all(
      animatedLayers.map(function (layer) {
        var asset =
          layer.officialAsset && findOfficialCharacter(layer.officialAsset.id);
        if (!asset) {
          completed += 1;
          if (onProgress) {
            onProgress(completed / animatedLayers.length);
          }
          return Promise.resolve(layer);
        }
        return loadGifFrameImages(asset).then(function (images) {
          layer.frames = images;
          layer.image = images[0];
          completed += 1;
          if (onProgress) {
            onProgress(completed / animatedLayers.length);
          }
          return layer;
        });
      })
    );
  }

  function renderGifFramePayloads(animatedLayers, output, onProgress) {
    var canvas = document.createElement("canvas");
    var frames = [];
    var index = 0;
    var timeline = gifTimeline(animatedLayers);

    var renderNext = function () {
      if (index >= timeline.frameCount) {
        return Promise.resolve(frames);
      }
      var time = index * timeline.delay;
      var layerImages = {};
      animatedLayers.forEach(function (layer) {
        var frameIndex = frameIndexAtElapsedTime(layer, time);
        layerImages[layer.id] = layer.frames[frameIndex];
      });
      renderArtwork(canvas, output.scale, { layerImages: layerImages, time: time });
      var ctx = canvas.getContext("2d", { willReadFrequently: true });
      var pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      frames.push({
        pixels: pixels.buffer,
        delay: timeline.delay
      });
      index += 1;
      if (onProgress) {
        onProgress(index / timeline.frameCount);
      }
      return afterBrowserPaint().then(renderNext);
    };

    return renderNext();
  }

  function encodeGifInWorker(frames, output, onProgress) {
    return new Promise(function (resolve, reject) {
      if (typeof Worker !== "function") {
        reject(new Error("This browser does not support background GIF export"));
        return;
      }
      var worker;
      try {
        worker = new Worker("./gif-export-worker.js?v=1", {
          type: "module"
        });
      } catch (error) {
        reject(error);
        return;
      }
      var settled = false;
      var finish = function (callback, value) {
        if (settled) {
          return;
        }
        settled = true;
        worker.terminate();
        callback(value);
      };
      worker.onmessage = function (event) {
        var message = event.data || {};
        if (message.type === "progress") {
          if (onProgress) {
            onProgress(clamp(Number(message.value) / 100, 0, 1));
          }
          return;
        }
        if (message.type === "finished") {
          finish(resolve, new Blob([message.bytes], { type: "image/gif" }));
          return;
        }
        if (message.type === "error") {
          finish(reject, new Error(message.message || "GIF encoding failed"));
        }
      };
      worker.onerror = function (event) {
        finish(
          reject,
          new Error(event.message || "GIF export worker could not start")
        );
      };
      var transfers = frames.map(function (frame) {
        return frame.pixels;
      });
      worker.postMessage(
        {
          type: "encode",
          frames: frames,
          width: output.width,
          height: output.height,
          maxColors: output.settings.maxColors
        },
        transfers
      );
    });
  }

  function setGifExportBusy(busy) {
    document.body.classList.toggle("gif-exporting", busy);
    elements.controlPanel.setAttribute("aria-busy", String(busy));
    if (!busy) {
      elements.controlPanel.removeAttribute("aria-busy");
    }
  }

  function downloadGifArtwork() {
    if (elements.downloadButton.classList.contains("loading")) {
      return;
    }
    if (!hasAnimatedLayers()) {
      showToast("请先添加动态贴纸图层");
      return;
    }

    readStateFromControls();
    updateInterface();
    var output = gifOutputDimensions();
    var animatedLayers = [];
    var exportFrameCount = 0;
    stopGifPreviewLoop();
    setGifExportBusy(true);
    setDownloadLoading(true);
    setDownloadProgress("准备帧…");
    elements.renderStatus.textContent = "正在准备动态帧…";

    waitForArtworkResources()
      .catch(function (error) {
        console.warn("Artwork resources were not fully ready.", error);
      })
      .then(function () {
        return loadAllGifLayerFrames(function (progress) {
          var percent = Math.round(progress * 100);
          setDownloadProgress("载入 " + percent + "%");
          elements.renderStatus.textContent =
            "正在载入动态帧 · " + percent + "%";
        });
      })
      .then(function () {
        animatedLayers = getAnimatedLayers();
        if (!animatedLayers.length) {
          throw new Error("No animated layers were ready");
        }
        setDownloadProgress("合成画面…");
        return renderGifFramePayloads(
          animatedLayers,
          output,
          function (progress) {
            var percent = Math.round(progress * 100);
            setDownloadProgress("合成 " + percent + "%");
            elements.renderStatus.textContent =
              "正在合成画面 · " + percent + "%";
          }
        );
      })
      .then(function (frames) {
        exportFrameCount = frames.length;
        setDownloadProgress("压缩 GIF…");
        return encodeGifInWorker(frames, output, function (progress) {
          var percent = Math.round(progress * 100);
          setDownloadProgress("压缩 " + percent + "%");
          elements.renderStatus.textContent =
            "正在压缩 GIF · " + percent + "%";
        });
      })
      .then(function (blob) {
        setGifExportBusy(false);
        startGifPreviewLoop();
        var filename =
          safeFilename(state.line1 || state.line2) + "-动态字标.gif";
        var dimensions =
          output.width +
          " × " +
          output.height +
          " · " +
          exportFrameCount +
          " 帧 · " +
          formatFileSize(blob.size);
        deliverArtwork(blob, filename, dimensions);
      })
      .catch(function (error) {
        console.warn("Unable to export GIF artwork.", error);
        setGifExportBusy(false);
        setDownloadLoading(false);
        startGifPreviewLoop();
        elements.renderStatus.textContent = "GIF 生成失败，请换低一档重试";
        showToast("GIF 生成失败，请换低一档重试");
      });
  }

  function releaseExportCanvas(canvas) {
    if (!canvas) {
      return;
    }
    // Mobile WebViews can retain detached canvas backing stores for a while.
    // Shrinking it explicitly releases the large RGBA buffer after encoding.
    canvas.width = 1;
    canvas.height = 1;
  }

  function createExportError(code, message) {
    var error = new Error(message || code);
    error.code = code;
    return error;
  }

  function dataUrlToBlob(dataUrl) {
    var parts = String(dataUrl || "").split(",");
    if (parts.length < 2 || typeof atob !== "function") {
      throw createExportError(
        "PNG_ENCODING_UNSUPPORTED",
        "This browser cannot encode PNG files"
      );
    }
    var mimeMatch = parts[0].match(/^data:([^;]+)/);
    var binary = atob(parts[1]);
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], {
      type: mimeMatch ? mimeMatch[1] : "image/png"
    });
  }

  function renderPngAtScale(scale) {
    return new Promise(function (resolve, reject) {
      var exportCanvas = document.createElement("canvas");
      var result;
      try {
        result = renderArtwork(exportCanvas, scale);
      } catch (error) {
        releaseExportCanvas(exportCanvas);
        reject(
          createExportError(
            "CANVAS_ALLOCATION_FAILED",
            error && error.message ? error.message : "Canvas allocation failed"
          )
        );
        return;
      }

      function complete(blob) {
        releaseExportCanvas(exportCanvas);
        if (!blob) {
          reject(
            createExportError(
              "PNG_ENCODING_FAILED",
              "The browser returned an empty PNG"
            )
          );
          return;
        }
        resolve({
          blob: blob,
          width: result.width * scale,
          height: result.height * scale,
          scale: scale
        });
      }

      if (typeof exportCanvas.toBlob === "function") {
        try {
          exportCanvas.toBlob(complete, "image/png", 1);
        } catch (error) {
          releaseExportCanvas(exportCanvas);
          reject(
            createExportError(
              "PNG_ENCODING_FAILED",
              error && error.message ? error.message : "PNG encoding failed"
            )
          );
        }
        return;
      }

      try {
        complete(dataUrlToBlob(exportCanvas.toDataURL("image/png")));
      } catch (error) {
        releaseExportCanvas(exportCanvas);
        reject(error);
      }
    });
  }

  function renderPngWithFallback(startScale) {
    function attempt(scale) {
      return renderPngAtScale(scale).catch(function (error) {
        if (scale <= 1) {
          throw error;
        }
        console.warn(
          "PNG export failed; retrying at a safer scale:",
          error
        );
        setDownloadProgress("自动兼容重试…");
        elements.renderStatus.textContent =
          "当前浏览器内存不足，正在自动降低一档重试…";
        return afterBrowserPaint().then(function () {
          return attempt(scale - 1);
        });
      });
    }

    return attempt(startScale);
  }

  function downloadArtwork() {
    if (elements.downloadButton.classList.contains("loading")) {
      return;
    }
    readStateFromControls();
    updateInterface();
    setDownloadLoading(true);
    setDownloadProgress("生成中…");
    elements.renderStatus.textContent = "正在准备高清作品…";

    var begin = function () {
      var dimensions = dimensionsFromValue(state.canvasSize);
      var requestedScale = state.exportScale;
      var startScale = compatibleImageExportScale(
        dimensions,
        requestedScale
      );
      if (startScale < requestedScale) {
        setDownloadProgress("兼容模式生成中…");
        elements.renderStatus.textContent =
          "当前浏览器将使用 " + startScale + "× 安全尺寸保存…";
      }

      renderPngWithFallback(startScale)
        .then(function (result) {
          var filename =
            safeFilename(state.line1 || state.line2) + "-字标.png";
          var dimensionLabel = result.width + " × " + result.height;
          var downgraded = result.scale < requestedScale;
          if (downgraded) {
            dimensionLabel += " · 自动兼容 " + result.scale + "×";
          }
          deliverArtwork(result.blob, filename, dimensionLabel);
          if (downgraded) {
            showToast(
              "当前浏览器已自动使用 " + result.scale + "× 完成保存"
            );
          }
        })
        .catch(function (error) {
          console.warn("Unable to export PNG artwork.", error);
          var code = (error && error.code) || "PNG_EXPORT_FAILED";
          setDownloadLoading(false);
          elements.renderStatus.textContent =
            "保存失败，请切换系统浏览器 · " + code;
          showToast("保存失败（" + code + "）");
        });
    };

    waitForArtworkResources().then(begin, function (error) {
      console.warn("Artwork resources were not fully ready.", error);
      begin();
    });
  }

  function syncChangedRangeProgress(event) {
    var range = event.target;
    if (
      range &&
      range.matches &&
      range.matches('input[type="range"]')
    ) {
      updateRangeProgress(range);
    }
  }

  document.addEventListener("input", syncChangedRangeProgress, true);
  document.addEventListener("change", syncChangedRangeProgress, true);

  [
    elements.line1,
    elements.line2,
    elements.subtitle,
    elements.canvasSize,
    elements.artworkScale,
    elements.artworkX,
    elements.artworkY,
    elements.artworkRotation,
    elements.outline,
    elements.titleShadowEnabled,
    elements.titleShadowColor,
    elements.titleShadowOpacity,
    elements.titleShadowOffsetY,
    elements.titleShadowBlur,
    elements.primaryColor,
    elements.accentColor,
    elements.skyColor,
    elements.overlayScale,
    elements.overlayX,
    elements.overlayY,
    elements.overlayRotation,
    elements.overlayOpacity,
    elements.overlayLayer,
    elements.exportScale,
    elements.gifQuality
  ].forEach(function (control) {
    control.addEventListener("input", function () {
      scheduleRender();
      scheduleHistoryCapture();
    });
    control.addEventListener("change", function () {
      scheduleRender();
      scheduleHistoryCapture();
    });
  });

  [
    {
      control: elements.selectedLayerScale,
      property: "scale",
      output: elements.selectedLayerScaleValue
    },
    {
      control: elements.selectedLayerX,
      property: "x",
      output: elements.selectedLayerXValue
    },
    {
      control: elements.selectedLayerY,
      property: "y",
      output: elements.selectedLayerYValue
    },
    {
      control: elements.selectedLayerRotation,
      property: "rotation",
      output: elements.selectedLayerRotationValue
    },
    {
      control: elements.selectedLayerOpacity,
      property: "opacity",
      output: elements.selectedLayerOpacityValue
    }
  ].forEach(function (item) {
    item.control.addEventListener("input", function () {
      setLayerProperty(
        getActiveLayer(),
        item.property,
        item.control.value,
        item.output
      );
    });
  });

  elements.selectedLayerVisibilityButton.addEventListener("click", function () {
    var layer = getActiveLayer();
    if (layer) {
      setLayerVisibility(layer, !layer.visible);
    }
  });
  elements.selectedLayerLockButton.addEventListener("click", function () {
    var layer = getActiveLayer();
    if (layer) {
      setLayerLocked(layer, !layer.locked, true);
    }
  });
  elements.selectedLayerResetButton.addEventListener("click", function () {
    var layer = getActiveLayer();
    resetLayerTransform(layer);
    if (layer) {
      showToast(layer.name + "已恢复默认位置");
    }
  });
  elements.selectedLayerDeleteButton.addEventListener("click", function () {
    removeLayer(activeLayerId, true);
  });
  elements.selectedStarCount.addEventListener("input", function () {
    setDecorationLayerProperty(
      getActiveLayer(),
      "starCount",
      elements.selectedStarCount.value,
      elements.selectedStarCountValue
    );
  });
  elements.selectedJDecorations.addEventListener("input", function () {
    setDecorationLayerProperty(
      getActiveLayer(),
      "showJDecorations",
      elements.selectedJDecorations.checked
    );
  });
  elements.randomizeStarsButton.addEventListener("click", function () {
    randomizeStarPositions(getActiveLayer(), true);
  });
  elements.selectedGroupLineGap.addEventListener("input", function () {
    setGroupLayerProperty(
      getActiveLayer(),
      "lineGap",
      elements.selectedGroupLineGap.value,
      elements.selectedGroupLineGapValue
    );
  });
  elements.selectedGroupSubtitleGap.addEventListener("input", function () {
    setGroupLayerProperty(
      getActiveLayer(),
      "subtitleGap",
      elements.selectedGroupSubtitleGap.value,
      elements.selectedGroupSubtitleGapValue
    );
  });
  elements.selectedGroupStarCount.addEventListener("input", function () {
    setDecorationLayerProperty(
      getActiveLayer(),
      "starCount",
      elements.selectedGroupStarCount.value,
      elements.selectedGroupStarCountValue
    );
  });
  elements.selectedGroupJDecorations.addEventListener("input", function () {
    setDecorationLayerProperty(
      getActiveLayer(),
      "showJDecorations",
      elements.selectedGroupJDecorations.checked
    );
  });
  elements.randomizeGroupStarsButton.addEventListener("click", function () {
    randomizeStarPositions(getActiveLayer(), true);
  });

  elements.editorSectionTabs.forEach(function (button) {
    button.addEventListener("click", function () {
      activateEditorSection(button.dataset.editorTab);
    });
  });

  elements.editorSectionNav.addEventListener("keydown", function (event) {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) < 0) {
      return;
    }
    var visibleTabs = Array.from(elements.editorSectionTabs).filter(
      function (button) {
        return button.offsetParent !== null;
      }
    );
    var activeIndex = visibleTabs.indexOf(document.activeElement);
    if (activeIndex < 0) {
      activeIndex = visibleTabs.findIndex(function (button) {
        return button.classList.contains("active");
      });
    }
    if (event.key === "Home") {
      activeIndex = 0;
    } else if (event.key === "End") {
      activeIndex = visibleTabs.length - 1;
    } else {
      activeIndex += event.key === "ArrowRight" ? 1 : -1;
      activeIndex = (activeIndex + visibleTabs.length) % visibleTabs.length;
    }
    event.preventDefault();
    visibleTabs[activeIndex].focus();
    visibleTabs[activeIndex].click();
  });

  elements.assetCategoryButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (elements.downloadButton.classList.contains("loading")) {
        return;
      }
      officialAssetCategory = button.dataset.assetCategory;
      updateEditorModeInterface();
    });
  });

  elements.officialAssetGrid.addEventListener("click", function (event) {
    if (elements.downloadButton.classList.contains("loading")) {
      return;
    }
    var button = event.target.closest(".official-asset-button");
    if (!button) {
      return;
    }
    loadOfficialAsset(button.dataset.assetKind, button.dataset.assetId);
  });

  elements.layerList.addEventListener("input", function (event) {
    var control = event.target.closest("[data-layer-property]");
    var decorationControl = event.target.closest(
      "[data-decoration-property]"
    );
    var groupControl = event.target.closest("[data-group-property]");
    var item = event.target.closest(".layer-item");
    if ((!control && !decorationControl && !groupControl) || !item) {
      return;
    }
    var layer = getLayer(item.dataset.layerId);
    if (control) {
      var output = control.parentElement.querySelector("output");
      setLayerProperty(
        layer,
        control.dataset.layerProperty,
        control.value,
        output
      );
      return;
    }
    if (groupControl) {
      setGroupLayerProperty(
        layer,
        groupControl.dataset.groupProperty,
        groupControl.value,
        groupControl.parentElement.querySelector("output")
      );
      return;
    }
    setDecorationLayerProperty(
      layer,
      decorationControl.dataset.decorationProperty,
      decorationControl.type === "checkbox"
        ? decorationControl.checked
        : decorationControl.value,
      decorationControl.parentElement.querySelector("output")
    );
  });

  elements.layerList.addEventListener("click", function (event) {
    var item = event.target.closest(".layer-item");
    if (!item) {
      return;
    }
    var layer = getLayer(item.dataset.layerId);
    if (!layer) {
      return;
    }
    var actionButton = event.target.closest("[data-layer-action]");
    if (actionButton) {
      var action = actionButton.dataset.layerAction;
      if (action === "move-up") {
        moveLayer(layer.id, 1);
        event.stopPropagation();
        return;
      }
      if (action === "move-down") {
        moveLayer(layer.id, -1);
        event.stopPropagation();
        return;
      }
      if (action === "duplicate") {
        selectLayer(layer.id, { render: false });
        duplicateActiveLayer();
        event.stopPropagation();
        return;
      }
      if (action === "delete") {
        removeLayer(layer.id, true);
        event.stopPropagation();
        return;
      }
      if (action === "reset") {
        selectLayer(layer.id, {
          showSelection: true,
          render: false,
          syncEditorSection: false
        });
        resetLayerTransform(layer);
        showToast(layer.name + "已恢复默认位置");
        event.stopPropagation();
        return;
      }
      if (action === "randomize-stars") {
        selectLayer(layer.id, {
          showSelection: true,
          render: false,
          syncEditorSection: false
        });
        randomizeStarPositions(layer, true);
        event.stopPropagation();
        return;
      }
      if (action === "visibility") {
        setLayerVisibility(layer, !layer.visible);
        event.stopPropagation();
        return;
      } else if (action === "lock") {
        selectLayer(layer.id, {
          showSelection: true,
          render: false,
          syncEditorSection: false
        });
        setLayerLocked(layer, !layer.locked, true);
        event.stopPropagation();
        return;
      }
    }
    if (event.target.closest(".layer-inline-properties")) {
      event.stopPropagation();
      return;
    }
    if (stackedEditorQuery.matches) {
      var shouldExpand = expandedLayerId !== layer.id;
      selectLayer(layer.id, {
        showSelection: true,
        render: false,
        syncEditorSection: false
      });
      expandedLayerId = shouldExpand ? layer.id : "";
      renderLayerList();
      scheduleRender();
      return;
    }
    selectLayer(layer.id);
  });

  elements.layerList.addEventListener("dragstart", function (event) {
    var item = event.target.closest(".layer-item");
    if (!item) {
      return;
    }
    draggedLayerId = item.dataset.layerId;
    item.classList.add("dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedLayerId);
    }
  });

  elements.layerList.addEventListener("dragover", function (event) {
    var item = event.target.closest(".layer-item");
    if (!item || !draggedLayerId || item.dataset.layerId === draggedLayerId) {
      return;
    }
    event.preventDefault();
    clearLayerDropIndicators();
    var rect = item.getBoundingClientRect();
    var placeAbove = event.clientY < rect.top + rect.height / 2;
    item.classList.add(placeAbove ? "drop-before" : "drop-after");
    item.dataset.dropAbove = String(placeAbove);
  });

  elements.layerList.addEventListener("drop", function (event) {
    var item = event.target.closest(".layer-item");
    if (!item || !draggedLayerId) {
      return;
    }
    event.preventDefault();
    var placeAbove = item.dataset.dropAbove === "true";
    reorderLayer(draggedLayerId, item.dataset.layerId, placeAbove);
    draggedLayerId = "";
    clearLayerDropIndicators();
  });

  elements.layerList.addEventListener("dragend", function () {
    draggedLayerId = "";
    clearLayerDropIndicators();
  });

  document.querySelectorAll(".canvas-ratio-option").forEach(function (button) {
    button.addEventListener("click", function () {
      setCanvasRatioMode(button.dataset.canvasMode);
    });
  });

  document.querySelectorAll(".background-button").forEach(function (button) {
    button.addEventListener("click", function () {
      state.backgroundMode = button.dataset.background;
      updateBackgroundInterface();
      scheduleRender();
      scheduleHistoryCapture();
    });
  });

  elements.textLayerToggleButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (!state.advancedLayerMode) {
        return;
      }
      var layerId = button.dataset.textLayerToggle;
      var enabled = !getLayer(layerId);
      setTextLayerActive(layerId, enabled, true);
      setEditorSection("text", { resetScroll: false });
      if (enabled) {
        var field = document.querySelector(
          '[data-text-layer-field="' + layerId + '"] input'
        );
        requestAnimationFrame(function () {
          if (field) {
            field.focus();
            field.select();
          }
        });
      }
    });
  });

  [
    { input: elements.line1, layerId: "text-line-1", textKey: "line1" },
    { input: elements.line2, layerId: "text-line-2", textKey: "line2" },
    {
      input: elements.subtitle,
      layerId: "text-subtitle",
      textKey: "subtitle"
    }
  ].forEach(function (item) {
    item.input.addEventListener("input", function () {
      state[item.textKey] = item.input.value;
      pruneGlyphAdjustmentsForLine(item.layerId, item.input.value);
      updateGlyphEditorInterface();
    });
    item.input.addEventListener("focus", function () {
      var targetLayer = state.advancedLayerMode
        ? getLayer(item.layerId)
        : getLayer("lettering-group");
      if (targetLayer) {
        selectLayer(targetLayer.id, {
          showSelection: true,
          render: false,
          syncEditorSection: false
        });
      }
    });
  });

  elements.previousGlyphButton.addEventListener("click", function () {
    moveActiveGlyphTarget(-1);
  });
  elements.nextGlyphButton.addEventListener("click", function () {
    moveActiveGlyphTarget(1);
  });
  elements.glyphResetButton.addEventListener("click", function () {
    resetCurrentGlyphAdjustment(true);
  });
  elements.glyphResetAllButton.addEventListener("click", function () {
    resetAllGlyphAdjustments(true);
  });
  elements.glyphFineTuneCard.addEventListener("toggle", function () {
    if (elements.glyphFineTuneCard.open) {
      updateGlyphEditorInterface();
    }
  });

  [
    { control: elements.glyphScale, property: "scale" },
    { control: elements.glyphOffsetX, property: "x" },
    { control: elements.glyphOffsetY, property: "y" },
    { control: elements.glyphRotation, property: "rotation" }
  ].forEach(function (item) {
    item.control.addEventListener("input", function () {
      setCurrentGlyphAdjustment(item.property, item.control.value);
    });
  });

  elements.advancedLayerMode.addEventListener("change", function () {
    setAdvancedLayerMode(elements.advancedLayerMode.checked, true);
    setEditorSection("text", { resetScroll: false });
  });

  elements.colorTargetButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setActiveColorTarget(button.dataset.colorTarget);
    });
  });

  var colorTargetList = Array.from(elements.colorTargetButtons);
  colorTargetList.forEach(function (button, index) {
    button.addEventListener("keydown", function (event) {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) < 0) {
        return;
      }
      var nextIndex = index;
      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = colorTargetList.length - 1;
      } else {
        nextIndex += event.key === "ArrowRight" ? 1 : -1;
        nextIndex =
          (nextIndex + colorTargetList.length) % colorTargetList.length;
      }
      event.preventDefault();
      setActiveColorTarget(
        colorTargetList[nextIndex].dataset.colorTarget,
        true
      );
    });
  });

  [elements.colorHue, elements.colorSaturation, elements.colorLightness].forEach(
    function (control) {
      control.addEventListener("input", updateColorFromHslControls);
      control.addEventListener("change", updateColorFromHslControls);
    }
  );

  [
    elements.shadowColorHue,
    elements.shadowColorSaturation,
    elements.shadowColorLightness
  ].forEach(function (control) {
    control.addEventListener("input", updateShadowColorFromHslControls);
    control.addEventListener("change", updateShadowColorFromHslControls);
  });

  elements.colorHexInput.addEventListener("input", function () {
    var clean = String(elements.colorHexInput.value).trim();
    if (/^#?[0-9a-f]{6}$/i.test(clean)) {
      setColorValue(activeColorTarget, clean);
    }
  });
  elements.colorHexInput.addEventListener("change", function () {
    if (!setColorValue(activeColorTarget, elements.colorHexInput.value)) {
      updateColorInterface();
      showToast("请输入 3 位或 6 位 HEX 颜色");
    }
  });

  elements.shadowColorHexInput.addEventListener("input", function () {
    var clean = String(elements.shadowColorHexInput.value).trim();
    if (/^#?[0-9a-f]{6}$/i.test(clean)) {
      setColorValue("titleShadowColor", clean);
    }
  });
  elements.shadowColorHexInput.addEventListener("change", function () {
    if (
      !setColorValue(
        "titleShadowColor",
        elements.shadowColorHexInput.value
      )
    ) {
      updateShadowColorInterface();
      showToast("请输入 3 位或 6 位 HEX 颜色");
    }
  });

  elements.colorPresetButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setColorValue(activeColorTarget, button.dataset.colorPreset);
    });
  });

  elements.palettePresetButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var palette = button.dataset.palette.split(",");
      setColorValue("primaryColor", palette[0], false);
      setColorValue("accentColor", palette[1], false);
      setColorValue("skyColor", palette[2], false);
      updateColorInterface();
      scheduleRender();
      scheduleHistoryCapture();
      showToast("整套配色已应用");
    });
  });

  document.querySelectorAll(".example-button").forEach(function (button) {
    button.addEventListener("click", function () {
      var example = examples[Number(button.dataset.example)] || examples[0];
      elements.line1.value = example.line1;
      elements.line2.value = example.line2;
      elements.subtitle.value = example.subtitle;
      state.glyphAdjustments = {};
      activeGlyphTarget = null;
      state.seed = (state.seed + 97) >>> 0;
      scheduleRender();
      scheduleHistoryCapture();
    });
  });

  elements.resetArtworkButton.addEventListener("click", function () {
    var layer = getActiveLayer();
    resetArtworkTransform();
    scheduleRender();
    scheduleHistoryCapture();
    if (isTextLayer(layer)) {
      showToast(layer.name + "已回到默认位置");
    }
  });

  elements.canvasResetButton.addEventListener("click", function () {
    var layer = getActiveLayer();
    if (!layer) {
      return;
    }
    if (isImageLayer(layer)) {
      resetOverlayTransform();
      showToast("图片已回到中央");
    } else {
      resetArtworkTransform();
      showToast(layer.name + "已回到默认位置");
    }
    scheduleRender();
    scheduleHistoryCapture();
  });

  elements.canvasSelectionDeleteButton.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    removeLayer(activeLayerId, true);
  });

  [
    { element: elements.canvasRotationHandle, mode: "rotate" },
    { element: elements.canvasScaleHandle, mode: "scale" }
  ].forEach(function (handle) {
    handle.element.addEventListener("pointerdown", function (event) {
      beginCanvasHandleDrag(event, handle.mode);
    });
    handle.element.addEventListener("pointermove", moveCanvasHandle);
    handle.element.addEventListener("pointerup", finishCanvasHandleDrag);
    handle.element.addEventListener("pointercancel", finishCanvasHandleDrag);
  });

  elements.resetButton.addEventListener("click", function () {
    state = createState();
    activeGlyphTarget = null;
    layers = createDefaultTextLayers();
    activeLayerId = "lettering-group";
    expandedLayerId = activeLayerId;
    stopGifPreviewLoop();
    applyStateToControls();
    syncLayerControls(getActiveLayer());
    renderLayerList();
    scheduleRender();
    scheduleHistoryCapture();
    showToast("已恢复初始画布");
  });

  elements.overlayFile.addEventListener("change", function () {
    anchorFixedViewport(false);
    var files = Array.from(elements.overlayFile.files || []).slice(0, 12);
    if (!files.length) {
      return;
    }
    setLocalUploadBusy(true);
    var queue = Promise.resolve();
    files.forEach(function (file, index) {
      queue = queue.then(function () {
        return loadOverlayFile(file, { followRatio: index === 0 });
      });
    });
    if ((elements.overlayFile.files || []).length > files.length) {
      showToast("一次最多添加 12 个本地素材");
    }
    queue.then(
      function () {
        setLocalUploadBusy(false);
      },
      function () {
        setLocalUploadBusy(false);
      }
    );
    elements.overlayFile.blur();
    anchorFixedViewportAfterLayout(false);
  });

  elements.overlayFile.addEventListener("click", function () {
    anchorFixedViewport(false);
  });

  elements.overlayLockButton.addEventListener("click", function () {
    setOverlayLocked(!state.overlayLocked, true);
  });

  elements.removeOverlayButton.addEventListener("click", function () {
    removeLayer(activeLayerId, true);
  });

  elements.resetOverlayButton.addEventListener("click", function () {
    resetOverlayTransform();
    updateOverlayInterface();
    scheduleRender();
    showToast("图片已回到中央");
  });

  elements.canvas.addEventListener("pointerdown", function (event) {
    if (event.button !== 0) {
      return;
    }
    readStateFromControls();
    var hitTarget = canvasTargetAtPointer(event, lastPreviewResult);
    if (!hitTarget) {
      hideCanvasSelection();
      return;
    }
    selectLayer(hitTarget, { showSelection: true, render: false });
    var hitLayer = getActiveLayer();
    if (!hitLayer || hitLayer.locked) {
      return;
    }
    canvasSelectionVisible = true;
    setDragTarget(hitLayer.id);
    canvasDragging = true;
    canvasDragStart = {
      target: hitLayer.id,
      clientX: event.clientX,
      clientY: event.clientY,
      x: hitLayer.x,
      y: hitLayer.y
    };
    elements.canvasFrame.classList.add("dragging");
    if (elements.canvas.setPointerCapture) {
      elements.canvas.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
  });

  elements.canvas.addEventListener("pointermove", function (event) {
    if (canvasDragging) {
      moveCanvasTargetFromPointer(event);
    }
  });

  function finishCanvasDrag(event) {
    if (!canvasDragging) {
      return;
    }
    canvasDragging = false;
    canvasDragStart = null;
    elements.canvasFrame.classList.remove("dragging");
    if (
      elements.canvas.hasPointerCapture &&
      elements.canvas.hasPointerCapture(event.pointerId)
    ) {
      elements.canvas.releasePointerCapture(event.pointerId);
    }
    syncSelectedLayerControls(getActiveLayer());
    renderLayerList();
    scheduleHistoryCapture();
  }

  elements.canvas.addEventListener("pointerup", finishCanvasDrag);
  elements.canvas.addEventListener("pointercancel", finishCanvasDrag);

  document.addEventListener(
    "pointerdown",
    function (event) {
      var target = event.target;
      var insideCanvas = target === elements.canvas;
      var insideSelection = elements.canvasSelection.contains(target);
      if (!insideCanvas && !insideSelection) {
        hideCanvasSelection();
      }
    },
    true
  );

  elements.downloadButton.addEventListener("click", function () {
    if (hasAnimatedLayers()) {
      downloadGifArtwork();
    } else {
      downloadArtwork();
    }
  });
  elements.cacheRefreshButton.addEventListener("click", refreshSiteCache);
  elements.undoButton.addEventListener("click", undoHistory);
  elements.redoButton.addEventListener("click", redoHistory);
  elements.mobileUndoButton.addEventListener("click", undoHistory);
  elements.mobileRedoButton.addEventListener("click", redoHistory);
  elements.aboutButton.addEventListener("click", openAboutDialog);
  elements.aboutBackdrop.addEventListener("click", closeAboutDialog);
  elements.aboutCloseButton.addEventListener("click", closeAboutDialog);
  elements.welcomeStartButton.addEventListener("click", closeWelcomeDialog);
  if (elements.mobileCacheRefreshButton) {
    elements.mobileCacheRefreshButton.addEventListener(
      "click",
      refreshSiteCache
    );
  }
  elements.saveAssistBackdrop.addEventListener("click", closeSaveAssist);
  elements.saveAssistCloseButton.addEventListener("click", closeSaveAssist);
  elements.closeSavedImageButton.addEventListener("click", closeSaveAssist);
  elements.systemSaveButton.addEventListener("click", sharePendingArtwork);
  elements.openSavedImageButton.addEventListener(
    "click",
    openPendingArtwork
  );

  document.addEventListener("keydown", function (event) {
    if (isWelcomeDialogOpen()) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWelcomeDialog();
      } else if (event.key === "Tab") {
        trapWelcomeDialogFocus(event);
      }
      return;
    }
    var key = String(event.key).toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        redoHistory();
      } else {
        undoHistory();
      }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === "y") {
      event.preventDefault();
      redoHistory();
      return;
    }
    if (
      event.key === "Escape" &&
      elements.aboutDialog &&
      !elements.aboutDialog.hidden
    ) {
      closeAboutDialog();
      return;
    }
    if (
      event.key === "Escape" &&
      elements.saveAssist &&
      !elements.saveAssist.hidden
    ) {
      closeSaveAssist();
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      stopGifPreviewLoop();
    } else {
      startGifPreviewLoop();
    }
  });

  function refreshCanvasGeometry() {
    fitCanvasFrame(dimensionsFromValue(state.canvasSize));
    updateCanvasSelection(lastPreviewResult);
    anchorFixedViewport(false);
  }

  if (window.ResizeObserver) {
    canvasStageResizeObserver = new ResizeObserver(refreshCanvasGeometry);
    canvasStageResizeObserver.observe(elements.canvasStage);
  }
  window.addEventListener("resize", refreshCanvasGeometry);
  if (stackedEditorQuery.addEventListener) {
    stackedEditorQuery.addEventListener(
      "change",
      normalizeEditorSectionForViewport
    );
  } else if (stackedEditorQuery.addListener) {
    stackedEditorQuery.addListener(normalizeEditorSectionForViewport);
  }
  window.addEventListener(
    "scroll",
    function () {
      anchorFixedViewport(false);
    },
    { passive: true }
  );
  window.addEventListener("pageshow", function () {
    setCacheRefreshLoading(false);
    anchorFixedViewportAfterLayout(true);
  });
  window.addEventListener("pagehide", function () {
    if (pendingSaveObjectUrl) {
      elements.savedImagePreview.removeAttribute("src");
      releasePendingSave(0);
    }
  });

  window.addEventListener("lettering-atlas-glyph-ready", scheduleRender);
  window.addEventListener("lettering-atlas-glyph-failed", function () {
    // The next render starts only the browser fallback font needed for the
    // affected glyph. Re-render once that font finishes loading.
    scheduleRender();
    if (document.fonts && document.fonts.ready) {
      Promise.resolve(document.fonts.ready).then(scheduleRender, function () {});
    }
  });

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }
  anchorFixedViewportAfterLayout(true);
  applyStateToControls();
  setEditorSection(activeEditorSection, { resetScroll: false });
  renderPreviewSafely();
  initializeHistory();
  restoreCachedOverlay();
  updateBrowserCompatibilityTip();
  openWelcomeDialog();

  if (styleEngine) {
    vectorEngineReady = Promise.resolve()
      .then(function () {
        return styleEngine.init(
          {},
          "./assets/font-atlas/runtime-glyph-index.json?v=5",
          function (progress) {
            setFontLoadingProgress(progress * 92);
          }
        );
      })
      .then(function () {
        scheduleRender();
      })
      .catch(function (error) {
        console.warn("Vector lettering engine unavailable; using canvas fonts.", error);
        showFontLoadingError(error);
        return null;
      });
  } else {
    vectorEngineReady = Promise.resolve(null);
    showFontLoadingError(new Error("Lettering style engine is unavailable"));
  }
  if (document.fonts && document.fonts.ready) {
    logoFontsReady = Promise.resolve(document.fonts.ready)
      .then(function () {
        scheduleRender();
      })
      .catch(function (error) {
        console.warn("A browser fallback font did not finish loading.", error);
        return null;
      });
    if (document.fonts.addEventListener) {
      document.fonts.addEventListener("loadingdone", scheduleRender);
    }
  } else {
    logoFontsReady = Promise.resolve(null);
  }
  finishInitialFontLoading();
})();
