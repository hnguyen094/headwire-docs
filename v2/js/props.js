// Apple's own device models, in place of the drawn ones: the reduced GLBs in props/, made by
// tools/docs/v2-props.sh. Each model that loads in time takes its drawn body's place, and each
// screen shows its picture on the model's own display, through the display's UVs. A model that
// fails or takes too long leaves its drawn body where it is.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { screen, solid } from './sketch.js';
import { foldOpen, plane } from './fold.js';

// Each model in its drawn body's frame. `stand` puts its base on the body's floor, otherwise it is
// centred on the body; `turn` and `tip` rotate it about y and z; `at` moves it after. `display`
// names the mesh that lit up in Apple's file (its emissive screen); `screen` is the drawn screen it
// stands in for, showing `picture` (screens.js); `fold` opens a folding phone about its `spine` to
// that many degrees, and `keys` names the lower half's inner panel, which shows `keysPicture`.
// `logo` names logo meshes to draw darker; `seat` rests a phone on its stand.
const props = [
    { file: 'mac-pro', body: 'macPro', stand: true },
    { file: 'mac-mini', body: 'macMini', stand: true },
    { file: 'imac', body: 'mac', stand: true, at: [0, 0, 0.11], display: 'KiaSydWNENzyEJp', logo: ['wYdKUadknzQnXQo'], screen: 'mac', picture: 'mac' },
    {
        file: 'iphone-duo', body: 'duo', stand: true, fold: { degrees: 105, spine: 'MvKPXGSdYDVvSpk' },
        display: 'UXtsBZYlaUvHoEh', screen: 'duo', picture: 'duo', keys: 'svvOILdVxasRAOk', keysPicture: 'duoKeys',
    },
    { file: 'ipad-pro', body: 'ipad', stand: true, at: [0, 0, -0.02], display: 'lsDiIbtoSGSmWWZ', screen: 'ipad', picture: 'ipad' },
    { file: 'iphone-18-pro', body: 'iphone', turn: Math.PI, seat: true, display: 'lit', screen: 'iphone', picture: 'iphone' },
];

const up = new THREE.Vector3(0, 1, 0);

function groupOf(node) {
    for (let at = node; at; at = at.parent) if (at.userData?.group) return at.userData.group;
    return null;
}

function regrey(root) {
    root.traverse((node) => {
        if (!node.isMesh) return;
        const color = node.material?.color;
        const tone = color ? 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b : 0.5;
        node.material = solid(Math.min(Math.max(Math.pow(tone, 1 / 2.2), 0.12), 0.97));
    });
}

// Metres, turned, and stood on the floor or centred.
function normalise(model, prop) {
    const holder = new THREE.Group();
    holder.add(model);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    if (Math.max(size.x, size.y, size.z) > 3) model.scale.multiplyScalar(0.01);
    model.rotation.set(0, prop.turn ?? 0, prop.tip ?? 0);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const centre = box.getCenter(new THREE.Vector3());
    model.position.sub(new THREE.Vector3(centre.x, prop.stand ? box.min.y : centre.y, centre.z));
    holder.position.fromArray(prop.at ?? [0, 0, 0]);
    return holder;
}

// The mesh called `name`, or with 'lit', the largest that showed a screen-shaped picture in
// Apple's file (v2-props.py marks them with the picture's aspect).
function named(model, name) {
    if (name === 'lit') {
        let best = null, area = 0;
        model.traverse((node) => {
            const aspect = node.userData?.screen ?? node.parent?.userData?.screen;
            if (!node.isMesh || !aspect || Math.abs(aspect - 1) < 0.05) return;
            const size = new THREE.Box3().setFromObject(node).getSize(new THREE.Vector3());
            const [a, b] = [size.x, size.y, size.z].sort((x, y) => y - x);
            if (a * b > area) {
                area = a * b;
                best = node;
            }
        });
        return best;
    }
    let found = null;
    model.traverse((node) => {
        if (!found && node.isMesh && (node.name === name || node.parent?.name === name)) found = node;
    });
    return found;
}

// The display's vertices in the world: those `only` keeps.
function surface(mesh, only) {
    mesh.updateMatrixWorld(true);
    const pos = mesh.geometry.attributes.position;
    const points = [];
    for (let i = 0; i < pos.count; i++) {
        if (only(mesh, i)) points.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
    }
    return { points };
}

// Shows `draw(aspect)` on the display, filling it exactly: each vertex gets new UVs from where it
// sits on the screen's face, left to right and top to bottom, so the picture spans the display's
// own outline, upright, at its own aspect, whatever UVs Apple's file gave it. `topward` is the way
// the picture's top faces on a screen lying flat; standing screens use up.
function showOn(mesh, draw, facing, only, topward = up) {
    const { points } = surface(mesh, only);
    if (points.length < 3) return null;
    const { centre, normal } = plane(points);
    if (normal.dot(facing) < 0) normal.negate();
    const upward = topward.clone().addScaledVector(normal, -normal.dot(topward)).normalize();
    const right = upward.clone().cross(normal).normalize();
    const xs = points.map((p) => p.clone().sub(centre).dot(right));
    const ys = points.map((p) => p.clone().sub(centre).dot(upward));
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const w = x1 - x0, h = y1 - y0;
    // Vertices left out (the other half of a folded panel) take the picture's black edge.
    const pos = mesh.geometry.attributes.position;
    const uv = new Float32Array(pos.count * 2).fill(-1);
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        if (!only(mesh, i)) continue;
        p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).sub(centre);
        uv[i * 2] = (p.dot(right) - x0) / w;
        uv[i * 2 + 1] = (y1 - p.dot(upward)) / h;
    }
    mesh.geometry = mesh.geometry.clone();
    mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const texture = new THREE.CanvasTexture(draw(w / h));
    texture.anisotropy = 8;
    texture.flipY = false;
    mesh.material = screen(texture);
    return { centre, normal, upward, size: Math.max(w, h) };
}

// Leaves out the clear glass (v2-props.py marks it), which would otherwise be drawn as solid and
// cover the display. Everything else stays, so the body reads as solid.
function clearGlass(model) {
    model.traverse((node) => {
        if (node.isMesh && (node.userData?.glass || node.parent?.userData?.glass)) node.visible = false;
    });
}

// Moves the drawn screen plane, which the camera frames, onto the model's display, and hides it.
function proxy(shown, { centre, normal, upward }) {
    const basis = new THREE.Matrix4().makeBasis(upward.clone().cross(normal).normalize(), upward, normal);
    const world = new THREE.Quaternion().setFromRotationMatrix(basis);
    const parent = shown.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    shown.quaternion.copy(parent.multiply(world));
    shown.position.copy(shown.parent.worldToLocal(centre.clone()));
    shown.visible = false;
}

// Rests a model leaning in a stand on the stand's base: moves its body up or down until the
// model's lowest point is on the base's top, 6.5 mm above the desk, so it never cuts into it.
function seat(holder, body) {
    const box = new THREE.Box3().setFromObject(holder);
    body.position.y += 0.0065 - box.min.y;
    body.updateMatrixWorld(true);
}

function hideBody(body) {
    body.traverse((node) => {
        if (node.isMesh) node.visible = false;
    });
}

function loader() {
    const draco = new DRACOLoader();
    draco.setDecoderPath('vendor/three-0.186.1/addons/libs/draco/gltf/');
    return new GLTFLoader().setDRACOLoader(draco);
}

// Draws the meshes `logo` names darker, so a logo that is nearly the body's own tone still reads.
function darken(model, names) {
    model.traverse((node) => {
        if (node.isMesh && (names.includes(node.name) || names.includes(node.parent?.name))) node.material = solid(0.35);
    });
}

function place(entry, screens, pictures) {
    const { prop, model } = entry;
    const body = screens.bodies[prop.body];
    regrey(model);
    if (prop.logo) darken(model, prop.logo);
    const half = prop.fold ? foldOpen(model, prop.fold, groupOf) : () => true;
    const holder = normalise(model, prop);
    hideBody(body);
    body.add(holder);
    holder.updateMatrixWorld(true);
    if (prop.seat) seat(holder, body);
    if (!prop.screen) return;
    const shown = screens[prop.screen];
    const display = named(model, prop.display);
    const facing = new THREE.Vector3(0, 0, 1).transformDirection(shown.matrixWorld);
    const frame = display && showOn(display, pictures[prop.picture], facing, half);
    if (!frame) {
        shown.visible = true;
        return;
    }
    clearGlass(model);
    proxy(shown, frame);
    // A folding phone's lower half: its picture's top towards the hinge, where the display stands.
    // The panel `keys` names marks where; the picture goes on whatever face is uppermost there.
    const panel = prop.keys && named(model, prop.keys);
    if (panel) {
        panel.geometry.computeBoundingBox();
        const centre = panel.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(panel.matrixWorld);
        const ray = new THREE.Raycaster(centre.clone().addScaledVector(up, 0.05), up.clone().negate(), 0, 0.1);
        const keys = ray.intersectObject(model, true).find((hit) => hit.object.visible)?.object ?? panel;
        showOn(keys, pictures[prop.keysPicture], up, () => true, frame.centre.clone().sub(centre).normalize());
    }
}

/**
 * Loads every model and puts each that arrives within `seconds` in place of its drawn body.
 * Answers how many it placed.
 */
export async function swapProps(scene, screens, pictures, seconds = 12) {
    const gltf = loader();
    const late = new Promise((done) => setTimeout(done, seconds * 1000, null));
    const loaded = await Promise.all(props.map((prop) =>
        Promise.race([gltf.loadAsync(`props/${prop.file}.glb`).then((result) => ({ prop, model: result.scene })), late]).catch(() => null)));
    let placed = 0;
    for (const entry of loaded) {
        if (!entry) continue;
        place(entry, screens, pictures);
        placed++;
    }
    scene.updateMatrixWorld(true);
    return placed;
}
