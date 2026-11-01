import { BUG_SPECIES, COUNTABLE_SPECIES } from "./bugs.js";
import { createRng, freshSeed } from "./rng.js";
import { CAVE_CONFIG } from '../../config/cave.js';
const [STAGE1_COUNT_MIN, STAGE1_COUNT_MAX] = CAVE_CONFIG.countRange;
const [STAGE2_TARGET_MIN, STAGE2_TARGET_MAX] = CAVE_CONFIG.collectRange;
const [STAGE3_TARGET_MIN, STAGE3_TARGET_MAX] = CAVE_CONFIG.jewelRange;
const STAGE3_CHOICE_COUNT = CAVE_CONFIG.jewelChoices;
const STAGE2_VISIBLE_AT_ONCE = CAVE_CONFIG.visibleSparkles;
function toChoices(values, rng) {
  return rng.shuffle(values).map((value) => ({
    value,
    id: rng.id("n")
  }));
}
function uniqueDistractors(rng, answer, min, max, needed, minDistance) {
  const pool = [];
  const fallback = [];
  for (let n = min; n <= max; n += 1) {
    if (n === answer) continue;
    fallback.push(n);
    if (Math.abs(n - answer) >= minDistance) pool.push(n);
  }
  const source = pool.length >= needed ? pool : fallback;
  return rng.shuffle(source).slice(0, needed);
}
function placeBugs(rng, species, count, countable) {
  const spots = countable ? gridPoints(rng, count, {
    minX: 16,
    maxX: 84,
    minY: 36,
    maxY: 55
  }) : edgePoints(rng, count);
  return spots.map((spot) => ({
    id: rng.id("bug"),
    species,
    x: spot.x,
    y: spot.y,
    scale: countable ? rng.float(0.96, 1.06) : rng.float(0.84, 1),
    rotate: rng.float(-12, 12),
    countable
  }));
}
function edgePoints(rng, count) {
  return Array.from({ length: count }, (_, i) => ({
    x: i % 2 === 0 ? rng.float(10, 12) : rng.float(88, 90),
    y: 41 + Math.floor(i / 2) * 15 + rng.float(-1, 1)
  }));
}
function gridPoints(rng, count, box) {
  const cols = count <= 6 ? 3 : count <= 8 ? 4 : 5;
  const rows = Math.ceil(count / cols);
  const points = [];
  const cellH = (box.maxY - box.minY) / Math.max(rows - 1, 1);
  for (let i = 0; i < count; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const inLastRow = row === rows - 1;
    const lastRowCount = count - (rows - 1) * cols;
    const xCols = inLastRow && lastRowCount > 0 ? lastRowCount : cols;
    const xIndex = inLastRow ? i - (rows - 1) * cols : col;
    const xSpan = box.maxX - box.minX;
    const x = xCols === 1 ? (box.minX + box.maxX) / 2 : box.minX + xSpan * xIndex / (xCols - 1);
    points.push({
      x: x + rng.float(-0.8, 0.8),
      y: box.minY + cellH * row + rng.float(-0.6, 0.6)
    });
  }
  return points;
}
function spreadPoints(rng, count, box) {
  const points = [];
  let guard = 0;
  while (points.length < count && guard < 400) {
    guard += 1;
    const candidate = {
      x: rng.float(box.minX, box.maxX),
      y: rng.float(box.minY, box.maxY)
    };
    const tooClose = points.some((p) => {
      const dx = p.x - candidate.x;
      const dy = p.y - candidate.y;
      return Math.hypot(dx, dy) < box.minGap;
    });
    if (!tooClose) points.push(candidate);
  }
  while (points.length < count) {
    points.push({
      x: box.minX + points.length * 13 % (box.maxX - box.minX),
      y: box.minY + points.length * 9 % (box.maxY - box.minY)
    });
  }
  return points;
}
function generateStage1(rng) {
  const species = rng.pick(COUNTABLE_SPECIES);
  const count = rng.int(STAGE1_COUNT_MIN, STAGE1_COUNT_MAX);
  const otherSpecies = BUG_SPECIES.filter((s) => s !== species);
  return {
    species,
    count,
    choices: toChoices(Array.from({ length: CAVE_CONFIG.countChoices }, (_, i) => i + 1), rng),
    bugs: placeBugs(rng, species, count, true),
    decoBugs: placeBugs(rng, rng.pick(otherSpecies), 2, false).map((bug) => ({
      ...bug,
      species: rng.pick(otherSpecies),
      y: rng.float(68, 69)
    }))
  };
}
function generateStage2(rng) {
  const target = rng.int(STAGE2_TARGET_MIN, STAGE2_TARGET_MAX);
  const spots = spreadPoints(rng, target, {
    minX: 8,
    maxX: 92,
    minY: 46,
    maxY: 78,
    minGap: 12
  });
  const sparkles = spots.map((spot, index) => ({
    id: rng.id("spark"),
    x: spot.x,
    y: spot.y,
    collected: false,
    size: index % 5 === 0 ? "medium" : "small",
    delay: rng.float(0, 1.4)
  }));
  return {
    target,
    sparkles,
    visibleAtOnce: STAGE2_VISIBLE_AT_ONCE,
    decoBugs: placeBugs(rng, rng.pick(BUG_SPECIES), 3, false).map((bug) => ({
      ...bug,
      species: rng.pick(BUG_SPECIES)
    }))
  };
}
function generateStage3(rng) {
  const target = rng.int(STAGE3_TARGET_MIN, STAGE3_TARGET_MAX);
  const distractors = uniqueDistractors(
    rng,
    target,
    STAGE3_TARGET_MIN,
    STAGE3_TARGET_MAX,
    STAGE3_CHOICE_COUNT - 1,
    1
  );
  const values = toChoices([target, ...distractors], rng);
  const hues = [12, 28, 46, 78, 132, 168, 188, 212, 268, 318];
  return {
    target,
    jewels: values.map((choice, index) => ({
      ...choice,
      x: 0,
      y: 0,
      hue: hues[index % hues.length]
    })),
    decoBugs: placeBugs(rng, rng.pick(BUG_SPECIES), 2, false).map((bug) => ({
      ...bug,
      species: rng.pick(BUG_SPECIES)
    }))
  };
}
function generateRun(seed = freshSeed()) {
  const rng = createRng(seed);
  return {
    seed,
    stage1: generateStage1(rng),
    stage2: generateStage2(rng),
    stage3: generateStage3(rng)
  };
}
function nextVisibleSparkles(sparkles, revealedIds, visibleAtOnce) {
  const collectedIds = new Set(sparkles.filter((s) => s.collected).map((s) => s.id));
  const stillRevealed = revealedIds.filter((id) => !collectedIds.has(id));
  const hidden = sparkles.filter((s) => !s.collected && !stillRevealed.includes(s.id)).map((s) => s.id);
  const need = Math.max(0, visibleAtOnce - stillRevealed.length);
  return [...stillRevealed, ...hidden.slice(0, need)];
}
const PROBLEM_SPEC = {
  stage1: {
    skill: "count-1-10",
    countRange: [STAGE1_COUNT_MIN, STAGE1_COUNT_MAX],
    choiceCount: 10
  },
  stage2: {
    skill: "count-on-11-20",
    targetRange: [STAGE2_TARGET_MIN, STAGE2_TARGET_MAX],
    visibleAtOnce: STAGE2_VISIBLE_AT_ONCE
  },
  stage3: {
    skill: "numeral-1-100",
    targetRange: [STAGE3_TARGET_MIN, STAGE3_TARGET_MAX],
    choiceCount: STAGE3_CHOICE_COUNT
  }
};
export {
  PROBLEM_SPEC,
  STAGE2_VISIBLE_AT_ONCE,
  generateRun,
  generateStage1,
  generateStage2,
  generateStage3,
  nextVisibleSparkles
};
