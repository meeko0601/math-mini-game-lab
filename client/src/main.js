import "./styles.css";
import {
  APP_CONFIG,
  GAME_CONFIGS,
  OFFLINE_ASSET_URLS,
  getGameConfig,
} from "./config/games.js";
import { applyTheme, el, visual } from "./core/dom.js";
import { createHomeCast } from "./core/characters.js";
import { registerPwa } from "./core/pwa.js";
import { mountCountGame } from "./games/countGame.js";
import { mountMoveGame } from "./games/moveGame.js";
import { mountChooseGame } from "./games/chooseGame.js";

const app = document.querySelector("#app");
const gameMounts = {
  count: mountCountGame,
  move: mountMoveGame,
  choose: mountChooseGame,
};

let soundEnabled = APP_CONFIG.sound;
let cleanupCurrentScreen = () => {};
const roundCounters = new Map();
let offlineStatus = import.meta.env.PROD ? "オフラインの じゅんびちゅう…" : null;
let offlineReady = false;

function setOfflineStatus(message, ready = false) {
  offlineStatus = message;
  offlineReady = ready;
  const status = document.querySelector("[data-pwa-status]");
  if (status) {
    status.textContent = message;
    status.dataset.ready = String(ready);
  }
}

function soundButton() {
  return el("button", {
    className: "icon-button sound-button",
    type: "button",
    text: soundEnabled ? "🔊" : "🔇",
    ariaLabel: soundEnabled ? "おとを けす" : "おとを だす",
    onClick: (event) => {
      soundEnabled = !soundEnabled;
      event.currentTarget.textContent = soundEnabled ? "🔊" : "🔇";
      event.currentTarget.setAttribute("aria-label", soundEnabled ? "おとを けす" : "おとを だす");
    },
  });
}

function goHome() {
  window.location.hash = "";
}

function startGame(gameId) {
  window.location.hash = `game=${gameId}`;
}

function renderHome() {
  cleanupCurrentScreen();
  cleanupCurrentScreen = () => {};
  app.removeAttribute("style");
  document.title = `${APP_CONFIG.title}（${APP_CONFIG.titleBadge}）`;

  const cards = el("div", { className: "game-grid", ariaLabel: "ゲームを えらぶ" });
  GAME_CONFIGS.forEach((game, index) => {
    cards.append(
      el("button", {
        className: "game-card",
        type: "button",
        ariaLabel: `${game.title}を はじめる`,
        style: {
          "--card-accent": game.theme.accent,
          "--card-soft": game.theme.soft,
          "--card-delay": `${index * 55}ms`,
        },
        onClick: () => startGame(game.id),
      }, [
        el("span", { className: "game-card__number", text: `0${index + 1}` }),
        visual(game.images?.card, game.cardIcon, "game-card__icon"),
        el("span", { className: "game-card__copy" }, [
          el("strong", { text: game.title }),
          el("small", { text: game.shortDescription }),
        ]),
        el("span", { className: "game-card__arrow", text: "➜" }),
      ]),
    );
  });

  app.replaceChildren(
    el("main", { className: "home-screen" }, [
      el("div", { className: "home-topbar" }, [
        el("div", { className: "brand-mark", ariaLabel: "かりの タイトル" }, [
          el("span", { className: "brand-mark__sun", text: APP_CONFIG.homeCharacter }),
          el("span", { className: "brand-mark__text" }, [
            el("strong", { text: APP_CONFIG.title }),
            el("small", { text: APP_CONFIG.titleBadge }),
          ]),
        ]),
        soundButton(),
      ]),
      el("section", { className: "home-intro" }, [
        el("div", { className: "home-intro__copy" }, [
          el("p", { className: "eyebrow", text: "MINI GAME PLAYGROUND" }),
          el("h1", { text: APP_CONFIG.subtitle }),
          el("p", { className: "home-intro__hint", text: "おおきな カードを タッチしてね" }),
        ]),
        createHomeCast(APP_CONFIG.characters),
      ]),
      cards,
      el("p", {
        className: "home-note",
        text: offlineStatus ?? "なまえ・どうぶつ・いろは あとから すぐ かえられます",
        dataset: { pwaStatus: "true", ready: String(offlineReady) },
      }),
    ]),
  );
}

function renderGame(game) {
  cleanupCurrentScreen();
  const mountGame = gameMounts[game.kind];
  if (!mountGame) {
    renderHome();
    return;
  }

  applyTheme(app, game.theme);
  document.title = `${game.title}｜${APP_CONFIG.title}`;

  const roundIndex = roundCounters.get(game.id) ?? 0;
  const castCycle = game.castCycle?.length ? game.castCycle : [[]];
  const roundConfig = {
    ...game,
    cast: castCycle[roundIndex % castCycle.length],
    roundIndex,
    nextLabel: APP_CONFIG.nextLabel,
  };

  const stage = el("section", { className: "game-stage" });
  const feedback = el("div", { className: "feedback-layer", ariaLabel: "こたえの おしらせ" });
  const roundKey = Date.now();

  const shell = el("main", { className: "game-screen", dataset: { round: roundKey } }, [
    el("header", { className: "game-header" }, [
      el("button", {
        className: "home-button",
        type: "button",
        ariaLabel: `${APP_CONFIG.homeLabel}へ もどる`,
        onClick: goHome,
      }, [el("span", { text: "⌂" }), el("small", { text: APP_CONFIG.homeLabel })]),
      el("div", { className: "game-title" }, [
        el("span", { text: game.cardIcon }),
        el("strong", { text: game.title }),
      ]),
      soundButton(),
    ]),
    stage,
    feedback,
  ]);

  app.replaceChildren(shell);
  cleanupCurrentScreen = mountGame({
    stage,
    feedback,
    config: roundConfig,
    soundEnabled: () => soundEnabled,
    nextRound: () => {
      roundCounters.set(game.id, roundIndex + 1);
      renderGame(game);
    },
  });
}

function renderFromHash() {
  const match = window.location.hash.match(/^#game=([a-z0-9-]+)$/);
  const game = match ? getGameConfig(match[1]) : null;
  if (game) renderGame(game);
  else renderHome();
}

window.addEventListener("hashchange", renderFromHash);
window.addEventListener("pagehide", () => cleanupCurrentScreen());
renderFromHash();
registerPwa({
  assetUrls: OFFLINE_ASSET_URLS,
  onReady: () => setOfflineStatus("✓ オフラインで あそべます", true),
  onError: (error) => {
    console.error("PWAのオフライン準備に失敗しました", error);
    setOfflineStatus("インターネットにつないで もういちど ひらいてね");
  },
});
