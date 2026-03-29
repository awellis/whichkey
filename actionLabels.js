// Human-readable labels for kanata key names
export const KEY_LABELS = {
    left: 'Left', right: 'Right', up: 'Up', down: 'Down',
    pgup: 'PgUp', pgdn: 'PgDn', home: 'Home', end: 'End',
    esc: 'Escape', spc: 'Space', bspc: 'Backspace', del: 'Delete',
    ret: 'Enter', tab: 'Tab', caps: 'CapsLock',
    lsft: 'LShift', rsft: 'RShift', lctl: 'LCtrl', rctl: 'RCtrl',
    lalt: 'LAlt', ralt: 'RAlt', lmet: 'Super', rmet: 'Super',
    ins: 'Insert', prtsc: 'PrtSc', pause: 'Pause',
    f1: 'F1', f2: 'F2', f3: 'F3', f4: 'F4', f5: 'F5', f6: 'F6',
    f7: 'F7', f8: 'F8', f9: 'F9', f10: 'F10', f11: 'F11', f12: 'F12',
};

// Kanata modifier prefix → display label
export const MODIFIER_PREFIXES = {
    'C-': 'Ctrl+',
    'M-': 'Super+',
    'A-': 'Alt+',
    'S-': 'Shift+',
};

// Resolve a kanata key name (possibly with modifier prefix) to a human label
export function labelForKey(name) {
    // Check modifier prefixes: C-right → Ctrl+Right, A-f4 → Alt+F4
    for (const [prefix, label] of Object.entries(MODIFIER_PREFIXES)) {
        if (name.startsWith(prefix)) {
            const base = name.slice(prefix.length);
            const baseLabel = KEY_LABELS[base] ?? base.toUpperCase();
            return `${label}${baseLabel}`;
        }
    }
    return KEY_LABELS[name] ?? null;
}

// Infer a group name from an action label
export function inferGroup(actionLabel, isPrefix) {
    if (isPrefix) return 'Prefix';
    if (/^(Left|Right|Up|Down|PgUp|PgDn|Home|End)$/.test(actionLabel))
        return 'Navigation';
    if (/^Ctrl\+(Left|Right|Up|Down)$/.test(actionLabel))
        return 'Word Navigation';
    if (/^Super\+/.test(actionLabel))
        return 'Tiling';
    if (/^(Alt\+F4|Close)$/i.test(actionLabel))
        return 'Window';
    if (/^Hyper\+/.test(actionLabel))
        return 'Window';
    return 'Actions';
}
