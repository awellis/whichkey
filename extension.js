import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { WhichKeyOverlay } from './overlay.js';
import { KanataClient } from './kanataClient.js';
import { PanelIndicator } from './panelIndicator.js';
import { LAYER_BINDINGS, HIDDEN_LAYERS } from './keymap.js';

export default class WhichKeyExtension extends Extension {
    enable() {
        console.log('[WhichKey] enabled');

        this._overlay = new WhichKeyOverlay();
        this._indicator = new PanelIndicator();
        this._breadcrumbTrail = [];

        this._client = new KanataClient('127.0.0.1', 9615);

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
                // Unknown layer — treat as hidden
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

        this._client?.disconnect();
        this._client = null;

        this._overlay?.destroy();
        this._overlay = null;

        this._indicator?.destroy();
        this._indicator = null;

        this._breadcrumbTrail = null;
    }
}
