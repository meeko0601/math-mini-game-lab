export function randomInt(min, max, random = Math.random) {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function pickRandom(list, random = Math.random) {
  return list[randomInt(0, list.length - 1, random)];
}

export function shuffled(list, random = Math.random) {
  return [...list]
    .map((value) => ({ value, order: random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ value }) => value);
}

function pickRoundItem(list, roundIndex, random = Math.random) {
  if (Number.isInteger(roundIndex) && roundIndex >= 0) {
    return list[roundIndex % list.length];
  }
  return pickRandom(list, random);
}

function describeItem(item, fallbackImage) {
  if (item && typeof item === "object") {
    return {
      item: item.icon || item.label,
      itemId: item.id,
      itemLabel: item.label,
      itemImage: item.image ?? fallbackImage,
    };
  }
  return {
    item,
    itemId: String(item),
    itemLabel: String(item),
    itemImage: fallbackImage,
  };
}

export function makeNumberChoices(answer, min, max, total = 4, random = Math.random) {
  const available = [];
  for (let value = min; value <= max; value += 1) {
    if (value !== answer) available.push(value);
  }

  let distance = 1;
  while (available.length < total - 1) {
    for (const candidate of [answer - distance, answer + distance]) {
      if (candidate >= 0 && candidate !== answer && !available.includes(candidate)) {
        available.push(candidate);
      }
      if (available.length >= total - 1) break;
    }
    distance += 1;
  }

  return shuffled([answer, ...shuffled(available, random).slice(0, total - 1)], random);
}

export function createCountQuestion(config, random = Math.random) {
  const answer = randomInt(config.min, config.max, random);
  const selectedItem = pickRoundItem(config.items, config.roundIndex, random);
  return {
    answer,
    ...describeItem(selectedItem, config.images?.item),
    choices: makeNumberChoices(answer, config.min, config.max, config.answerChoices, random),
  };
}

export function createMoveQuestion(config, random = Math.random) {
  const target = randomInt(config.min, config.max, random);
  const selectedItem = pickRoundItem(config.items, config.roundIndex, random);
  return {
    target,
    ...describeItem(selectedItem, config.images?.item),
    totalItems: target + config.extraItems,
  };
}

export function createChooseQuestion(config, random = Math.random) {
  const target = pickRoundItem(config.shapes, config.roundIndex, random);
  const others = config.shapes.filter((shape) => shape.id !== target.id);
  const choices = [];

  for (let index = 0; index < config.targetCount; index += 1) {
    choices.push({ ...target, key: `target-${index}` });
  }
  const shuffledOthers = shuffled(others, random);
  let otherIndex = 0;
  while (choices.length < config.choiceCount) {
    const shape = shuffledOthers[otherIndex % shuffledOthers.length];
    choices.push({ ...shape, key: `other-${choices.length}` });
    otherIndex += 1;
  }

  return { target, choices: shuffled(choices, random) };
}

export function formatTemplate(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
