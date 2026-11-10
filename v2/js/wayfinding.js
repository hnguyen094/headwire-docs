// Wayfinding on the home page, with or without the drawing: a cue at the bottom that there's more
// below, until the reader first scrolls; a rail on the left that fills as the reader walks across
// the desk, read from the same scroll map the camera follows (scroll.js), with a link to each
// chapter's shot; and a button back to the top once the reader is on their way. Without scripts
// all three stay hidden.
import { chapterStops, scrollMap } from './scroll.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
// How far, in CSS pixels, the reader scrolls before the cue goes for good.
const CUE_GONE_AFTER = 24;
// How far along the timeline the reader walks before the button back to the top shows: halfway to
// the second shot.
const TOP_FROM = 0.125;

function jump(y) {
    scrollTo({ top: y, behavior: reduced.matches ? 'instant' : 'smooth' });
}

// The chapter the reader is in: the stop nearest timeline position t, which is the one whose card
// is on the screen.
function current(stops, t) {
    return stops.reduce((near, stop) => (Math.abs(stop.t - t) < Math.abs(near.t - t) ? stop : near), stops[0]);
}

function update(parts, state) {
    const t = state.map(scrollY);
    parts.rail.style.setProperty('--progress', t.toFixed(4));
    const at = current(state.stops, t).shot;
    for (const link of parts.links) {
        const stop = state.stops.find(({ shot }) => shot === link.dataset.shot);
        link.classList.toggle('passed', stop !== undefined && stop.t <= t + 0.001);
        if (link.dataset.shot === at) link.setAttribute('aria-current', 'step');
        else link.removeAttribute('aria-current');
    }
    if (scrollY > CUE_GONE_AFTER) parts.cue.classList.add('gone');
    parts.top.classList.toggle('gone', t < TOP_FROM);
}

// Reads the stops again, and places each chapter's link on the rail at its shot's position.
function measure(story, parts, state) {
    state.stops = chapterStops(story);
    state.map = scrollMap(story);
    for (const link of parts.links) {
        const stop = state.stops.find(({ shot }) => shot === link.dataset.shot);
        link.parentElement.style.setProperty('--at', String(stop?.t ?? 0));
    }
    update(parts, state);
}

// How far, in CSS pixels, a touch may move and still be a tap.
const TAP_SLOP = 10;

/**
 * Runs `action(event)` on a click, and on a touch that starts and ends on `element` without moving
 * further than TAP_SLOP. A browser makes no click of a touch that stops a scroll's momentum
 * (Chrome's tap suppression after a fling), though it still sends the touch; ending the touch here
 * cancels the click that would otherwise follow, so the action runs once. iOS sends neither
 * (WebKit r219340), and there the first touch only stops the scroll.
 */
function onTap(element, action) {
    let start = null;
    element.addEventListener('touchstart', (event) => {
        const touch = event.changedTouches[0];
        start = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
    }, { passive: true });
    element.addEventListener('touchend', (event) => {
        const touch = event.changedTouches[0];
        const tapped = start && Math.hypot(touch.clientX - start.x, touch.clientY - start.y) <= TAP_SLOP;
        start = null;
        if (!tapped || !event.cancelable) return;
        event.preventDefault();
        action(event);
    });
    element.addEventListener('click', action);
}

function listen(story, parts, state) {
    for (const link of parts.links) {
        onTap(link, (event) => {
            const stop = state.stops.find(({ shot }) => shot === link.dataset.shot);
            if (!stop) return;
            event.preventDefault();
            jump(stop.y);
        });
    }
    onTap(parts.top, () => {
        jump(0);
        parts.title.setAttribute('tabindex', '-1');
        parts.title.focus({ preventScroll: true });
    });
    addEventListener('scroll', () => update(parts, state), { passive: true });
    // The stills arriving, the drawing taking over or giving up, and a turned phone all move the
    // chapters.
    new ResizeObserver(() => measure(story, parts, state)).observe(story);
    addEventListener('resize', () => measure(story, parts, state));
}

/** Shows and runs the cue, the chapter rail and the button back to the top for `story`. */
export function startWayfinding(story) {
    const parts = {
        cue: document.querySelector('.cue'),
        rail: document.querySelector('.chapters'),
        links: [...document.querySelectorAll('.chapters a[data-shot]')],
        top: document.querySelector('.to-top'),
        title: document.querySelector('#title'),
    };
    if (!parts.cue || !parts.rail || !parts.top) return;
    const state = { stops: [], map: () => 0 };
    measure(story, parts, state);
    listen(story, parts, state);
    if (scrollY > CUE_GONE_AFTER) parts.cue.classList.add('gone');
    for (const part of [parts.cue, parts.rail, parts.top]) part.hidden = false;
}
