(function (global) {
  "use strict";

  /*
   * Each template is deliberately data-only. New lettering styles can be added
   * here without touching the renderer. The vector engine consumes these rules
   * glyph by glyph, while app.js remains responsible for the editor UI/layout.
   */
  global.LETTERING_TEMPLATES = {
    playful: {
      id: "reference-lettering-v2",
      label: "参考图复刻",
      vector: true,
      atlasEnabled: true,
      atlasLines: {
        "0": "直到群友变成",
        "1": "一只小猪"
      },
      fonts: {
        hanPrimary: "longcang",
        hanAccent: "longcang",
        latinPrimary: "kalam",
        latinAccent: "kalam"
      },
      selection: {
        hanAccentRate: 0,
        latinAccentRate: 0,
        hanAccentChars: "",
        hanPrimaryChars: ""
      },
      metrics: {
        hanAdvance: 1.02,
        latinAdvance: 0.95,
        spaceAdvance: 0.3,
        trackingHan: -0.018,
        trackingLatin: -0.012
      },
      glyph: {
        monoline: true,
        monolineWidth: 0.094,
        emboldenHan: 0.034,
        emboldenLatin: 0.018,
        outline: 0.007,
        firstScaleX: 1.08,
        firstScaleY: 1.12,
        lastScaleX: 1.05,
        lineTwoScale: 1,
        rotation: 0.052,
        baselineJitter: 0.035,
        widthJitter: 0.045,
        heightJitter: 0.055,
        warp: {
          horizontalWave: 0.042,
          verticalWave: 0.038,
          arch: 0.035,
          shear: 0.064,
          waist: 0.082,
          cornerDrift: 0.04
        }
      },
      positionPatterns: {
        "0": [
          { "scaleX": 1.08, "scaleY": 1.13, "rotation": -0.022, "y": -0.035 },
          { "scaleX": 0.84, "scaleY": 0.94, "rotation": 0.018, "y": 0.018 },
          { "scaleX": 0.98, "scaleY": 1.03, "rotation": -0.012, "y": -0.006 },
          { "scaleX": 0.9, "scaleY": 0.96, "rotation": 0.02, "y": 0.014 },
          { "scaleX": 1.02, "scaleY": 0.98, "rotation": -0.014, "y": 0.006 },
          { "scaleX": 1.07, "scaleY": 1.05, "rotation": 0.014, "y": -0.006 }
        ],
        "1": [
          { "scaleX": 1.12, "scaleY": 0.94, "rotation": 0.015, "y": -0.016 },
          { "scaleX": 1.02, "scaleY": 1.08, "rotation": -0.014, "y": 0 },
          { "scaleX": 0.88, "scaleY": 0.96, "rotation": 0.018, "y": 0.018 },
          { "scaleX": 1.1, "scaleY": 1.08, "rotation": -0.012, "y": -0.004 },
          { "scaleX": 0.94, "scaleY": 1.02, "rotation": 0.012, "y": 0.01 }
        ]
      },
      attachments: {
        enabled: true,
        topFlowers: true,
        firstHook: true,
        terminalCurl: true,
        underlineTail: true
      }
    },

    rounded: {
      id: "soft-round-v1",
      label: "软糖圆体",
      vector: true,
      fonts: {
        hanPrimary: "kuaile",
        hanAccent: "qingke",
        latinPrimary: "kalam",
        latinAccent: "princess"
      },
      selection: {
        hanAccentRate: 0.08,
        latinAccentRate: 0.03,
        hanAccentChars: "",
        hanPrimaryChars: ""
      },
      metrics: {
        hanAdvance: 0.94,
        latinAdvance: 0.96,
        spaceAdvance: 0.31,
        trackingHan: 0.002,
        trackingLatin: -0.005
      },
      glyph: {
        emboldenHan: 0.035,
        emboldenLatin: 0.026,
        outline: 0.011,
        firstScaleX: 1.05,
        firstScaleY: 1.08,
        lastScaleX: 1.02,
        lineTwoScale: 1,
        rotation: 0.035,
        baselineJitter: 0.035,
        widthJitter: 0.07,
        heightJitter: 0.07,
        warp: {
          horizontalWave: 0.01,
          verticalWave: 0.015,
          arch: 0.012,
          shear: 0.018,
          waist: 0.025,
          cornerDrift: 0.012
        }
      },
      attachments: {
        enabled: true,
        topFlowers: false,
        firstHook: true,
        terminalCurl: true,
        underlineTail: false
      }
    },

    poster: {
      id: "cut-paper-poster-v1",
      label: "切纸海报",
      vector: true,
      fonts: {
        hanPrimary: "kuaile",
        hanAccent: "qingke",
        latinPrimary: "kalam",
        latinAccent: "princess"
      },
      selection: {
        hanAccentRate: 0,
        latinAccentRate: 0,
        hanAccentChars: "",
        hanPrimaryChars: ""
      },
      metrics: {
        hanAdvance: 0.95,
        latinAdvance: 0.95,
        spaceAdvance: 0.3,
        trackingHan: -0.002,
        trackingLatin: -0.012
      },
      glyph: {
        emboldenHan: 0.025,
        emboldenLatin: 0.02,
        outline: 0.009,
        firstScaleX: 1,
        firstScaleY: 1,
        lastScaleX: 1,
        lineTwoScale: 1,
        rotation: 0.018,
        baselineJitter: 0.018,
        widthJitter: 0.04,
        heightJitter: 0.035,
        warp: {
          horizontalWave: 0.006,
          verticalWave: 0.008,
          arch: 0,
          shear: 0.01,
          waist: 0.01,
          cornerDrift: 0.006
        }
      },
      attachments: {
        enabled: false,
        topFlowers: false,
        firstHook: false,
        terminalCurl: false,
        underlineTail: false
      }
    }
  };
})(window);
