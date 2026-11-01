const KOBITO_SPECIES = [
  "akabane",
  "benikinoko",
  "hanagashira",
  "kusamadara",
  "momojiri"
];
const KOBITO_TAP_POSES = ["happy", "run", "surprised"];
const KOBITO_REACTION_MS = 1400;
const KOBITO_META = {
  akabane: { label: "\u3042\u304B\u3070\u306D", reaction: "wings", accent: "#ffd44f" },
  benikinoko: { label: "\u3079\u306B\u304D\u306E\u3053", reaction: "curl", accent: "#f45b4d" },
  hanagashira: { label: "\u306F\u306A\u304C\u3057\u3089", reaction: "hop", accent: "#ee7289" },
  kusamadara: { label: "\u304F\u3055\u307E\u3060\u3089", reaction: "hide", accent: "#9abb61" },
  momojiri: { label: "\u3082\u3082\u3058\u308A", reaction: "glow", accent: "#ff9db7" }
};
function chooseKobitoPose(previous, random = Math.random) {
  const pool = KOBITO_TAP_POSES.filter((pose) => pose !== previous);
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
  return pool[index];
}
const BUG_SPECIES = KOBITO_SPECIES;
const COUNTABLE_SPECIES = KOBITO_SPECIES;
const BUG_META = KOBITO_META;
export {
  BUG_META,
  BUG_SPECIES,
  COUNTABLE_SPECIES,
  KOBITO_META,
  KOBITO_REACTION_MS,
  KOBITO_SPECIES,
  KOBITO_TAP_POSES,
  chooseKobitoPose
};
