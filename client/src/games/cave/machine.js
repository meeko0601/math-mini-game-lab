import { generateRun, nextVisibleSparkles } from "./problemGenerator.js";
import { freshSeed } from "./rng.js";
const SCENE_ORDER = [
  "title",
  "entrance",
  "stage1",
  "stage1Clear",
  "stage2",
  "stage2Clear",
  "stage3",
  "stage3Clear",
  "treasure",
  "ending"
];
function createSnapshot(seed) {
  const problems = generateRun(seed ?? freshSeed());
  return {
    scene: "title",
    seed: problems.seed,
    problems,
    collected: 0,
    revealedSparkleIds: nextVisibleSparkles(
      problems.stage2.sparkles,
      [],
      problems.stage2.visibleAtOnce
    ),
    feedback: "none",
    lastChoice: null,
    mute: false
  };
}
function go(scene, state, extra = {}) {
  return {
    ...state,
    scene,
    feedback: "none",
    lastChoice: null,
    ...extra
  };
}
function reduce(state, action) {
  switch (action.type) {
    case "TOGGLE_MUTE":
      return { ...state, mute: !state.mute };
    case "CLEAR_FEEDBACK":
      return { ...state, feedback: "none" };
    case "START":
      return go("entrance", state);
    case "ENTER_CAVE":
      return go("stage1", state);
    case "CHOOSE_COUNT": {
      if (state.scene !== "stage1") return state;
      const correct = action.value === state.problems.stage1.count;
      return {
        ...state,
        lastChoice: action.value,
        feedback: correct ? "correct" : "retry",
        scene: correct ? "stage1Clear" : "stage1"
      };
    }
    case "COLLECT_SPARKLE": {
      if (state.scene !== "stage2") return state;
      if (!state.revealedSparkleIds.includes(action.id) || !state.problems.stage2.sparkles.some(s => s.id === action.id && !s.collected)) return state;
      const sparkles = state.problems.stage2.sparkles.map(
        (s) => s.id === action.id ? { ...s, collected: true } : s
      );
      const collected = sparkles.filter((s) => s.collected).length;
      const problems = {
        ...state.problems,
        stage2: { ...state.problems.stage2, sparkles }
      };
      const done = collected >= state.problems.stage2.target;
      return {
        ...state,
        problems,
        collected,
        revealedSparkleIds: nextVisibleSparkles(
          sparkles,
          state.revealedSparkleIds,
          state.problems.stage2.visibleAtOnce
        ),
        feedback: "correct",
        scene: done ? "stage2Clear" : "stage2"
      };
    }
    case "CHOOSE_JEWEL": {
      if (state.scene !== "stage3") return state;
      const correct = action.value === state.problems.stage3.target;
      return {
        ...state,
        lastChoice: action.value,
        feedback: correct ? "correct" : "retry",
        scene: correct ? "stage3Clear" : "stage3"
      };
    }
    case "ADVANCE": {
      if (state.scene === "stage1Clear") return go("stage2", state, { collected: 0 });
      if (state.scene === "stage2Clear") return go("stage3", state);
      if (state.scene === "stage3Clear") return go("treasure", state);
      if (state.scene === "treasure") return go("ending", state);
      return state;
    }
    case "REPLAY":
      return createSnapshot();
    default:
      return state;
  }
}
function progressIndex(scene) {
  if (scene === "title" || scene === "entrance") return 0;
  if (scene === "stage1" || scene === "stage1Clear") return 1;
  if (scene === "stage2" || scene === "stage2Clear") return 2;
  return 3;
}
export {
  SCENE_ORDER,
  createSnapshot,
  progressIndex,
  reduce
};
