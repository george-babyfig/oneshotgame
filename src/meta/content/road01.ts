import type { RoadContent, ThemeSpec } from '../m14types';

/** Package C fills this data; Package A installs it only after content validation. */
export const ROAD01_THEME: ThemeSpec = { id: '', name: '', colors: ['#000000', '#000000', '#000000'], motif: 'wave' };
export const ROAD01: RoadContent = {
  road: { id: 'road01', name: '', addedIn: '1.2', tiers: [] },
  theme: ROAD01_THEME,
  looks: [],
  products: [],
  singles: [],
  stardust: [],
  samplers: [],
};
