// The shaders of Sketch's cached layers (layers.js): the paper, its grain drawn once for a stretch
// of the scroll; the boil, the hatching and the outlines' wobble drawn once per boil tick; and the
// edges, where the outlines pass, drawn each frame at a CSS pixel's resolution, the step their
// kernel takes anyway. The full-screen pass (sketch-shaders.js) reads them rather than working each
// out at every device pixel.

/** Value noise and its fractal sum, shared by the layers and the full-screen pass. */
export const noiseChunk = /* glsl */ `
float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return v;
}`;

// The paper, a strip twice the screen's height whose bottom row is the paper's `origin` CSS pixels
// up: warm, with a fine tooth and a few soft fibres. By day the grain darkens the paper a little;
// at night it lifts graphite paper in pale specks and streaks, as light catches its tooth, which a
// darkening can't show on paper so dark (the page's graphite.svg, alike). The tooth goes in alpha,
// for the pencil's pressure.
export const paperFragment = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform vec2 resolution;
uniform float pixel;
uniform float origin;
uniform vec3 paper;
uniform float night;
uniform float grain;
out vec4 outColor;
${noiseChunk}
void main() {
    vec2 paperAt = vUv * resolution / pixel + vec2(0.0, origin);
    float tooth = fbm(paperAt * 0.9);
    float fibre = smoothstep(0.62, 0.9, noise(vec2(paperAt.x * 0.02, paperAt.y * 0.4))) * 0.5;
    float blotch = fbm(paperAt * 0.004);
    vec3 base = paper * mix(1.0, 0.955 + 0.06 * tooth - 0.02 * fibre + 0.03 * (blotch - 0.5), grain);
    base += night * grain * (0.26 * max(tooth - 0.42, 0.0) + 0.08 * fibre + 0.05 * (blotch - 0.5)) * vec3(0.9, 0.89, 0.86);
    outColor = vec4(base, tooth);
}`;

// The boil at tick `boil`: the three sets of hatching, each line's ink before the tone picks it,
// and the two outline passes' wobble, each pushed about by its own boiling noise.
export const boilFragment = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform vec2 resolution;
uniform float pixel;
uniform float boil;
layout(location = 0) out vec4 outHatch;
layout(location = 1) out vec4 outWobble;
${noiseChunk}
// One set of hatching lines across the paper at angle a, spacing s CSS pixels apart.
float hatch(vec2 p, float a, float s, float seed) {
    vec2 r = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
    float wob = (noise(r * 0.018 + seed + boil * 0.37) - 0.5) * 0.9;
    float v = r.y / s + wob;
    float d = abs(fract(v) - 0.5) * s;
    float line = 1.0 - smoothstep(0.35, 1.05, d);
    float stroke = smoothstep(0.25, 0.45, noise(vec2(r.x * 0.012, floor(v) * 3.7 + seed)));
    return line * stroke;
}
void main() {
    vec2 css = vUv * resolution / pixel;
    float tick = boil;
    outHatch = vec4(hatch(css, 0.785, 6.5, 1.0), hatch(css, -0.785, 6.5, 2.0), hatch(css, 0.2, 4.5, 3.0),
        noise(css * 0.02 + tick * 3.0));
    outWobble = vec4(noise(css * 0.035 + tick * 7.1), noise(css * 0.035 + 41.0 + tick * 7.1),
        noise(css * 0.05 + 93.0 + tick * 5.3), noise(css * 0.05 + 7.0 + tick * 5.3));
}`;

// The edges: how strongly an outline passes through each CSS pixel, for the two outline passes'
// spreads, a CSS pixel and 1.3. The full-screen pass reads them where its wobble pushes each line.
export const edgeFragment = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tShade;
uniform sampler2D tData;
uniform vec2 resolution;
uniform float pixel;
uniform float far;
out vec4 outEdges;
float depthAt(vec2 uv) {
    vec4 d = texture(tData, uv);
    float raw = (d.z * 255.0 * 256.0 + d.w * 255.0) / 65535.0;
    return raw * far;
}
vec3 normalAt(vec2 uv) {
    vec2 xy = texture(tData, uv).xy * 2.0 - 1.0;
    return vec3(xy, sqrt(max(1.0 - dot(xy, xy), 0.0)));
}
float kindAt(vec2 uv) { return texture(tShade, uv).a; }
float toneAt(vec2 uv) { return dot(texture(tShade, uv).rgb, vec3(0.299, 0.587, 0.114)); }

// How strongly an outline passes through uv: jumps in depth, bends in the surface, where a screen
// meets its frame, and where one surface's tone meets another's on a flat face, such as a logo.
float edge(vec2 uv, float spread) {
    vec2 px = spread / resolution;
    float d0 = depthAt(uv);
    vec3 n0 = normalAt(uv);
    float k0 = kindAt(uv);
    float t0 = toneAt(uv);
    float e = 0.0;
    for (int i = 0; i < 4; i++) {
        vec2 o = i == 0 ? vec2(px.x, 0) : i == 1 ? vec2(0, px.y) : i == 2 ? vec2(px.x, px.y) : vec2(-px.x, px.y);
        float da = depthAt(uv + o), db = depthAt(uv - o);
        float ref = max(min(d0, min(da, db)), 0.05);
        float lap = abs(da + db - 2.0 * d0) / ref;
        float slope = abs(da - db) / ref;
        e = max(e, smoothstep(0.035, 0.09, max(lap * 1.4, slope * 0.5)));
        float bend = 1.0 - min(dot(n0, normalAt(uv + o)), dot(n0, normalAt(uv - o)));
        e = max(e, smoothstep(0.12, 0.3, bend));
        e = max(e, step(0.2, abs(kindAt(uv + o) - k0) + abs(kindAt(uv - o) - k0)));
        if (k0 > 0.75) e = max(e, smoothstep(0.05, 0.11, max(abs(toneAt(uv + o) - t0), abs(toneAt(uv - o) - t0))));
    }
    return e;
}

void main() {
    outEdges = vec4(edge(vUv, 1.0 * pixel), 0.0, 0.0, 1.0);
}`;
