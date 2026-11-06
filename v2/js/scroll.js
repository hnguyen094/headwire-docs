// Scroll position to timeline position, for the live drawing.
import { timeline } from './timeline.js';

// Scroll to timeline position: the camera reaches each chapter's shot as the chapter's middle
// crosses the middle of the screen, and moves on at once; between those points it goes at an even
// pace, so the walk never stops.
export function scrollMap(story) {
    const top = story.getBoundingClientRect().top + scrollY;
    const view = innerHeight;
    const points = [[top, 0]];
    for (const chapter of story.querySelectorAll('[data-shot]')) {
        const key = timeline.find(([, name]) => name === chapter.dataset.shot);
        if (!key || key[0] === 0 || key[0] === 1) continue;
        const box = chapter.getBoundingClientRect();
        points.push([box.top + scrollY + box.height / 2 - view / 2, key[0]]);
    }
    points.push([top + story.offsetHeight - view, 1]);
    points.sort((a, b) => a[0] - b[0]);
    return (y) => {
        if (y <= points[0][0]) return points[0][1];
        for (let i = 1; i < points.length; i++) {
            const [y1, t1] = points[i];
            const [y0, t0] = points[i - 1];
            if (y <= y1) return t0 + (t1 - t0) * ((y - y0) / Math.max(y1 - y0, 1));
        }
        return 1;
    };
}

/**
 * Fades each pinned card out as the next one scrolls in over it: fully there while the next card
 * is below the screen, gone once the next card's top reaches its middle, and gone for good once
 * the next card pins.
 */
export function fadeCards(story) {
    const cards = [...story.querySelectorAll('[data-shot] .card')];
    cards.forEach((card, i) => {
        const next = cards[i + 1];
        let shown = 1;
        if (next) {
            const box = card.getBoundingClientRect();
            const middle = box.top + box.height / 2;
            const arriving = next.closest('[data-shot]').getBoundingClientRect().top > 0;
            const share = (next.getBoundingClientRect().top - middle) / Math.max(innerHeight - middle, 1);
            shown = arriving ? Math.min(Math.max(share, 0), 1) : 0;
        }
        card.style.opacity = shown.toFixed(3);
        card.classList.toggle('gone', shown < 0.5);
    });
}
