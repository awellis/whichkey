import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const WhichKeyIndicator = GObject.registerClass(
class WhichKeyIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'WhichKey Indicator', true);

        this._label = new St.Label({
            style_class: 'whichkey-indicator whichkey-indicator-disconnected',
            text: 'KEY',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.add_child(this._label);

        this._connected = false;
        this._layerName = 'base';

        // No menu — purely a status display
        this.menu.close();
        this.setSensitive(false);
    }

    setLayer(layerName) {
        this._layerName = layerName;
        this._label.set_text(layerName.toUpperCase());
        this._updateStyle();
    }

    setConnected(connected) {
        this._connected = connected;
        this._updateStyle();
    }

    _updateStyle() {
        this._label.style_class = 'whichkey-indicator';

        if (!this._connected) {
            this._label.add_style_class_name('whichkey-indicator-disconnected');
        } else if (this._layerName === 'base') {
            this._label.add_style_class_name('whichkey-indicator-base');
        } else {
            this._label.add_style_class_name('whichkey-indicator-active');
        }
    }
});

export class PanelIndicator {
    constructor() {
        this._indicator = new WhichKeyIndicator();
        Main.panel.addToStatusArea('whichkey-indicator', this._indicator);
    }

    setLayer(layerName) {
        this._indicator.setLayer(layerName);
    }

    setConnected(connected) {
        this._indicator.setConnected(connected);
    }

    destroy() {
        this._indicator.destroy();
        this._indicator = null;
    }
}
