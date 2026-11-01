/** 重ならないランダム配置。継続表示中の物は動かさず、新しい物だけ配置する。 */
export function placeSparkles(ids, previous, width, height, size, gap, avoid = null, random = Math.random) {
  const result = new Map(ids.filter(id => previous.has(id)).map(id => [id, previous.get(id)]));
  const radius = size / 2;
  const distance = size + gap;
  const fits = point => [...result.values()].every(other =>
    Math.abs(point.x - other.x) >= distance || Math.abs(point.y - other.y) >= distance);
  const fresh = point => !avoid || Math.hypot(point.x - avoid.x, point.y - avoid.y) >= size;
  for (const id of ids) {
    if (result.has(id)) continue;
    let point;
    for (let attempt = 0; attempt < 600; attempt++) {
      const candidate = { x: radius + random() * Math.max(0, width - size), y: radius + random() * Math.max(0, height - size) };
      if (fits(candidate) && fresh(candidate)) { point = candidate; break; }
    }
    if (!point) {
      // すき間がなくなった場合は、固定格子を見せず全体を余白内でランダムに組み直す。
      const columns = Math.max(1, Math.floor((width + gap) / distance));
      const rows = Math.max(1, Math.floor((height + gap) / distance));
      const candidates = Array.from({ length: columns * rows }, (_, index) => ({
        x: radius + (index % columns) * distance,
        y: radius + Math.floor(index / columns) * distance,
        order: random(),
      })).sort((a,b) => a.order - b.order);
      const used = [];
      for (const key of ids) {
        const index = candidates.findIndex(p => (!avoid || key !== id || fresh(p)) &&
          used.every(q => Math.abs(p.x-q.x) >= distance || Math.abs(p.y-q.y) >= distance));
        const candidate = candidates.splice(index < 0 ? 0 : index, 1)[0];
        if (!candidate) throw new Error('きらきらの表示領域が足りません');
        // 同じ平行移動なら非重複を維持できる。
        used.push(candidate);
        result.set(key, {x:candidate.x, y:candidate.y});
      }
      const dx = random() * Math.max(0, width - size - (columns - 1) * distance);
      const dy = random() * Math.max(0, height - size - (rows - 1) * distance);
      for (const [key,p] of result) result.set(key,{x:p.x+dx,y:p.y+dy});
      return result;
    }
    result.set(id, point);
  }
  return result;
}

export function pickExplorers(characters, random = Math.random) {
  const pool = [...characters];
  return Array.from({length: Math.min(2, pool.length)}, () => pool.splice(Math.floor(random()*pool.length),1)[0]);
}
