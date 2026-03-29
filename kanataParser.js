import { labelForKey, inferGroup } from './actionLabels.js';

// Tokenize kanata config text into flat token array
function tokenize(text) {
    const tokens = [];
    let i = 0;
    while (i < text.length) {
        // Skip whitespace
        if (/\s/.test(text[i])) { i++; continue; }

        // Skip line comments
        if (text[i] === ';' && text[i + 1] === ';') {
            while (i < text.length && text[i] !== '\n') i++;
            continue;
        }

        // Parens
        if (text[i] === '(' || text[i] === ')') {
            tokens.push(text[i]);
            i++;
            continue;
        }

        // Quoted string
        if (text[i] === '"') {
            let str = '"';
            i++;
            while (i < text.length && text[i] !== '"') {
                str += text[i];
                i++;
            }
            if (i < text.length) { str += '"'; i++; }
            tokens.push(str);
            continue;
        }

        // Bare token
        let tok = '';
        while (i < text.length && !/[\s()]/.test(text[i])) {
            tok += text[i];
            i++;
        }
        if (tok) tokens.push(tok);
    }
    return tokens;
}

// Parse flat tokens into nested S-expression arrays
function parseSexpList(tokens) {
    const forms = [];
    let i = 0;

    function parseOne() {
        if (tokens[i] === '(') {
            i++; // skip (
            const list = [];
            while (i < tokens.length && tokens[i] !== ')') {
                list.push(parseOne());
            }
            i++; // skip )
            return list;
        }
        return tokens[i++];
    }

    while (i < tokens.length) {
        forms.push(parseOne());
    }
    return forms;
}

// Extract defsrc, defalias, deflayer from parsed S-expressions
function parseKanataConfig(text) {
    const tokens = tokenize(text);
    const forms = parseSexpList(tokens);

    let defsrc = [];
    const aliases = new Map();
    const layers = [];

    for (const form of forms) {
        if (!Array.isArray(form)) continue;

        if (form[0] === 'defsrc') {
            defsrc = form.slice(1);
        } else if (form[0] === 'defalias') {
            // Pairs: name1 value1 name2 value2 ...
            for (let i = 1; i < form.length - 1; i += 2) {
                aliases.set(form[i], form[i + 1]);
            }
        } else if (form[0] === 'deflayer') {
            layers.push({
                name: form[1],
                keys: form.slice(2),
            });
        }
    }

    return { defsrc, aliases, layers };
}

// Resolve an alias reference like @name through the alias map
function resolveAlias(node, aliases) {
    if (typeof node === 'string' && node.startsWith('@')) {
        const name = node.slice(1);
        if (aliases.has(name))
            return aliases.get(name);
    }
    return node;
}

// Check if a node represents (layer-switch base) or @back
function isBackToBase(node, aliases) {
    const resolved = resolveAlias(node, aliases);
    if (Array.isArray(resolved) &&
        resolved[0] === 'layer-switch' && resolved[1] === 'base')
        return true;
    return false;
}

// Check if a node is a layer-switch to a non-base layer (prefix key)
function getLayerSwitchTarget(node, aliases) {
    const resolved = resolveAlias(node, aliases);
    if (Array.isArray(resolved) &&
        resolved[0] === 'layer-switch' && resolved[1] !== 'base')
        return resolved[1];
    return null;
}

// Check if a node is a complex action we should skip (tap-hold, tap-dance, etc.)
function isSkippableAction(node, aliases) {
    const resolved = resolveAlias(node, aliases);
    if (!Array.isArray(resolved)) return false;
    const head = resolved[0];
    return head === 'tap-hold' || head === 'tap-dance' ||
           head === 'tap-dance-eager' || head === 'multi' &&
           resolved.every(el =>
               typeof el === 'string' && ['lsft', 'lctl', 'lalt', 'lmet'].includes(el) ||
               el === 'multi'
           );
}

// Check if a node is a pure modifier combo (like hyper)
function isPureModifierCombo(node, aliases) {
    const resolved = resolveAlias(node, aliases);
    if (!Array.isArray(resolved) || resolved[0] !== 'multi') return false;
    const modifiers = new Set(['lsft', 'rsft', 'lctl', 'rctl', 'lalt', 'ralt', 'lmet', 'rmet']);
    return resolved.slice(1).every(el => typeof el === 'string' && modifiers.has(el));
}

// Format a multi-modifier + key combo for display
function formatModifierCombo(parts, aliases) {
    const modLabels = { lsft: 'Shift', rsft: 'Shift', lctl: 'Ctrl', rctl: 'Ctrl',
                        lalt: 'Alt', ralt: 'Alt', lmet: 'Super', rmet: 'Super' };
    const modifiers = new Set(['lsft', 'rsft', 'lctl', 'rctl', 'lalt', 'ralt', 'lmet', 'rmet']);
    const mods = [];
    let action = null;

    for (const part of parts) {
        if (typeof part === 'string' && modifiers.has(part)) {
            const label = modLabels[part];
            if (!mods.includes(label)) mods.push(label);
        } else if (typeof part === 'string' && !modifiers.has(part) && part !== 'multi') {
            action = labelForKey(part) ?? part.toUpperCase();
        } else if (Array.isArray(part)) {
            // Nested multi for modifier combo (e.g., hyper+key)
            const nested = formatModifierCombo(part, aliases);
            if (nested) {
                // Merge nested modifiers
                const nestedParts = nested.split('+');
                const nestedKey = nestedParts.pop();
                for (const m of nestedParts) {
                    if (!mods.includes(m)) mods.push(m);
                }
                action = nestedKey;
            }
        }
    }

    if (mods.length === 4 && mods.includes('Shift') && mods.includes('Ctrl') &&
        mods.includes('Alt') && mods.includes('Super')) {
        return action ? `Hyper+${action}` : 'Hyper';
    }

    if (action)
        return [...mods, action].join('+');
    return null;
}

// Extract a displayable action from a resolved node
// Returns { action, isPrefix } or null to skip
function extractAction(node, aliases) {
    const resolved = resolveAlias(node, aliases);

    // Transparent key — skip
    if (resolved === '_') return null;

    // Back to base — skip
    if (isBackToBase(resolved, aliases)) return null;

    // Bare key name
    if (typeof resolved === 'string') {
        // Skip if it's a tap-hold/tap-dance alias
        const aliasResolved = resolveAlias(resolved, aliases);
        if (aliasResolved !== resolved)
            return extractAction(aliasResolved, aliases);

        const label = labelForKey(resolved);
        if (label) return { action: label, isPrefix: false };
        return { action: resolved.toUpperCase(), isPrefix: false };
    }

    if (!Array.isArray(resolved)) return null;

    const head = resolved[0];

    // tap-hold, tap-dance — skip (these are modifier/activation keys)
    if (head === 'tap-hold' || head === 'tap-dance' || head === 'tap-dance-eager')
        return null;

    // layer-switch to non-base — prefix key
    if (head === 'layer-switch' && resolved[1] !== 'base') {
        const target = resolved[1];
        const label = target.charAt(0).toUpperCase() + target.slice(1);
        return { action: `${label}\u2026`, isPrefix: true, targetLayer: target };
    }

    // multi — the fire-and-return pattern or modifier combo
    if (head === 'multi') {
        // Pure modifier combo (like hyper) — skip
        if (isPureModifierCombo(resolved, aliases)) return null;

        const parts = resolved.slice(1);

        // Check for (multi (layer-switch base) <action>) pattern
        const hasBackToBase = parts.some(p => isBackToBase(p, aliases));
        if (hasBackToBase) {
            // Find the non-layer-switch action(s)
            const actionParts = parts.filter(p => !isBackToBase(p, aliases));
            if (actionParts.length === 1) {
                const actionNode = actionParts[0];
                // Could be a simple key with modifier prefix
                if (typeof actionNode === 'string') {
                    const label = labelForKey(actionNode);
                    if (label) return { action: label, isPrefix: false };
                    return { action: actionNode.toUpperCase(), isPrefix: false };
                }
                // Nested multi (modifier combo + key)
                if (Array.isArray(actionNode) && actionNode[0] === 'multi') {
                    const label = formatModifierCombo(actionNode, aliases);
                    if (label) return { action: label, isPrefix: false };
                }
                return extractAction(actionNode, aliases);
            }
            // Multiple action parts — format as modifier combo
            const label = formatModifierCombo(parts.filter(p => !isBackToBase(p, aliases)), aliases);
            if (label) return { action: label, isPrefix: false };
        }

        // General multi — try to format as modifier combo
        const label = formatModifierCombo(parts, aliases);
        if (label) return { action: label, isPrefix: false };
    }

    return null;
}

// Build layer bindings from kanata config text
// Returns { layerBindings, hiddenLayers } matching the keymap.js shape
export function buildLayerBindings(configText) {
    const { defsrc, aliases, layers } = parseKanataConfig(configText);
    const result = {};
    const hiddenLayers = new Set();

    for (const layer of layers) {
        if (layer.name === 'base') {
            hiddenLayers.add('base');
            continue;
        }

        const bindings = [];
        for (let i = 0; i < defsrc.length && i < layer.keys.length; i++) {
            const physicalKey = defsrc[i];
            const keyAction = layer.keys[i];
            const extracted = extractAction(keyAction, aliases);
            if (!extracted) continue;

            const group = inferGroup(extracted.action, extracted.isPrefix);
            bindings.push({
                key: physicalKey,
                action: extracted.action,
                group,
                ...(extracted.isPrefix ? { isPrefix: true } : {}),
            });
        }

        if (bindings.length === 0) {
            hiddenLayers.add(layer.name);
        } else {
            result[layer.name] = bindings;
        }
    }

    return { layerBindings: result, hiddenLayers };
}
