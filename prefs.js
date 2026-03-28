import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class WhichKeyPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'WhichKey for Kanata',
            icon_name: 'input-keyboard-symbolic',
        });

        const group = new Adw.PreferencesGroup({
            title: 'Connection',
            description: 'Settings for connecting to kanata\'s TCP server',
        });

        const portRow = new Adw.SpinRow({
            title: 'Kanata TCP Port',
            subtitle: 'Port number kanata is listening on (requires -p flag)',
            adjustment: new Gtk.Adjustment({
                lower: 1024,
                upper: 65535,
                step_increment: 1,
                value: settings.get_int('kanata-port'),
            }),
        });

        settings.bind(
            'kanata-port',
            portRow.adjustment,
            'value',
            0 // Gio.SettingsBindFlags.DEFAULT
        );

        group.add(portRow);
        page.add(group);
        window.add(page);
    }
}
