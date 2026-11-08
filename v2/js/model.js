// Apple's device models readied for the sketch: greyed to its tones, sized and stood in their
// drawn bodies' places, and drawn with one draw call per tone.
import * as THREE from 'three';
import { solid } from './sketch.js';

/** The half a folding phone's mesh is on, from the group v2-props.sh tagged its node with. */
export function groupOf(node) {
    for (let at = node; at; at = at.parent) if (at.userData?.group) return at.userData.group;
    return null;
}

/** Draws each mesh in the sketch's grey at its own colour's lightness. */
export function regrey(root) {
    root.traverse((node) => {
        if (!node.isMesh) return;
        const color = node.material?.color;
        const tone = color ? 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b : 0.5;
        node.material = solid(Math.min(Math.max(Math.pow(tone, 1 / 2.2), 0.12), 0.97));
    });
}

/** Draws the meshes `names` names darker, so a logo nearly the body's own tone still reads. */
export function darken(model, names) {
    model.traverse((node) => {
        if (node.isMesh && (names.includes(node.name) || names.includes(node.parent?.name))) node.material = solid(0.35);
    });
}

/** Metres, turned, and stood on the floor or centred, in a holder placed at `prop.at`. */
export function normalise(model, prop) {
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

/**
 * Leaves out the clear glass (v2-props.py marks it), which would otherwise be drawn as solid and
 * cover the display. Everything else stays, so the body reads as solid.
 */
export function clearGlass(model) {
    model.traverse((node) => {
        if (node.isMesh && (node.userData?.glass || node.parent?.userData?.glass)) node.visible = false;
    });
}

/** Hides the drawn body's own meshes, its screens among them. */
export function hideBody(body) {
    body.traverse((node) => {
        if (node.isMesh) node.visible = false;
    });
}

/**
 * Rests a model leaning in a stand on the stand's base: moves its body up or down until the
 * model's lowest point is on the base's top, 6.5 mm above the desk, so it never cuts into it.
 */
export function seat(holder, body) {
    const box = new THREE.Box3().setFromObject(holder);
    body.position.y += 0.0065 - box.min.y;
    body.updateMatrixWorld(true);
}

// Each solid mesh the page draws, by tone: shown, with every parent shown, and not a screen.
function solidsByTone(holder) {
    const tones = new Map();
    holder.traverseVisible((node) => {
        const uniforms = node.isMesh && node.material.uniforms;
        if (!uniforms || uniforms.kind.value) return;
        const tone = uniforms.tone.value;
        tones.set(tone, [...(tones.get(tone) ?? []), node]);
    });
    return tones;
}

// One geometry of the meshes' positions and normals, in `frame`'s space. A mirrored mesh's
// triangles are wound the other way, so each keeps facing the way it did.
function merged(meshes, frame) {
    const counts = meshes.map(({ geometry }) => [geometry.attributes.position.count, geometry.index?.count ?? geometry.attributes.position.count]);
    const positions = new Float32Array(counts.reduce((sum, [n]) => sum + n * 3, 0));
    const normals = new Float32Array(positions.length);
    const indices = new Uint32Array(counts.reduce((sum, [, n]) => sum + n, 0));
    const v = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
    let base = 0, at = 0;
    meshes.forEach(({ geometry, matrixWorld }, m) => {
        const { position, normal } = geometry.attributes;
        const matrix = frame.clone().multiply(matrixWorld);
        normalMatrix.getNormalMatrix(matrix);
        for (let i = 0; i < position.count; i++) {
            v.fromBufferAttribute(position, i).applyMatrix4(matrix).toArray(positions, (base + i) * 3);
            if (normal) v.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize().toArray(normals, (base + i) * 3);
            else normals[(base + i) * 3 + 1] = 1;
        }
        const mirrored = matrix.determinant() < 0;
        for (let i = 0; i < counts[m][1]; i++) {
            const k = mirrored ? i - (i % 3) + [0, 2, 1][i % 3] : i;
            indices[at + i] = base + (geometry.index ? geometry.index.getX(k) : k);
        }
        base += position.count;
        at += counts[m][1];
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    return geometry;
}

const unseen = new THREE.MeshBasicMaterial({ visible: false });

/**
 * Draws all of a placed model's solid meshes of one tone as one mesh, so a model of a hundred
 * meshes costs a draw call per tone. The meshes stay in place, unseen, for what finds them by
 * name; their geometry goes.
 */
export function mergeByTone(holder) {
    holder.updateMatrixWorld(true);
    const frame = holder.matrixWorld.clone().invert();
    for (const [tone, meshes] of solidsByTone(holder)) {
        if (meshes.length < 2) continue;
        holder.add(new THREE.Mesh(merged(meshes, frame), solid(tone)));
        for (const mesh of meshes) {
            mesh.geometry.dispose();
            mesh.geometry = new THREE.BufferGeometry();
            mesh.material = unseen;
        }
    }
    holder.updateMatrixWorld(true);
}
