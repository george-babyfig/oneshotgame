import { makeLevel, greedyScore } from './levels.ts';
const L = makeLevel(24);
console.log(L.throws, L.stars, greedyScore(L.start, L.queue, L.throws));
