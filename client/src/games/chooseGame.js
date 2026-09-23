import { el, visual } from "../core/dom.js";
import { createCharacterPrompt } from "../core/characters.js";
import { createFeedbackController } from "../core/feedback.js";
import { createChooseQuestion, formatTemplate } from "../core/questions.js";

export function mountChooseGame({ stage, feedback, config, nextRound, soundEnabled }) {
  const question = createChooseQuestion(config);
  const controller = createFeedbackController(feedback, config, nextRound, soundEnabled);
  let foundCount = 0;

  const choices = el("div", { className: "shape-choices", ariaLabel: "えらぶもの" });
  for (const choice of question.choices) {
    choices.append(
      el("button", {
        className: `shape-button shape-button--${choice.id}`,
        type: "button",
        ariaLabel: choice.label,
        onClick: (event) => {
          if (controller.isLocked() || event.currentTarget.dataset.found === "true") return;

          if (choice.id === question.target.id) {
            event.currentTarget.dataset.found = "true";
            event.currentTarget.classList.add("is-found");
            foundCount += 1;
            if (foundCount === config.targetCount) {
              setTimeout(() => controller.success(), 180);
            }
          } else {
            event.currentTarget.classList.add("try-again");
            setTimeout(() => event.currentTarget?.classList.remove("try-again"), 360);
            controller.retry();
          }
        },
      }, [visual(choice.image, choice.icon, "shape-button__visual")]),
    );
  }

  stage.replaceChildren(
    createCharacterPrompt(
      config.cast,
      formatTemplate(config.promptTemplate, { label: question.target.label }),
    ),
    el("div", { className: "target-preview", ariaLabel: question.target.label }, [
      visual(
        config.images?.target ?? question.target.image,
        question.target.icon,
        `target-shape shape-button--${question.target.id}`,
      ),
      el("span", { text: `を ${config.targetCount}こ` }),
    ]),
    choices,
  );

  return () => controller.dispose();
}
