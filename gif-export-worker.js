import {
  GIFEncoder,
  applyPalette,
  quantize
} from "./assets/vendor/gifenc.esm.js";

self.addEventListener("message", function (event) {
  var payload = event.data || {};
  if (payload.type !== "encode") {
    return;
  }

  try {
    var frames = payload.frames || [];
    if (!frames.length) {
      throw new Error("No animation frames were provided");
    }
    var width = Number(payload.width) || 1;
    var height = Number(payload.height) || 1;
    var maxColors = Number(payload.maxColors) || 128;
    var encoder = GIFEncoder({ initialCapacity: 1024 * 1024 });
    var format = "rgba4444";

    frames.forEach(function (frame, index) {
      var rgba = new Uint8ClampedArray(frame.pixels);
      var palette = quantize(rgba, maxColors, {
        format: format,
        oneBitAlpha: 127,
        clearAlpha: true,
        clearAlphaThreshold: 127,
        clearAlphaColor: 0
      });
      var indexed = applyPalette(rgba, palette, format);
      var transparentIndex = palette.findIndex(function (color) {
        return color.length > 3 && color[3] === 0;
      });

      encoder.writeFrame(indexed, width, height, {
        palette: palette,
        delay: Math.max(20, Number(frame.delay) || 100),
        repeat: 0,
        transparent: transparentIndex >= 0,
        transparentIndex: transparentIndex,
        dispose: transparentIndex >= 0 ? 2 : 1
      });

      self.postMessage({
        type: "progress",
        value: Math.round(((index + 1) / frames.length) * 100)
      });
    });

    encoder.finish();
    var bytes = encoder.bytes();
    self.postMessage(
      {
        type: "finished",
        bytes: bytes.buffer,
        byteLength: bytes.byteLength
      },
      [bytes.buffer]
    );
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error && error.message ? error.message : String(error)
    });
  }
});
