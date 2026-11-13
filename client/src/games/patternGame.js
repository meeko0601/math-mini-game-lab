import { el, visual } from '../core/dom.js';
import { createCharacterPrompt } from '../core/characters.js';
import { createFeedbackController } from '../core/feedback.js';
import { createPatternQuestion } from './patternQuestion.js';

export function mountPatternGame({ stage, feedback, config, nextRound, soundEnabled }) {
  const question = createPatternQuestion(config);
  const controller = createFeedbackController(feedback, config, nextRound, soundEnabled);
  const sequence = el('div', { className: 'pattern-sequence', ariaLabel: config.prompt });
  const slot = el('div', { className: 'pattern-tile pattern-tile--missing', text: '？' });
  slot.setAttribute('aria-live', 'polite');
  question.sequence.forEach((item, index) => {
    sequence.append(el('div', {
      className: 'pattern-tile',
      dataset: { group: Math.floor(index / question.groupSize) },
    }, [visual(item.image, item.icon, 'pattern-image')]));
  });
  sequence.append(slot);

  const hint = el('button', {
    className: 'pattern-hint', type: 'button', text: config.hintLabel,
    onClick: () => {
      sequence.classList.add('pattern-sequence--hint');
      hint.textContent = config.groupLabel;
      hint.setAttribute('aria-pressed', 'true');
    },
  });
  hint.setAttribute('aria-pressed', 'false');
  const answers = el('div', { className: 'pattern-answers', ariaLabel: config.answerLabel });
  question.choices.forEach((item) => {
    answers.append(el('button', {
      className: 'pattern-choice', type: 'button', ariaLabel: item.label,
      onClick: () => {
        if (controller.isLocked()) return;
        if (item.id === question.answer.id) {
          slot.replaceChildren(visual(item.image, item.icon, 'pattern-image'));
          slot.classList.add('pattern-tile--solved');
          answers.querySelectorAll('button').forEach((button) => { button.disabled = true; });
          controller.success();
        } else {
          sequence.classList.add('pattern-sequence--hint');
          controller.retry();
        }
      },
    }, [visual(item.image, item.icon, 'pattern-choice__image'), el('span', { text: item.label })]));
  });
  stage.replaceChildren(
    createCharacterPrompt(config.cast, config.prompt),
    el('p', { className: 'pattern-instruction', text: config.hint }),
    sequence, hint, answers,
  );
  return () => controller.dispose();
}
