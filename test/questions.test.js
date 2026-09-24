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

test("画像題材は数える・運ぶで循環し、みつける表情はランダムに選ばれる", () => {
  assert.deepEqual(
    [GAME_ITEM_ASSETS.count.length, GAME_ITEM_ASSETS.move.length, GAME_ITEM_ASSETS.choose.length],
    [3, 3, 16],
  );

  const countIds = Array.from({ length: 3 }, (_, roundIndex) =>
    createCountQuestion({ ...GAME_CONFIGS[0], roundIndex }, alwaysZero).itemId);
  const moveIds = Array.from({ length: 3 }, (_, roundIndex) =>
    createMoveQuestion({ ...GAME_CONFIGS[1], roundIndex }, alwaysZero).itemId);

  assert.equal(new Set(countIds).size, 3);
  assert.equal(new Set(moveIds).size, 3);
  assert.equal(new Set(GAME_ITEM_ASSETS.choose.map((item) => item.id)).size, 16);
  assert.equal(
    GAME_ITEM_ASSETS.choose.every((item) => item.image.src.includes("/expressions/web/")),
    true,
  );

  const firstTarget = createChooseQuestion(GAME_CONFIGS[2], alwaysZero).target.id;
  const lastTarget = createChooseQuestion(GAME_CONFIGS[2], () => 0.999).target.id;
  assert.notEqual(firstTarget, lastTarget);

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

  const charactersSource = readFileSync(resolve(publicRoot, "../src/core/characters.js"), "utf8");
  assert.match(charactersSource, /createHomeCast[\s\S]*characterFullBody/);
});

test("PWA設定と全ゲーム画像がオフライン利用向けに揃っている", () => {
  const publicRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../client/public");
  const projectRoot = resolve(publicRoot, "../..");
  const manifest = JSON.parse(readFileSync(resolve(publicRoot, "manifest.json"), "utf8"));
  const serviceWorker = readFileSync(resolve(publicRoot, "sw.js"), "utf8");
  const indexHtml = readFileSync(resolve(publicRoot, "../index.html"), "utf8");
  const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8"));

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
  assert.match(serviceWorker, /__PWA_PRECACHE_MANIFEST__/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /cache\.match\(scopedUrl\("\/index\.html"\)/);
  assert.match(packageJson.scripts.build, /build-service-worker\.mjs/);
  assert.equal(existsSync(resolve(projectRoot, "scripts/build-service-worker.mjs")), true);
  assert.equal(existsSync(resolve(projectRoot, "vercel.json")), true);
  assert.match(indexHtml, /rel="manifest"/);
  assert.match(indexHtml, /apple-mobile-web-app-capable/);
  assert.doesNotMatch(indexHtml, /https?:\/\//);
});

test("はこんでみようはiPad Safari向けの画像表示とタッチ代替を備える", () => {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const moveGame = readFileSync(resolve(projectRoot, "client/src/games/moveGame.js"), "utf8");
  const styles = readFileSync(resolve(projectRoot, "client/src/styles.css"), "utf8");

  assert.match(moveGame, /backgroundImage/);
  assert.match(moveGame, /activePointerId/);
  assert.match(moveGame, /タップだけでも運べます/);
  assert.match(styles, /\.move-item\s*\{[\s\S]*?touch-action: none;/);
  assert.match(styles, /\.move-item\s*\{[\s\S]*?padding: 0;/);
  assert.match(styles, /\.move-item__visual\s*\{[\s\S]*?background-size: contain;/);
  assert.match(styles, /\.move-item__visual\s*\{[\s\S]*?background-position: center center;/);
  assert.match(styles, /-webkit-touch-callout: none;/);
});
