// Version 2 of the home page: the desk drawn as a pencil sketch, with scrolling walking the camera
// across it, drawn live with three.js (live.js). Without WebGL 2, without scripts, or with Reduce
// Motion on, the page keeps its stills.
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const capture = new URLSearchParams(location.search).has('capture');

function webgl2() {
    try {
        return !!document.createElement('canvas').getContext('webgl2');
    } catch {
        return false;
    }
}

async function run() {
    if ((reduced && !capture) || !webgl2()) return;
    const { start } = await import('./live.js');
    await start();
}

run().catch((error) => {
    root.classList.remove('live');
    console.error(error);
});
