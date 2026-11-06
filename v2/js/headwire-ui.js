// Headwire's own controls, drawn the way the app draws them over the stream: round glass buttons
// with white symbols. keysRow is the row of Mac keys (as in the App Store captures: back, forward,
// Mission Control, Launchpad, brightness, media, volume, keyboard); settingsButton is the glass
// settings button; keyboardAndTrackpad is the lower half of a folding phone opened like a laptop,
// keys above and a trackpad below, in the same glass.

const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';

function glass(ctx, path) {
    ctx.save();
    path();
    ctx.fillStyle = 'rgba(28,28,34,0.58)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
}

function circle(ctx, x, y, r) {
    glass(ctx, () => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
    });
}

function ink(ctx, s) {
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = Math.max(1.5, s * 0.12);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

function line(ctx, points) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
}

function triangle(ctx, x, y, s, dir) {
    ctx.beginPath();
    ctx.moveTo(x - dir * s * 0.4, y - s * 0.45);
    ctx.lineTo(x + dir * s * 0.45, y);
    ctx.lineTo(x - dir * s * 0.4, y + s * 0.45);
    ctx.closePath();
    ctx.fill();
}

function sun(ctx, x, y, s, rays) {
    ctx.beginPath();
    ctx.arc(x, y, s * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        line(ctx, [[x + Math.cos(a) * s * 0.45, y + Math.sin(a) * s * 0.45], [x + Math.cos(a) * s * rays, y + Math.sin(a) * s * rays]]);
    }
}

function speaker(ctx, x, y, s, waves) {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y - s * 0.18);
    ctx.lineTo(x - s * 0.25, y - s * 0.18);
    ctx.lineTo(x, y - s * 0.42);
    ctx.lineTo(x, y + s * 0.42);
    ctx.lineTo(x - s * 0.25, y + s * 0.18);
    ctx.lineTo(x - s * 0.5, y + s * 0.18);
    ctx.closePath();
    ctx.fill();
    for (let i = 1; i <= waves; i++) {
        ctx.beginPath();
        ctx.arc(x, y, s * 0.2 * i + s * 0.05, -0.8, 0.8);
        ctx.stroke();
    }
    if (waves === 0) line(ctx, [[x + s * 0.15, y - s * 0.2], [x + s * 0.5, y + s * 0.2]]);
}

// Each symbol is drawn in a box of size s centred on (x, y).
const symbols = [
    (ctx, x, y, s) => line(ctx, [[x + s * 0.15, y - s * 0.35], [x - s * 0.2, y], [x + s * 0.15, y + s * 0.35]]),
    (ctx, x, y, s) => line(ctx, [[x - s * 0.15, y - s * 0.35], [x + s * 0.2, y], [x - s * 0.15, y + s * 0.35]]),
    (ctx, x, y, s) => {
        ctx.strokeRect(x - s * 0.5, y - s * 0.32, s * 0.42, s * 0.28);
        ctx.strokeRect(x - s * 0.5, y + s * 0.06, s * 0.42, s * 0.26);
        ctx.strokeRect(x + s * 0.02, y - s * 0.32, s * 0.48, s * 0.64);
    },
    (ctx, x, y, s) => {
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) ctx.fillRect(x + i * s * 0.32 - s * 0.1, y + j * s * 0.32 - s * 0.1, s * 0.2, s * 0.2);
    },
    (ctx, x, y, s) => sun(ctx, x, y, s, 0.6),
    (ctx, x, y, s) => sun(ctx, x, y, s, 0.75),
    (ctx, x, y, s) => {
        triangle(ctx, x - s * 0.05, y, s * 0.7, -1);
        triangle(ctx, x + s * 0.32, y, s * 0.7, -1);
    },
    (ctx, x, y, s) => {
        triangle(ctx, x - s * 0.18, y, s * 0.7, 1);
        ctx.fillRect(x + s * 0.12, y - s * 0.3, s * 0.1, s * 0.6);
        ctx.fillRect(x + s * 0.3, y - s * 0.3, s * 0.1, s * 0.6);
    },
    (ctx, x, y, s) => {
        triangle(ctx, x - s * 0.3, y, s * 0.7, 1);
        triangle(ctx, x + s * 0.05, y, s * 0.7, 1);
    },
    (ctx, x, y, s) => speaker(ctx, x + s * 0.05, y, s, 0),
    (ctx, x, y, s) => speaker(ctx, x + s * 0.05, y, s, 1),
    (ctx, x, y, s) => speaker(ctx, x, y, s, 3),
    (ctx, x, y, s) => {
        ctx.strokeRect(x - s * 0.5, y - s * 0.3, s, s * 0.6);
        for (let i = 0; i < 4; i++) ctx.fillRect(x - s * 0.36 + i * s * 0.22, y - s * 0.15, s * 0.1, s * 0.08);
        ctx.fillRect(x - s * 0.25, y + s * 0.08, s * 0.5, s * 0.08);
    },
];

/** The row of Mac keys, centred on (cx, cy), each button of radius r. */
export function keysRow(ctx, cx, cy, r) {
    const gap = r * 2.36;
    const x0 = cx - (gap * (symbols.length - 1)) / 2;
    symbols.forEach((draw, i) => {
        const x = x0 + i * gap;
        circle(ctx, x, cy, r);
        ctx.save();
        ink(ctx, r);
        draw(ctx, x, cy, r * 0.95);
        ctx.restore();
    });
}

/** The glass settings button: three sliders. */
export function settingsButton(ctx, x, y, r) {
    circle(ctx, x, y, r);
    ctx.save();
    ink(ctx, r * 0.8);
    for (const [dy, knob] of [[-0.3, 0.2], [0, -0.25], [0.3, 0.1]]) {
        line(ctx, [[x - r * 0.45, y + dy * r], [x + r * 0.45, y + dy * r]]);
        ctx.beginPath();
        ctx.arc(x + knob * r, y + dy * r, r * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function key(ctx, x, y, w, h, label) {
    glass(ctx, () => {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, h * 0.22);
    });
    ctx.fillStyle = '#fff';
    ctx.font = `500 ${Math.round(Math.min(h * 0.42, (w / Math.max(label.length, 1)) * 1.5))}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}

/**
 * The lower half of a folding phone opened like a laptop, `width` by `height` with the hinge at
 * the top: Headwire's Mac keys, a keyboard, and a trackpad below.
 */
export function keyboardAndTrackpad(ctx, width, height) {
    ctx.fillStyle = '#0b0b0f';
    ctx.fillRect(0, 0, width, height);
    const pad = width * 0.035;
    const r = Math.min(height * 0.032, width / 34);
    keysRow(ctx, width / 2, pad + r, r);
    const rows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['⇧', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
    ];
    const top = pad * 2 + r * 2;
    const gap = width * 0.012;
    const kw = (width - pad * 2 - gap * 9) / 10;
    const kh = Math.min(kw * 1.15, height * 0.1);
    rows.forEach((row, i) => {
        const span = row.length * kw + (row.length - 1) * gap;
        let x = (width - span) / 2;
        for (const label of row) {
            key(ctx, x, top + i * (kh + gap), kw, kh, label);
            x += kw + gap;
        }
    });
    const bottom = top + 3 * (kh + gap);
    const modifiers = [['control', 1.3], ['option', 1.3], ['command', 1.6], ['', 4.8], ['command', 1.6], ['option', 1.3]];
    const units = modifiers.reduce((sum, [, u]) => sum + u, 0);
    const unit = (width - pad * 2 - gap * (modifiers.length - 1)) / units;
    let x = pad;
    for (const [label, u] of modifiers) {
        key(ctx, x, bottom, unit * u, kh, label);
        x += unit * u + gap;
    }
    // The trackpad: the rest of the half.
    const padTop = bottom + kh + pad;
    glass(ctx, () => {
        ctx.beginPath();
        ctx.roundRect(width * 0.18, padTop, width * 0.64, Math.max(height - padTop - pad, kh), kh * 0.35);
    });
}
