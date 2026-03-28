export const LAYER_BINDINGS = {
    leader: [
        { key: 'h', action: 'Left', group: 'Navigation' },
        { key: 'j', action: 'Down', group: 'Navigation' },
        { key: 'k', action: 'Up', group: 'Navigation' },
        { key: 'l', action: 'Right', group: 'Navigation' },
        { key: 'u', action: 'PgUp', group: 'Navigation' },
        { key: 'd', action: 'PgDn', group: 'Navigation' },
        { key: 'a', action: 'Home', group: 'Navigation' },
        { key: '0', action: 'Home', group: 'Navigation' },
        { key: '4', action: 'End', group: 'Navigation' },
        { key: 'w', action: 'Word Fwd', group: 'Word Navigation' },
        { key: 'b', action: 'Word Back', group: 'Word Navigation' },
        { key: 'e', action: 'Word Fwd', group: 'Word Navigation' },
        { key: 'x', action: 'Window\u2026', group: 'Prefix', isPrefix: true },
    ],
    window: [
        { key: 'h', action: 'Tile Left', group: 'Tiling' },
        { key: 'j', action: 'Tile Down', group: 'Tiling' },
        { key: 'k', action: 'Tile Up', group: 'Tiling' },
        { key: 'l', action: 'Tile Right', group: 'Tiling' },
        { key: 'c', action: 'Close', group: 'Window' },
        { key: 'f', action: 'Hyper+W', group: 'Window' },
    ],
};

export const HIDDEN_LAYERS = new Set(['base']);
