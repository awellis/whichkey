import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { WhichKeyOverlay } from './overlay.js';
import { LAYER_BINDINGS } from './keymap.js';

export default class WhichKeyExtension extends Extension {
    enable() {
        console.log('[WhichKey] enabled');
        this._overlay = new WhichKeyOverlay();

        // Show leader overlay immediately for visual testing
        this._overlay.show('leader', LAYER_BINDINGS.leader, ['leader']);
    }

    disable() {
        console.log('[WhichKey] disabled');
        this._overlay?.destroy();
        this._overlay = null;
    }
}
