import test from 'node:test';
import assert from 'node:assert/strict';
import { createPatternQuestion } from '../client/src/games/patternQuestion.js';
import { GAME_CONFIGS, OFFLINE_ASSET_URLS } from '../client/src/config/games.js';

const config = GAME_CONFIGS.find((game) => game.id === 'pattern');

test('くり返しを2回見てから答えられ、各段階の正解が一意に選べる', () => {
  for (let roundIndex = 0; roundIndex < 40; roundIndex++) {
    for (const random of [() => 0, () => 0.999, Math.random]) {
      const q = createPatternQuestion({ ...config, roundIndex }, random);
      const pattern = config.patterns[roundIndex % config.patterns.length];
      assert.equal(q.sequence.length, pattern.length * 2);
      assert.deepEqual(q.sequence.slice(0, pattern.length), q.sequence.slice(pattern.length));
      const ids = [...new Set(q.sequence.map((item) => item.id))];
      assert.deepEqual(q.sequence.map((item) => ids.indexOf(item.id)), [...pattern, ...pattern]);
      assert.equal(q.answer.id, q.sequence[0].id);
      assert.equal(q.choices.filter((c) => c.id === q.answer.id).length, 1);
      assert.equal(new Set(q.choices.map((c) => c.id)).size, q.choices.length);
      assert.ok(q.choices.length >= 2 && q.choices.length <= 3);
      for (const item of q.sequence) assert.ok(OFFLINE_ASSET_URLS.includes(item.image.src));
    }
  }
});
