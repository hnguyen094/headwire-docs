// The Mac's desktop picture, drawn rather than loaded: the app window on the MacBook Pro's screen
// in the illustration on apple.com's Mac pages (help-me-choose hero_mbp), rebuilt as shapes with
// its own colours and proportions, so it is sharp at any size and lays itself out for any screen.
// A wide screen gets the window's three columns (a purple notes panel over a lavender bar chart,
// a pie chart, and a sidebar of controls); a tall one stacks the notes, the pie and the bars.
//
// All measurements are in the illustration's own pixels: its screen is 418 by 263 under a
// 49-pixel toolbar.

const colour = {
    toolbar: '#d7d6d6', button: '#e5e5e5', buttonLight: '#f0efef', label: '#8080ea', rule: '#c4c4c4',
    purple: '#b286f8', white: '#f6f6f6', lavender: '#ede3fe', grey: '#c4c4c4', paper: '#f6f6f6',
    sidebar: '#e6e6e6', pill: '#cccccc', deep: '#9f45f6', light: '#c19af9', pink: '#e488f9', blue: '#58bff9',
    sky: '#6bcafa', control: '#69a7f9', lilac: '#b87cf7',
    red: '#de5955', yellow: '#f2b844', green: '#44ac58',
};

// A filled box [x, y, w, h, corner radius].
function rect(ctx, [x, y, w, h, r = 0], fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
}

// A box [x, y, w, h] with round ends.
function pill(ctx, [x, y, w, h], fill) {
    rect(ctx, [x, y, w, h, h / 2], fill);
}

// The window's title bar and toolbar, `width` wide: traffic lights, a title, and buttons with
// their labels spread across.
function toolbar(ctx, width) {
    rect(ctx, [0, 0, width, 49], colour.toolbar);
    for (const [x, c] of [[8.5, colour.red], [19, colour.yellow], [29.5, colour.green]]) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x, 10, 2.6, 0, Math.PI * 2);
        ctx.fill();
    }
    pill(ctx, [width / 2 - 25, 8, 32, 4], colour.label);
    pill(ctx, [width / 2 + 11, 8, 13, 4], colour.label);
    const groups = [[10, 3], [105, 1], [154, 5]];
    const right = width >= 300 ? [[width - 113, 3]] : [];
    for (const [x0, n] of [...groups, ...right]) {
        for (let i = 0; i < n; i++) {
            const x = x0 + i * 23.5;
            if (x + 17 > width - 20) continue;
            rect(ctx, [x, 24, 17, 10, 3.5], i % 3 === 2 ? colour.buttonLight : colour.button);
            pill(ctx, [x + 3, 37, 11, 4], colour.label);
        }
    }
    ctx.fillStyle = colour.label;
    ctx.fillRect(width - 14, 31, 8, 2);
    ctx.fillRect(width - 11, 28, 2, 8);
    rect(ctx, [0, 49, width, 1], colour.rule);
}

// The purple notes panel: white lines of text.
function notes(ctx, [x, y, w, h]) {
    rect(ctx, [x, y, w, h], colour.purple);
    const lines = [0.56, 0.7, 0.62, 0.66, 0.56];
    lines.forEach((share, i) => pill(ctx, [x + w * 0.15, y + 21 + i * 12.2, (w - w * 0.15) * share, 6], colour.white));
}

// The lavender bar chart: a column of grey ticks, three bars and a baseline.
function bars(ctx, [x, y, w, h]) {
    rect(ctx, [x, y, w, h], colour.lavender);
    for (let i = 0; i < 6; i++) pill(ctx, [x + 6, y + 14 + i * 15.2, 8, 5], colour.grey);
    const base = y + h - 22;
    const scale = (h - 40) / 75;
    for (const [dx, tall, c] of [[52, 38, colour.pink], [82, 64, colour.deep], [112, 48, colour.blue]]) {
        rect(ctx, [x + (dx / 172) * w, base - tall * scale, (22 / 172) * w, tall * scale], c);
    }
    pill(ctx, [x + (28 / 172) * w, base + 1, (132 / 172) * w, 4], colour.grey);
}

// The pie chart on paper: four slices, with grey lines of text above and below.
function pie(ctx, [x, y, w, h]) {
    rect(ctx, [x, y, w, h], colour.paper);
    pill(ctx, [x + 6, y + 6, 17, 6], colour.pill);
    pill(ctx, [x + 6, y + 15, 12, 6], colour.pill);
    const r = Math.min(w * 0.36, h * 0.3);
    const cx = x + w / 2, cy = y + h * 0.43;
    for (const [from, to, c] of [[-Math.PI, -Math.PI / 2, colour.deep], [-Math.PI / 2, 0, colour.light], [0, Math.PI / 4, colour.pink], [Math.PI / 4, Math.PI, colour.blue]]) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, from, to);
        ctx.closePath();
        ctx.fill();
    }
    for (let i = 0; i < 3; i++) pill(ctx, [x + w * 0.5, y + h - 42 + i * 8.5, w * (i === 1 ? 0.4 : 0.36), 6], colour.pill);
}

// The sidebar of controls.
function sidebar(ctx, [x, y, w, h]) {
    rect(ctx, [x, y, w, h], colour.sidebar);
    pill(ctx, [x + 10, y + 8, 18, 4], colour.grey);
    ctx.strokeStyle = colour.control;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(x + 33, y + 6, 22, 7, 3.5);
    ctx.stroke();
    pill(ctx, [x + 61, y + 8, 22, 4], colour.grey);
    rect(ctx, [x + 11, y + 20, w - 22, 21, 4], colour.white);
    pill(ctx, [x + 15, y + 26, 34, 9], colour.sky);
    const rows = [
        (yy) => pill(ctx, [x + 11, yy, 23, 4], colour.label),
        (yy) => { rect(ctx, [x + 11, yy, w - 30, 8, 4], colour.white); rect(ctx, [x + w - 21, yy, 8, 8, 2], colour.control); },
        (yy) => { rect(ctx, [x + 11, yy, 40, 8, 4], colour.white); rect(ctx, [x + 44, yy, 7, 8, 2], colour.control); pill(ctx, [x + w - 31, yy, 18, 8], colour.lilac); },
        (yy) => { for (let i = 0; i < 3; i++) rect(ctx, [x + 11 + i * 23, yy, 19, 8, 2], i === 1 ? colour.control : colour.white); },
        (yy) => { for (let i = 0; i < 3; i++) rect(ctx, [x + 11 + i * 23, yy, 19, 8, 2], colour.white); },
        (yy) => pill(ctx, [x + 11, yy, 23, 4], colour.label),
        (yy) => { for (let i = 0; i < 3; i++) rect(ctx, [x + 11 + i * 23, yy, 19, 8, 2], colour.white); },
        (yy) => { pill(ctx, [x + 11, yy + 2, 15, 4], colour.label); rect(ctx, [x + 31, yy, w - 44, 8, 4], colour.white); },
        (yy) => { pill(ctx, [x + 11, yy + 2, 15, 4], colour.label); rect(ctx, [x + 51, yy, 19, 8, 2], colour.white); rect(ctx, [x + 74, yy, 13, 8, 2], colour.white); },
    ];
    const step = (h - 52) / rows.length;
    rows.forEach((row, i) => row(y + 50 + i * step));
}

/**
 * Draws the desktop picture to fill `width` by `height` on `ctx`. A screen at least as wide as it
 * is tall gets the three columns; a narrower one gets them stacked.
 */
export function paintWallpaper(ctx, width, height) {
    ctx.save();
    if (width >= height) {
        // Height sets the scale; the pie column takes up whatever width the screen adds or lacks.
        const s = height / 263;
        ctx.scale(s, s);
        const w = width / s;
        const left = 172, side = w >= 330 ? 96 : 0;
        toolbar(ctx, w);
        notes(ctx, [0, 50, left, 99]);
        bars(ctx, [0, 149, left, 114]);
        pie(ctx, [left, 50, w - left - side, 213]);
        if (side) sidebar(ctx, [w - side, 50, side, 213]);
    } else {
        // Width sets the scale: notes, pie and bars, one under another.
        const s = width / 172;
        ctx.scale(s, s);
        const h = height / s;
        toolbar(ctx, 172);
        const rest = h - 50;
        notes(ctx, [0, 50, 172, rest * 0.26]);
        pie(ctx, [0, 50 + rest * 0.26, 172, rest * 0.42]);
        bars(ctx, [0, 50 + rest * 0.68, 172, rest * 0.32]);
    }
    ctx.restore();
}
