// A tiny seeded random number generator (mulberry32), so a screenshot seed
// always stages the same frame and a run can be replayed exactly.

export function makeRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random number in [min, max). */
export function range(random, min, max) {
  return min + random() * (max - min);
}
