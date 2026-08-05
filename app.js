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
    density: 64,
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
    overlayLocked: true,
    seed: 147
  };

  var state = Object.assign({}, defaults);
  var renderFrame = 0;
  var toastTimer = 0;
  var logoFontsReady = null;
  var vectorEngineReady = null;
  var styleEngine = window.LetteringStyleEngine || null;
  var overlayImage = null;
  var overlayFileName = "";
  var overlayFileBytes = 0;
  var overlayObjectUrl = "";
  var activeDragTarget = "artwork";
  var canvasSelectionVisible = false;
  var canvasDragging = false;
  var canvasDragStart = null;
  var canvasHandleDrag = null;
  var lastPreviewResult = null;
  var canvasStageResizeObserver = null;
  var localAssetDbPromise = null;
  var fontLoadingPercent = 0;
  var fontLoadingHideTimer = 0;
  var initialFontLoadingError = null;

  var elements = {
    canvas: document.getElementById("logoCanvas"),
    canvasStage: document.getElementById("canvasStage"),
    canvasFrame: document.getElementById("canvasFrame"),
    canvasCornerLabel: document.getElementById("canvasCornerLabel"),
    canvasSelection: document.getElementById("canvasSelection"),
    canvasSelectionLabel: document.getElementById("canvasSelectionLabel"),
    canvasRotationHandle: document.getElementById("canvasRotationHandle"),
    canvasScaleHandle: document.getElementById("canvasScaleHandle"),
    canvasResetButton: document.getElementById("canvasResetButton"),
    controlPanel: document.querySelector(".control-panel"),
    line1: document.getElementById("line1"),
    line2: document.getElementById("line2"),
    subtitle: document.getElementById("subtitle"),
    line1Count: document.getElementById("line1Count"),
    line2Count: document.getElementById("line2Count"),
    subtitleCount: document.getElementById("subtitleCount"),
    canvasSize: document.getElementById("canvasSize"),
    canvasRatioPicker: document.getElementById("canvasRatioPicker"),
    autoCanvasRatioButton: document.getElementById("autoCanvasRatioButton"),
    autoCanvasRatioShape: document.getElementById("autoCanvasRatioShape"),
    density: document.getElementById("density"),
    densityValue: document.getElementById("densityValue"),
    lineGap: document.getElementById("lineGap"),
    lineGapValue: document.getElementById("lineGapValue"),
    subtitleGap: document.getElementById("subtitleGap"),
    subtitleGapValue: document.getElementById("subtitleGapValue"),
    artworkScale: document.getElementById("artworkScale"),
    artworkScaleValue: document.getElementById("artworkScaleValue"),
    artworkX: document.getElementById("artworkX"),
    artworkXValue: document.getElementById("artworkXValue"),
    artworkY: document.getElementById("artworkY"),
    artworkYValue: document.getElementById("artworkYValue"),
    artworkRotation: document.getElementById("artworkRotation"),
    artworkRotationValue: document.getElementById("artworkRotationValue"),
    resetArtworkButton: document.getElementById("resetArtworkButton"),
    titleShadowEnabled: document.getElementById("titleShadowEnabled"),
    titleShadowControls: document.getElementById("titleShadowControls"),
    titleShadowColor: document.getElementById("titleShadowColor"),
    titleShadowColorValue: document.getElementById("titleShadowColorValue"),
    titleShadowOpacity: document.getElementById("titleShadowOpacity"),
    titleShadowOpacityValue: document.getElementById("titleShadowOpacityValue"),
    titleShadowOffsetY: document.getElementById("titleShadowOffsetY"),
    titleShadowOffsetYValue: document.getElementById("titleShadowOffsetYValue"),
    titleShadowBlur: document.getElementById("titleShadowBlur"),
    titleShadowBlurValue: document.getElementById("titleShadowBlurValue"),
    dragArtworkButton: document.getElementById("dragArtworkButton"),
    dragOverlayButton: document.getElementById("dragOverlayButton"),
    outline: document.getElementById("outline"),
    primaryColor: document.getElementById("primaryColor"),
    primaryColorValue: document.getElementById("primaryColorValue"),
    accentColor: document.getElementById("accentColor"),
    accentColorValue: document.getElementById("accentColorValue"),
    skyColor: document.getElementById("skyColor"),
    skyColorValue: document.getElementById("skyColorValue"),
    overlayFile: document.getElementById("overlayFile"),
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
    exportDescription: document.getElementById("exportDescription"),
    renderStatus: document.getElementById("renderStatus"),
    downloadButton: document.getElementById("downloadButton"),
    resetButton: document.getElementById("resetButton"),
    shuffleButton: document.getElementById("shuffleButton"),
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
    elements.fontLoadingLabel.textContent = "字体加载失败，请刷新重试";
    elements.fontLoadingPercent.textContent = "";
    elements.fontLoadingPopover.classList.remove("is-complete", "is-hidden");
    elements.fontLoadingPopover.classList.add("is-error");
    elements.fontLoadingTrack.setAttribute(
      "aria-valuetext",
      "字体加载失败，请刷新重试"
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
                reject(new Error("Unable to load initial atlas glyphs"));
                return;
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
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
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

  function canvasSizeFromOverlayImage() {
    if (!overlayImage || !overlayImage.naturalWidth || !overlayImage.naturalHeight) {
      return defaults.canvasSize;
    }
    var ratio = clamp(
      overlayImage.naturalWidth / overlayImage.naturalHeight,
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
    if (!overlayImage || !overlayImage.naturalWidth || !overlayImage.naturalHeight) {
      elements.autoCanvasRatioShape.style.removeProperty("width");
      elements.autoCanvasRatioShape.style.removeProperty("height");
      return;
    }
    var ratio = clamp(
      overlayImage.naturalWidth / overlayImage.naturalHeight,
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
    var hasImage = Boolean(overlayImage);
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
      if (!overlayImage) {
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
  }

  function fitCanvasFrame(dimensions) {
    if (!elements.canvasStage || !elements.canvasFrame) {
      return;
    }
    var availableWidth = elements.canvasStage.clientWidth;
    var availableHeight = elements.canvasStage.clientHeight;
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

  function writeCachedOverlay(file, name) {
    return openLocalAssetDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction("assets", "readwrite");
        transaction.objectStore("assets").put(
          {
            blob: file,
            name: name || file.name || "这张图片",
            size: file.size || 0,
            type: file.type || "image/png",
            savedAt: Date.now()
          },
          "overlay-image"
        );
        transaction.oncomplete = resolve;
        transaction.onerror = function () {
          reject(transaction.error || new Error("Unable to cache overlay"));
        };
      });
    });
  }

  function readCachedOverlay() {
    return openLocalAssetDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction("assets", "readonly");
        var request = transaction.objectStore("assets").get("overlay-image");
        request.onsuccess = function () {
          resolve(request.result || null);
        };
        request.onerror = function () {
          reject(request.error || new Error("Unable to read overlay cache"));
        };
      });
    });
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
    state.artworkScale = defaults.artworkScale;
    state.artworkX = defaults.artworkX;
    state.artworkY = defaults.artworkY;
    state.artworkRotation = defaults.artworkRotation;
    if (elements.artworkScale) {
      elements.artworkScale.value = state.artworkScale;
      elements.artworkX.value = state.artworkX;
      elements.artworkY.value = state.artworkY;
      elements.artworkRotation.value = state.artworkRotation;
    }
  }

  function updateDragTargetInterface() {
    var artworkActive = activeDragTarget === "artwork";
    var overlayActiveAndLocked =
      !artworkActive && Boolean(overlayImage) && state.overlayLocked;
    elements.dragArtworkButton.classList.toggle("active", artworkActive);
    elements.dragArtworkButton.setAttribute("aria-pressed", String(artworkActive));
    elements.dragOverlayButton.classList.toggle("active", !artworkActive);
    elements.dragOverlayButton.setAttribute("aria-pressed", String(!artworkActive));
    elements.canvasResetButton.disabled = overlayActiveAndLocked;
    elements.canvasFrame.classList.toggle(
      "active-overlay-locked",
      overlayActiveAndLocked
    );
    elements.canvas.setAttribute(
      "title",
      artworkActive
        ? "拖动文字与装饰"
        : overlayActiveAndLocked
          ? "图片已锁定"
          : "拖动加入的图片"
    );
  }

  function setDragTarget(target) {
    activeDragTarget =
      target === "overlay" && overlayImage && !state.overlayLocked
        ? "overlay"
        : "artwork";
    updateDragTargetInterface();
    updateCanvasSelection(lastPreviewResult);
  }

  function setOverlayLocked(locked, notifyUser) {
    if (!overlayImage) {
      return;
    }
    state.overlayLocked = Boolean(locked);
    canvasDragging = false;
    canvasDragStart = null;
    canvasHandleDrag = null;
    elements.canvasFrame.classList.remove("dragging", "manipulating");
    hideCanvasSelection();
    updateOverlayInterface();
    setDragTarget(state.overlayLocked ? "artwork" : "overlay");
    scheduleRender();
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
  }

  function clearOverlayImage(resetTransform, preserveLocalCache) {
    if (overlayObjectUrl) {
      URL.revokeObjectURL(overlayObjectUrl);
    }
    overlayImage = null;
    overlayFileName = "";
    overlayFileBytes = 0;
    overlayObjectUrl = "";
    state.overlayLocked = defaults.overlayLocked;
    if (state.canvasRatioMode === "auto") {
      state.canvasRatioMode = defaults.canvasRatioMode;
      state.canvasSize = defaults.canvasSize;
      elements.canvasSize.value = state.canvasSize;
    }
    canvasDragging = false;
    canvasDragStart = null;
    canvasHandleDrag = null;
    elements.canvasFrame.classList.remove("dragging", "manipulating");
    hideCanvasSelection();
    setDragTarget("artwork");
    if (elements.overlayFile) {
      elements.overlayFile.value = "";
    }
    if (elements.overlayThumbnail) {
      elements.overlayThumbnail.removeAttribute("src");
    }
    if (resetTransform !== false) {
      resetOverlayTransform();
    }
    if (!preserveLocalCache) {
      deleteCachedOverlay().catch(function (error) {
        console.warn("Could not clear the browser-local image cache.", error);
      });
    }
    updateOverlayInterface();
    updateCanvasRatioInterface();
    anchorFixedViewportAfterLayout(false);
  }

  function loadOverlayFile(file, options) {
    options = options || {};
    if (!file) {
      return;
    }
    var supportedType = /^(image\/png|image\/jpeg|image\/webp)$/i.test(
      file.type || ""
    );
    var supportedName = /\.(png|jpe?g|webp)$/i.test(
      options.name || file.name || ""
    );
    if (!supportedType && !supportedName) {
      showToast("请选择 PNG、JPG 或 WebP 图片");
      elements.overlayFile.value = "";
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast("图片不能超过 25 MB");
      elements.overlayFile.value = "";
      return;
    }

    var objectUrl = URL.createObjectURL(file);
    var image = new Image();
    image.decoding = "async";
    image.onload = function () {
      if (overlayObjectUrl) {
        URL.revokeObjectURL(overlayObjectUrl);
      }
      overlayImage = image;
      overlayFileName = options.name || file.name || "这张图片";
      overlayFileBytes = options.size || file.size || 0;
      overlayObjectUrl = objectUrl;
      state.overlayLocked = defaults.overlayLocked;
      hideCanvasSelection();
      state.canvasRatioMode = "auto";
      state.canvasSize = canvasSizeFromOverlayImage();
      elements.canvasSize.value = state.canvasSize;
      if (options.resetTransform !== false) {
        resetOverlayTransform();
      }
      elements.overlayThumbnail.src = objectUrl;
      elements.overlayFile.value = "";
      updateOverlayInterface();
      updateCanvasRatioInterface();
      if (!options.silent) {
        setDragTarget("artwork");
      }
      scheduleRender();
      if (options.persist !== false) {
        writeCachedOverlay(file, overlayFileName).catch(function (error) {
          console.warn("Could not cache the image in this browser.", error);
        });
      }
      if (!options.silent) {
        showToast("图片已加入");
      }
      anchorFixedViewportAfterLayout(false);
    };
    image.onerror = function () {
      URL.revokeObjectURL(objectUrl);
      elements.overlayFile.value = "";
      showToast("无法读取这张图片");
    };
    image.src = objectUrl;
  }

  function restoreCachedOverlay() {
    readCachedOverlay()
      .then(function (cached) {
        if (!cached || !cached.blob) {
          return;
        }
        loadOverlayFile(cached.blob, {
          name: cached.name,
          size: cached.size,
          persist: false,
          resetTransform: false,
          silent: true
        });
      })
      .catch(function (error) {
        console.warn("Could not restore the browser-local image cache.", error);
      });
  }

  function updateOverlayInterface() {
    if (!elements.overlayControls) {
      return;
    }
    var hasImage = Boolean(overlayImage);
    var locked = hasImage && state.overlayLocked;
    elements.overlayControls.hidden = !hasImage;
    elements.overlayControls.classList.toggle("is-locked", locked);
    elements.removeOverlayButton.disabled = !hasImage;
    elements.overlayThumbnail.hidden = !hasImage;
    elements.overlayPlaceholder.hidden = hasImage;
    elements.canvasFrame.classList.toggle("has-overlay", hasImage);
    elements.canvasFrame.classList.toggle("dragging", canvasDragging);
    elements.dragOverlayButton.disabled = !hasImage || locked;
    elements.overlayLockButton.disabled = !hasImage;
    elements.overlayLockButton.setAttribute(
      "aria-pressed",
      String(hasImage ? state.overlayLocked : true)
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
    if ((!hasImage || locked) && activeDragTarget === "overlay") {
      activeDragTarget = "artwork";
    }
    updateDragTargetInterface();

    if (hasImage) {
      elements.overlayFileName.textContent = overlayFileName;
      elements.overlayFileMeta.textContent =
        overlayImage.naturalWidth +
        " × " +
        overlayImage.naturalHeight +
        " px · " +
        formatFileSize(overlayFileBytes);
    } else {
      elements.overlayFileName.textContent = "还没有添加图片";
      elements.overlayFileMeta.textContent =
        "PNG、JPG 或 WebP · 25 MB 以内";
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

  function drawOverlayImage(ctx, width, height) {
    if (!overlayImage || !overlayImage.naturalWidth || !overlayImage.naturalHeight) {
      return;
    }
    var drawWidth = width * (state.overlayScale / 100);
    var drawHeight =
      drawWidth * (overlayImage.naturalHeight / overlayImage.naturalWidth);
    var centerX = width * (state.overlayX / 100);
    var centerY = height * (state.overlayY / 100);

    ctx.save();
    ctx.globalAlpha = clamp(state.overlayOpacity / 100, 0, 1);
    ctx.translate(centerX, centerY);
    ctx.rotate((state.overlayRotation * Math.PI) / 180);
    ctx.drawImage(
      overlayImage,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
    ctx.restore();
  }

  function artworkTransformScale(width, height) {
    var fittedBaseScale = width / height >= 1.98 ? 0.88 : 0.94;
    return fittedBaseScale * clamp(state.artworkScale / 100, 0.4, 1.8);
  }

  function applyArtworkTransform(ctx, width, height) {
    var scale = artworkTransformScale(width, height);
    ctx.translate(
      width * (state.artworkX / 100),
      height * (state.artworkY / 100)
    );
    ctx.rotate((state.artworkRotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);
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

    if (target === "overlay") {
      if (
        state.overlayLocked ||
        !overlayImage ||
        !overlayImage.naturalWidth ||
        !overlayImage.naturalHeight
      ) {
        return null;
      }
      var overlayWidth = width * (state.overlayScale / 100);
      return {
        centerX: width * (state.overlayX / 100),
        centerY: height * (state.overlayY / 100),
        width: overlayWidth,
        height:
          overlayWidth *
          (overlayImage.naturalHeight / overlayImage.naturalWidth),
        angle: state.overlayRotation,
        label:
          "图片 · " +
          Math.round(state.overlayScale) +
          "% · " +
          Math.round(state.overlayRotation) +
          "°"
      };
    }

    var bounds = result.artworkBounds;
    if (!bounds) {
      return null;
    }
    var scale = artworkTransformScale(width, height);
    var boundsCenterX = (bounds.left + bounds.right) / 2;
    var boundsCenterY = (bounds.top + bounds.bottom) / 2;
    var offsetX = (boundsCenterX - width / 2) * scale;
    var offsetY = (boundsCenterY - height / 2) * scale;
    var radians = (state.artworkRotation * Math.PI) / 180;
    return {
      centerX:
        width * (state.artworkX / 100) +
        offsetX * Math.cos(radians) -
        offsetY * Math.sin(radians),
      centerY:
        height * (state.artworkY / 100) +
        offsetX * Math.sin(radians) +
        offsetY * Math.cos(radians),
      width: (bounds.right - bounds.left) * scale,
      height: (bounds.bottom - bounds.top) * scale,
      angle: state.artworkRotation,
      label:
        "文字 · " +
        Math.round(state.artworkScale) +
        "% · " +
        Math.round(state.artworkRotation) +
        "°"
    };
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
    var targets = activeDragTarget === "overlay"
      ? ["overlay", "artwork"]
      : ["artwork", "overlay"];

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
    elements.canvasSelectionLabel.textContent = geometry.label;
    elements.canvasSelection.setAttribute("aria-label", geometry.label);
  }

  function beginCanvasHandleDrag(event, mode) {
    if (event.button !== 0) {
      return;
    }
    readStateFromControls();
    if (activeDragTarget === "overlay" && state.overlayLocked) {
      return;
    }
    if (activeDragTarget === "overlay" && !overlayImage) {
      setDragTarget("artwork");
    }

    var rect = elements.canvas.getBoundingClientRect();
    var x = activeDragTarget === "overlay" ? state.overlayX : state.artworkX;
    var y = activeDragTarget === "overlay" ? state.overlayY : state.artworkY;
    var centerX = rect.left + rect.width * (x / 100);
    var centerY = rect.top + rect.height * (y / 100);
    var deltaX = event.clientX - centerX;
    var deltaY = event.clientY - centerY;

    canvasHandleDrag = {
      mode: mode,
      target: activeDragTarget,
      pointerId: event.pointerId,
      element: event.currentTarget,
      centerX: centerX,
      centerY: centerY,
      startDistance: Math.max(1, Math.hypot(deltaX, deltaY)),
      startAngle: Math.atan2(deltaY, deltaX),
      startScale:
        activeDragTarget === "overlay" ? state.overlayScale : state.artworkScale,
      startRotation:
        activeDragTarget === "overlay"
          ? state.overlayRotation
          : state.artworkRotation
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

    if (canvasHandleDrag.mode === "scale") {
      var distance = Math.max(1, Math.hypot(deltaX, deltaY));
      var min = canvasHandleDrag.target === "overlay" ? 5 : 40;
      var max = canvasHandleDrag.target === "overlay" ? 200 : 180;
      var scale = clamp(
        Math.round(
          canvasHandleDrag.startScale *
            (distance / canvasHandleDrag.startDistance)
        ),
        min,
        max
      );
      if (canvasHandleDrag.target === "overlay") {
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
      if (canvasHandleDrag.target === "overlay") {
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
    event.preventDefault();
    event.stopPropagation();
  }

  function moveCanvasTargetFromPointer(event) {
    if (!canvasDragStart) {
      return;
    }
    if (canvasDragStart.target === "overlay" && state.overlayLocked) {
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

    if (canvasDragStart.target === "overlay") {
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

    ctx.font = config.weight + " " + fontSize + "px " + config.family;
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
    return {
      glyphs: null,
      totalWidth: ctx.measureText(text).width
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
      glyphs: bestLayout.glyphs
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

  function drawReferenceClusters(ctx, width, height, seed) {
    var density = state.density / 100;
    if (density < 0.12) {
      return;
    }

    var random = mulberry32(seed ^ 0x6cc918);
    var base = Math.min(width, height);
    var blue = state.primaryColor;
    var sky = state.skyColor;
    var yellow = state.accentColor;
    var outline = mixColor(state.primaryColor, "#ffffff", 0.28);

    ctx.save();
    ctx.globalAlpha = clamp(0.55 + density * 0.45, 0, 1);

    drawStar(ctx, width * 0.045, height * 0.52, base * 0.05, outline, 5, true, -0.18);
    drawStar(ctx, width * 0.06, height * 0.65, base * 0.034, sky, 5, false, -0.35);
    drawStar(ctx, width * 0.125, height * 0.67, base * 0.023, yellow, 5, false, 0.18);
    drawSparkle(ctx, width * 0.075, height * 0.77, base * 0.018, blue, 0.08);

    drawStar(ctx, width * 0.9, height * 0.57, base * 0.043, yellow, 5, false, 0.12);
    drawStar(ctx, width * 0.968, height * 0.56, base * 0.055, outline, 5, true, 0.08);
    drawStar(ctx, width * 0.92, height * 0.7, base * 0.025, sky, 5, false, -0.14);
    drawSparkle(ctx, width * 0.965, height * 0.75, base * 0.015, blue, 0.12);

    if (density > 0.38) {
      drawStar(ctx, width * 0.69, height * 0.145, base * 0.025, blue, 6, true, random());
      drawStar(ctx, width * 0.9, height * 0.1, base * 0.022, blue, 6, true, random());
      drawSparkle(ctx, width * 0.31, height * 0.12, base * 0.013, sky, random());
      drawSparkle(ctx, width * 0.55, height * 0.105, base * 0.011, blue, random());
    }

    ctx.restore();
  }

  function drawLowerConfetti(ctx, width, height, seed, exclusionRects) {
    var density = state.density / 100;
    if (density < 0.18) {
      return;
    }

    var random = mulberry32(seed ^ 0x9e2391);
    var base = Math.min(width, height);
    var count = Math.round(7 + density * 10);
    var palette = [
      state.primaryColor,
      state.skyColor,
      state.accentColor,
      mixColor(state.primaryColor, "#ffffff", 0.4)
    ];

    for (var i = 0; i < count; i += 1) {
      var progress = count === 1 ? 0.5 : i / (count - 1);
      var x = width * (0.075 + progress * 0.85);
      var y = height * (0.75 + (random() - 0.5) * 0.085);
      var radius = base * (0.006 + random() * 0.009);
      var blocked = exclusionRects.some(function (rect) {
        return pointTouchesRect(x, y, radius * 1.15, rect);
      });
      if (blocked) {
        continue;
      }

      var color = palette[Math.floor(random() * palette.length)];
      var type = i % 3;
      if (type === 0) {
        drawSparkle(ctx, x, y, radius, color, random() * 0.5);
      } else if (type === 1) {
        drawStar(ctx, x, y, radius, color, 5, false, random());
      } else {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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

  function drawUnderlineSwash(ctx, line, centerX, color) {
    var startX = centerX + line.left + line.totalWidth * 0.06;
    var length = Math.min(line.totalWidth * 0.28, line.fontSize * 1.5);
    var y = line.bottom + line.fontSize * 0.06;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2.5, line.fontSize * 0.025);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.bezierCurveTo(
      startX + length * 0.23,
      y + line.fontSize * 0.08,
      startX + length * 0.7,
      y + line.fontSize * 0.1,
      startX + length,
      y - line.fontSize * 0.03
    );
    ctx.stroke();
    ctx.restore();
  }

  function drawDecorations(ctx, width, height, exclusionRects, seed) {
    var density = state.density / 100;
    if (density <= 0) {
      return;
    }

    var random = mulberry32(seed ^ 0xa71f23d);
    var base = Math.min(width, height);
    var palette = [
      state.primaryColor,
      state.skyColor,
      state.accentColor,
      mixColor(state.primaryColor, "#ffffff", 0.43)
    ];
    var candidates = [
      [0.055, 0.18],
      [0.12, 0.11],
      [0.2, 0.17],
      [0.29, 0.08],
      [0.4, 0.13],
      [0.51, 0.075],
      [0.61, 0.14],
      [0.72, 0.09],
      [0.82, 0.15],
      [0.93, 0.1],
      [0.965, 0.28],
      [0.045, 0.34],
      [0.08, 0.48],
      [0.045, 0.64],
      [0.105, 0.75],
      [0.2, 0.78],
      [0.31, 0.72],
      [0.42, 0.79],
      [0.55, 0.73],
      [0.67, 0.78],
      [0.79, 0.72],
      [0.89, 0.78],
      [0.96, 0.65],
      [0.92, 0.49],
      [0.86, 0.34],
      [0.16, 0.34],
      [0.75, 0.31],
      [0.27, 0.52],
      [0.73, 0.53],
      [0.51, 0.48]
    ];

    for (var i = candidates.length - 1; i > 0; i -= 1) {
      var swapIndex = Math.floor(random() * (i + 1));
      var temporary = candidates[i];
      candidates[i] = candidates[swapIndex];
      candidates[swapIndex] = temporary;
    }

    var wanted = Math.round(8 + density * 23);
    var drawn = 0;
    for (var j = 0; j < candidates.length && drawn < wanted; j += 1) {
      var x = candidates[j][0] * width;
      var y = candidates[j][1] * height;
      var radius = base * (0.014 + random() * 0.025);
      var blocked = exclusionRects.some(function (rect) {
        return pointTouchesRect(x, y, radius * 1.4, rect);
      });
      if (blocked) {
        continue;
      }

      var color = palette[Math.floor(random() * palette.length)];
      var type = Math.floor(random() * 5);
      var rotation = random() * Math.PI;
      if (type === 0) {
        drawStar(ctx, x, y, radius, color, 5, false, rotation);
      } else if (type === 1) {
        drawStar(ctx, x, y, radius, color, 6, true, rotation);
      } else if (type === 2) {
        drawSparkle(ctx, x, y, radius * 0.95, color, rotation);
      } else if (type === 3) {
        drawRing(ctx, x, y, radius * 0.8, color);
      } else {
        drawDotCluster(ctx, x, y, radius * 1.1, color, random);
      }
      drawn += 1;
    }
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
      line.config.weight + " " + line.fontSize + "px " + line.config.family;
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    line.glyphs.forEach(function (glyph) {
      if (glyph.whitespace) {
        x += glyph.advance;
        return;
      }

      var glyphWidth = glyph.naturalWidth * glyph.scaleX;
      ctx.save();
      ctx.translate(
        x + glyphWidth / 2,
        line.y + glyph.yOffset + (shadowPass ? state.titleShadowOffsetY : 0)
      );
      ctx.rotate(glyph.rotation);
      ctx.scale(glyph.scaleX, glyph.scaleY);
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

      if (!vectorDrawn) {
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

  function strokeLetteringPath(ctx, path, width, color, outlineColor) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (state.outline) {
      ctx.strokeStyle = rgba(outlineColor, 0.96);
      ctx.lineWidth = width + Math.max(2.2, width * 0.23);
      ctx.stroke(path);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke(path);
    ctx.restore();
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
      state.density < 8
    ) {
      return;
    }

    var anchors = glyphAnchors(line, centerX);
    if (!anchors.length) {
      return;
    }

    var amount = state.irregularity / 100;
    var density = state.density / 100;
    var size = line.fontSize;
    var main = state.primaryColor;
    var outlineColor = mixColor(state.skyColor, "#ffffff", 0.76);
    var first = anchors[0];
    var last = anchors[anchors.length - 1];
    var firstAtlasMeta =
      first.glyph.fontKey && first.glyph.fontKey.indexOf("atlas:") === 0 && styleEngine
      ? styleEngine.getAtlasMeta(first.glyph.char, template)
      : null;
    var lastAtlasMeta =
      last.glyph.fontKey && last.glyph.fontKey.indexOf("atlas:") === 0 && styleEngine
      ? styleEngine.getAtlasMeta(last.glyph.char, template)
      : null;

    if (
      template.attachments.firstHook &&
      amount > 0.14 &&
      !firstAtlasMeta
    ) {
      var hook = new Path2D();
      var hookY = first.top + size * 0.23;
      hook.moveTo(first.left + size * 0.31, hookY + size * 0.06);
      hook.bezierCurveTo(
        first.left - size * 0.07,
        hookY + size * 0.11,
        first.left - size * 0.17,
        hookY - size * 0.22,
        first.left + size * 0.03,
        hookY - size * 0.25
      );
      hook.bezierCurveTo(
        first.left + size * 0.2,
        hookY - size * 0.26,
        first.left + size * 0.21,
        hookY - size * 0.05,
        first.left + size * 0.09,
        hookY - size * 0.04
      );
      strokeLetteringPath(
        ctx,
        hook,
        Math.max(4, size * (0.055 + amount * 0.012)),
        main,
        outlineColor
      );
    }

    if (firstAtlasMeta && firstAtlasMeta.firstHook && density > 0.22) {
      drawSideCurl(
        ctx,
        first.left - size * 0.045,
        first.baseline + size * 0.09,
        size * 0.3,
        1,
        main
      );
    }

    if (
      template.attachments.terminalCurl &&
      amount > 0.08 &&
      !(lastAtlasMeta && lastAtlasMeta.terminalCurl)
    ) {
      var curl = new Path2D();
      var curlStartX = last.right - size * 0.15;
      var curlY = last.baseline - size * 0.01;
      curl.moveTo(curlStartX, curlY);
      curl.bezierCurveTo(
        last.right + size * 0.18,
        curlY + size * 0.3,
        last.right + size * 0.5,
        curlY + size * 0.22,
        last.right + size * 0.43,
        curlY - size * 0.02
      );
      curl.bezierCurveTo(
        last.right + size * 0.39,
        curlY - size * 0.18,
        last.right + size * 0.2,
        curlY - size * 0.16,
        last.right + size * 0.25,
        curlY - size * 0.03
      );
      strokeLetteringPath(
        ctx,
        curl,
        Math.max(3.4, size * 0.033),
        main,
        outlineColor
      );
    }

    if (template.attachments.underlineTail && lineIndex > 0 && anchors.length > 1) {
      var tail = new Path2D();
      var tailStart = last.left + size * 0.18;
      var tailY = last.baseline - size * 0.03;
      tail.moveTo(tailStart, tailY);
      tail.bezierCurveTo(
        last.left + size * 0.06,
        tailY + size * 0.52,
        last.left - size * 0.43,
        tailY + size * 0.57,
        last.left - size * 0.4,
        tailY + size * 0.27
      );
      tail.bezierCurveTo(
        last.left - size * 0.38,
        tailY + size * 0.08,
        last.left - size * 0.18,
        tailY + size * 0.11,
        last.left - size * 0.25,
        tailY + size * 0.26
      );
      strokeLetteringPath(
        ctx,
        tail,
        Math.max(4, size * 0.052),
        main,
        outlineColor
      );
    }

    if (template.attachments.topFlowers && density > 0.3 && anchors.length > 2) {
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

      if (lineIndex > 0 && anchors.length > 4 && density > 0.56) {
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
    var tracked = Boolean(subtitle.glyphs);
    ctx.save();
    ctx.font =
      subtitle.weight + " " + subtitle.fontSize + "px " + subtitle.family;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = tracked ? "left" : "center";
    ctx.lineJoin = "round";

    function drawTrackedGlyphs(method) {
      var x = centerX - subtitle.totalWidth / 2;
      subtitle.glyphs.forEach(function (glyph) {
        ctx[method](glyph.char, x, subtitle.y);
        x += glyph.advance;
      });
    }

    if (state.outline) {
      ctx.strokeStyle = rgba(mixColor(state.skyColor, "#ffffff", 0.83), 0.86);
      ctx.lineWidth = Math.max(1.3, subtitle.fontSize * 0.024);
      if (tracked) {
        drawTrackedGlyphs("strokeText");
      } else {
        ctx.strokeText(subtitle.text, centerX, subtitle.y);
      }
    }

    ctx.fillStyle = color;
    if (tracked) {
      drawTrackedGlyphs("fillText");
    } else {
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

  function renderArtwork(canvas, scale) {
    var dimensions = dimensionsFromValue(state.canvasSize);
    var width = dimensions.width;
    var height = dimensions.height;
    var pixelScale = scale || 1;

    canvas.width = Math.round(width * pixelScale);
    canvas.height = Math.round(height * pixelScale);
    if (canvas === elements.canvas) {
      canvas.style.aspectRatio = width + " / " + height;
    }

    var ctx = canvas.getContext("2d", { alpha: true });
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
    var activeTemplate = styleEngine
      ? styleEngine.getTemplate(state.fontStyle)
      : null;
    var runtimeAtlasMode = Boolean(
      activeTemplate && activeTemplate.atlasEnabled
    );
    var activeTitleCount = (line1Text ? 1 : 0) + (line2Text ? 1 : 0);
    var centerX = width / 2;
    var combinedSeed =
      (state.seed +
        hashString(line1Text + "|" + line2Text + "|" + subtitleText)) >>>
      0;
    var titleLines = [];
    var referenceRatio = width / height >= 1.98;

    if (activeTitleCount === 2) {
      var firstLineY =
        height *
        (subtitleText
          ? referenceRatio
            ? 0.36
            : 0.33
          : referenceRatio
            ? 0.42
            : 0.38);
      var secondLineY =
        height *
        (subtitleText
          ? referenceRatio
            ? 0.69
            : 0.63
          : referenceRatio
            ? 0.73
            : 0.67);
      var lineMidpoint = (firstLineY + secondLineY) / 2;
      var scaledHalfGap =
        ((secondLineY - firstLineY) / 2) *
        clamp(state.lineGap / 100, 0.6, 1.5);
      firstLineY = lineMidpoint - scaledHalfGap;
      secondLineY = lineMidpoint + scaledHalfGap;

      titleLines.push(
        prepareGlyphLine(
          ctx,
          line1Text,
          firstLineY,
          width * 0.82,
          Math.min(
            height * (referenceRatio ? 0.32 : 0.235),
            width * (referenceRatio ? 0.22 : 0.17)
          ),
          {
            style: state.fontStyle,
            irregularity: state.irregularity,
            seed: combinedSeed ^ 0x119abc,
            lineIndex: 0,
            atlasMode: runtimeAtlasMode
          }
        )
      );
      titleLines.push(
        prepareGlyphLine(
          ctx,
          line2Text,
          secondLineY,
          width * 0.7,
          Math.min(
            height * (referenceRatio ? 0.37 : 0.285),
            width * (referenceRatio ? 0.23 : 0.205)
          ),
          {
            style: state.fontStyle,
            irregularity: state.irregularity,
            seed: combinedSeed ^ 0x7a013f,
            lineIndex: 1,
            atlasMode: runtimeAtlasMode
          }
        )
      );
    } else {
      var onlyText = line1Text || line2Text;
      if (onlyText) {
        titleLines.push(
          prepareGlyphLine(
            ctx,
            onlyText,
            height * (subtitleText ? 0.5 : 0.55),
            width * 0.82,
            Math.min(height * 0.32, width * 0.22),
            {
              style: state.fontStyle,
              irregularity: state.irregularity,
              seed: combinedSeed ^ 0x29fcd1,
              lineIndex: 0,
              atlasMode: runtimeAtlasMode
            }
          )
        );
      }
    }

    var subtitle = null;
    if (subtitleText) {
      subtitle = prepareSubtitle(
        ctx,
        subtitleText,
        0,
        width * 0.76,
        Math.min(
          height * (referenceRatio ? 0.11 : 0.098),
          width * 0.063
        )
      );

      if (titleLines.length) {
        var titleBottom = titleLines.reduce(function (lowest, line) {
          return Math.max(lowest, line.bottom);
        }, 0);
        var baseSubtitleGap = height * (referenceRatio ? 0.022 : 0.075);
        var subtitleGapScale = clamp(state.subtitleGap / 100, 0.5, 2);
        var titleShift = (-baseSubtitleGap * (subtitleGapScale - 1)) / 2;
        titleLines.forEach(function (line) {
          line.y += titleShift;
          line.top += titleShift;
          line.bottom += titleShift;
        });
        var subtitleTop =
          titleBottom +
          titleShift -
          height * (referenceRatio ? 0.03 : 0.025) +
          baseSubtitleGap * subtitleGapScale;
        subtitle.y = subtitleTop + subtitle.fontSize * 1.05;
      } else {
        subtitle.y = height * 0.56;
      }

      subtitle.top = subtitle.y - subtitle.fontSize * 1.05;
      subtitle.bottom = subtitle.y + subtitle.fontSize * 0.48;
    }

    var artworkBounds = measureArtworkBounds(
      titleLines,
      subtitle,
      width,
      height
    );

    var exclusionRects = titleLines.map(function (line) {
      return globalRect(line, centerX, Math.min(width, height) * 0.014);
    });
    if (subtitle) {
      exclusionRects.push(
        globalRect(subtitle, centerX, Math.min(width, height) * 0.01)
      );
    }

    if (overlayImage && state.overlayLayer === "background") {
      drawOverlayImage(ctx, width, height);
    }

    ctx.save();
    applyArtworkTransform(ctx, width, height);

    drawReferenceClusters(ctx, width, height, combinedSeed);
    drawDecorations(ctx, width, height, exclusionRects, combinedSeed);
    drawLowerConfetti(
      ctx,
      width,
      height,
      combinedSeed,
      exclusionRects
    );

    var usesAttachedGrammar = Boolean(
      activeTemplate &&
        activeTemplate.attachments &&
        activeTemplate.attachments.enabled
    );

    if (state.density > 18 && titleLines.length && !usesAttachedGrammar) {
      var anchorLine = titleLines[titleLines.length - 1];
      var curlSize = Math.min(anchorLine.fontSize * 0.45, width * 0.055);
      var curlY = anchorLine.y + anchorLine.fontSize * 0.22;
      var leftCurlX = centerX + anchorLine.left - curlSize * 0.26;
      var rightCurlX = centerX + anchorLine.right + curlSize * 0.26;
      if (leftCurlX - curlSize > width * 0.02) {
        drawSideCurl(
          ctx,
          leftCurlX,
          curlY,
          curlSize,
          1,
          mixColor(state.primaryColor, "#00101d", 0.08)
        );
      }
      if (rightCurlX + curlSize < width * 0.98) {
        drawSideCurl(
          ctx,
          rightCurlX,
          curlY,
          curlSize,
          -1,
          mixColor(state.primaryColor, "#00101d", 0.08)
        );
      }
      if (state.density > 42) {
        drawUnderlineSwash(
          ctx,
          anchorLine,
          centerX,
          mixColor(state.primaryColor, "#00101d", 0.08)
        );
      }
    }

    if (state.titleShadowEnabled && state.titleShadowOpacity > 0) {
      titleLines.forEach(function (line) {
        drawGlyphLine(ctx, line, centerX, {
          shadowPass: true,
          pixelScale: pixelScale
        });
      });
    }

    titleLines.forEach(function (line, index) {
      drawGlyphLine(ctx, line, centerX);
      drawAttachedGlyphGrammar(ctx, line, centerX, index);
    });

    if (subtitle) {
      drawSubtitle(ctx, subtitle, centerX);
      if (state.density > 10) {
        drawSubtitleFlourish(ctx, subtitle, centerX, width, combinedSeed);
      }
    }

    ctx.restore();

    if (overlayImage && state.overlayLayer === "foreground") {
      drawOverlayImage(ctx, width, height);
    }

    return {
      width: width,
      height: height,
      lines: titleLines,
      subtitle: subtitle,
      artworkBounds: artworkBounds,
      isEmpty: !titleLines.length && !subtitle && !overlayImage
    };
  }

  function readStateFromControls() {
    state.line1 = elements.line1.value;
    state.line2 = elements.line2.value;
    state.subtitle = elements.subtitle.value;
    state.canvasSize = elements.canvasSize.value;
    state.density = Number(elements.density.value);
    state.lineGap = Number(elements.lineGap.value);
    state.subtitleGap = Number(elements.subtitleGap.value);
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
  }

  function updateRange(range, output, suffix) {
    var min = Number(range.min) || 0;
    var max = Number(range.max) || 100;
    var value = Number(range.value);
    var progress = ((value - min) / (max - min)) * 100;
    range.style.setProperty("--range-progress", progress + "%");
    output.value = value + (suffix == null ? "%" : suffix);
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
    updateRange(elements.density, elements.densityValue);
    updateRange(elements.lineGap, elements.lineGapValue);
    updateRange(elements.subtitleGap, elements.subtitleGapValue);
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

    elements.titleShadowColorValue.textContent =
      state.titleShadowColor.toUpperCase();
    elements.titleShadowControls.disabled = !state.titleShadowEnabled;
    elements.primaryColorValue.textContent = state.primaryColor.toUpperCase();
    elements.accentColorValue.textContent = state.accentColor.toUpperCase();
    elements.skyColorValue.textContent = state.skyColor.toUpperCase();
    elements.canvasCornerLabel.textContent =
      dimensions.width + " × " + dimensions.height;
    elements.canvasFrame.style.setProperty(
      "--canvas-ratio",
      dimensions.width + " / " + dimensions.height
    );
    fitCanvasFrame(dimensions);
    elements.exportDescription.textContent =
      exportWidth + " × " + exportHeight + " px";

    // Artwork colors belong to the canvas only. The interface keeps the
    // fixed theme colors declared in CSS so light artwork palettes remain usable.

    var accessibleText = [
      state.line1,
      state.line2,
      state.subtitle,
      overlayImage ? "图片 " + overlayFileName : ""
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

    if (!result.lines.length && !result.subtitle && overlayImage) {
      elements.renderStatus.textContent = "拖动图片，放到喜欢的位置";
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
    elements.renderStatus.textContent = overlayImage
      ? statusText + " · 图片已加入"
      : statusText;
  }

  function scheduleRender() {
    if (renderFrame) {
      cancelAnimationFrame(renderFrame);
    }
    renderFrame = requestAnimationFrame(function () {
      renderFrame = 0;
      renderPreview();
    });
  }

  function applyStateToControls() {
    elements.line1.value = state.line1;
    elements.line2.value = state.line2;
    elements.subtitle.value = state.subtitle;
    elements.canvasSize.value = state.canvasSize;
    elements.density.value = state.density;
    elements.lineGap.value = state.lineGap;
    elements.subtitleGap.value = state.subtitleGap;
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
    updateOverlayInterface();
    updateBackgroundInterface();
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toastText.textContent = message;
    elements.toast.classList.add("visible");
    toastTimer = window.setTimeout(function () {
      elements.toast.classList.remove("visible");
    }, 2100);
  }

  function safeFilename(text) {
    var base = text.trim() || "我的字标";
    return base
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 32);
  }

  function downloadArtwork() {
    readStateFromControls();
    updateInterface();
    elements.downloadButton.classList.add("loading");
    elements.downloadButton.setAttribute("aria-busy", "true");
    elements.renderStatus.textContent = "正在准备高清作品…";

    var begin = function () {
      try {
        var exportCanvas = document.createElement("canvas");
        var result = renderArtwork(exportCanvas, state.exportScale);
        exportCanvas.toBlob(
          function (blob) {
            if (!blob) {
              elements.downloadButton.classList.remove("loading");
              elements.downloadButton.removeAttribute("aria-busy");
              elements.renderStatus.textContent = "保存失败，请降低清晰度重试";
              showToast("保存失败，请重试");
              return;
            }

            var url = URL.createObjectURL(blob);
            var link = document.createElement("a");
            link.href = url;
            link.download = safeFilename(state.line1 || state.line2) + "-字标.png";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(function () {
              URL.revokeObjectURL(url);
            }, 1000);

            elements.downloadButton.classList.remove("loading");
            elements.downloadButton.removeAttribute("aria-busy");
            elements.renderStatus.textContent =
              "作品已保存 · " +
              result.width * state.exportScale +
              " × " +
              result.height * state.exportScale;
            showToast("作品已保存");
          },
          "image/png",
          1
        );
      } catch (error) {
        elements.downloadButton.classList.remove("loading");
        elements.downloadButton.removeAttribute("aria-busy");
        elements.renderStatus.textContent = "尺寸太大，请降低清晰度重试";
        showToast("尺寸太大，请选择较低清晰度");
      }
    };

    if (logoFontsReady || vectorEngineReady) {
      Promise.all([
        logoFontsReady || Promise.resolve(),
        vectorEngineReady || Promise.resolve()
      ])
        .then(function () {
          if (styleEngine && styleEngine.whenAtlasReady) {
            // A preflight render starts any glyph requests caused by text that
            // was edited immediately before the download button was pressed.
            renderArtwork(elements.canvas, 1);
            return styleEngine.whenAtlasReady();
          }
          return undefined;
        })
        .then(begin);
    } else if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(begin);
    } else {
      begin();
    }
  }

  [
    elements.line1,
    elements.line2,
    elements.subtitle,
    elements.canvasSize,
    elements.density,
    elements.lineGap,
    elements.subtitleGap,
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
    elements.exportScale
  ].forEach(function (control) {
    control.addEventListener("input", scheduleRender);
    control.addEventListener("change", scheduleRender);
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
    });
  });

  document.querySelectorAll(".example-button").forEach(function (button) {
    button.addEventListener("click", function () {
      var example = examples[Number(button.dataset.example)] || examples[0];
      elements.line1.value = example.line1;
      elements.line2.value = example.line2;
      elements.subtitle.value = example.subtitle;
      state.seed = (state.seed + 97) >>> 0;
      scheduleRender();
    });
  });

  elements.shuffleButton.addEventListener("click", function () {
    state.seed = (state.seed + 7919) >>> 0;
    scheduleRender();
    showToast("星星换好啦");
  });

  elements.resetArtworkButton.addEventListener("click", function () {
    resetArtworkTransform();
    scheduleRender();
    showToast("文字已回到中央");
  });

  elements.canvasResetButton.addEventListener("click", function () {
    if (activeDragTarget === "overlay" && overlayImage) {
      resetOverlayTransform();
      showToast("图片已回到中央");
    } else {
      resetArtworkTransform();
      showToast("文字已回到中央");
    }
    scheduleRender();
  });

  elements.dragArtworkButton.addEventListener("click", function () {
    hideCanvasSelection();
    setDragTarget("artwork");
  });

  elements.dragOverlayButton.addEventListener("click", function () {
    hideCanvasSelection();
    setDragTarget("overlay");
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
    state = Object.assign({}, defaults);
    clearOverlayImage(false);
    applyStateToControls();
    scheduleRender();
    showToast("已恢复初始样式");
  });

  elements.overlayFile.addEventListener("change", function () {
    anchorFixedViewport(false);
    loadOverlayFile(elements.overlayFile.files[0]);
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
    clearOverlayImage();
    scheduleRender();
    showToast("图片已移除");
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
    canvasSelectionVisible = true;
    setDragTarget(hitTarget);
    canvasDragging = true;
    canvasDragStart = {
      target: activeDragTarget,
      clientX: event.clientX,
      clientY: event.clientY,
      x: activeDragTarget === "overlay" ? state.overlayX : state.artworkX,
      y: activeDragTarget === "overlay" ? state.overlayY : state.artworkY
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

  elements.downloadButton.addEventListener("click", downloadArtwork);

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
  window.addEventListener(
    "scroll",
    function () {
      anchorFixedViewport(false);
    },
    { passive: true }
  );
  window.addEventListener("pageshow", function () {
    anchorFixedViewportAfterLayout(true);
  });

  window.addEventListener("lettering-atlas-glyph-ready", scheduleRender);

  if (styleEngine) {
    vectorEngineReady = styleEngine
      .init({
        longcang: "./assets/fonts/LongCang-Regular.ttf",
        qingke: "./assets/fonts/ZCOOLQingKeHuangYou-Regular.ttf",
        kuaile: "./assets/fonts/ZCOOLKuaiLe-Regular.ttf",
        kalam: "./assets/fonts/Kalam-Bold.ttf",
        princess: "./assets/fonts/PrincessSofia-Regular.ttf"
      }, "./assets/font-atlas/runtime-glyph-index.json?v=3", function (progress) {
        setFontLoadingProgress(progress * 92);
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
    showFontLoadingError(new Error("Lettering style engine is unavailable"));
  }

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }
  anchorFixedViewportAfterLayout(true);
  applyStateToControls();
  renderPreview();
  restoreCachedOverlay();
  if (document.fonts && document.fonts.load) {
    logoFontsReady = Promise.all([
      document.fonts.load(
        '400 120px "LogoDesignedCN"',
        "直到群友变成一只小猪自由生长"
      ),
      document.fonts.load(
        '400 120px "LogoSkeletonCN"',
        "直到群友变成一只小猪自由生长"
      ),
      document.fonts.load(
        '400 120px "LogoHandCN"',
        "直到群友变成一只小猪自由生长"
      ),
      document.fonts.load(
        '400 90px "LogoScriptEN"',
        "Till We All Turn into Little Piggies"
      ),
      document.fonts.load(
        '700 120px "LogoHandEN"',
        "STAY CURIOUS KEEP CREATING"
      )
    ])
      .then(function (loadedFonts) {
        scheduleRender();
        return loadedFonts;
      })
      .catch(function (error) {
        console.warn("Canvas lettering fonts unavailable.", error);
        showFontLoadingError(error);
        return null;
      });
  } else if (document.fonts && document.fonts.ready) {
    logoFontsReady = document.fonts.ready
      .then(function () {
        scheduleRender();
      })
      .catch(function (error) {
        console.warn("Canvas lettering fonts unavailable.", error);
        showFontLoadingError(error);
        return null;
      });
  }
  finishInitialFontLoading();
})();
