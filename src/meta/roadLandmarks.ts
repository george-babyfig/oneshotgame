import { t } from '../i18n';
import type { Profile } from './profile';
import type { RoadLandmarkDef } from './m14types';

export const ROAD_LANDMARKS: readonly RoadLandmarkDef[] = [];
/** Package D adds eligible letters once; the Inbox caller counts the new mail. */
export function roadLandmarkMail(_p: Profile): number {
  return 0;
}
export const ROAD_LANDMARK_STRINGS = {
  openTitle: (landmark: string) => t('{landmark} is ready to build', { landmark }),
  openBody: (landmark: string) => t('You can build {landmark} on the Floating Isle. Its steps stay open.', { landmark }),
  finishTitle: (landmark: string) => t('{landmark} is complete!', { landmark }),
  finishBody: (landmark: string, decoration: string, title: string) =>
    t('{landmark} is complete. Your {decoration} and {title} are ready.', { landmark, decoration, title }),
};
