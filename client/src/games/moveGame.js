import { el, visual } from "../core/dom.js";
import { createCharacterPrompt } from "../core/characters.js";
import { createFeedbackController } from "../core/feedback.js";
import { playSound } from "../core/audio.js";
import { createMoveQuestion, formatTemplate } from "../core/questions.js";

export function mountMoveGame({ stage, feedback, config, nextRound, soundEnabled }) {
  const question = createMoveQuestion(config);
  const controller = createFeedbackController(feedback, config, nextRound, soundEnabled);
  let movedCount = 0;

  function createMoveItemVisual(itemImage, fallbackText) {
    if (!itemImage?.src) return visual(itemImage, fallbackText, "move-item__visual");

    const itemVisual = el("span", {
      className: "move-item__visual",
      ariaLabel: itemImage.alt ?? "はこぶもの",
      style: { backgroundImage: `url("${itemImage.src}")` },
    });
    itemVisual.setAttribute("role", "img");
    return itemVisual;
  }

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
    let activePointerId = null;

    const finishPointer = (event) => {
      if (activePointerId !== event.pointerId) return false;
      try {
        if (typeof item.hasPointerCapture === "function" && item.hasPointerCapture(event.pointerId)) {
          item.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Safariで解除済みでも、このあとの判定を続けます。
      }
      activePointerId = null;
      return true;
    };

    item.addEventListener("pointerdown", (event) => {
      if (controller.isLocked()) return;
      activePointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      dragged = false;
      suppressClick = false;
      if (typeof item.setPointerCapture === "function") {
        try {
          item.setPointerCapture(event.pointerId);
        } catch {
          // SafariでPointer Captureが拒否されても、タップ操作は継続できます。
        }
      }
      item.classList.add("is-dragging");
    });

    item.addEventListener("pointermove", (event) => {
      if (activePointerId !== event.pointerId) return;
      const x = event.clientX - startX;
      const y = event.clientY - startY;
      dragged ||= Math.abs(x) + Math.abs(y) > 10;
      item.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.08)`;
    });

    item.addEventListener("pointerup", (event) => {
      if (!finishPointer(event)) return;
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

    item.addEventListener("pointercancel", (event) => {
      if (!finishPointer(event)) return;
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
    }, [createMoveItemVisual(question.itemImage, question.item)]);
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
