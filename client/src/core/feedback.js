import { el, visual } from "./dom.js";
import { createFeedbackCast } from "./characters.js";
import { pickRandom } from "./questions.js";
import { playSound } from "./audio.js";

export function createFeedbackController(container, config, onNext, soundEnabled) {
  let locked = false;
  let timer;
  const canPlaySound = () =>
    typeof soundEnabled === "function" ? soundEnabled() : soundEnabled;

  function retry(message = config.retryMessage) {
    if (locked) return;
    playSound("retry", canPlaySound());
    container.replaceChildren(
      el("div", { className: "feedback feedback--retry" }, [
        createFeedbackCast(config.cast, "retry"),
        el("strong", { text: message }),
      ]),
    );
    clearTimeout(timer);
    timer = setTimeout(() => container.replaceChildren(), 1500);
  }

  function success(message = pickRandom(config.successMessages)) {
    if (locked) return;
    locked = true;
    clearTimeout(timer);
    playSound("success", canPlaySound());

    const burst = el("div", { className: "celebration", ariaLabel: "せいかい" });
    for (let index = 0; index < 10; index += 1) {
      burst.append(
        el("span", {
          className: "celebration__piece",
          text: index % 2 ? "★" : "●",
          style: {
            "--piece-index": index,
            "--piece-color": ["#ffcf56", "#ef6f6c", "#62b6a8", "#8c78cf"][index % 4],
          },
        }),
      );
    }

    container.replaceChildren(
      burst,
      el("div", { className: "feedback feedback--success" }, [
        createFeedbackCast(config.cast, "success"),
        el("div", { className: "feedback__message" }, [
          visual(config.images?.success, "✨", "feedback__spark"),
          el("strong", { text: message }),
        ]),
        el("button", {
          className: "primary-button next-button",
          type: "button",
          ariaLabel: "つぎの もんだいへ",
          text: `${config.nextLabel ?? "つぎへ"}  ➜`,
          onClick: onNext,
        }),
      ]),
    );
  }

  return {
    retry,
    success,
    isLocked: () => locked,
    dispose: () => clearTimeout(timer),
  };
}
