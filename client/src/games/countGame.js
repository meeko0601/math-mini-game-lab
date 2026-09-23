import { el, visual } from "../core/dom.js";
import { createCharacterPrompt } from "../core/characters.js";
import { createFeedbackController } from "../core/feedback.js";
import { createCountQuestion } from "../core/questions.js";

export function mountCountGame({ stage, feedback, config, nextRound, soundEnabled }) {
  const question = createCountQuestion(config);
  const controller = createFeedbackController(feedback, config, nextRound, soundEnabled);

  const itemField = el("div", {
    className: "count-field",
    ariaLabel: `${question.itemLabel}が${question.answer}こ`,
  });
  for (let index = 0; index < question.answer; index += 1) {
    itemField.append(
      visual(question.itemImage, question.item, "count-item"),
    );
  }

  const answers = el("div", { className: "number-answers", ariaLabel: "こたえ" });
  for (const choice of question.choices) {
    answers.append(
      el("button", {
        className: "number-button",
        type: "button",
        text: choice,
        ariaLabel: `${choice}こ`,
        onClick: (event) => {
          if (controller.isLocked()) return;
          if (choice === question.answer) {
            event.currentTarget.classList.add("is-correct");
            controller.success();
          } else {
            event.currentTarget.classList.add("try-again");
            setTimeout(() => event.currentTarget?.classList.remove("try-again"), 360);
            controller.retry();
          }
        },
      }),
    );
  }

  stage.replaceChildren(
    createCharacterPrompt(config.cast, config.prompt),
    itemField,
    answers,
  );

  return () => controller.dispose();
}
