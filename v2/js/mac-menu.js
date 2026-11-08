// The Mac's menu bar, with Headwire Connect's item highlighted and its menu open under it, as
// screens.js paints them over each screen's desktop. The menu's words are Headwire Connect's own
// (ConnectAppMenuContent, SwitchRows, DevicesMenuSection and DeviceRow in src/HeadwireConnect).

const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';

// A rounded box [x, y, w, h, corner radius], as the path.
function roundRect(ctx, [x, y, w, h, r]) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
}

// `words` with their left, or with `align`, their right, `at` [x, y].
function text(ctx, words, { at: [x, y], size = 17, weight = 400, color = '#1d1d22', align = 'left' }) {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(words, x, y);
}

/**
 * Paints the menu bar `width` wide, with as many menu titles as fit left of Headwire Connect's
 * item; answers the item's right edge.
 */
export function paintMenuBar(ctx, width) {
    ctx.fillStyle = 'rgba(246,246,248,0.82)';
    ctx.fillRect(0, 0, width, 36);
    const item = width - 236;
    let x = 22;
    for (const [title, weight] of [['Jotter', 700], ['File', 400], ['Edit', 400], ['View', 400], ['Window', 400], ['Help', 400]]) {
        ctx.font = `${weight} 17px ${font}`;
        const w = ctx.measureText(title).width;
        if (x + w > item - 20) break;
        text(ctx, title, { at: [x, 18], weight });
        x += w + 26;
    }
    text(ctx, 'Tue 10:24', { at: [width - 22, 18], align: 'right' });
    // Headwire Connect's item: a display with its inside filled, as when a device is using this Mac,
    // highlighted because its menu is open.
    roundRect(ctx, [item, 5, 44, 26, 6]);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fill();
    ctx.strokeStyle = '#1d1d22';
    ctx.lineWidth = 2;
    roundRect(ctx, [item + 11, 10, 22, 14, 2.5]);
    ctx.stroke();
    ctx.fillStyle = '#1d1d22';
    ctx.fillRect(item + 14.5, 13.5, 15, 7);
    ctx.fillRect(item + 17, 26, 10, 2);
    return item + 44;
}

function paintSwitch(ctx, x, y) {
    roundRect(ctx, [x, y - 9, 32, 18, 9]);
    ctx.fillStyle = '#2f7cf6';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 23, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
}

// A divider across the menu [x, y, w].
function rule(ctx, [x, y, w]) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x + 12, y, w - 24, 1.5);
}

/** Headwire Connect's menu, open under its item, whose right edge is `right`. */
export function paintMenu(ctx, right) {
    const w = 320, x = Math.max(8, right - w), y = 40;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    roundRect(ctx, [x, y, w, 336, 12]);
    ctx.fillStyle = 'rgba(238,238,242,0.97)';
    ctx.fill();
    ctx.restore();
    const left = x + 18, end = x + w - 18;
    let row = y + 26;
    text(ctx, 'Streaming', { at: [left, row] });
    paintSwitch(ctx, end - 32, row);
    row += 32;
    text(ctx, 'Input', { at: [left, row] });
    paintSwitch(ctx, end - 32, row);
    row += 22;
    rule(ctx, [x, row, w]);
    row += 22;
    text(ctx, 'Devices', { at: [left, row], size: 14, weight: 600, color: '#7a7a82' });
    for (const [name, line] of [['iPad', 'Showing and controlling · USB cable'], ['iPhone', 'Showing · Wi-Fi']]) {
        row += 32;
        text(ctx, name, { at: [left, row - 8] });
        text(ctx, line, { at: [left, row + 12], size: 14, color: '#6c6c74' });
        text(ctx, '›', { at: [end, row], size: 20, color: '#6c6c74', align: 'right' });
        row += 16;
    }
    row += 28;
    text(ctx, 'Pair a Device…', { at: [left, row] });
    row += 22;
    rule(ctx, [x, row, w]);
    row += 22;
    text(ctx, 'Settings…', { at: [left, row] });
    text(ctx, '⌘,', { at: [end, row], color: '#7a7a82', align: 'right' });
    row += 30;
    text(ctx, 'About Headwire Connect', { at: [left, row] });
    row += 30;
    text(ctx, 'Quit Headwire Connect', { at: [left, row] });
    text(ctx, '⌘Q', { at: [end, row], color: '#7a7a82', align: 'right' });
}
