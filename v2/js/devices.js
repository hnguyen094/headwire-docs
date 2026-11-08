// The drawn devices with screens, each built round the plane that shows its picture: the
// all-in-one, a phone in a stand, the folding phone and the tablet on its keyboard (scene.js puts
// them on the desk).
import * as THREE from 'three';
import { tones, box, place, screenPlane } from './shapes.js';

export function allInOne(group, texture) {
    const mac = new THREE.Group();
    const panel = box([0.54, 0.35, 0.012, 0.008], tones.metal);
    mac.add(place(panel, [0, 0.285, 0]));
    mac.add(place(box([0.524, 0.302, 0.002, 0.003], tones.dark), [0, 0.296, 0.0062]));
    const shown = screenPlane(0.5, 0.28125, texture);
    mac.add(place(shown, [0, 0.296, 0.0075]));
    mac.add(place(box([0.15, 0.17, 0.01, 0.004], tones.metal), [0, 0.12, -0.05], [-0.36, 0, 0]));
    mac.add(place(box([0.15, 0.008, 0.14, 0.004], tones.metal), [0, 0.004, -0.04]));
    mac.add(place(box([0.28, 0.008, 0.11, 0.004], tones.metal), [0, 0.004, 0.25]));
    for (let r = 0; r < 4; r++) mac.add(place(box([0.25, 0.002, 0.016, 0.001], tones.key), [0, 0.009, 0.215 + r * 0.022]));
    mac.add(place(box([0.15, 0.006, 0.1, 0.004], tones.metal), [0.25, 0.003, 0.25]));
    group.add(place(mac, [-0.16, 0, -0.17]));
    return { shown, body: mac };
}

// A phone [w, h] showing `texture`, leaning back by `tilt` in a stand.
export function stand([phoneW, phoneH], texture, tilt) {
    const group = new THREE.Group();
    group.add(place(box([phoneW * 0.8, 0.006, 0.06, 0.003], tones.dark), [0, 0.003, 0]));
    group.add(place(box([phoneW * 0.5, 0.05, 0.004, 0.002], tones.dark), [0, 0.026, -0.018], [-tilt, 0, 0]));
    const phone = new THREE.Group();
    phone.add(box([phoneW, phoneH, 0.008, 0.006], tones.dark));
    const shown = screenPlane(phoneW - 0.008, phoneH - 0.008, texture);
    phone.add(place(shown, [0, 0, 0.0042]));
    group.add(place(phone, [0, phoneH / 2 + 0.004, 0.006], [-tilt, 0, 0]));
    return { group, shown, body: phone };
}

// The folding phone half open, like a small laptop: one half flat, the other opened past upright.
export function foldingPhone(texture, keys) {
    const group = new THREE.Group();
    const w = 0.118, d = 0.082, open = THREE.MathUtils.degToRad(105);
    group.add(place(box([w, 0.006, d, 0.004], tones.dark), [0, 0.003, 0]));
    group.add(place(screenPlane(w - 0.006, d - 0.006, keys), [0, 0.0062, 0], [-Math.PI / 2, 0, 0]));
    const lid = new THREE.Group();
    lid.add(place(box([w, d, 0.006, 0.004], tones.dark), [0, d / 2, 0]));
    const shown = screenPlane(w - 0.006, d - 0.006, texture);
    lid.add(place(shown, [0, d / 2, 0.0032]));
    group.add(place(lid, [0, 0.006, -d / 2], [Math.PI / 2 - open, 0, 0]));
    return { group, shown };
}

export function tabletOnKeyboard(group, texture) {
    const tablet = new THREE.Group();
    tablet.add(place(box([0.248, 0.008, 0.195, 0.004], tones.metal), [0, 0.004, 0]));
    tablet.add(place(box([0.225, 0.002, 0.085, 0.002], tones.key), [0, 0.0085, -0.035]));
    tablet.add(place(box([0.1, 0.002, 0.06, 0.002], tones.key), [0, 0.0085, 0.055]));
    tablet.add(place(box([0.248, 0.1, 0.006, 0.003], tones.metal), [0, 0.06, -0.09], [-0.28, 0, 0]));
    const slate = new THREE.Group();
    slate.add(box([0.25, 0.178, 0.0055, 0.008], tones.dark));
    const shown = screenPlane(0.232, 0.174, texture);
    slate.add(place(shown, [0, 0, 0.0029]));
    tablet.add(place(slate, [0, 0.112, -0.072], [-0.3, 0, 0]));
    group.add(place(tablet, [0.47, 0, 0.02], [0, -0.32, 0]));
    return { shown, body: tablet };
}
