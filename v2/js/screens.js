// The pictures on the screens, drawn for each screen's own shape and size. Every screen shows the
// same Mac: the desktop picture (wallpaper.js, drawn to fit), with a menu bar and Headwire
// Connect's menu open in it. The iPad, the iPhone and the folding phone add Headwire's own
// controls on top (headwire-ui.js); the menu bar and the menu are mac-menu.js's.
import { keysRow, settingsButton } from './headwire-ui.js';
import { paintMenuBar, paintMenu } from './mac-menu.js';
import { duoDeck } from './duo-deck.js';
import { paintWallpaper } from './wallpaper.js';

// Desktop units: every desktop is 1080 tall, as wide as its screen's shape makes it.
const UNIT_HEIGHT = 1080;

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
 * half) and `duoKeys` (its lower half: Headwire's key row, Mac keys and trackpad).
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
    const withControls = (ctx, width, height) => {
        const r = Math.min(height * 0.032, width / 34);
        settingsButton(ctx, [width - r * 1.6, 36 + r * 1.6, r]);
        keysRow(ctx, [width / 2, height - r * 1.8, r]);
    };
    // Half-folded like a laptop, the upper pane is the stream alone, fitted to the pane: the
    // controls are on the lower pane (duo-deck.js).
    const fitted = (aspect) => {
        const { canvas, ctx, width, height } = canvasFor(aspect);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        const w = Math.min(width, (height * 16) / 9), h = (w * 9) / 16;
        ctx.drawImage(desktop(16 / 9), (width - w) / 2, (height - h) / 2, w, h);
        return canvas;
    };
    return {
        mac: (aspect) => desktop(aspect),
        ipad: (aspect) => desktop(aspect, withControls),
        iphone: (aspect) => desktop(aspect, withControls),
        duo: fitted,
        duoKeys: (aspect) => {
            const { canvas, ctx, width, height } = canvasFor(aspect);
            duoDeck(ctx, width, height);
            return canvas;
        },
    };
}
