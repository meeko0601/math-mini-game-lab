function createRng(seed) {
  let t = seed >>> 0;
  const next = () => {
    t += 1831565813;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
  return {
    seed,
    next,
    float(min = 0, max = 1) {
      return min + (max - min) * next();
    },
    int(min, max) {
      return Math.floor(this.float(min, max + 1));
    },
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    shuffle(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    id(prefix) {
      return `${prefix}-${Math.floor(next() * 1e9).toString(36)}`;
    }
  };
}
function freshSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 4294967295)) >>> 0;
}
export {
  createRng,
  freshSeed
};
