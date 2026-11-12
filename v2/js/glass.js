// Standard's look for the drawing: the sketch's geometry pass (sketch.js) drawn clean by
// glass-shaders.js, in colours by colour scheme that match the page's own (themes.css).
import * as THREE from 'three';
import { postVertex } from './sketch-shaders.js';
import { glassFragment } from './glass-shaders.js';

/**
 * The wash's gradient, its glows' colours and how far at most they tint it, the satin surfaces from `shadow` to `lit`, and the outlines'
 * `ink`, as they reach the canvas. `night` dims the screens a little and firms the outlines.
 */
export const glassPalettes = {
    light: { top: 0xfbfbfd, bottom: 0xe9e9ee, glowA: 0xbfd0fa, glowB: 0xf6d2e2, glowAmount: 0.6, shadow: 0x8e929c, lit: 0xfafafc, ink: 0x1d1d1f, night: 0 },
    dark: { top: 0x15151d, bottom: 0x09090d, glowA: 0x26337a, glowB: 0x3c1a48, glowAmount: 0.55, shadow: 0x0c0c10, lit: 0x5a5c66, ink: 0x000000, night: 1 },
};

// Where the glows sit, in screen heights from the bottom, before any scroll, and how far each
// rises per screen height the background has moved: glowA nearer, so faster.
const GLOWS = { glowAAt: { x: 0.12, y: 0.92, rate: 0.3 }, glowBAt: { x: 0.9, y: 0.62, rate: 0.18 } };

/**
 * Each glow's centre, [x, y] across and up the screen from its bottom left, once the background has
 * moved `drift` screen heights: rising with it and wrapped into the screen, where the shader draws
 * it again a screen above and below, so a glow never leaves however long the page.
 */
export function glowCentres(drift) {
    return Object.values(GLOWS).map(({ x, y, rate }) => {
        const at = y + drift * rate;
        return [x, at - Math.floor(at)];
    });
}

/**
 * Moves `material`'s background `drift` screen heights: the one value it keeps for the offset,
 * which its glows' centres follow.
 */
export function setGlassDrift(material, drift) {
    material.userData.drift = drift;
    glowCentres(drift).forEach(([x, y], i) => material.uniforms[Object.keys(GLOWS)[i]].value.set(x, y));
}

/** How far `material`'s background has moved, in screen heights, and where its glows are drawn. */
export const glassDrift = (material) => ({
    drift: material.userData.drift ?? 0,
    glows: Object.keys(GLOWS).map((name) => material.uniforms[name].value.toArray()),
});

/** The pass's material over `target`'s two textures, sharing the sketch's `far`. */
export function glassMaterial(target, far) {
    const color = () => ({ value: new THREE.Color() });
    return new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: postVertex,
        fragmentShader: glassFragment,
        uniforms: {
            tShade: { value: target.textures[0] },
            tData: { value: target.textures[1] },
            resolution: { value: new THREE.Vector2(1, 1) },
            pixel: { value: 1 },
            far,
            top: color(), bottom: color(), glowA: color(), glowB: color(), shadow: color(), lit: color(), ink: color(),
            glowAmount: { value: 0 },
            night: { value: 0 },
            glowAAt: { value: new THREE.Vector2(GLOWS.glowAAt.x, GLOWS.glowAAt.y) },
            glowBAt: { value: new THREE.Vector2(GLOWS.glowBAt.x, GLOWS.glowBAt.y) },
        },
        depthTest: false,
        depthWrite: false,
    });
}

/** Sets `material`'s colours to glassPalettes[scheme]. */
export function setGlassScheme(material, scheme) {
    for (const [name, value] of Object.entries(glassPalettes[scheme])) {
        const uniform = material.uniforms[name];
        if (uniform.value instanceof THREE.Color) uniform.value.setHex(value, THREE.NoColorSpace);
        else uniform.value = value;
    }
}
