// Headwire's own controls, drawn the way the app draws them over the stream: round glass buttons
// with white symbols. keysRow is the row of Mac keys (as in the App Store captures: back, forward,
// Mission Control, Launchpad, brightness, media, volume, keyboard); settingsButton is the glass
// settings button. duo-deck.js draws the lower half of a folding phone opened like a laptop from
// these.

export function glass(ctx, path) {
    ctx.save();
    path();
    ctx.fillStyle = 'rgba(28,28,34,0.58)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
}

function circle(ctx, [x, y], r) {
    glass(ctx, () => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
    });
}

export function ink(ctx, s) {
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

function triangle(ctx, [x, y, s], dir) {
    ctx.beginPath();
    ctx.moveTo(x - dir * s * 0.4, y - s * 0.45);
    ctx.lineTo(x + dir * s * 0.45, y);
    ctx.lineTo(x - dir * s * 0.4, y + s * 0.45);
    ctx.closePath();
    ctx.fill();
}

function sun(ctx, [x, y, s], rays) {
    ctx.beginPath();
    ctx.arc(x, y, s * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        line(ctx, [[x + Math.cos(a) * s * 0.45, y + Math.sin(a) * s * 0.45], [x + Math.cos(a) * s * rays, y + Math.sin(a) * s * rays]]);
    }
}

function speaker(ctx, [x, y, s], waves) {
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

// Each symbol is drawn in a box of size s centred on (x, y), given as [x, y, s].
const symbols = [
    (ctx, [x, y, s]) => line(ctx, [[x + s * 0.15, y - s * 0.35], [x - s * 0.2, y], [x + s * 0.15, y + s * 0.35]]),
    (ctx, [x, y, s]) => line(ctx, [[x - s * 0.15, y - s * 0.35], [x + s * 0.2, y], [x - s * 0.15, y + s * 0.35]]),
    (ctx, [x, y, s]) => {
        ctx.strokeRect(x - s * 0.5, y - s * 0.32, s * 0.42, s * 0.28);
        ctx.strokeRect(x - s * 0.5, y + s * 0.06, s * 0.42, s * 0.26);
        ctx.strokeRect(x + s * 0.02, y - s * 0.32, s * 0.48, s * 0.64);
    },
    (ctx, [x, y, s]) => {
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) ctx.fillRect(x + i * s * 0.32 - s * 0.1, y + j * s * 0.32 - s * 0.1, s * 0.2, s * 0.2);
    },
    (ctx, [x, y, s]) => sun(ctx, [x, y, s], 0.6),
    (ctx, [x, y, s]) => sun(ctx, [x, y, s], 0.75),
    (ctx, [x, y, s]) => {
        triangle(ctx, [x - s * 0.05, y, s * 0.7], -1);
        triangle(ctx, [x + s * 0.32, y, s * 0.7], -1);
    },
    (ctx, [x, y, s]) => {
        triangle(ctx, [x - s * 0.18, y, s * 0.7], 1);
        ctx.fillRect(x + s * 0.12, y - s * 0.3, s * 0.1, s * 0.6);
        ctx.fillRect(x + s * 0.3, y - s * 0.3, s * 0.1, s * 0.6);
    },
    (ctx, [x, y, s]) => {
        triangle(ctx, [x - s * 0.3, y, s * 0.7], 1);
        triangle(ctx, [x + s * 0.05, y, s * 0.7], 1);
    },
    (ctx, [x, y, s]) => speaker(ctx, [x + s * 0.05, y, s], 0),
    (ctx, [x, y, s]) => speaker(ctx, [x + s * 0.05, y, s], 1),
    (ctx, [x, y, s]) => speaker(ctx, [x, y, s], 3),
    (ctx, [x, y, s]) => {
        ctx.strokeRect(x - s * 0.5, y - s * 0.3, s, s * 0.6);
        for (let i = 0; i < 4; i++) ctx.fillRect(x - s * 0.36 + i * s * 0.22, y - s * 0.15, s * 0.1, s * 0.08);
        ctx.fillRect(x - s * 0.25, y + s * 0.08, s * 0.5, s * 0.08);
    },
];

/** The row of Mac keys, centred on (cx, cy), each button of radius r: `at` is [cx, cy, r]. */
export function keysRow(ctx, [cx, cy, r]) {
    // 44-point keys, 4 points apart, as the app's key row lays them out.
    const gap = r * (48 / 22);
    const x0 = cx - (gap * (symbols.length - 1)) / 2;
    symbols.forEach((draw, i) => {
        const x = x0 + i * gap;
        circle(ctx, [x, cy], r);
        ctx.save();
        ink(ctx, r);
        draw(ctx, [x, cy, r * 0.95]);
        ctx.restore();
    });
}

/** The glass settings button, three sliders, centred on (x, y) with radius r: [x, y, r]. */
export function settingsButton(ctx, [x, y, r]) {
    circle(ctx, [x, y], r);
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
