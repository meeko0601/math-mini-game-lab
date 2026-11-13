import { shuffled } from '../core/questions.js';

export function createPatternQuestion(config, random = Math.random) {
  const round = config.roundIndex ?? 0;
  const pattern = config.patterns[round % config.patterns.length];
  const items = shuffled(config.items, random).slice(0, Math.max(...pattern) + 1);
  // Show two complete repetitions before asking for the next item.
  const sequence = [...pattern, ...pattern].map((index) => items[index]);
  return {
    sequence,
    answer: items[pattern[0]],
    choices: shuffled(items, random),
    groupSize: pattern.length,
  };
}
