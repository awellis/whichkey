import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class WhichKeyOverlay {
    constructor() {
        this._overlay = new St.BoxLayout({
            style_class: 'whichkey-overlay',
            vertical: true,
            reactive: false,
            opacity: 0,
            visible: false,
        });

        this._breadcrumb = new St.Label({
            style_class: 'whichkey-breadcrumb',
        });
        this._overlay.add_child(this._breadcrumb);

        this._grid = new St.BoxLayout({
            vertical: true,
        });
        this._overlay.add_child(this._grid);

        Main.layoutManager.uiGroup.add_child(this._overlay);

        this._monitorsChangedId = Main.layoutManager.connect(
            'monitors-changed',
            () => this._reposition()
        );
    }

    show(layerName, bindings, breadcrumbTrail) {
        this._breadcrumb.set_text(
            breadcrumbTrail.map(n => n.toUpperCase()).join('  >  ')
        );

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
                }));

                binding.add_child(new St.Label({
                    style_class: 'whichkey-action',
                    text: entry.action,
                }));

                row.add_child(binding);
            }
        }

        this._overlay.visible = true;
        this._reposition();
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
        if (!monitor)
            return;

        const workArea = Main.layoutManager.getWorkAreaForMonitor(
            monitor.index
        );

        this._overlay.set_position(
            Math.floor(
                workArea.x + (workArea.width - this._overlay.width) / 2
            ),
            Math.floor(workArea.y + workArea.height - this._overlay.height - 48)
        );
    }

    destroy() {
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }

        this._overlay.destroy();
        this._overlay = null;
    }
}
