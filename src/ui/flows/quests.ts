// Kept as a compatibility entry point until navigation embeds wishesPanel.
import { btn, modal } from '../dom';
import { t } from '../../i18n';
import type { App } from '../app';
import { wishesPanel } from './wishes';
export function questsFlow(app: App) {
  const box = modal(
    [
      wishesPanel(app),
      // An explicit way out for VoiceOver users, who cannot tap the scrim (J2).
      btn(t('Back'), 'ghost wide', () => box.close()),
    ],
    { cls: 'tall', onClose: () => app.refresh() },
  );
}
