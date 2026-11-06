// The pictures on the screens, drawn for each screen's own shape and size. Every screen shows the
// same Mac: the desktop picture (wallpaper.js, drawn to fit), with a menu bar and Headwire
// Connect's menu open in it. The iPad, the iPhone and the folding phone add Headwire's own
// controls on top (headwire-ui.js).
//
// The menu's words are Headwire Connect's own (ConnectAppMenuContent, SwitchRows,
// DevicesMenuSection and DeviceRow in src/HeadwireConnect).
import { keysRow, settingsButton, keyboardAndTrackpad } from './headwire-ui.js';
import { paintWallpaper } from './wallpaper.js';

const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';
// Desktop units: every desktop is 1080 tall, as wide as its screen's shape makes it.
const UNIT_HEIGHT = 1080;

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
}

function text(ctx, words, x, y, { size = 17, weight = 400, color = '#1d1d22', align = 'left' } = {}) {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(words, x, y);
}

// The menu bar, with as many menu titles as fit left of Headwire Connect's item.
function paintMenuBar(ctx, width) {
    ctx.fillStyle = 'rgba(246,246,248,0.82)';
    ctx.fillRect(0, 0, width, 36);
    const item = width - 236;
    let x = 22;
    for (const [title, weight] of [['Jotter', 700], ['File', 400], ['Edit', 400], ['View', 400], ['Window', 400], ['Help', 400]]) {
        ctx.font = `${weight} 17px ${font}`;
        const w = ctx.measureText(title).width;
        if (x + w > item - 20) break;
        text(ctx, title, x, 18, { weight });
        x += w + 26;
    }
    text(ctx, 'Tue 10:24', width - 22, 18, { align: 'right' });
    // Headwire Connect's item: a display with its inside filled, as when a device is using this Mac,
    // highlighted because its menu is open.
    roundRect(ctx, item, 5, 44, 26, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fill();
    ctx.strokeStyle = '#1d1d22';
    ctx.lineWidth = 2;
    roundRect(ctx, item + 11, 10, 22, 14, 2.5);
    ctx.stroke();
    ctx.fillStyle = '#1d1d22';
    ctx.fillRect(item + 14.5, 13.5, 15, 7);
    ctx.fillRect(item + 17, 26, 10, 2);
    return item + 44;
}

function paintSwitch(ctx, x, y) {
    roundRect(ctx, x, y - 9, 32, 18, 9);
    ctx.fillStyle = '#2f7cf6';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 23, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
}

function rule(ctx, x, y, w) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x + 12, y, w - 24, 1.5);
}

// Headwire Connect's menu, open under its item, whose right edge is `right`.
function paintMenu(ctx, right) {
    const w = 320, x = Math.max(8, right - w), y = 40;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    roundRect(ctx, x, y, w, 336, 12);
    ctx.fillStyle = 'rgba(238,238,242,0.97)';
    ctx.fill();
    ctx.restore();
    const left = x + 18, end = x + w - 18;
    let row = y + 26;
    text(ctx, 'Streaming', left, row);
    paintSwitch(ctx, end - 32, row);
    row += 32;
    text(ctx, 'Input', left, row);
    paintSwitch(ctx, end - 32, row);
    row += 22;
    rule(ctx, x, row, w);
    row += 22;
    text(ctx, 'Devices', left, row, { size: 14, weight: 600, color: '#7a7a82' });
    for (const [name, line] of [['iPad', 'Showing and controlling · USB cable'], ['iPhone', 'Showing · Wi-Fi']]) {
        row += 32;
        text(ctx, name, left, row - 8);
        text(ctx, line, left, row + 12, { size: 14, color: '#6c6c74' });
        text(ctx, '›', end, row, { size: 20, color: '#6c6c74', align: 'right' });
        row += 16;
    }
    row += 28;
    text(ctx, 'Pair a Device…', left, row);
    row += 22;
    rule(ctx, x, row, w);
    row += 22;
    text(ctx, 'Settings…', left, row);
    text(ctx, '⌘,', end, row, { color: '#7a7a82', align: 'right' });
    row += 30;
    text(ctx, 'About Headwire Connect', left, row);
    row += 30;
    text(ctx, 'Quit Headwire Connect', left, row);
    text(ctx, '⌘Q', end, row, { color: '#7a7a82', align: 'right' });
}

// A canvas for a screen of this shape, its long side 2048 pixels, with its context scaled to
// desktop units.
function canvasFor(aspect) {
    const pixels = Math.round(aspect >= 1 ? 2048 / aspect : 2048);
    const canvas = document.createElement('canvas');
    canvas.height = pixels;
    canvas.width = Math.max(1, Math.round(pixels * aspect));
    const ctx = canvas.getContext('2d');
    ctx.scale(pixels / UNIT_HEIGHT, pixels / UNIT_HEIGHT);
    return { canvas, ctx, width: UNIT_HEIGHT * aspect, height: UNIT_HEIGHT };
}

// The Mac's screen at this shape: the desktop picture under the menu bar, and the menu.
function paintDesktop(ctx, width, height) {
    ctx.save();
    ctx.translate(0, 36);
    paintWallpaper(ctx, width, height - 36);
    ctx.restore();
    paintMenu(ctx, paintMenuBar(ctx, width));
}

/**
 * Answers a function per screen, each taking the screen's aspect (width
 * over height) and answering a canvas: `mac`, `ipad`, `iphone`, `duo` (the folding phone's upper
 * half) and `duoKeys` (its lower half, Headwire's keyboard and trackpad).
 */
export async function screenPictures() {
    const desktop = (aspect, chrome) => {
        const { canvas, ctx, width, height } = canvasFor(aspect);
        paintDesktop(ctx, width, height);
        chrome?.(ctx, width, height);
        return canvas;
    };
    // Headwire's controls over the stream: the settings button in the top corner, and the row of
    // Mac keys along the bottom, sized to the screen.
    const withControls = (keys) => (ctx, width, height) => {
        const r = Math.min(height * 0.032, width / 34);
        settingsButton(ctx, width - r * 1.6, 36 + r * 1.6, r);
        if (keys) keysRow(ctx, width / 2, height - r * 1.8, r);
    };
    return {
        mac: (aspect) => desktop(aspect),
        ipad: (aspect) => desktop(aspect, withControls(true)),
        iphone: (aspect) => desktop(aspect, withControls(true)),
        duo: (aspect) => desktop(aspect, withControls(false)),
        duoKeys: (aspect) => {
            const { canvas, ctx, width, height } = canvasFor(aspect);
            keyboardAndTrackpad(ctx, width, height);
            return canvas;
        },
    };
}
