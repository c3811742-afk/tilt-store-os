// A seeded random number generator (mulberry32): the same seed always gives the same demo data.
export const createRandom = (seed: number) => {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;
  const pick = <T>(list: readonly T[]) => list[Math.floor(next() * list.length)];
  const chance = (probability: number) => next() < probability;
  return { next, int, pick, chance };
};

export type Random = ReturnType<typeof createRandom>;
