// The desk, in metres, with y up and the desk top at y = 0 and the floor at y = -0.74. The drawn
// devices (a tower on the floor, a small box, an all-in-one display, a headset, a folding phone, a
// tablet on a keyboard and a phone) are what the page shows when Apple's models don't load
// (props.js): plain shapes with no maker's details, sized like the real ones. Each screen is a plane of its own that
// shows its picture; `screens` names where each one is so the camera can frame it.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { solid, screen } from './sketch.js';

const tones = { desk: 0.93, wall: 1.12, metal: 0.86, dark: 0.3, key: 0.8, paper: 0.99, mug: 0.95 };

function box(w, h, d, tone, r = 0.004) {
    const radius = Math.min(r, w / 2.01, h / 2.01, d / 2.01);
    return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), solid(tone));
}

function place(mesh, [x, y, z], [rx, ry, rz] = [0, 0, 0]) {
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    return mesh;
}

function screenPlane(w, h, texture) {
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), screen(texture));
}

function room(group) {
    group.add(place(box(1.9, 0.04, 0.82, tones.desk, 0.006), [0, -0.02, 0]));
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), solid(tones.wall));
    group.add(place(wall, [0, 0.7, -0.42]));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), solid(0.9));
    group.add(place(floor, [0, -0.74, 0.8], [-Math.PI / 2, 0, 0]));
    for (const x of [-0.9, 0.9]) group.add(place(box(0.04, 0.72, 0.7, tones.metal), [x * 0.96, -0.4, 0]));
    return wall;
}

// The tower stands on the floor beside the desk; the small box sits on the desk under the left of
// the all-in-one's display.
function towerAndBox(group) {
    const tower = new THREE.Group();
    tower.add(place(box(0.21, 0.52, 0.44, tones.metal, 0.012), [0, 0.26, 0]));
    tower.add(place(box(0.17, 0.006, 0.003, tones.dark), [0, 0.46, 0.221]));
    for (const x of [-0.07, 0.07]) tower.add(place(box(0.02, 0.012, 0.36, tones.dark), [x, 0.006, 0]));
    group.add(place(tower, [-1.17, -0.74, -0.02], [0, 0.3, 0]));
    const mini = new THREE.Group();
    mini.add(place(box(0.127, 0.036, 0.127, tones.metal, 0.012), [0, 0.018, 0]));
    mini.add(place(box(0.03, 0.002, 0.002, tones.dark), [-0.03, 0.012, 0.064]));
    group.add(place(mini, [-0.36, 0, -0.13]));
    return { tower, mini };
}

// A headset resting on the desk: its curved front, the light seal behind it, and the band.
function headset(group) {
    const visor = new THREE.Group();
    const front = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 32, 1, false, -0.85, 1.7), solid(tones.dark));
    visor.add(place(front, [0, 0.05, -0.06]));
    visor.add(place(box(0.17, 0.075, 0.03, tones.metal, 0.012), [0, 0.05, -0.005]));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 32, Math.PI), solid(tones.key));
    visor.add(place(band, [0, 0.012, -0.075], [-Math.PI / 2, 0, 0]));
    group.add(place(visor, [-0.62, 0, -0.12], [0, 0.2, 0]));
    return visor;
}

function allInOne(group, texture) {
    const mac = new THREE.Group();
    const panel = box(0.54, 0.35, 0.012, tones.metal, 0.008);
    mac.add(place(panel, [0, 0.285, 0]));
    mac.add(place(box(0.524, 0.302, 0.002, tones.dark, 0.003), [0, 0.296, 0.0062]));
    const shown = screenPlane(0.5, 0.28125, texture);
    mac.add(place(shown, [0, 0.296, 0.0075]));
    mac.add(place(box(0.15, 0.17, 0.01, tones.metal, 0.004), [0, 0.12, -0.05], [-0.36, 0, 0]));
    mac.add(place(box(0.15, 0.008, 0.14, tones.metal, 0.004), [0, 0.004, -0.04]));
    mac.add(place(box(0.28, 0.008, 0.11, tones.metal, 0.004), [0, 0.004, 0.25]));
    for (let r = 0; r < 4; r++) mac.add(place(box(0.25, 0.002, 0.016, tones.key, 0.001), [0, 0.009, 0.215 + r * 0.022]));
    mac.add(place(box(0.15, 0.006, 0.1, tones.metal, 0.004), [0.25, 0.003, 0.25]));
    group.add(place(mac, [-0.16, 0, -0.17]));
    return { shown, body: mac };
}

function stand(phoneW, phoneH, texture, tilt) {
    const group = new THREE.Group();
    group.add(place(box(phoneW * 0.8, 0.006, 0.06, tones.dark, 0.003), [0, 0.003, 0]));
    group.add(place(box(phoneW * 0.5, 0.05, 0.004, tones.dark, 0.002), [0, 0.026, -0.018], [-tilt, 0, 0]));
    const phone = new THREE.Group();
    phone.add(box(phoneW, phoneH, 0.008, tones.dark, 0.006));
    const shown = screenPlane(phoneW - 0.008, phoneH - 0.008, texture);
    phone.add(place(shown, [0, 0, 0.0042]));
    group.add(place(phone, [0, phoneH / 2 + 0.004, 0.006], [-tilt, 0, 0]));
    return { group, shown, body: phone };
}

// The folding phone half open, like a small laptop: one half flat, the other opened past upright.
function foldingPhone(texture, keys) {
    const group = new THREE.Group();
    const w = 0.118, d = 0.082, open = THREE.MathUtils.degToRad(105);
    group.add(place(box(w, 0.006, d, tones.dark, 0.004), [0, 0.003, 0]));
    group.add(place(screenPlane(w - 0.006, d - 0.006, keys), [0, 0.0062, 0], [-Math.PI / 2, 0, 0]));
    const lid = new THREE.Group();
    lid.add(place(box(w, d, 0.006, tones.dark, 0.004), [0, d / 2, 0]));
    const shown = screenPlane(w - 0.006, d - 0.006, texture);
    lid.add(place(shown, [0, d / 2, 0.0032]));
    group.add(place(lid, [0, 0.006, -d / 2], [Math.PI / 2 - open, 0, 0]));
    return { group, shown };
}

function tabletOnKeyboard(group, texture) {
    const tablet = new THREE.Group();
    tablet.add(place(box(0.248, 0.008, 0.195, tones.metal, 0.004), [0, 0.004, 0]));
    tablet.add(place(box(0.225, 0.002, 0.085, tones.key, 0.002), [0, 0.0085, -0.035]));
    tablet.add(place(box(0.1, 0.002, 0.06, tones.key, 0.002), [0, 0.0085, 0.055]));
    tablet.add(place(box(0.248, 0.1, 0.006, tones.metal, 0.003), [0, 0.06, -0.09], [-0.28, 0, 0]));
    const slate = new THREE.Group();
    slate.add(box(0.25, 0.178, 0.0055, tones.dark, 0.008));
    const shown = screenPlane(0.232, 0.174, texture);
    slate.add(place(shown, [0, 0, 0.0029]));
    tablet.add(place(slate, [0, 0.112, -0.072], [-0.3, 0, 0]));
    group.add(place(tablet, [0.47, 0, 0.02], [0, -0.32, 0]));
    return { shown, body: tablet };
}

function things(group) {
    const mug = new THREE.Group();
    mug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.037, 0.095, 32, 1, true), solid(tones.mug)));
    mug.add(place(new THREE.Mesh(new THREE.CircleGeometry(0.037, 32), solid(0.45)), [0, 0.035, 0], [-Math.PI / 2, 0, 0]));
    mug.add(place(new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.007, 10, 24, Math.PI), solid(tones.mug)), [0.04, 0, 0], [0, 0, -Math.PI / 2]));
    group.add(place(mug, [0.17, 0.0475, 0.27]));
    const book = new THREE.Group();
    book.add(place(box(0.15, 0.014, 0.21, tones.paper, 0.003), [0, 0.007, 0]));
    book.add(place(box(0.151, 0.004, 0.211, 0.55, 0.002), [0, 0.016, 0]));
    group.add(place(book, [-0.62, 0, 0.24], [0, 0.35, 0]));
    const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.17, 6), solid(0.7));
    group.add(place(pencil, [-0.5, 0.004, 0.27], [0, 0.2, Math.PI / 2]));
}

/**
 * Builds the desk into `scene` with the pictures from screens.js. Returns the screens, by name,
 * for the camera path, and each device's body, which props.js can swap for another model.
 */
export function buildDesk(scene, pictures) {
    // Each drawn screen's picture, drawn for its shape.
    const picture = (name, w, h) => {
        const texture = new THREE.CanvasTexture(pictures[name](w / h));
        texture.anisotropy = 8;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        return texture;
    };
    const textures = {
        mac: picture('mac', 0.5, 0.28125), ipad: picture('ipad', 0.232, 0.174), iphone: picture('iphone', 0.0635, 0.139),
        duo: picture('duo', 0.112, 0.076), duoKeys: picture('duoKeys', 0.112, 0.076),
    };
    const group = new THREE.Group();
    const wall = room(group);
    const { tower, mini } = towerAndBox(group);
    const visionPro = headset(group);
    const mac = allInOne(group, textures.mac);
    const duo = foldingPhone(textures.duo, textures.duoKeys);
    group.add(place(duo.group, [0.2, 0, -0.08], [0, -0.35, 0]));
    const ipad = tabletOnKeyboard(group, textures.ipad);
    const phone = stand(0.0715, 0.147, textures.iphone, 0.22);
    group.add(place(phone.group, [0.75, 0, 0.1], [0, -0.55, 0]));
    things(group);
    scene.add(group);
    scene.updateMatrixWorld(true);
    return {
        wall, mac: mac.shown, duo: duo.shown, ipad: ipad.shown, iphone: phone.shown,
        bodies: { macPro: tower, macMini: mini, visionPro, mac: mac.body, duo: duo.group, ipad: ipad.body, iphone: phone.body },
    };
}
