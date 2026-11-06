// The lower half of iPhone Duo half-folded like a laptop, as Headwire lays it out there
// (AppView+TrackpadPane, decisions/workspace/foldable-layout.md): along the top edge the key row,
// its keyboard key last; under it the Mac keys strip (MacKeysView), which runs on past the pane's
// edge and scrolls; then the trackpad, with the settings button at its top trailing corner. There
// is no keyboard drawn on the pane: the system keyboard only rises when the keyboard key is tapped.
// Laid out in points on a pane 669 points wide, the inner display's width in that pose.
import { glass, ink, keysRow, settingsButton } from './headwire-ui.js';

const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';
const PANE_WIDTH = 669;

function label(ctx, words, x, y, size, color = '#fff') {
    ctx.font = `500 ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(words, x, y);
}

// The strip's keys, in its order: the sticky modifiers, Escape, Tab, the arrows and Delete
// Forward, the function keys' page button, then the App Switcher, Spotlight and Paste to Mac.
// null is a divider.
const strip = ['⌃', '⌥', '⌘', '⇧', null, 'esc', '⇥', '←', '↑', '↓', '→', '⌦', 'fn', null, 'switcher', 'spotlight', 'paste'];

function face(ctx, key, x, y) {
    if (key === 'switcher') {
        ctx.strokeRect(x - 7, y - 3, 10, 10);
        ctx.strokeRect(x - 3, y - 7, 10, 10);
    } else if (key === 'spotlight') {
        ctx.beginPath();
        ctx.arc(x - 2, y - 2, 6, 0, Math.PI * 2);
        ctx.moveTo(x + 2.5, y + 2.5);
        ctx.lineTo(x + 8, y + 8);
        ctx.stroke();
    } else if (key === 'paste') {
        ctx.strokeRect(x - 6, y - 7, 12, 15);
        ctx.fillRect(x - 3, y - 9, 6, 4);
    } else {
        label(ctx, key, x, y + 1, key.length > 1 ? 15 : 19);
    }
}

// The Mac keys strip, its first key `left` points in, keys centred on y; clipped at the pane.
function macKeys(ctx, left, y) {
    let x = left;
    for (const key of strip) {
        if (!key) {
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.fillRect(x, y - 14, 1, 28);
            x += 1 + 6;
            continue;
        }
        glass(ctx, () => {
            ctx.beginPath();
            ctx.roundRect(x, y - 20, 52, 40, 20);
        });
        ctx.save();
        ink(ctx, 16);
        ctx.lineWidth = 1.8;
        face(ctx, key, x + 26, y);
        ctx.restore();
        x += 52 + 6;
    }
}

function trackpad(ctx, top, bottom) {
    ctx.beginPath();
    ctx.roundRect(12, top + 12, PANE_WIDTH - 24, bottom - top - 24, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
    label(ctx, 'Trackpad', PANE_WIDTH / 2, (top + bottom) / 2, 13, 'rgba(235,235,245,0.6)');
    settingsButton(ctx, PANE_WIDTH - 12 - 8 - 22, top + 12 + 8 + 22, 22);
}

/** Draws the lower pane, `width` by `height` in the canvas's units, with the hinge at the top. */
export function duoDeck(ctx, width, height) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    const scale = width / PANE_WIDTH;
    ctx.save();
    ctx.scale(scale, scale);
    // The key row: 44-point keys inside 6 points of glass, 12 points below the hinge.
    keysRow(ctx, PANE_WIDTH / 2, 12 + 6 + 22, 22);
    ctx.save();
    ctx.beginPath();
    ctx.rect(12, 72, PANE_WIDTH - 24, 52);
    ctx.clip();
    macKeys(ctx, 24, 72 + 26);
    ctx.restore();
    trackpad(ctx, 124, height / scale);
    ctx.restore();
}
