// Kept as a compatibility entry point until navigation embeds wishesPanel.
import { modal } from '../dom';
import type { App } from '../app';
import { wishesPanel } from './wishes';
export function questsFlow(app: App) {
  modal([wishesPanel(app)], { cls: 'tall', onClose: () => app.refresh() });
}
