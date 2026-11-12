// The desk, in metres, with y up and the desk top at y = 0 and the floor at y = -0.74. The drawn
// devices (a tower on the floor, a small box, an all-in-one display, a headset, a folding phone, a
// tablet on a keyboard and a phone) are what the page shows when Apple's models don't load
// (props.js): plain shapes with no maker's details, sized like the real ones. Each screen is a plane of its own that
// shows its picture; `screens` names where each one is so the camera can frame it.
import * as THREE from 'three';
import { solid, backdrop } from './sketch.js';
import { tones, box, place } from './shapes.js';
import { allInOne, stand, foldingPhone, tabletOnKeyboard } from './devices.js';

function room(group) {
    group.add(place(box([1.9, 0.04, 0.82, 0.006], tones.desk), [0, -0.02, 0]));
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), backdrop(tones.wall));
    group.add(place(wall, [0, 0.7, -0.42]));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), backdrop(0.9));
    group.add(place(floor, [0, -0.74, 0.8], [-Math.PI / 2, 0, 0]));
    for (const x of [-0.9, 0.9]) group.add(place(box([0.04, 0.72, 0.7], tones.metal), [x * 0.96, -0.4, 0]));
    return wall;
}

// The tower stands on the floor beside the desk; the small box sits on the desk under the left of
// the all-in-one's display.
function towerAndBox(group) {
    const tower = new THREE.Group();
    tower.add(place(box([0.21, 0.52, 0.44, 0.012], tones.metal), [0, 0.26, 0]));
    tower.add(place(box([0.17, 0.006, 0.003], tones.dark), [0, 0.46, 0.221]));
    for (const x of [-0.07, 0.07]) tower.add(place(box([0.02, 0.012, 0.36], tones.dark), [x, 0.006, 0]));
    group.add(place(tower, [-1.17, -0.74, -0.02], [0, 0.3, 0]));
    const mini = new THREE.Group();
    mini.add(place(box([0.127, 0.036, 0.127, 0.012], tones.metal), [0, 0.018, 0]));
    mini.add(place(box([0.03, 0.002, 0.002], tones.dark), [-0.03, 0.012, 0.064]));
    group.add(place(mini, [-0.36, 0, -0.13]));
    return { tower, mini };
}

// A headset resting on the desk: its curved front, the light seal behind it, and the band.
function headset(group) {
    const visor = new THREE.Group();
    const front = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 32, 1, false, -0.85, 1.7), solid(tones.dark));
    visor.add(place(front, [0, 0.05, -0.06]));
    visor.add(place(box([0.17, 0.075, 0.03, 0.012], tones.metal), [0, 0.05, -0.005]));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 32, Math.PI), solid(tones.key));
    visor.add(place(band, [0, 0.012, -0.075], [-Math.PI / 2, 0, 0]));
    group.add(place(visor, [-0.62, 0, -0.12], [0, 0.2, 0]));
    return visor;
}

function things(group) {
    const mug = new THREE.Group();
    mug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.037, 0.095, 32, 1, true), solid(tones.mug)));
    mug.add(place(new THREE.Mesh(new THREE.CircleGeometry(0.037, 32), solid(0.45)), [0, 0.035, 0], [-Math.PI / 2, 0, 0]));
    mug.add(place(new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.007, 10, 24, Math.PI), solid(tones.mug)), [0.04, 0, 0], [0, 0, -Math.PI / 2]));
    group.add(place(mug, [0.17, 0.0475, 0.27]));
    const book = new THREE.Group();
    book.add(place(box([0.15, 0.014, 0.21, 0.003], tones.paper), [0, 0.007, 0]));
    book.add(place(box([0.151, 0.004, 0.211, 0.002], 0.55), [0, 0.016, 0]));
    group.add(place(book, [-0.62, 0, 0.24], [0, 0.35, 0]));
    const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.17, 6), solid(0.7));
    group.add(place(pencil, [-0.5, 0.004, 0.27], [0, 0.2, Math.PI / 2]));
}

/**
 * Builds the desk into `scene` with the pictures from screens.js. Returns the screens, by name,
 * for the camera path; each device's body, which props.js can swap for another model; and each
 * picture's texture, by name, which a model's display can take over.
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
    const phone = stand([0.0715, 0.147], textures.iphone, 0.22);
    group.add(place(phone.group, [0.75, 0, 0.1], [0, -0.55, 0]));
    things(group);
    scene.add(group);
    scene.updateMatrixWorld(true);
    return {
        wall, mac: mac.shown, duo: duo.shown, ipad: ipad.shown, iphone: phone.shown, textures,
        bodies: { macPro: tower, macMini: mini, visionPro, mac: mac.body, duo: duo.group, ipad: ipad.body, iphone: phone.body },
    };
}
