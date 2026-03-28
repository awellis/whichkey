import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { WhichKeyOverlay } from './overlay.js';
import { KanataClient } from './kanataClient.js';
import { PanelIndicator } from './panelIndicator.js';
import { LAYER_BINDINGS, HIDDEN_LAYERS } from './keymap.js';

export default class WhichKeyExtension extends Extension {
    enable() {
        console.log('[WhichKey] enabled');

        this._settings = this.getSettings();
        this._overlay = new WhichKeyOverlay();
        this._indicator = new PanelIndicator();
        this._breadcrumbTrail = [];

        this._connectClient(this._settings.get_int('kanata-port'));

        this._settingsChangedId = this._settings.connect(
            'changed::kanata-port',
            () => {
                const port = this._settings.get_int('kanata-port');
                console.log(`[WhichKey] port changed to ${port}`);
                this._client?.disconnect();
                this._connectClient(port);
            }
        );
    }

    _connectClient(port) {
        this._client = new KanataClient('127.0.0.1', port);

        this._client.onLayerChange((layerName) => {
            console.log(`[WhichKey] layer: ${layerName}`);
            this._indicator.setLayer(layerName);

            if (HIDDEN_LAYERS.has(layerName)) {
                this._breadcrumbTrail = [];
                this._overlay.hide();
            } else if (LAYER_BINDINGS[layerName]) {
                if (this._breadcrumbTrail.length === 0)
                    this._breadcrumbTrail = [layerName];
                else
                    this._breadcrumbTrail = [...this._breadcrumbTrail, layerName];

                this._overlay.show(
                    layerName,
                    LAYER_BINDINGS[layerName],
                    this._breadcrumbTrail
                );
            } else {
                this._breadcrumbTrail = [];
                this._overlay.hide();
            }
        });

        this._client.onConnectionChange((connected) => {
            console.log(`[WhichKey] connected: ${connected}`);
            this._indicator.setConnected(connected);
            if (!connected)
                this._overlay.hide();
        });

        this._client.connect();
    }

    disable() {
        console.log('[WhichKey] disabled');

        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        this._client?.disconnect();
        this._client = null;

        this._overlay?.destroy();
        this._overlay = null;

        this._indicator?.destroy();
        this._indicator = null;

        this._settings = null;
        this._breadcrumbTrail = null;
    }
}
