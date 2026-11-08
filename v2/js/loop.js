// When the drawing draws: every animation frame while something moves, and otherwise only when
// the pencil lines boil, so a page left alone wakes a few times a second rather than at the
// display's rate, and not at all with Reduce Motion.

const browserClock = {
    now: () => performance.now(),
    frame: (run) => requestAnimationFrame(run),
    after: (run, ms) => setTimeout(run, ms),
    cancel: (timer) => clearTimeout(timer),
};

/**
 * Runs `step(now)` on an animation frame after each `wake()`, and on the next while it answers
 * true, meaning something still moves. Once it answers false the loop sleeps until `wake()`, or
 * until the next boil tick when `rate()` gives ticks a second. Nothing runs while `live()` is false.
 */
export function createLoop(step, { rate, live, clock = browserClock }) {
    let requested = false, timer = null;

    function run(now) {
        requested = false;
        if (!live()) return;
        if (step(now)) {
            request();
            return;
        }
        const ticks = rate();
        if (!ticks) return;
        const at = clock.now();
        const next = (Math.floor((at * ticks) / 1000) + 1) * (1000 / ticks);
        timer = clock.after(wake, next - at + 1);
    }

    function request() {
        requested = true;
        clock.frame(run);
    }

    function wake() {
        if (timer !== null) {
            clock.cancel(timer);
            timer = null;
        }
        if (!requested && live()) request();
    }

    return { wake };
}
