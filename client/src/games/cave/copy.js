import { BUG_META } from "./bugs.js";
const TITLE_CANDIDATES = {
  recommended: "\u3053\u3073\u3068\u3069\u3046\u304F\u3064\u306E \u304D\u3089\u304D\u3089\u3055\u304C\u3057",
  original: "\u3072\u307F\u3064\u306E\u3057\u307E\u306E \u305F\u304B\u3089\u3055\u304C\u3057",
  reason: "4\u6B73\u5150\u306F\u300E\u3072\u307F\u3064\u306E\u3057\u307E\u300F\u3088\u308A\u300E\u3069\u3046\u304F\u3064\u300F\u3068\u300E\u304D\u3089\u304D\u3089\u300F\u306E\u65B9\u304C\u3001\u4ECA\u3084\u308B\u3053\u3068\u304C\u76EE\u306B\u6D6E\u304B\u3073\u3084\u3059\u3044\u3002"
};
const COPY = {
  titleKicker: "\u308A\u3044\u3093\u3061\u3083\u3093\u306E \u307C\u3046\u3051\u3093",
  start: "\u306F\u3058\u3081\u308B",
  enter: "\u3069\u3046\u304F\u3064\u3078",
  next: "\u3064\u304E\u3078",
  again: "\u3082\u3046\u3044\u3061\u3069",
  retry: "\u3082\u3046\u3044\u3063\u304B\u3044",
  found: "\u307F\u3064\u3051\u305F\uFF01",
  opened: "\u3042\u3044\u305F\uFF01",
  entranceHint: "\u3069\u3046\u304F\u3064\u304C \u5149\u3063\u3066\u308B",
  stage1Prompt: (species) => `${BUG_META[species].label}(\u3042\u3057\u3085) \u306A\u3093\u3073\u304D\uFF1F`,
  stage2Prompt: (n) => `${n}\u3053 \u307F\u3064\u3051\u3088\u3046`,
  stage3Prompt: (n) => `${n}\u306E \u307B\u3046\u305B\u304D \u3069\u308C\u304B\u306A\uFF1F`,
  clearPath: "\u307F\u3061\u304C \u3072\u304B\u3063\u305F",
  doorOpen: "\u3068\u3073\u3089\u304C \u3042\u3044\u305F",
  treasure: "\u305F\u304B\u3089\u3070\u3053\u3060\uFF01",
  ending: "\u304D\u3089\u304D\u3089 \u307F\u3064\u3051\u305F",
  characterRiin: "\u308A\u3044\u3093\u3061\u3083\u3093\u753B\u50CF\u4E88\u5B9A",
  characterPrecure: "\u30D7\u30EA\u30AD\u30E5\u30A2\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u753B\u50CF\u4E88\u5B9A"
};
const TAP_MIN_PX = 72;
function sceneLabel(scene) {
  switch (scene) {
    case "title":
      return "\u30BF\u30A4\u30C8\u30EB";
    case "entrance":
      return "\u3044\u308A\u3050\u3061";
    case "stage1":
    case "stage1Clear":
      return "\u3053\u3073\u3068";
    case "stage2":
    case "stage2Clear":
      return "\u304D\u3089\u304D\u3089";
    case "stage3":
    case "stage3Clear":
    case "treasure":
    case "ending":
      return "\u305F\u304B\u3089";
    default:
      return "";
  }
}
export {
  COPY,
  TAP_MIN_PX,
  TITLE_CANDIDATES,
  sceneLabel
};
