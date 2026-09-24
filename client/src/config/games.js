/**
 * まず変更する場所。
 * 名前・絵文字・画像・数の範囲・言葉・色は、ゲームロジックを触らずに変更できます。
 */
const image = (src, alt) => ({ src, alt });

const character = ({ id, name, fileName }) => ({
  id,
  name,
  idle: image(`/assets/characters/${fileName}_idle.png`, `${name}の ぜんしん`),
  success: image(`/assets/characters/${fileName}_success.png`, `よろこぶ ${name}`),
  expressions: {
    smile: image(`/assets/characters/expressions/web/${fileName}_smile.png`, `ほほえむ ${name}`),
    joy: image(`/assets/characters/expressions/web/${fileName}_joy.png`, `まんめんの えがおの ${name}`),
    sad: image(`/assets/characters/expressions/web/${fileName}_sad.png`, `かなしい かおの ${name}`),
    thinking: image(`/assets/characters/expressions/web/${fileName}_thinking.png`, `かんがえる ${name}`),
  },
});

/**
 * キャラクター名・表情画像はここでまとめて差し替えられます。
 * ゲームごとの組み合わせは、各ゲームの castCycle で決めます。
 */
export const CHARACTER_ASSETS = {
  answer: character({ id: "answer", name: "アンサー", fileName: "cure_answer" }),
  arcana: character({ id: "arcana", name: "アルカナ", fileName: "cure_arcana_shadow" }),
  eclair: character({ id: "eclair", name: "エクレール", fileName: "cure_eclair" }),
  mystique: character({ id: "mystique", name: "ミスティーク", fileName: "cure_mystique" }),
};

/**
 * ZIP内のPNGと、生成した表情画像を一か所に登録します。
 * characterCandidates は既存参照との互換用一覧です。
 */
export const IMAGE_ASSETS = {
  characterCandidates: Object.values(CHARACTER_ASSETS),
  mascotCandidates: [
    image("/assets/mascots/pochitan.png", "ポチタン"),
    image("/assets/mascots/mashutan.png", "マシュタン"),
    image("/assets/mascots/jett_senpai.png", "ジェットせんぱい"),
  ],
  scenes: {
    team: image("/assets/scenes/detective_precure_team_home.png", "キャラクター候補の チーム画像"),
  },
  effects: {
    magnifier: image("/assets/effects/detective_magnifier.png", "きらきらの ルーペ"),
    clueGem: image("/assets/effects/clue_gem.png", "ひかる てがかり"),
    success: image("/assets/effects/hanamaru_success.png", "きらきらの はなまる"),
  },
};

function collectImageUrls(value, urls = new Set()) {
  if (!value || typeof value !== "object") return urls;
  if (typeof value.src === "string") {
    urls.add(value.src);
    return urls;
  }
  Object.values(value).forEach((child) => collectImageUrls(child, urls));
  return urls;
}

/** Service Workerへ渡す、ゲームプレイに必要なローカル画像一覧です。 */
export const OFFLINE_ASSET_URLS = [...collectImageUrls(IMAGE_ASSETS)];

const gameItem = (id, label, itemImage, icon = "") => ({
  id,
  label,
  image: itemImage,
  icon,
});

const EXPRESSION_LABELS = {
  smile: "ほほえむ",
  joy: "にっこり えがおの",
  sad: "かなしい かおの",
  thinking: "かんがえる",
};

/** 各ゲームで使う題材。並び順が、そのまま問題ごとの循環順になります。 */
export const GAME_ITEM_ASSETS = {
  count: [
    gameItem("magnifier", "ルーペ", IMAGE_ASSETS.effects.magnifier, "🔎"),
    gameItem("clue-gem", "てがかり", IMAGE_ASSETS.effects.clueGem, "💎"),
    gameItem("hanamaru", "はなまる", IMAGE_ASSETS.effects.success, "🌟"),
  ],
  move: [
    gameItem("pochitan", "ポチタン", IMAGE_ASSETS.mascotCandidates[0], "🐾"),
    gameItem("mashutan", "マシュタン", IMAGE_ASSETS.mascotCandidates[1], "🐾"),
    gameItem("jett-senpai", "ジェットせんぱい", IMAGE_ASSETS.mascotCandidates[2], "🐾"),
  ],
  choose: Object.values(CHARACTER_ASSETS).flatMap((itemCharacter) =>
    Object.entries(itemCharacter.expressions).map(([expression, expressionImage]) =>
      gameItem(
        `${itemCharacter.id}-${expression}`,
        `${EXPRESSION_LABELS[expression]} ${itemCharacter.name}`,
        expressionImage,
        "🕵️‍♀️",
      ),
    ),
  ),
};

export const APP_CONFIG = {
  title: "さんすう あそび",
  titleBadge: "かり",
  subtitle: "どれで あそぶ？",
  homeCharacter: "☀️",
  nextLabel: "つぎへ",
  homeLabel: "おうち",
  sound: true,
  characters: Object.values(CHARACTER_ASSETS),
  images: {
    home: IMAGE_ASSETS.scenes.team,
  },
};

export const GAME_CONFIGS = [
  {
    id: "count",
    kind: "count",
    title: "かぞえよう",
    shortDescription: "みて・かぞえて・タッチ",
    cardIcon: "🍓",
    character: "🐻",
    items: GAME_ITEM_ASSETS.count,
    prompt: "いくつ あるかな？",
    min: 1,
    max: 10,
    answerChoices: 4,
    successMessages: ["やったね！", "ぴったり！", "すごい！"],
    retryMessage: "だいじょうぶ。もういちど みてみよう",
    castCycle: [
      [CHARACTER_ASSETS.answer, CHARACTER_ASSETS.arcana],
      [CHARACTER_ASSETS.eclair, CHARACTER_ASSETS.mystique],
    ],
    images: {
      card: IMAGE_ASSETS.effects.success,
      prompt: IMAGE_ASSETS.effects.magnifier,
      item: null,
      success: IMAGE_ASSETS.effects.success,
    },
    theme: {
      background: "#fff2df",
      surface: "#fffaf2",
      accent: "#ec6d61",
      accentDark: "#a33d38",
      soft: "#ffd9cb",
      ink: "#3e302d",
    },
  },
  {
    id: "move",
    kind: "move",
    title: "はこんでみよう",
    shortDescription: "つかんで・はこぶ",
    cardIcon: "⭐",
    character: "🐰",
    items: GAME_ITEM_ASSETS.move,
    destinationIcon: "🧺",
    instructionTemplate: "{count}こ はこぼう",
    min: 1,
    max: 5,
    extraItems: 2,
    successMessages: ["できた！", "じょうず！", "ぜんぶ はいったね！"],
    retryMessage: "ゆっくりで だいじょうぶ",
    castCycle: [
      [CHARACTER_ASSETS.eclair, CHARACTER_ASSETS.mystique],
      [CHARACTER_ASSETS.answer, CHARACTER_ASSETS.arcana],
    ],
    images: {
      card: IMAGE_ASSETS.effects.clueGem,
      prompt: IMAGE_ASSETS.effects.magnifier,
      item: null,
      destination: null,
      success: IMAGE_ASSETS.effects.success,
    },
    theme: {
      background: "#eef7ff",
      surface: "#fbfdff",
      accent: "#4d8fca",
      accentDark: "#245d90",
      soft: "#cee8ff",
      ink: "#263c4f",
    },
  },
  {
    id: "choose",
    kind: "choose",
    title: "みつけよう",
    shortDescription: "おなじものを タッチ",
    cardIcon: "🔷",
    character: "🐶",
    shapes: GAME_ITEM_ASSETS.choose,
    randomizeTarget: true,
    promptTemplate: "{label}を みつけよう",
    choiceCount: 6,
    targetCount: 2,
    successMessages: ["みつけた！", "そのとおり！", "ぜんぶ みつけた！"],
    retryMessage: "おしい！ ほかも みてみよう",
    castCycle: [
      [CHARACTER_ASSETS.mystique, CHARACTER_ASSETS.answer],
      [CHARACTER_ASSETS.arcana, CHARACTER_ASSETS.eclair],
    ],
    images: {
      card: IMAGE_ASSETS.effects.magnifier,
      prompt: IMAGE_ASSETS.effects.magnifier,
      target: null,
      success: IMAGE_ASSETS.effects.success,
    },
    theme: {
      background: "#f6f1ff",
      surface: "#fdfaff",
      accent: "#8870c9",
      accentDark: "#584196",
      soft: "#e6dcff",
      ink: "#392f51",
    },
  },
];

export function getGameConfig(gameId) {
  return GAME_CONFIGS.find((game) => game.id === gameId);
}
