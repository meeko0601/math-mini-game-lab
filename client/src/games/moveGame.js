import { el, visual } from "../core/dom.js";
import { createCharacterPrompt } from "../core/characters.js";
import { createFeedbackController } from "../core/feedback.js";
import { playSound } from "../core/audio.js";
import { createMoveQuestion, formatTemplate } from "../core/questions.js";

export function mountMoveGame({ stage, feedback, config, nextRound, soundEnabled }) {
  const question = createMoveQuestion(config);
  const controller = createFeedbackController(feedback, config, nextRound, soundEnabled);
  let movedCount = 0;

  const source = el("div", { className: "move-source", ariaLabel: "はこぶもの" });
  const destinationCount = el("strong", { className: "destination-count", text: "0" });
  const destination = el("div", { className: "move-destination", ariaLabel: "ここへ はこす" }, [
    visual(config.images?.destination, config.destinationIcon, "destination-icon"),
    el("span", { className: "destination-label" }, [destinationCount, document.createTextNode(` / ${question.target}`)]),
  ]);

  function moveItem(item) {
    if (controller.isLocked() || item.dataset.moved === "true") return;
    item.dataset.moved = "true";
    item.classList.remove("is-dragging");
    item.style.removeProperty("transform");
    item.classList.add("is-moving");
    movedCount += 1;
    destinationCount.textContent = String(movedCount);
    playSound("move", typeof soundEnabled === "function" ? soundEnabled() : soundEnabled);
    setTimeout(() => item.remove(), 240);

    if (movedCount === question.target) {
      destination.classList.add("is-full");
      setTimeout(() => controller.success(), 260);
    }
  }

  function enablePointerDrag(item) {
    let startX = 0;
    let startY = 0;
    let dragged = false;
    let suppressClick = false;

    item.addEventListener("pointerdown", (event) => {
      if (controller.isLocked()) return;
      startX = event.clientX;
      startY = event.clientY;
      dragged = false;
      suppressClick = false;
      item.setPointerCapture(event.pointerId);
      item.classList.add("is-dragging");
    });

    item.addEventListener("pointermove", (event) => {
      if (!item.hasPointerCapture(event.pointerId)) return;
      const x = event.clientX - startX;
      const y = event.clientY - startY;
      dragged ||= Math.abs(x) + Math.abs(y) > 10;
      item.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.08)`;
    });

    item.addEventListener("pointerup", (event) => {
      if (!item.hasPointerCapture(event.pointerId)) return;
      item.releasePointerCapture(event.pointerId);
      const destinationRect = destination.getBoundingClientRect();
      const droppedInside =
        event.clientX >= destinationRect.left &&
        event.clientX <= destinationRect.right &&
        event.clientY >= destinationRect.top &&
        event.clientY <= destinationRect.bottom;
      suppressClick = dragged;
      item.classList.remove("is-dragging");
      item.style.removeProperty("transform");

      // 小さい子向けに、ドラッグしにくい場合はタップだけでも運べます。
      if (droppedInside || !dragged) moveItem(item);
      else controller.retry("はこの なかまで はこんでみよう");
    });

    item.addEventListener("pointercancel", () => {
      suppressClick = dragged;
      item.classList.remove("is-dragging");
      item.style.removeProperty("transform");
    });

    // Enter / Spaceによるボタン操作も、タップと同じ結果にします。
    item.addEventListener("click", () => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      moveItem(item);
    });
  }

  for (let index = 0; index < question.totalItems; index += 1) {
    const item = el("button", {
      className: "move-item",
      type: "button",
      ariaLabel: `${question.itemLabel}を はこぶ`,
    }, [visual(question.itemImage, question.item, "move-item__visual")]);
    enablePointerDrag(item);
    source.append(item);
  }

  stage.replaceChildren(
    createCharacterPrompt(
      config.cast,
      formatTemplate(config.instructionTemplate, { count: question.target }),
    ),
    el("p", { className: "gesture-hint", text: "つかんで はこぶ（タッチだけでも OK）" }),
    el("div", { className: "move-board" }, [source, el("div", { className: "move-arrow", text: "➜" }), destination]),
  );

  return () => controller.dispose();
}
