import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class WhichKeyOverlay {
    constructor(settings) {
        this._settings = settings;
        this._fontSize = settings.get_int('font-size');
        this._opacity = settings.get_int('overlay-opacity');
        this._margin = settings.get_int('bottom-margin');
        this._position = settings.get_string('overlay-position');

        this._overlay = new St.BoxLayout({
            style_class: 'whichkey-overlay',
            vertical: true,
            reactive: false,
            opacity: 0,
            visible: false,
        });
        this._applyOverlayStyle();

        this._breadcrumb = new St.Label({
            style_class: 'whichkey-breadcrumb',
            style: `font-size: ${this._fontSize - 3}px`,
        });
        this._overlay.add_child(this._breadcrumb);

        this._grid = new St.BoxLayout({ vertical: true });
        this._overlay.add_child(this._grid);

        Main.layoutManager.addChrome(this._overlay, {
            affectsInputRegion: false,
            affectsStruts: false,
        });

        this._monitorsChangedId = Main.layoutManager.connect(
            'monitors-changed',
            () => this._reposition()
        );
    }

    updateSettings(settings) {
        this._settings = settings;
        this._fontSize = settings.get_int('font-size');
        this._opacity = settings.get_int('overlay-opacity');
        this._margin = settings.get_int('bottom-margin');
        this._position = settings.get_string('overlay-position');

        this._applyOverlayStyle();
        this._breadcrumb.set_style(`font-size: ${this._fontSize - 3}px`);
        this._reposition();
    }

    _applyOverlayStyle() {
        const alpha = (this._opacity / 100).toFixed(2);
        this._overlay.set_style(`background-color: rgba(30, 30, 46, ${alpha});`);
    }

    show(layerName, bindings, breadcrumbTrail) {
        this._breadcrumb.set_text(
            breadcrumbTrail.map(n => n.toUpperCase()).join('  >  ')
        );
        this._breadcrumb.set_style(`font-size: ${this._fontSize - 3}px`);

        this._grid.destroy_all_children();

        const groups = new Map();
        for (const b of bindings) {
            if (!groups.has(b.group))
                groups.set(b.group, []);
            groups.get(b.group).push(b);
        }

        for (const [groupName, entries] of groups) {
            const groupLabel = new St.Label({
                style_class: 'whichkey-group-label',
                text: groupName.toUpperCase(),
                style: `font-size: ${this._fontSize - 4}px`,
            });
            this._grid.add_child(groupLabel);

            const row = new St.BoxLayout({ vertical: false });
            this._grid.add_child(row);

            for (const entry of entries) {
                const binding = new St.BoxLayout({
                    style_class: entry.isPrefix
                        ? 'whichkey-binding whichkey-prefix'
                        : 'whichkey-binding',
                    vertical: false,
                });

                binding.add_child(new St.Label({
                    style_class: 'whichkey-key',
                    text: entry.key,
                    style: `font-size: ${this._fontSize}px`,
                }));

                binding.add_child(new St.Label({
                    style_class: 'whichkey-action',
                    text: entry.action,
                    style: `font-size: ${this._fontSize - 1}px`,
                }));

                row.add_child(binding);
            }
        }

        this._overlay.visible = true;
        this._reposition();
        this._applyOverlayStyle();
        this._overlay.ease({
            opacity: 255,
            duration: 150,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    hide() {
        if (!this._overlay.visible)
            return;

        this._overlay.ease({
            opacity: 0,
            duration: 100,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                this._overlay.visible = false;
            },
        });
    }

    _reposition() {
        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor) return;

        const workArea = Main.layoutManager.getWorkAreaForMonitor(monitor.index);
        const ow = this._overlay.width;
        const oh = this._overlay.height;
        const m = this._margin;

        let x, y;
        switch (this._position) {
        case 'top-center':
            x = workArea.x + (workArea.width - ow) / 2;
            y = workArea.y + m;
            break;
        case 'bottom-left':
            x = workArea.x + m;
            y = workArea.y + workArea.height - oh - m;
            break;
        case 'bottom-right':
            x = workArea.x + workArea.width - ow - m;
            y = workArea.y + workArea.height - oh - m;
            break;
        case 'top-left':
            x = workArea.x + m;
            y = workArea.y + m;
            break;
        case 'top-right':
            x = workArea.x + workArea.width - ow - m;
            y = workArea.y + m;
            break;
        default: // bottom-center
            x = workArea.x + (workArea.width - ow) / 2;
            y = workArea.y + workArea.height - oh - m;
            break;
        }

        this._overlay.set_position(Math.floor(x), Math.floor(y));
    }

    destroy() {
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }
        Main.layoutManager.removeChrome(this._overlay);
        this._overlay.destroy();
        this._overlay = null;
    }
}
