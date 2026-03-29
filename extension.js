import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { WhichKeyOverlay } from './overlay.js';
import { KanataClient } from './kanataClient.js';
import { PanelIndicator } from './panelIndicator.js';
import { buildLayerBindings } from './kanataParser.js';
import { LAYER_BINDINGS, HIDDEN_LAYERS } from './keymap.js';

export default class WhichKeyExtension extends Extension {
    enable() {
        console.log('[WhichKey] enabled');

        this._settings = this.getSettings();
        this._overlay = new WhichKeyOverlay(this._settings);
        this._indicator = new PanelIndicator();
        this._breadcrumbTrail = [];
        this._settingSignals = [];

        this._loadKeymap();
        this._connectClient(this._settings.get_int('kanata-port'));

        this._connectSetting('changed::kanata-port', () => {
            const port = this._settings.get_int('kanata-port');
            console.log(`[WhichKey] port changed to ${port}`);
            this._client?.disconnect();
            this._connectClient(port);
        });

        this._connectSetting('changed::kanata-config-path', () => {
            console.log('[WhichKey] config path changed');
            this._loadKeymap();
            this._setupFileMonitor();
        });

        const appearanceKeys = ['font-size', 'overlay-opacity',
                                'bottom-margin', 'overlay-position'];
        for (const key of appearanceKeys) {
            this._connectSetting(`changed::${key}`, () => {
                this._overlay.updateSettings(this._settings);
            });
        }

        this._setupFileMonitor();
    }

    _connectSetting(signal, callback) {
        const id = this._settings.connect(signal, callback);
        this._settingSignals.push(id);
    }

    _loadKeymap() {
        let configPath = this._settings.get_string('kanata-config-path');
        if (!configPath) {
            configPath = GLib.build_filenamev([
                GLib.get_home_dir(), '.config', 'kanata', 'kanata.kbd',
            ]);
        }

        try {
            const [ok, contents] = GLib.file_get_contents(configPath);
            if (!ok) throw new Error('file_get_contents returned false');

            const text = new TextDecoder().decode(contents);
            const { layerBindings, hiddenLayers } = buildLayerBindings(text);

            this._layerBindings = layerBindings;
            this._hiddenLayers = hiddenLayers;
            console.log(`[WhichKey] parsed ${Object.keys(layerBindings).length} layers from ${configPath}`);
        } catch (e) {
            console.warn(`[WhichKey] failed to parse ${configPath}: ${e.message}, using fallback`);
            this._layerBindings = LAYER_BINDINGS;
            this._hiddenLayers = HIDDEN_LAYERS;
        }
    }

    _setupFileMonitor() {
        this._clearFileMonitor();

        let configPath = this._settings.get_string('kanata-config-path');
        if (!configPath) {
            configPath = GLib.build_filenamev([
                GLib.get_home_dir(), '.config', 'kanata', 'kanata.kbd',
            ]);
        }

        try {
            const file = Gio.File.new_for_path(configPath);
            this._fileMonitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
            this._fileMonitor.connect('changed', (_monitor, _file, _otherFile, eventType) => {
                if (eventType !== Gio.FileMonitorEvent.CHANGES_DONE_HINT)
                    return;
                if (this._reloadTimeout) GLib.source_remove(this._reloadTimeout);
                this._reloadTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                    console.log('[WhichKey] config file changed, reloading');
                    this._loadKeymap();
                    this._reloadTimeout = null;
                    return GLib.SOURCE_REMOVE;
                });
            });
        } catch (e) {
            console.warn(`[WhichKey] could not monitor ${configPath}: ${e.message}`);
        }
    }

    _clearFileMonitor() {
        if (this._reloadTimeout) {
            GLib.source_remove(this._reloadTimeout);
            this._reloadTimeout = null;
        }
        if (this._fileMonitor) {
            this._fileMonitor.cancel();
            this._fileMonitor = null;
        }
    }

    _connectClient(port) {
        this._client = new KanataClient('127.0.0.1', port);

        this._client.onLayerChange((layerName) => {
            console.log(`[WhichKey] layer: ${layerName}`);
            this._indicator.setLayer(layerName);

            if (this._hiddenLayers.has(layerName)) {
                this._breadcrumbTrail = [];
                this._overlay.hide();
            } else if (this._layerBindings[layerName]) {
                if (this._breadcrumbTrail.length === 0)
                    this._breadcrumbTrail = [layerName];
                else
                    this._breadcrumbTrail = [...this._breadcrumbTrail, layerName];

                this._overlay.show(
                    layerName,
                    this._layerBindings[layerName],
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

        for (const id of this._settingSignals)
            this._settings.disconnect(id);
        this._settingSignals = null;

        this._clearFileMonitor();

        this._client?.disconnect();
        this._client = null;

        this._overlay?.destroy();
        this._overlay = null;

        this._indicator?.destroy();
        this._indicator = null;

        this._settings = null;
        this._breadcrumbTrail = null;
        this._layerBindings = null;
        this._hiddenLayers = null;
    }
}
