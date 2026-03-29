import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { buildLayerBindings, resolveConfigPath } from './kanataParser.js';

export default class WhichKeyPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // --- Settings page ---
        const settingsPage = new Adw.PreferencesPage({
            title: 'Settings',
            icon_name: 'preferences-system-symbolic',
        });

        // --- Kanata group ---
        const kanataGroup = new Adw.PreferencesGroup({
            title: 'Kanata',
            description: 'Connection and configuration',
        });

        // Restart kanata button
        const restartRow = new Adw.ActionRow({
            title: 'Restart Kanata',
            subtitle: 'Restart the kanata service and reload config',
        });
        const restartButton = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: 'Restart kanata service',
        });
        restartButton.connect('clicked', () => {
            try {
                GLib.spawn_command_line_async('systemctl --user restart kanata');
                restartButton.set_icon_name('emblem-ok-symbolic');
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
                    restartButton.set_icon_name('view-refresh-symbolic');
                    return GLib.SOURCE_REMOVE;
                });
            } catch (e) {
                console.error(`[WhichKey] Failed to restart kanata: ${e.message}`);
            }
        });
        restartRow.add_suffix(restartButton);
        restartRow.set_activatable_widget(restartButton);
        kanataGroup.add(restartRow);

        // Edit config button
        const resolvedPath = resolveConfigPath(settings);
        const editRow = new Adw.ActionRow({
            title: 'Edit Config',
            subtitle: resolvedPath,
        });
        const editButton = new Gtk.Button({
            icon_name: 'text-editor-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: 'Open config in text editor',
        });
        editButton.connect('clicked', () => {
            const file = Gio.File.new_for_path(resolveConfigPath(settings));
            const launcher = new Gtk.FileLauncher({ file });
            launcher.launch(window, null, null);
        });
        editRow.add_suffix(editButton);
        editRow.set_activatable_widget(editButton);
        kanataGroup.add(editRow);

        // --- Advanced (collapsed) ---
        const advancedRow = new Adw.ExpanderRow({
            title: 'Advanced',
            subtitle: 'Port and config file overrides',
            show_enable_switch: false,
        });

        // TCP port
        const portRow = new Adw.SpinRow({
            title: 'TCP Port',
            subtitle: 'Port kanata is listening on (requires -p flag)',
            adjustment: new Gtk.Adjustment({
                lower: 1024, upper: 65535, step_increment: 1,
                value: settings.get_int('kanata-port'),
            }),
        });
        settings.bind('kanata-port', portRow.adjustment, 'value', 0);
        advancedRow.add_row(portRow);

        // Config file path
        const configPath = settings.get_string('kanata-config-path');
        const configRow = new Adw.ActionRow({
            title: 'Config File',
            subtitle: configPath || '~/.config/kanata/kanata.kbd (default)',
        });
        const browseButton = new Gtk.Button({
            icon_name: 'document-open-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: 'Browse for .kbd file',
        });
        browseButton.connect('clicked', () => {
            const dialog = new Gtk.FileDialog();
            const filter = new Gtk.FileFilter();
            filter.add_pattern('*.kbd');
            filter.set_name('Kanata config files');
            const filters = new Gio.ListStore({ item_type: Gtk.FileFilter });
            filters.append(filter);
            dialog.set_filters(filters);

            const currentPath = settings.get_string('kanata-config-path');
            if (currentPath) {
                dialog.set_initial_file(Gio.File.new_for_path(currentPath));
            } else {
                const defaultPath = GLib.build_filenamev([
                    GLib.get_home_dir(), '.config', 'kanata', 'kanata.kbd',
                ]);
                const defaultFile = Gio.File.new_for_path(defaultPath);
                if (defaultFile.query_exists(null))
                    dialog.set_initial_file(defaultFile);
            }

            dialog.open(window, null, (_dialog, result) => {
                try {
                    const file = dialog.open_finish(result);
                    if (file) {
                        const path = file.get_path();
                        settings.set_string('kanata-config-path', path);
                        configRow.set_subtitle(path);
                        editRow.set_subtitle(path);
                    }
                } catch (e) {
                    // User cancelled
                }
            });
        });
        configRow.add_suffix(browseButton);
        configRow.set_activatable_widget(browseButton);
        advancedRow.add_row(configRow);

        kanataGroup.add(advancedRow);

        settingsPage.add(kanataGroup);

        // --- Appearance group ---
        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Appearance',
            description: 'Overlay display settings',
        });

        // Font size
        const fontRow = new Adw.SpinRow({
            title: 'Font Size',
            subtitle: 'Base font size for key labels (px)',
            adjustment: new Gtk.Adjustment({
                lower: 8, upper: 24, step_increment: 1,
                value: settings.get_int('font-size'),
            }),
        });
        settings.bind('font-size', fontRow.adjustment, 'value', 0);
        appearanceGroup.add(fontRow);

        // Opacity
        const opacityRow = new Adw.SpinRow({
            title: 'Opacity',
            subtitle: 'Background opacity (%)',
            adjustment: new Gtk.Adjustment({
                lower: 0, upper: 100, step_increment: 5,
                value: settings.get_int('overlay-opacity'),
            }),
        });
        settings.bind('overlay-opacity', opacityRow.adjustment, 'value', 0);
        appearanceGroup.add(opacityRow);

        // Bottom margin
        const marginRow = new Adw.SpinRow({
            title: 'Edge Margin',
            subtitle: 'Distance from screen edge (px)',
            adjustment: new Gtk.Adjustment({
                lower: 0, upper: 200, step_increment: 4,
                value: settings.get_int('bottom-margin'),
            }),
        });
        settings.bind('bottom-margin', marginRow.adjustment, 'value', 0);
        appearanceGroup.add(marginRow);

        // Position
        const positions = ['bottom-center', 'top-center', 'bottom-left',
                           'bottom-right', 'top-left', 'top-right'];
        const positionLabels = Gtk.StringList.new([
            'Bottom Center', 'Top Center', 'Bottom Left',
            'Bottom Right', 'Top Left', 'Top Right',
        ]);
        const positionRow = new Adw.ComboRow({
            title: 'Position',
            subtitle: 'Screen position for the overlay',
            model: positionLabels,
        });
        const currentPos = settings.get_string('overlay-position');
        const posIndex = positions.indexOf(currentPos);
        if (posIndex >= 0) positionRow.set_selected(posIndex);
        positionRow.connect('notify::selected', () => {
            settings.set_string('overlay-position', positions[positionRow.selected]);
        });
        appearanceGroup.add(positionRow);

        settingsPage.add(appearanceGroup);
        window.add(settingsPage);

        // --- Layers page ---
        const layersPage = new Adw.PreferencesPage({
            title: 'Layers',
            icon_name: 'view-list-symbolic',
        });

        this._populateLayersPage(layersPage, settings, window);
        window.add(layersPage);
    }

    _populateLayersPage(page, settings, window) {
        // Remove existing groups
        let child = page.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            // PreferencesPage wraps children in a scrolled/clamp structure;
            // removing all groups via the page API is cleaner
            if (child instanceof Adw.PreferencesGroup)
                page.remove(child);
            child = next;
        }

        const configPath = resolveConfigPath(settings);

        // Controls group with refresh button
        const controlsGroup = new Adw.PreferencesGroup();
        const refreshRow = new Adw.ActionRow({
            title: 'Config File',
            subtitle: configPath,
        });
        const refreshButton = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: 'Refresh layer view',
        });
        refreshButton.connect('clicked', () => {
            // Clear and repopulate
            const groups = [];
            let child = page.get_first_child();
            while (child) {
                const next = child.get_next_sibling();
                if (child instanceof Adw.PreferencesGroup)
                    groups.push(child);
                child = next;
            }
            for (const g of groups)
                page.remove(g);
            this._populateLayersPage(page, settings, window);
        });
        refreshRow.add_suffix(refreshButton);
        controlsGroup.add(refreshRow);
        page.add(controlsGroup);

        // Parse and display layers
        try {
            const [ok, contents] = GLib.file_get_contents(configPath);
            if (!ok) throw new Error('Could not read config file');

            const text = new TextDecoder().decode(contents);
            const { layerBindings, hiddenLayers } = buildLayerBindings(text);

            const layerNames = [...Object.keys(layerBindings), ...hiddenLayers];
            // Deduplicate (base might be in both)
            const seen = new Set();
            for (const name of layerNames) {
                if (seen.has(name)) continue;
                seen.add(name);

                const bindings = layerBindings[name];
                const isHidden = hiddenLayers.has(name);

                const group = new Adw.PreferencesGroup({
                    title: name.toUpperCase(),
                    description: isHidden ? 'Hidden layer — not shown in overlay' : null,
                });

                if (bindings && bindings.length > 0) {
                    for (const b of bindings) {
                        const row = new Adw.ActionRow({
                            title: `${b.key}  →  ${b.action}`,
                            subtitle: b.group + (b.isPrefix ? ' (prefix)' : ''),
                        });
                        if (b.isPrefix) {
                            row.add_suffix(new Gtk.Image({
                                icon_name: 'go-next-symbolic',
                                valign: Gtk.Align.CENTER,
                            }));
                        }
                        group.add(row);
                    }
                } else if (!isHidden) {
                    const emptyRow = new Adw.ActionRow({
                        title: 'No visible bindings',
                        subtitle: 'All keys are transparent or modifier-only',
                    });
                    group.add(emptyRow);
                }

                page.add(group);
            }

            if (seen.size === 0) {
                const emptyGroup = new Adw.PreferencesGroup({
                    title: 'No Layers Found',
                    description: 'Could not parse any layers from the config file',
                });
                page.add(emptyGroup);
            }
        } catch (e) {
            const errorGroup = new Adw.PreferencesGroup({
                title: 'Error',
                description: `Could not load config: ${e.message}`,
            });
            page.add(errorGroup);
        }
    }
}
