import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class WhichKeyExtension extends Extension {
    enable() {
        console.log('[WhichKey] enabled');
    }

    disable() {
        console.log('[WhichKey] disabled');
    }
}
