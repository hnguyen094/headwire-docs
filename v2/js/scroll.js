// Scroll position to timeline position, for the live drawing.
import { timeline } from './timeline.js';

// Scroll to timeline position: each chapter's hold lines up with its card in the middle of the
// screen, and the travel between holds takes the scroll between cards.
export function scrollMap(story) {
    const chapters = [...story.querySelectorAll('[data-shot]')];
    const top = story.getBoundingClientRect().top + scrollY;
    const view = innerHeight;
    const holds = timeline.filter((key, i) => timeline[i + 1]?.[1] === key[1]);
    const points = [[top, 0]];
    for (const chapter of chapters) {
        const hold = holds.find(([, name]) => name === chapter.dataset.shot);
        if (!hold) continue;
        const end = timeline[timeline.indexOf(hold) + 1][0];
        const box = chapter.getBoundingClientRect();
        const start = box.top + scrollY - view * 0.35;
        const stop = box.bottom + scrollY - view * 0.65;
        points.push([start, hold[0]], [Math.max(stop, start + 1), end]);
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
