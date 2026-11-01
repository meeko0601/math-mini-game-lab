import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRun } from '../client/src/games/cave/problemGenerator.js';
import { createSnapshot, reduce } from '../client/src/games/cave/machine.js';
import { KOBITO_SPECIES, chooseKobitoPose } from '../client/src/games/cave/bugs.js';
import { COPY } from '../client/src/games/cave/copy.js';
import { CAVE_ASSETS } from '../client/src/config/cave.js';
import { placeSparkles, pickExplorers } from '../client/src/games/cave/layout.js';
import { createRng } from '../client/src/games/cave/rng.js';
import { CAVE_EXPLORERS } from '../client/src/config/cave.js';

test('探検隊は重複しない2人を抽選し、きらきらは画面内で重ならず取得後に再配置する', () => {
  for (let seed=1;seed<=100;seed++) {
    const random=createRng(seed).next;
    const cast=pickExplorers(CAVE_EXPLORERS,random);
    assert.equal(new Set(cast.map(c=>c.id)).size,2);
    let ids=Array.from({length:7},(_,i)=>String(i));
    let positions=placeSparkles(ids,new Map(),320,270,64,10,null,random);
    for(let round=0;round<20;round++) {
      const points=[...positions.values()];
      for(let i=0;i<points.length;i++) {
        assert.ok(points[i].x>=32 && points[i].x<=288);
        assert.ok(points[i].y>=32 && points[i].y<=238);
        for(let j=i+1;j<points.length;j++) assert.ok(Math.abs(points[i].x-points[j].x)>=74 || Math.abs(points[i].y-points[j].y)>=74);
      }
      const removed=ids.shift(), old=positions.get(removed);
      ids.push(`new-${round}`);
      positions=placeSparkles(ids,positions,320,270,64,10,old,random);
      assert.equal(positions.has(removed),false);
    }
  }
});

test('洞窟の全5種・数量・10択・画像4状態を維持する', () => {
  const species = new Set();
  for (let seed = 1; seed <= 150; seed++) {
    const run = generateRun(seed);
    assert.deepEqual(run, generateRun(seed));
    const {stage1:a,stage2:b,stage3:c} = run;
    species.add(a.species);
    assert.ok(a.count >= 5 && a.count <= 10);
    assert.equal(a.bugs.length, a.count);
    assert.ok(a.bugs.every(bug => bug.species === a.species && bug.countable));
    assert.ok(a.decoBugs.every(bug => bug.species !== a.species && !bug.countable));
    assert.equal(new Set(a.choices.map(c => c.value)).size,10);
    assert.ok(b.target >= 11 && b.target <= 20);
    assert.equal(b.visibleAtOnce,7);
    assert.ok(c.target >= 1 && c.target <= 100);
    assert.equal(new Set(c.jewels.map(j => j.value)).size,10);
    assert.equal(c.jewels.filter(j => j.value === c.target).length,1);
  }
  assert.deepEqual([...species].sort(), [...KOBITO_SPECIES].sort());
  for (const species of KOBITO_SPECIES) {
    assert.match(COPY.stage1Prompt(species), /\(あしゅ\) なんびき？$/);
    for (const pose of ['default','happy','run','surprised']) assert.ok(CAVE_ASSETS[`${species}_${pose}`]);
    for (const previous of ['happy','run','surprised']) assert.notEqual(chooseKobitoPose(previous),previous);
  }
});

test('不正解→再挑戦→収集→宝石飛行の中間状態→宝箱→再プレイが進む', () => {
  let s = createSnapshot(10);
  s=reduce(s,{type:'START'});
  s=reduce(s,{type:'ENTER_CAVE'});
  s=reduce(s,{type:'CHOOSE_COUNT',value:0});
  assert.equal(s.scene,'stage1');
  assert.equal(s.feedback,'retry');
  s=reduce(s,{type:'CHOOSE_COUNT',value:s.problems.stage1.count});
  assert.equal(s.scene,'stage1Clear');
  s=reduce(s,{type:'ADVANCE'});
  while(s.scene === 'stage2') {
    assert.ok(s.revealedSparkleIds.length <= 7);
    const id=s.revealedSparkleIds[0];
    s=reduce(s,{type:'COLLECT_SPARKLE',id});
    const total=s.collected;
    s=reduce(s,{type:'COLLECT_SPARKLE',id});
    assert.equal(s.collected,total);
  }
  assert.equal(s.scene,'stage2Clear');
  assert.equal(s.collected,s.problems.stage2.target);
  s=reduce(s,{type:'ADVANCE'});
  s=reduce(s,{type:'CHOOSE_JEWEL',value:0});
  assert.equal(s.scene,'stage3');
  s=reduce(s,{type:'CHOOSE_JEWEL',value:s.problems.stage3.target});
  assert.equal(s.scene,'stage3Clear');
  s=reduce(s,{type:'ADVANCE'});
  assert.equal(s.scene,'treasure');
  s=reduce(s,{type:'ADVANCE'});
  assert.equal(s.scene,'ending');
  assert.equal(reduce(s,{type:'REPLAY'}).scene,'title');
});
