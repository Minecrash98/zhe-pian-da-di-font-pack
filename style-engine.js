(function (global) {
  "use strict";

  var fonts = Object.create(null);
  var atlasGlyphs = Object.create(null);
  var atlasImages = Object.create(null);
  var atlasLoading = Object.create(null);
  var tintCache = Object.create(null);
  var skeletonCache = Object.create(null);
  var ready = false;
  var readyPromise = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hash(text) {
    var value = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      value ^= text.charCodeAt(i);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  function random01(seed) {
    var value = seed >>> 0;
    value += 0x6d2b79f5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  function isHan(character) {
    return /[\u3400-\u9fff\uf900-\ufaff]/.test(character);
  }

  function getTemplate(style) {
    var templates = global.LETTERING_TEMPLATES || {};
    return templates[style] || templates.playful || null;
  }

  function loadFont(key, url) {
    return fetch(url)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Unable to load font: " + url);
        }
        return response.arrayBuffer();
      })
      .then(function (buffer) {
        fonts[key] = global.opentype.parse(buffer);
        return fonts[key];
      });
  }

  function loadAtlas(url) {
    if (!url) {
      return Promise.resolve();
    }
    return fetch(url)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Unable to load glyph atlas: " + url);
        }
        return response.json();
      })
      .then(function (manifest) {
        var source = manifest.glyphs || manifest;
        atlasGlyphs = Object.create(null);
        Object.keys(source).forEach(function (character) {
          var entry = source[character];
          atlasGlyphs[character] = entry.variants
            ? entry
            : { variants: [entry] };
        });
        return manifest;
      });
  }

  function init(manifest, atlasUrl) {
    if (readyPromise) {
      return readyPromise;
    }
    if (!global.opentype) {
      readyPromise = Promise.reject(new Error("opentype.js is not available"));
      return readyPromise;
    }
    var fontPromises = Object.keys(manifest).map(function (key) {
        return loadFont(key, manifest[key]);
      });
    fontPromises.push(loadAtlas(atlasUrl));
    readyPromise = Promise.all(fontPromises).then(function () {
      ready = true;
      return api;
    });
    return readyPromise;
  }

  function supports(fontKey, character) {
    var font = fonts[fontKey];
    if (!font || !character || !character.trim()) {
      return false;
    }
    var glyph = font.charToGlyph(character);
    return Boolean(glyph && glyph.index !== 0);
  }

  function fallbackKey(character, preferred) {
    if (supports(preferred, character)) {
      return preferred;
    }
    var order = isHan(character)
      ? ["longcang", "qingke", "kuaile", "kalam", "princess"]
      : ["kalam", "princess", "longcang", "qingke", "kuaile"];
    for (var i = 0; i < order.length; i += 1) {
      if (supports(order[i], character)) {
        return order[i];
      }
    }
    return preferred;
  }

  function atlasSelection(fontKey) {
    if (!fontKey || fontKey.indexOf("atlas:") !== 0) {
      return null;
    }
    var encoded = fontKey.slice(6);
    var separator = encoded.lastIndexOf("|");
    var character = separator >= 0 ? encoded.slice(0, separator) : encoded;
    var variantIndex = separator >= 0
      ? parseInt(encoded.slice(separator + 1), 10) || 0
      : 0;
    var entry = atlasGlyphs[character];
    if (!entry || !entry.variants || !entry.variants.length) {
      return null;
    }
    return {
      character: character,
      variantIndex: variantIndex % entry.variants.length,
      meta: entry.variants[variantIndex % entry.variants.length]
    };
  }

  function chooseFontKey(
    character,
    index,
    text,
    template,
    seed,
    lineIndex,
    allowAtlas
  ) {
    if (!template) {
      return isHan(character) ? "qingke" : "kalam";
    }
    if (
      allowAtlas !== false &&
      template.atlasEnabled &&
      atlasGlyphs[character]
    ) {
      var variants = atlasGlyphs[character].variants;
      var variantSeed = (
        seed ^ hash(character + "|" + index + "|" + text + "|" + lineIndex)
      ) >>> 0;
      var variantIndex = Math.floor(random01(variantSeed) * variants.length);
      return "atlas:" + character + "|" + variantIndex;
    }
    var lineHasHan = /[\u3400-\u9fff\uf900-\ufaff]/.test(text);
    var family = template.fonts;
    var primary = lineHasHan ? family.hanPrimary : family.latinPrimary;
    return fallbackKey(character, primary);
  }

  function measureGlyph(character, fontSize, fontKey, template) {
    if (!character.trim()) {
      return fontSize * ((template && template.metrics.spaceAdvance) || 0.3);
    }
    if (fontKey && fontKey.indexOf("atlas:") === 0) {
      var selection = atlasSelection(fontKey);
      if (selection) {
        var meta = selection.meta;
        return ((meta.advance || meta.width) / meta.emHeight) * fontSize;
      }
    }
    var font = fonts[fallbackKey(character, fontKey)];
    if (!font) {
      return fontSize * (isHan(character) ? 0.94 : 0.58);
    }
    var width = font.getAdvanceWidth(character, fontSize, { kerning: false });
    var usesHanSkeleton =
      fontKey === "longcang" || fontKey === "qingke" || fontKey === "kuaile";
    var factor = usesHanSkeleton
      ? template.metrics.hanAdvance
      : template.metrics.latinAdvance;
    return Math.max(fontSize * 0.12, width * factor);
  }

  function makeWarp(glyph, template, fontSize) {
    var profile = template.glyph.warp;
    var amount = glyph.warpAmount;
    var seed = (glyph.seed ^ hash(glyph.char + "|" + glyph.index)) >>> 0;
    var phase = random01(seed) * Math.PI * 2;
    var direction = random01(seed ^ 0x91e10da5) < 0.5 ? -1 : 1;
    var waveScale = 0.72 + random01(seed ^ 0x63d83595) * 0.56;
    var top = -fontSize * 0.92;
    var bottom = fontSize * 0.2;
    var width = Math.max(glyph.naturalWidth, fontSize * 0.16);
    var left = -glyph.naturalWidth / 2;

    return function (point) {
      var u = clamp((point.x - left) / width, -0.2, 1.2);
      var v = clamp((point.y - top) / (bottom - top), -0.2, 1.2);
      var centerWeight = Math.sin(clamp(u, 0, 1) * Math.PI);
      var verticalWeight = Math.sin(clamp(v, 0, 1) * Math.PI);
      var x = point.x;
      var y = point.y;

      x +=
        Math.sin(v * Math.PI * 1.55 + phase) *
        profile.horizontalWave *
        fontSize *
        amount *
        waveScale;
      x +=
        (0.48 - v) *
        profile.shear *
        fontSize *
        amount *
        direction;
      x +=
        (u - 0.5) *
        verticalWeight *
        profile.waist *
        fontSize *
        amount;

      y +=
        Math.sin(u * Math.PI * 2 + phase) *
        profile.verticalWave *
        fontSize *
        amount *
        waveScale;
      y += centerWeight * profile.arch * fontSize * amount * direction;
      y +=
        (u - 0.5) *
        (v - 0.45) *
        profile.cornerDrift *
        fontSize *
        amount *
        4;

      return { x: x, y: y };
    };
  }

  function buildWarpedPath(glyph, template, fontSize) {
    if (glyph.fontKey && glyph.fontKey.indexOf("atlas:") === 0) {
      return null;
    }
    var font = fonts[fallbackKey(glyph.char, glyph.fontKey)];
    if (!font) {
      return null;
    }
    var source = font.getPath(
      glyph.char,
      -glyph.naturalWidth / 2,
      0,
      fontSize,
      { kerning: false }
    );
    var warp = makeWarp(glyph, template, fontSize);
    var path = new Path2D();

    source.commands.forEach(function (command) {
      var p;
      var p1;
      var p2;
      if (command.type === "M") {
        p = warp({ x: command.x, y: command.y });
        path.moveTo(p.x, p.y);
      } else if (command.type === "L") {
        p = warp({ x: command.x, y: command.y });
        path.lineTo(p.x, p.y);
      } else if (command.type === "C") {
        p1 = warp({ x: command.x1, y: command.y1 });
        p2 = warp({ x: command.x2, y: command.y2 });
        p = warp({ x: command.x, y: command.y });
        path.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p.x, p.y);
      } else if (command.type === "Q") {
        p1 = warp({ x: command.x1, y: command.y1 });
        p = warp({ x: command.x, y: command.y });
        path.quadraticCurveTo(p1.x, p1.y, p.x, p.y);
      } else if (command.type === "Z") {
        path.closePath();
      }
    });
    return path;
  }

  function thinBinary(pixels, width, height) {
    var changed = true;
    var pass = 0;
    var removals = [];

    function value(x, y) {
      return pixels[y * width + x];
    }

    while (changed && pass < 72) {
      changed = false;
      pass += 1;

      for (var phase = 0; phase < 2; phase += 1) {
        removals.length = 0;
        for (var y = 1; y < height - 1; y += 1) {
          for (var x = 1; x < width - 1; x += 1) {
            var index = y * width + x;
            if (!pixels[index]) {
              continue;
            }
            var p2 = value(x, y - 1);
            var p3 = value(x + 1, y - 1);
            var p4 = value(x + 1, y);
            var p5 = value(x + 1, y + 1);
            var p6 = value(x, y + 1);
            var p7 = value(x - 1, y + 1);
            var p8 = value(x - 1, y);
            var p9 = value(x - 1, y - 1);
            var neighbors = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
            if (neighbors < 2 || neighbors > 6) {
              continue;
            }
            var transitions =
              (!p2 && p3) +
              (!p3 && p4) +
              (!p4 && p5) +
              (!p5 && p6) +
              (!p6 && p7) +
              (!p7 && p8) +
              (!p8 && p9) +
              (!p9 && p2);
            if (transitions !== 1) {
              continue;
            }
            if (
              phase === 0
                ? p2 * p4 * p6 || p4 * p6 * p8
                : p2 * p4 * p8 || p2 * p6 * p8
            ) {
              continue;
            }
            removals.push(index);
          }
        }
        if (removals.length) {
          changed = true;
          removals.forEach(function (index) {
            pixels[index] = 0;
          });
        }
      }
    }
    return pixels;
  }

  function buildSkeleton(glyph, template) {
    var cacheKey = glyph.fontKey + "|" + glyph.char;
    if (skeletonCache[cacheKey]) {
      return skeletonCache[cacheKey];
    }
    var font = fonts[fallbackKey(glyph.char, glyph.fontKey)];
    if (!font) {
      return null;
    }

    var basis = 1000;
    var naturalWidth = measureGlyph(
      glyph.char,
      basis,
      glyph.fontKey,
      template
    );
    var source = font.getPath(
      glyph.char,
      -naturalWidth / 2,
      0,
      basis,
      { kerning: false }
    );
    var box = source.getBoundingBox();
    var sourceWidth = Math.max(1, box.x2 - box.x1);
    var sourceHeight = Math.max(1, box.y2 - box.y1);
    var resolution = 240;
    var padding = 10;
    var rasterScale = Math.min(
      (resolution - padding * 2) / sourceWidth,
      (resolution - padding * 2) / sourceHeight
    );
    var offsetX = padding - box.x1 * rasterScale;
    var offsetY = padding - box.y1 * rasterScale;
    var canvas = document.createElement("canvas");
    canvas.width = resolution;
    canvas.height = resolution;
    var context = canvas.getContext("2d", { willReadFrequently: true });
    context.setTransform(rasterScale, 0, 0, rasterScale, offsetX, offsetY);
    context.beginPath();

    source.commands.forEach(function (command) {
      if (command.type === "M") {
        context.moveTo(command.x, command.y);
      } else if (command.type === "L") {
        context.lineTo(command.x, command.y);
      } else if (command.type === "C") {
        context.bezierCurveTo(
          command.x1,
          command.y1,
          command.x2,
          command.y2,
          command.x,
          command.y
        );
      } else if (command.type === "Q") {
        context.quadraticCurveTo(
          command.x1,
          command.y1,
          command.x,
          command.y
        );
      } else if (command.type === "Z") {
        context.closePath();
      }
    });
    context.fillStyle = "#ffffff";
    context.fill();
    context.setTransform(1, 0, 0, 1, 0, 0);

    var data = context.getImageData(0, 0, resolution, resolution).data;
    var binary = new Uint8Array(resolution * resolution);
    for (var i = 0; i < binary.length; i += 1) {
      binary[i] = data[i * 4 + 3] > 46 ? 1 : 0;
    }
    thinBinary(binary, resolution, resolution);

    function sourcePoint(x, y) {
      return {
        x: ((x + 0.5 - offsetX) / rasterScale) / basis,
        y: ((y + 0.5 - offsetY) / rasterScale) / basis
      };
    }

    var segments = [];
    var neighborOffsets = [
      [1, 0],
      [0, 1],
      [1, 1],
      [-1, 1]
    ];
    for (var py = 1; py < resolution - 1; py += 1) {
      for (var px = 1; px < resolution - 1; px += 1) {
        if (!binary[py * resolution + px]) {
          continue;
        }
        for (var n = 0; n < neighborOffsets.length; n += 1) {
          var nx = px + neighborOffsets[n][0];
          var ny = py + neighborOffsets[n][1];
          if (binary[ny * resolution + nx]) {
            segments.push([
              sourcePoint(px, py),
              sourcePoint(nx, ny)
            ]);
          }
        }
      }
    }

    skeletonCache[cacheKey] = { segments: segments };
    return skeletonCache[cacheKey];
  }

  function drawMonolineGlyph(ctx, glyph, options) {
    var skeleton = buildSkeleton(glyph, options.template);
    if (!skeleton || !skeleton.segments.length) {
      return false;
    }
    var fontSize = options.fontSize;
    var warp = makeWarp(glyph, options.template, fontSize);
    var strokeWidth = fontSize * options.template.glyph.monolineWidth;

    function strokeSkeleton(color, width) {
      ctx.beginPath();
      skeleton.segments.forEach(function (segment) {
        var start = warp({
          x: segment[0].x * fontSize,
          y: segment[0].y * fontSize
        });
        var end = warp({
          x: segment[1].x * fontSize,
          y: segment[1].y * fontSize
        });
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    ctx.save();
    if (options.outline) {
      strokeSkeleton(
        options.outlineColor,
        strokeWidth + fontSize * options.template.glyph.outline * 2
      );
    }
    strokeSkeleton(options.fillStyle, strokeWidth);
    ctx.restore();
    return true;
  }

  function drawGlyph(ctx, glyph, options) {
    if (glyph.fontKey && glyph.fontKey.indexOf("atlas:") === 0) {
      return drawAtlasGlyph(ctx, glyph, options);
    }
    if (options.template.glyph.monoline) {
      return drawMonolineGlyph(ctx, glyph, options);
    }
    var template = options.template;
    var fontSize = options.fontSize;
    var path = buildWarpedPath(glyph, template, fontSize);
    if (!path) {
      return false;
    }

    var emboldenFactor = isHan(glyph.char)
      ? template.glyph.emboldenHan
      : template.glyph.emboldenLatin;
    if (glyph.fontKey === "kuaile") {
      emboldenFactor *= 0.48;
    }
    var embolden = fontSize * emboldenFactor;
    var outline = options.outline
      ? fontSize * template.glyph.outline
      : 0;

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (outline > 0) {
      ctx.strokeStyle = options.outlineColor;
      ctx.lineWidth = embolden * 2 + outline * 2;
      ctx.stroke(path);
    }
    if (embolden > 0) {
      ctx.strokeStyle = options.fillStyle;
      ctx.lineWidth = embolden * 2;
      ctx.stroke(path);
    }
    ctx.fillStyle = options.fillStyle;
    ctx.fill(path);
    ctx.restore();
    return true;
  }

  function requestAtlasImage(meta) {
    var key = meta.file;
    if (atlasImages[key]) {
      return atlasImages[key];
    }
    if (atlasLoading[key]) {
      return null;
    }
    atlasLoading[key] = new Promise(function (resolve) {
      var image = new Image();
      image.onload = function () {
        atlasImages[key] = image;
        delete atlasLoading[key];
        if (typeof global.dispatchEvent === "function") {
          global.dispatchEvent(new Event("lettering-atlas-glyph-ready"));
        }
        resolve(image);
      };
      image.onerror = function () {
        delete atlasLoading[key];
        console.warn("Unable to load atlas glyph:", key);
        resolve(null);
      };
      image.src = key;
    });
    return null;
  }

  function whenAtlasReady() {
    var pending = Object.keys(atlasLoading).map(function (key) {
      return atlasLoading[key];
    });
    return Promise.all(pending).then(function () {
      return undefined;
    });
  }

  function tintedAtlasGlyph(meta, color) {
    var image = requestAtlasImage(meta);
    if (!image) {
      return null;
    }
    var cacheKey = meta.file + "|" + color;
    if (tintCache[cacheKey]) {
      return tintCache[cacheKey];
    }
    var canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    var context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    context.globalCompositeOperation = "source-in";
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    tintCache[cacheKey] = canvas;
    return canvas;
  }

  function drawAtlasGlyph(ctx, glyph, options) {
    var selection = atlasSelection(glyph.fontKey);
    if (!selection) {
      return false;
    }
    var meta = selection.meta;
    var image = requestAtlasImage(meta);
    if (!image) {
      return false;
    }

    var ratio = options.fontSize / meta.emHeight;
    var width = meta.width * ratio;
    var height = meta.height * ratio;
    var x = -(meta.centerX == null ? meta.width / 2 : meta.centerX) * ratio;
    var y = -meta.baseline * ratio;
    var fill = tintedAtlasGlyph(meta, options.solidColor);
    if (!fill) {
      return false;
    }

    if (options.outline) {
      var outline = tintedAtlasGlyph(meta, options.outlineColor);
      var radius = Math.max(1.1, options.fontSize * options.template.glyph.outline);
      for (var i = 0; i < 12; i += 1) {
        var angle = (i / 12) * Math.PI * 2;
        ctx.drawImage(
          outline,
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius,
          width,
          height
        );
      }
    }
    ctx.drawImage(fill, x, y, width, height);
    return true;
  }

  function getAtlasMeta(character, template) {
    if (!template || !template.atlasEnabled) {
      return null;
    }
    var entry = atlasGlyphs[character];
    return entry && entry.variants ? entry.variants[0] : null;
  }

  var api = {
    init: init,
    isReady: function () {
      return ready;
    },
    getTemplate: getTemplate,
    chooseFontKey: chooseFontKey,
    measureGlyph: measureGlyph,
    drawGlyph: drawGlyph,
    getAtlasMeta: getAtlasMeta,
    whenAtlasReady: whenAtlasReady
  };

  global.LetteringStyleEngine = api;
})(window);
