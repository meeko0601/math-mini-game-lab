/** 洞窟ゲームの素材・配役・数・演出。引き継ぎ版のルールを維持します。 */
const files = [
  'bg-entrance_c8a8d22f.jpg', 'bg-entrance-glowing-wide_2e4f4b40.jpg',
  'bg-entrance-glowing-portrait_00066085.jpg', 'bg-cave_283b0a5b.jpg',
  'bg-cave-path-lit_29f9cae8.jpg', 'bg-cave-door-closed_779e3b43.jpg',
  'bg-cave-door-open_97fe81bb.jpg', 'bg-treasure-room_86c29d18.jpg',
  'chest-closed_5383000c.png', 'chest-open_549fe7fd.png', 'sparkle_0b3a3337.png',
  'gem_5dafc00e.png', 'map_3551d37a.png', 'lantern_764aaf96.png',
  'akabane_default_7587d46a.png', 'akabane_happy_23ff2a5d.png', 'akabane_run_b6defe0d.png', 'akabane_surprised_91ea2f86.png',
  'benikinoko_default_9d9a9250.png', 'benikinoko_happy_64367789.png', 'benikinoko_run_8d0dc9d9.png', 'benikinoko_surprised_be3fe170.png',
  'hanagashira_default_72e275a2.png', 'hanagashira_happy_450698a8.png', 'hanagashira_run_6399f63d.png', 'hanagashira_surprised_99945d85.png',
  'kusamadara_default_1df02b73.png', 'kusamadara_happy_d646dee6.png', 'kusamadara_run_ed79ea5a.png', 'kusamadara_surprised_75210078.png',
  'momojiri_default_c7f9cd14.png', 'momojiri_happy_d023e697.png', 'momojiri_run_51064e6d.png', 'momojiri_surprised_9cd9075c.png',
  'sfx-tap_527d5a35.mp3', 'sfx-collect_0ecca614.mp3', 'sfx-correct_4412ad96.mp3', 'sfx-retry_754370dc.mp3', 'sfx-open_96554a9b.mp3',
];
export const CAVE_ASSETS = Object.fromEntries(files.map(file => [file.replace(/_[a-f0-9]+\.(png|jpg|mp3)$/, ''), `/assets/cave/${file}`]));
export const CAVE_EXPLORERS = [
  ['akechi_anna', 'あんな'], ['kobayashi_mikuru', 'みくる'],
  ['moria_ruruka', 'るるか'], ['howa_kurea', 'くれあ'],
].map(([id, name]) => ({ id, name, expressions: Object.fromEntries(
  ['normal', 'joy', 'disappointed'].map(expression => [expression, {
    src: `/assets/cave/explorers/${id}_${expression}.png`, alt: `${name}の たんけんたい`,
  }]),
)}));
export const CAVE_ASSET_URLS = [...Object.values(CAVE_ASSETS), ...CAVE_EXPLORERS.flatMap(c => Object.values(c.expressions).map(image => image.src))];
export const CAVE_CONFIG = {
  countRange: [5, 10], countChoices: 10,
  collectRange: [11, 20], visibleSparkles: 7,
  jewelRange: [1, 100], jewelChoices: 10,
  reactionMs: 1400, flightMs: 980, flightWaitMs: 1050,
  retryExpressionMs: 1800,
  sparkleSize: 64, sparkleGap: 10,
  jewelSpeed: 10, jewelSize: 64,
  retryMessage: 'ゆっくり もういちど みてみよう',
};
