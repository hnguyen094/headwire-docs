// Standard's look for the drawing: the sketch's geometry pass (sketch.js) drawn as line work on a
// plain ground by lines-shaders.js, in colours by colour scheme that match the page's own
// (themes.css).
import * as THREE from 'three';
import { postVertex } from './sketch-shaders.js';
import { linesFragment, smoothFragment } from './lines-shaders.js';

/**
 * The ground, the solids' lit face and the line work's `line`, as they reach the canvas. `night`
 * dims the screens a little.
 */
export const linesPalettes = {
    light: { ground: 0xfbfbfc, solid: 0xeef0f4, line: 0x0a0c14, night: 0 },
    dark: { ground: 0x04050a, solid: 0x161a22, line: 0xe8ecf4, night: 1 },
};

/** The pass's material over `target`'s two textures, sharing the sketch's `far`. */
export function linesMaterial(target, far) {
    const color = () => ({ value: new THREE.Color() });
    return new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: postVertex,
        fragmentShader: linesFragment,
        uniforms: {
            tShade: { value: target.textures[0] },
            tData: { value: target.textures[1] },
            resolution: { value: new THREE.Vector2(1, 1) },
            pixel: { value: 1 },
            far,
            ground: color(), solid: color(), line: color(),
            night: { value: 0 },
        },
        depthTest: false,
        depthWrite: false,
    });
}

/**
 * The smoothing that follows the line work for `renderer`: `target`, the line work's own target,
 * which the full-screen pass draws into; `resize(width, height)` in device pixels; and `draw()`,
 * which draws the line work smoothed onto the canvas.
 */
export function createSmoothing(renderer) {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    const material = new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: postVertex,
        fragmentShader: smoothFragment,
        uniforms: { tColor: { value: target.texture }, resolution: { value: new THREE.Vector2(1, 1) } },
        depthTest: false,
        depthWrite: false,
    });
    const triangle = new THREE.BufferGeometry();
    triangle.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const mesh = new THREE.Mesh(triangle, material);
    mesh.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(mesh);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return {
        target,
        resize(width, height) {
            target.setSize(width, height);
            material.uniforms.resolution.value.set(width, height);
        },
        draw() {
            renderer.setRenderTarget(null);
            renderer.render(scene, camera);
        },
    };
}

/** Sets `material`'s colours to linesPalettes[scheme]. */
export function setLinesScheme(material, scheme) {
    for (const [name, value] of Object.entries(linesPalettes[scheme])) {
        const uniform = material.uniforms[name];
        if (uniform.value instanceof THREE.Color) uniform.value.setHex(value, THREE.NoColorSpace);
        else uniform.value = value;
    }
}
