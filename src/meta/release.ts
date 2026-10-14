import { t } from '../i18n';
import type { ReleaseInfo } from './m14types';

/** Draft build anchor. Package B confirms the submission date before release. */
export const RELEASE: ReleaseInfo = { version: '1.2', submitOn: '2026-10-14' };
// Deferred literal keys are discoverable without rendering any new step-0 surface.
export const M14_STRINGS = {
  roadLandmarks: () => t('Road Landmarks'),
  roadLooks: (road: string) => t('Your {road} looks', { road }),
  whatsNew: (version: string) => t("What's new in {version}", { version }),
  roadFallback: () => t('Your Road is in Missions'),
  opensOn: (date: string) => t('Opens {date}', { date }),
  pastRoads: () => t('Past Roads'),
};
