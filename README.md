# WhichKey for Kanata

A GNOME Shell extension that displays a neovim-style which-key OSD overlay for [kanata](https://github.com/jtroo/kanata) keyboard layers. When you enter a layer, the overlay appears showing available key bindings grouped by purpose. When you leave the layer, it disappears.

## How it works

The extension connects to kanata's TCP server and listens for `LayerChange` events. When a non-base layer is activated, the overlay fades in at the bottom of the screen showing all available bindings. A panel indicator in the top bar shows the current layer and connection status.

## Kanata layer layout

Double-tap **Space** to enter the leader layer. Press **ESC** (or tap **Caps Lock**) to exit back to base.

### Base layer

| Key | Action |
|-----|--------|
| Caps Lock | tap = ESC, hold = Control |
| Left Ctrl | Hyper (Shift+Ctrl+Alt+Super) |
| Space (double-tap) | Enter leader layer |

### Leader layer

| Key | Action | Group |
|-----|--------|-------|
| h / j / k / l | Arrow keys | Navigation |
| u / d | Page Up / Page Down | Navigation |
| a / 0 | Home | Navigation |
| 4 | End | Navigation |
| w / e | Word forward (Ctrl+Right) | Word navigation |
| b | Word back (Ctrl+Left) | Word navigation |
| x | Enter window sub-layer | Prefix |

### Window sub-layer

Entered from leader via `x`. Each action fires and returns to base.

| Key | Action |
|-----|--------|
| h / j / k / l | Tile left / down / up / right (Super+Arrow) |
| c | Close window (Alt+F4) |
| f | Hyper+W |

## Requirements

- GNOME Shell 49
- [kanata](https://github.com/jtroo/kanata) running with TCP server enabled (`-p 9615`)

## Installation

1. Clone the repo into your GNOME Shell extensions directory:

```bash
git clone https://github.com/awellis/whichkey.git ~/.local/share/gnome-shell/extensions/whichkey-kanata@local
```

2. Make sure kanata is running with the TCP server flag:

```bash
kanata --cfg kanata.kbd -p 9615
```

3. Restart GNOME Shell (log out and back in on Wayland, or `Alt+F2` → `r` on X11).

4. Enable the extension:

```bash
gnome-extensions enable whichkey-kanata@local
```

## Configuration

The kanata TCP port (default `9615`) can be changed in the extension preferences:

```bash
gnome-extensions prefs whichkey-kanata@local
```

## Styling

The overlay uses the [Catppuccin Mocha](https://github.com/catppuccin/catppuccin) color palette. Edit `stylesheet.css` to customize colors, fonts, and sizing.

## Architecture

| File | Purpose |
|------|---------|
| `extension.js` | Lifecycle, wires modules together, tracks breadcrumb state |
| `kanataClient.js` | TCP client with auto-reconnect and exponential backoff |
| `overlay.js` | Non-interactive OSD widget with grouped bindings and fade animations |
| `panelIndicator.js` | Top-bar indicator showing current layer and connection status |
| `keymap.js` | Layer-to-binding mapping data |
| `stylesheet.css` | All visual styling |
| `prefs.js` | GSettings preferences UI |

## License

[GPL-3.0](LICENSE)
