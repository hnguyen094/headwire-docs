// Version 2 of the home page: the desk drawn as a pencil sketch, with scrolling walking the camera
// across it, drawn live with three.js (live.js). The page's head picks the live layout before the
// first paint (index.html); without WebGL 2, without scripts, or with Reduce Motion on, the page
// keeps its stills, and it goes back to them if the drawing can't start.
const root = document.documentElement;

async function run() {
    if (!root.classList.contains('live')) return;
    const { start } = await import('./live.js');
    await start();
}

run().catch((error) => {
    root.classList.remove('live');
    console.error(error);
});
