import './caveGame.css';
import { el, visual } from '../core/dom.js';
import { createSnapshot, reduce, progressIndex } from './cave/machine.js';
import { COPY } from './cave/copy.js';
import { KOBITO_META, chooseKobitoPose } from './cave/bugs.js';
import { placeSparkles, pickExplorers } from './cave/layout.js';

/** Manusの問題生成・状態遷移を再利用する、既存DOMゲーム用の表示アダプター。 */
export function mountCaveGame({ stage, config, soundEnabled }) {
  const art = config.assets;
  let state = createSnapshot();
  let disposed = false;
  const timers = new Set();
  const players = new Set();
  const poseStates = new Map();
  let sparklePositions = new Map();
  let lastSparkle = null;
  let castScene = null;
  let sceneCast = [];
  let feedbackTimer;
  let frame = 0;
  let jewelMotions = new Map();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const root = el('div', { className: 'cave-game' });
  stage.replaceChildren(root);
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms);
    timers.add(id);
    return id;
  };
  function cue(name) {
    if (!soundEnabled() || !art[`sfx-${name}`]) return;
    const player = new Audio(art[`sfx-${name}`]);
    player.volume = name === 'retry' ? 0.25 : 0.5;
    players.add(player);
    player.addEventListener('ended', () => players.delete(player), { once: true });
    player.play().catch(() => players.delete(player));
  }
  // 全ポーズを先読みし、初タップ時のちらつきを抑える。
  Object.entries(art).filter(([key]) => /_(default|happy|run|surprised)$/.test(key))
    .forEach(([, src]) => { const img = new Image(); img.src = src; });
  config.explorers.flatMap(c => Object.values(c.expressions)).forEach(({src}) => { const img = new Image(); img.src = src; });

  const picture = (key, className, alt = '') => visual({ src: art[key], alt }, '', className);
  const button = (text, action, className = 'cave-action') => el('button', {
    type: 'button', className, text, onClick: () => dispatch(action),
  });
  function dispatch(action) {
    if (disposed) return;
    if (action.type === 'COLLECT_SPARKLE') {
      if (!state.revealedSparkleIds.includes(action.id) || state.problems.stage2.sparkles.find(s => s.id === action.id)?.collected) return;
      lastSparkle = sparklePositions.get(action.id);
    }
    clearTimeout(feedbackTimer);
    timers.delete(feedbackTimer);
    const previous = state;
    state = reduce(state, action);
    if (state === previous) return;
    if (action.type === 'CHOOSE_COUNT' || action.type === 'CHOOSE_JEWEL') {
      cue(state.feedback === 'correct' ? 'correct' : 'retry');
    } else if (action.type === 'COLLECT_SPARKLE') cue('collect');
    else cue('tap');
    if (action.type === 'REPLAY') { poseStates.clear(); sparklePositions.clear(); jewelMotions.clear(); castScene = null; }
    render();
    if (state.feedback === 'retry' || (state.scene === 'stage2' && state.feedback === 'correct')) {
      feedbackTimer = later(() => { state = reduce(state, {type:'CLEAR_FEEDBACK'}); updateExpressions(); }, config.rules.retryExpressionMs);
    }
    if (state.scene === 'stage3Clear' && previous.scene === 'stage3') {
      flyWinner();
      later(() => { dispatch({ type: 'ADVANCE' }); cue('open'); }, config.rules.flightWaitMs);
    }
  }
  function kobito(bug) {
    const record = poseStates.get(bug.id) ?? { pose: 'default', previous: null, timer: null };
    poseStates.set(bug.id, record);
    const img = picture(`${bug.species}_${record.pose}`, 'cave-kobito__image', KOBITO_META[bug.species].label);
    const node = el('button', {
      type: 'button', className: 'cave-kobito',
      ariaLabel: `${KOBITO_META[bug.species].label}を タッチ`,
      dataset: { kobito: bug.id, countable: String(bug.countable) },
      style: { '--kobito-accent': KOBITO_META[bug.species].accent },
      onClick: () => {
        clearTimeout(record.timer);
        timers.delete(record.timer);
        record.pose = chooseKobitoPose(record.previous);
        record.previous = record.pose;
        img.src = art[`${bug.species}_${record.pose}`];
        img.classList.remove('is-reacting');
        void img.offsetWidth;
        img.classList.add('is-reacting');
        record.timer = later(() => {
          record.pose = 'default';
          const current = root.querySelector(`[data-kobito="${bug.id}"] img`);
          if (current) { current.src = art[`${bug.species}_default`]; current.classList.remove('is-reacting'); }
        }, config.rules.reactionMs);
        cue('tap');
      },
    }, [img]);
    return node;
  }
  function expression() {
    return state.feedback === 'retry' ? 'disappointed'
      : state.feedback === 'correct' || /Clear$/.test(state.scene) || ['treasure','ending'].includes(state.scene) ? 'joy' : 'normal';
  }
  function portrait(character, className, forced = expression()) {
    const node = visual(character.expressions[forced], '🕵️', className);
    node.dataset.explorer = character.id;
    return node;
  }
  function updateExpressions() {
    root.querySelectorAll('[data-explorer]').forEach(node => {
      const character = sceneCast.find(c => c.id === node.dataset.explorer);
      node.src = character.expressions[expression()].src;
    });
  }
  function cast(expression, large = false) {
    return el('div', { className: `cave-cast${large ? ' cave-cast--large' : ''}` }, sceneCast.map(character =>
      el('figure', {}, [portrait(character, 'cave-cast__image', expression),
        el('figcaption', { text: character.name })])));
  }
  function prompt(text, happy = false, targetImage = null, showCast = true) {
    return el('div', { className: 'cave-prompt' }, [
      showCast ? portrait(sceneCast[0], 'cave-speaker') : null,
      el('div', { className: 'cave-bubble' }, [
        targetImage ? visual({ src: targetImage, alt: '' }, '', 'cave-prompt-target') : null,
        el('h2', { text }),
      ]),
      showCast ? portrait(sceneCast[1], 'cave-speaker') : null,
    ]);
  }
  function decor(bugs) {
    return el('div', { className: 'cave-decor', ariaLabel: 'どうくつの なかま' }, bugs.map(kobito));
  }
  function retry() {
    const node = el('p', { className: 'cave-retry', text: state.feedback === 'retry' ? config.rules.retryMessage : ' ' });
    node.setAttribute('role', 'status');
    return node;
  }
  function clearPanel(text) {
    return el('div', { className: 'cave-clear' }, [el('p', { text }), button(COPY.next, { type: 'ADVANCE' })]);
  }
  function flyWinner() {
    const winner = root.querySelector('.cave-jewel--winner');
    const chest = root.querySelector('.cave-chest');
    if (!winner || !chest) return;
    const from = winner.getBoundingClientRect();
    const to = chest.getBoundingClientRect();
    winner.style.setProperty('--fly-x', `${to.left + to.width * .58 - from.left - from.width / 2}px`);
    winner.style.setProperty('--fly-y', `${to.top + to.height * .48 - from.top - from.height / 2}px`);
    winner.style.setProperty('--flight-duration', `${config.rules.flightMs}ms`);
    void winner.offsetWidth;
    winner.classList.add('is-flying');
  }
  function render() {
    cancelAnimationFrame(frame);
    const scene = state.scene;
    // 正誤だけの再描画では同じ2人を保ち、画面が変わる時に抽選する。
    if (castScene !== scene) { sceneCast = pickExplorers(config.explorers); castScene = scene; }
    root.dataset.scene = scene;
    const background = scene === 'title' ? 'bg-entrance' : scene === 'entrance' ? 'bg-entrance-glowing-wide'
      : scene === 'stage1' ? 'bg-cave' : scene === 'stage1Clear' ? 'bg-cave-path-lit'
        : scene === 'stage2' ? 'bg-cave-door-closed' : scene === 'stage2Clear' ? 'bg-cave-door-open' : 'bg-treasure-room';
    root.style.setProperty('--cave-bg', `url("${art[background]}")`);
    root.style.setProperty('--cave-portrait-bg', `url("${art[scene === 'entrance' ? 'bg-entrance-glowing-portrait' : background]}")`);
    const content = el('div', { className: 'cave-content' });
    const progress = el('div', { className: 'cave-progress', ariaLabel: `ぼうけん ${progressIndex(scene)} / 3` },
      ['🔎', '✨', '💎'].map((text, i) => el('span', { text, className: i < progressIndex(scene) ? 'is-lit' : '' })));
    if (scene === 'title') {
      content.append(el('div', { className: 'cave-title' }, [
        el('p', { text: 'いっしょに たからさがし' }),
        el('h1', {}, [el('span', { text: 'こびとどうくつの' }), el('span', { text: 'きらきらさがし' })]),
        el('div', { className: 'cave-tools' }, [picture('map', ''), picture('lantern', '')]),
        cast('normal', true), button(COPY.start, { type: 'START' }),
      ]));
    } else if (scene === 'entrance') {
      content.append(prompt(COPY.entranceHint), el('div', { className: 'cave-entry' }, [button(COPY.enter, { type: 'ENTER_CAVE' })]));
    } else if (scene.startsWith('stage1')) {
      const p = state.problems.stage1;
      const clear = scene === 'stage1Clear';
      const field = el('div', { className: 'cave-count-field', ariaLabel: 'かぞえる こびと' }, p.bugs.map(kobito));
      content.append(prompt(COPY.stage1Prompt(p.species), clear, art[`${p.species}_default`]), field, decor(p.decoBugs));
      if (clear) content.append(clearPanel(COPY.clearPath));
      else content.append(el('div', { className: 'cave-answers' }, p.choices.map(choice => {
        const node = button(String(choice.value), { type: 'CHOOSE_COUNT', value: choice.value }, 'cave-number');
        if (state.feedback === 'retry' && state.lastChoice === choice.value) node.classList.add('cave-shake');
        return node;
      })), retry());
    } else if (scene.startsWith('stage2')) {
      const p = state.problems.stage2;
      const clear = scene === 'stage2Clear';
      content.append(prompt(clear ? `${state.collected}こ ${COPY.found}` : COPY.stage2Prompt(p.target), clear));
      if (!clear) {
        const hud = el('div', { className: 'cave-counter' }, [el('strong', { text: String(state.collected) }),
          el('div', { className: 'cave-beads' }, Array.from({ length: p.target }, (_, i) => el('span', { className: i < state.collected ? 'is-collected' : '' })))]);
        hud.setAttribute('role', 'status');
        const visible = new Set(state.revealedSparkleIds);
        const field = el('div', { className: 'cave-sparkles', ariaLabel: 'きらきらを タッチ' });
        p.sparkles.filter(s => visible.has(s.id) && !s.collected).forEach(s => {
          field.append(el('button', { type: 'button', className: 'cave-sparkle', ariaLabel: 'きらきらを あつめる',
            dataset: { sparkle: s.id },
            style: {width:`${config.rules.sparkleSize}px`,height:`${config.rules.sparkleSize}px`},
            onClick: () => dispatch({ type: 'COLLECT_SPARKLE', id: s.id }) }, [picture('sparkle', '')]));
        });
        content.append(hud, field);
      } else content.append(clearPanel(COPY.doorOpen));
      content.append(decor(p.decoBugs));
    } else if (scene.startsWith('stage3')) {
      const p = state.problems.stage3;
      const flying = scene === 'stage3Clear';
      content.append(prompt(COPY.stage3Prompt(p.target)), el('div', { className: 'cave-chest' }, [picture('chest-closed', ''), el('strong', { text: String(p.target) })]));
      const tray = el('div', { className: 'cave-jewels' }, p.jewels.map(jewel => {
        const node = el('button', { type: 'button', className: 'cave-jewel', ariaLabel: `${jewel.value}の ほうせき`,
          dataset: { value: jewel.value }, onClick: () => dispatch({ type: 'CHOOSE_JEWEL', value: jewel.value }) },
        [picture('gem', ''), el('strong', { text: String(jewel.value) })]);
        node.firstChild.style.filter = `hue-rotate(${jewel.hue}deg)`;
        node.disabled = flying;
        if (flying) node.classList.add(jewel.value === p.target ? 'cave-jewel--winner' : 'cave-jewel--dimmed');
        if (state.feedback === 'retry' && state.lastChoice === jewel.value) node.classList.add('cave-shake');
        return el('div', {className:'cave-jewel-mover',dataset:{jewelId:jewel.id}}, [node]);
      }));
      content.append(tray, retry(), decor(p.decoBugs));
    } else {
      content.append(el('div', { className: 'cave-ending' }, [
        prompt(scene === 'ending' ? COPY.ending : COPY.opened, true, null, scene !== 'ending'),
        picture('chest-open', 'cave-open-chest', 'ひらいた たからばこ'),
        scene === 'ending' ? cast('joy', true) : null,
        button(scene === 'ending' ? COPY.again : COPY.next, { type: scene === 'ending' ? 'REPLAY' : 'ADVANCE' }),
      ]));
    }
    root.replaceChildren(progress, content);
    if (scene === 'stage2') layoutSparkles();
    if (scene === 'stage3' || scene === 'stage3Clear') layoutJewels();
  }
  function layoutSparkles(reset = false) {
    const field = root.querySelector('.cave-sparkles');
    if (!field) return;
    if (reset) sparklePositions.clear();
    const ids = [...field.children].map(node => node.dataset.sparkle);
    sparklePositions = placeSparkles(ids, sparklePositions, field.clientWidth, field.clientHeight,
      config.rules.sparkleSize, config.rules.sparkleGap, lastSparkle);
    lastSparkle = null;
    for (const node of field.children) {
      const point = sparklePositions.get(node.dataset.sparkle);
      node.style.left = `${point.x}px`;
      node.style.top = `${point.y}px`;
    }
  }
  function layoutJewels(reset = false) {
    const tray = root.querySelector('.cave-jewels');
    if (!tray) return;
    const nodes = [...tray.children];
    const columns = tray.clientWidth < 500 ? 3 : 5;
    const rows = Math.ceil(nodes.length/columns);
    const cellW = tray.clientWidth/columns, cellH = tray.clientHeight/rows;
    const size = Math.min(config.rules.jewelSize, cellW-6, cellH-6);
    const initialPosition = index => ({x:(index%columns)*cellW + Math.random()*Math.max(0,cellW-size),
      y:Math.floor(index/columns)*cellH + Math.random()*Math.max(0,cellH-size)});
    const target = () => ({x:Math.random()*Math.max(0,tray.clientWidth-size),
      y:Math.random()*Math.max(0,tray.clientHeight-size)});
    nodes.forEach((node,index) => {
      let motion = jewelMotions.get(node.dataset.jewelId);
      if (!motion || reset) { motion = {...initialPosition(index), target:target()}; jewelMotions.set(node.dataset.jewelId,motion); }
      node.style.width = node.style.height = `${size}px`;
      node.style.transform = `translate(${motion.x}px,${motion.y}px)`;
    });
    if (state.scene !== 'stage3' || reducedMotion.matches) return;
    let last = performance.now();
    function tick(now) {
      if (disposed || state.scene !== 'stage3') return;
      const step = Math.min((now-last)/1000,.05)*config.rules.jewelSpeed;
      last=now;
      nodes.forEach((node,index) => {
        const motion=jewelMotions.get(node.dataset.jewelId);
        const dx=motion.target.x-motion.x, dy=motion.target.y-motion.y;
        const distance=Math.hypot(dx,dy);
        if (distance <= step) motion.target=target();
        else {
          const x=motion.x+dx/distance*step, y=motion.y+dy/distance*step;
          const blocked=[...jewelMotions.entries()].some(([id,other]) => id !== node.dataset.jewelId &&
            Math.abs(x-other.x)<size+2 && Math.abs(y-other.y)<size+2);
          if (blocked) motion.target=target();
          else { motion.x=x; motion.y=y; }
        }
        node.style.transform=`translate(${motion.x}px,${motion.y}px)`;
      });
      frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
  }
  const resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    layoutSparkles(true);
    layoutJewels(true);
  });
  resizeObserver.observe(root);
  const motionChange = () => { cancelAnimationFrame(frame); layoutJewels(); };
  reducedMotion.addEventListener('change',motionChange);
  render();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    reducedMotion.removeEventListener('change',motionChange);
    timers.forEach(clearTimeout);
    players.forEach(player => { player.pause(); player.removeAttribute('src'); });
    poseStates.clear();
  };
}
