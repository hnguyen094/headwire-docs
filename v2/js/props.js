// Apple's own device models, in place of the drawn ones: the reduced GLBs in props/, made by
// tools/docs/v2-props.sh. Each model takes its drawn body's place as it arrives, and each screen
// shows its picture on the model's own display, through the display's UVs. A model that fails or
// takes too long leaves its drawn body where it is.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { foldOpen } from './fold.js';
import { named, showOn, proxy } from './display.js';
import { groupOf, regrey, darken, normalise, clearGlass, hideBody, seat, mergeByTone } from './model.js';

// Each model in its drawn body's frame. `stand` puts its base on the body's floor, otherwise it is
// centred on the body; `turn` and `tip` rotate it about y and z; `at` moves it after. `display`
// names the mesh that lit up in Apple's file (its emissive screen); `screen` is the drawn screen it
// stands in for, showing `picture` (screens.js); `fold` opens a folding phone about its `spine` to
// that many degrees, and the display's piece on the lower half (fold.js) shows `keysPicture`.
// `logo` names logo meshes to draw darker; `seat` rests a phone on its stand.
const props = [
    { file: 'mac-pro', body: 'macPro', stand: true },
    { file: 'mac-mini', body: 'macMini', stand: true },
    { file: 'vision-pro', body: 'visionPro', stand: true },
    { file: 'imac', body: 'mac', stand: true, at: [0, 0, 0.11], display: 'KiaSydWNENzyEJp', logo: ['wYdKUadknzQnXQo'], screen: 'mac', picture: 'mac' },
    {
        file: 'iphone-duo', body: 'duo', stand: true, fold: { degrees: 105, spine: 'MvKPXGSdYDVvSpk' },
        display: 'UXtsBZYlaUvHoEh', screen: 'duo', picture: 'duo', keysPicture: 'duoKeys',
    },
    { file: 'ipad-pro', body: 'ipad', stand: true, at: [0, 0, -0.02], display: 'lsDiIbtoSGSmWWZ', screen: 'ipad', picture: 'ipad' },
    { file: 'iphone-18-pro', body: 'iphone', turn: Math.PI, seat: true, display: 'lit', screen: 'iphone', picture: 'iphone' },
];

/** How many models the page asks for. */
export const propCount = props.length;

function loader() {
    const draco = new DRACOLoader();
    // Through the import map, so the vendored version is named in one place.
    draco.setDecoderPath(import.meta.resolve('three/addons/libs/draco/gltf/'));
    return new GLTFLoader().setDRACOLoader(draco);
}

/**
 * The picture `name` at `aspect`, as a texture: the drawn screen's own when its shape is near
 * enough, so the page keeps one copy of it; otherwise a new one, and the drawn screen's, which
 * nothing shows once the model is in, is let go.
 */
function pictureFor(name, aspect, { screens, pictures }) {
    const drawn = screens.textures[name];
    if (drawn?.image && Math.abs(drawn.image.width / drawn.image.height / aspect - 1) < 0.03) return drawn;
    if (drawn) {
        drawn.dispose();
        drawn.image = null;
    }
    const texture = new THREE.CanvasTexture(pictures[name](aspect));
    texture.anisotropy = 8;
    return texture;
}

// Shows the prop's picture on the model's display, and moves the drawn screen onto it; and on a
// folding phone, the keys on the display's piece on the lower half.
function showScreen(entry, upper, desk) {
    const { prop, model } = entry;
    const shown = desk.screens[prop.screen];
    const display = named(model, prop.display, upper);
    const facing = new THREE.Vector3(0, 0, 1).transformDirection(shown.matrixWorld);
    const frame = display && showOn(display, (aspect) => pictureFor(prop.picture, aspect, desk), { normal: facing });
    if (!frame) {
        shown.visible = true;
        return;
    }
    clearGlass(model);
    proxy(shown, frame);
    // A folding phone's lower half: the display's piece there, its picture's top towards the
    // hinge, which foldOpen lays along the model's x with the lower half towards +z.
    const keys = prop.keysPicture && named(model, prop.display, (mesh) => !upper(mesh));
    const top = new THREE.Vector3(0, 0, -1).transformDirection(model.matrixWorld);
    if (keys) showOn(keys, (aspect) => pictureFor(prop.keysPicture, aspect, desk), { normal: new THREE.Vector3(0, 1, 0), top });
}

function place(entry, desk) {
    const { prop, model } = entry;
    const body = desk.screens.bodies[prop.body];
    regrey(model);
    if (prop.logo) darken(model, prop.logo);
    const upper = prop.fold ? foldOpen(model, prop.fold, groupOf) : () => true;
    const holder = normalise(model, prop);
    hideBody(body);
    body.add(holder);
    holder.updateMatrixWorld(true);
    if (prop.seat) seat(holder, body);
    if (prop.screen) showScreen(entry, upper, desk);
    mergeByTone(holder);
}

/**
 * Loads every model into `desk` ({ scene, screens, pictures }) and puts each that arrives within
 * `seconds` in place of its drawn body as it arrives, telling `placed()` after each. Answers how
 * many it placed.
 */
export async function swapProps(desk, placed, seconds = 12) {
    const gltf = loader();
    const late = new Promise((done) => setTimeout(done, seconds * 1000, null));
    let count = 0;
    await Promise.all(props.map(async (prop) => {
        const arriving = gltf.loadAsync(`props/${prop.file}.glb`).then((result) => ({ prop, model: result.scene }));
        const entry = await Promise.race([arriving, late]).catch(() => null);
        if (!entry) return;
        place(entry, desk);
        desk.scene.updateMatrixWorld(true);
        count++;
        placed();
    }));
    return count;
}
