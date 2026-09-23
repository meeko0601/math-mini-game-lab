import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createChooseQuestion,
  createCountQuestion,
  createMoveQuestion,
  formatTemplate,
  makeNumberChoices,
  randomInt,
} from "../client/src/core/questions.js";
import {
  CHARACTER_ASSETS,
  GAME_CONFIGS,
  GAME_ITEM_ASSETS,
  IMAGE_ASSETS,
  OFFLINE_ASSET_URLS,
} from "../client/src/config/games.js";

const alwaysZero = () => 0;

test("randomInt は両端を含む範囲の値を返す", () => {
  assert.equal(randomInt(1, 10, alwaysZero), 1);
  assert.equal(randomInt(1, 10, () => 0.999), 10);
});

test("数の選択肢には正解が1回だけ含まれる", () => {
  const choices = makeNumberChoices(3, 1, 5, 4, alwaysZero);
  assert.equal(choices.length, 4);
  assert.equal(choices.filter((choice) => choice === 3).length, 1);
  assert.equal(new Set(choices).size, 4);
});

test("3種の問題生成が設定の範囲を守る", () => {
  const count = createCountQuestion(GAME_CONFIGS[0], alwaysZero);
  assert.equal(count.answer, GAME_CONFIGS[0].min);
  assert.equal(count.choices.includes(count.answer), true);

  const move = createMoveQuestion(GAME_CONFIGS[1], alwaysZero);
  assert.equal(move.target, GAME_CONFIGS[1].min);
  assert.equal(move.totalItems, move.target + GAME_CONFIGS[1].extraItems);

  const choose = createChooseQuestion(GAME_CONFIGS[2], alwaysZero);
  assert.equal(choose.choices.length, GAME_CONFIGS[2].choiceCount);
  assert.equal(
    choose.choices.filter((choice) => choice.id === choose.target.id).length,
    GAME_CONFIGS[2].targetCount,
  );
});

test("文章テンプレートの値を置き換えられる", () => {
  assert.equal(formatTemplate("{count}こ はこぼう", { count: 4 }), "4こ はこぼう");
});

test("画像題材は問題ごとに循環し、みつける8種へ偏りがない", () => {
  assert.deepEqual(
    [GAME_ITEM_ASSETS.count.length, GAME_ITEM_ASSETS.move.length, GAME_ITEM_ASSETS.choose.length],
    [3, 3, 8],
  );

  const countIds = Array.from({ length: 3 }, (_, roundIndex) =>
    createCountQuestion({ ...GAME_CONFIGS[0], roundIndex }, alwaysZero).itemId);
  const moveIds = Array.from({ length: 3 }, (_, roundIndex) =>
    createMoveQuestion({ ...GAME_CONFIGS[1], roundIndex }, alwaysZero).itemId);
  const chooseTargets = Array.from({ length: 8 }, (_, roundIndex) =>
    createChooseQuestion({ ...GAME_CONFIGS[2], roundIndex }, alwaysZero).target.id);

  assert.equal(new Set(countIds).size, 3);
  assert.equal(new Set(moveIds).size, 3);
  assert.equal(new Set(chooseTargets).size, 8);

  const choose = createChooseQuestion({ ...GAME_CONFIGS[2], roundIndex: 0 }, alwaysZero);
  const distractors = choose.choices.filter((choice) => choice.id !== choose.target.id);
  assert.equal(new Set(distractors.map((choice) => choice.id)).size, distractors.length);
});

test("ゲームIDと種類は重複せず、必要な設定がある", () => {
  assert.equal(new Set(GAME_CONFIGS.map((game) => game.id)).size, GAME_CONFIGS.length);
  for (const game of GAME_CONFIGS) {
    assert.ok(game.title);
    assert.ok(game.character);
    assert.ok(game.successMessages.length > 0);
    assert.ok(game.theme.accent);
  }
});

test("画像素材は設定に集約され、3ゲームから差し替えられる", () => {
  const images = [];
  const collectImages = (value) => {
    if (!value || typeof value !== "object") return;
    if (typeof value.src === "string") {
      images.push(value);
      return;
    }
    Object.values(value).forEach(collectImages);
  };
  collectImages(IMAGE_ASSETS);

  assert.equal(images.length, 31);
  const publicRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../client/public");
  for (const image of images) {
    assert.match(image.src, /^\/assets\/.+\.png$/);
    assert.ok(image.alt);
    assert.equal(existsSync(resolve(publicRoot, image.src.slice(1))), true);
  }

  for (const game of GAME_CONFIGS) {
    assert.ok(game.images?.card?.src);
    assert.ok(game.images?.prompt?.src);
    assert.ok(game.images?.success?.src);
    assert.equal(game.castCycle.length, 2);
    assert.equal(game.castCycle.every((cast) => cast.length === 2), true);
  }

  assert.equal(Object.keys(CHARACTER_ASSETS).length, 4);
  for (const character of Object.values(CHARACTER_ASSETS)) {
    assert.deepEqual(Object.keys(character.expressions).sort(), ["joy", "sad", "smile", "thinking"]);
  }
});

test("PWA設定と全ゲーム画像がオフライン利用向けに揃っている", () => {
  const publicRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../client/public");
  const manifest = JSON.parse(readFileSync(resolve(publicRoot, "manifest.json"), "utf8"));
  const serviceWorker = readFileSync(resolve(publicRoot, "sw.js"), "utf8");
  const indexHtml = readFileSync(resolve(publicRoot, "../index.html"), "utf8");

  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
  for (const icon of manifest.icons) {
    assert.equal(existsSync(resolve(publicRoot, icon.src.replace(/^\.\//, ""))), true);
  }

  assert.equal(OFFLINE_ASSET_URLS.length, 31);
  for (const assetUrl of OFFLINE_ASSET_URLS) {
    assert.equal(existsSync(resolve(publicRoot, assetUrl.slice(1))), true);
  }

  assert.match(serviceWorker, /addEventListener\("install"/);
  assert.match(serviceWorker, /addEventListener\("fetch"/);
  assert.match(serviceWorker, /OFFLINE_READY/);
  assert.match(indexHtml, /rel="manifest"/);
  assert.match(indexHtml, /apple-mobile-web-app-capable/);
  assert.doesNotMatch(indexHtml, /https?:\/\//);
});
