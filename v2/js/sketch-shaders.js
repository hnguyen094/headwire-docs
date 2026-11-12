// The sketch's shaders (sketch.js): the geometry pass, which draws every mesh's shade and kind
// into one target and its normal and depth into another, and the full-screen pass, which turns
// those into wobbly ink outlines, hatching by tone and a paper grain.

// Depth is packed into 16 bits from the camera to its far plane, `far`, which follows the camera
// back as a narrow screen backs the wide shots off (path.js).

export const geometryVertex = /* glsl */ `
in vec3 position;
in vec3 normal;
in vec2 uv;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform mat3 uvTransform;
out vec3 vViewNormal;
out vec3 vWorldNormal;
out float vDepth;
out vec2 vUv;
void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vViewNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vDepth = -view.z;
    vUv = (uvTransform * vec3(uv, 1.0)).xy;
    gl_Position = projectionMatrix * view;
}`;

export const geometryFragment = /* glsl */ `
precision highp float;
in vec3 vViewNormal;
in vec3 vWorldNormal;
in float vDepth;
in vec2 vUv;
uniform float tone;
uniform float kind;
uniform sampler2D map;
uniform vec3 lightDir;
uniform float far;
layout(location = 0) out vec4 gShade;
layout(location = 1) out vec4 gData;
vec2 packDepth(float d) {
    float v = clamp(d / far, 0.0, 1.0) * 65535.0;
    return vec2(floor(v / 256.0), mod(floor(v), 256.0)) / 255.0;
}
void main() {
    vec3 n = normalize(vViewNormal);
    if (!gl_FrontFacing) n = -n;
    vec3 shade;
    if (kind > 0.5 && kind < 1.5) {
        shade = texture(map, vUv).rgb;
    } else {
        vec3 w = normalize(vWorldNormal);
        if (!gl_FrontFacing) w = -w;
        float lambert = max(dot(w, normalize(lightDir)), 0.0);
        float sky = 0.5 + 0.5 * w.y;
        shade = vec3(tone * (0.44 + 0.42 * lambert + 0.2 * sky));
    }
    // Kind 2 is the room behind the desk: a solid to the sketch, and a backdrop to Standard (glass.js).
    gShade = vec4(shade, kind > 1.5 ? 0.85 : kind > 0.5 ? 0.5 : 1.0);
    gData = vec4(n.xy * 0.5 + 0.5, packDepth(vDepth));
}`;

export const postVertex = /* glsl */ `
in vec3 position;
out vec2 vUv;
void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const postFragment = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tShade;
uniform sampler2D tData;
uniform vec2 resolution;
uniform float pixel;
uniform float boil;
uniform vec3 ink;
uniform vec3 paper;
uniform vec3 screenInk;
uniform float night;
uniform float paperShift;
uniform float grain;
uniform float far;
out vec4 outColor;

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
}
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
    vec2 frag = vUv * resolution;
    vec2 css = frag / pixel;
    float tick = boil;

    // The paper: warm, with a fine tooth and a few soft fibres. By day the grain darkens the paper
    // a little; at night it lifts graphite paper in pale specks and streaks, as light catches its
    // tooth, which a darkening can't show on paper so dark (the page's graphite.svg, alike).
    // The paper's grain slides with the scroll at its share of the copy's pace (paper.js).
    vec2 paperAt = css - vec2(0.0, paperShift);
    float tooth = fbm(paperAt * 0.9);
    float fibre = smoothstep(0.62, 0.9, noise(vec2(paperAt.x * 0.02, paperAt.y * 0.4))) * 0.5;
    float blotch = fbm(paperAt * 0.004);
    vec3 base = paper * mix(1.0, 0.955 + 0.06 * tooth - 0.02 * fibre + 0.03 * (blotch - 0.5), grain);
    base += night * grain * (0.26 * max(tooth - 0.42, 0.0) + 0.08 * fibre + 0.05 * (blotch - 0.5)) * vec3(0.9, 0.89, 0.86);

    vec4 shade = texture(tShade, vUv);
    float kind = shade.a;
    vec3 color = base;

    // Hatching on solid surfaces, denser as they get darker.
    if (kind > 0.75) {
        float lum = dot(shade.rgb, vec3(0.299, 0.587, 0.114));
        float jitter = (noise(css * 0.05 + tick) - 0.5) * 0.06;
        float l = lum + jitter;
        float h = 0.0;
        h = max(h, hatch(css, 0.785, 6.5, 1.0) * (1.0 - smoothstep(0.66, 0.74, l)));
        h = max(h, hatch(css, -0.785, 6.5, 2.0) * (1.0 - smoothstep(0.46, 0.54, l)) * 0.9);
        h = max(h, hatch(css, 0.2, 4.5, 3.0) * (1.0 - smoothstep(0.26, 0.34, l)) * 0.85);
        color = mix(color, color * mix(0.86, 1.0, smoothstep(0.2, 0.9, l)), 0.6);
        // Chalk at night goes over the shadows more lightly than pencil does by day.
        color = mix(color, ink, h * mix(0.55, 0.38, night) * mix(1.0, 0.8 + 0.2 * tooth, grain));
    } else if (kind > 0.25) {
        // A screen: the real picture, a little muted, printed onto the paper by day and glowing a
        // little dimmed off the dark paper at night.
        vec3 c = shade.rgb;
        float g = dot(c, vec3(0.299, 0.587, 0.114));
        c = mix(vec3(g), c, 0.82);
        c = mix(screenInk, vec3(1.0), smoothstep(0.0, 1.0, c));
        vec3 sheet = mix(base, vec3(1.0), mix(0.55, 1.0, night)) * mix(1.0, 0.8, night);
        color = sheet * mix(vec3(1.0), c, 0.96);
    }

    // Outlines: two passes, each pushed about by its own boiling noise, so a line wobbles and
    // sometimes doubles like a pencil going over it twice.
    float wobble = 1.6 * pixel;
    vec2 n1 = vec2(noise(css * 0.035 + tick * 7.1), noise(css * 0.035 + 41.0 + tick * 7.1)) - 0.5;
    vec2 n2 = vec2(noise(css * 0.05 + 93.0 + tick * 5.3), noise(css * 0.05 + 7.0 + tick * 5.3)) - 0.5;
    float e1 = edge(vUv + n1 * wobble * 2.0 / resolution, 1.0 * pixel);
    float e2 = edge(vUv + n2 * wobble * 2.6 / resolution, 1.3 * pixel);
    float pressure = 0.55 + 0.45 * smoothstep(0.2, 0.7, noise(css * 0.02 + tick * 3.0));
    float line = max(e1 * pressure, e2 * 0.45);
    color = mix(color, ink, clamp(line, 0.0, 1.0) * mix(1.0, 0.82 + 0.18 * tooth, grain));

    outColor = vec4(color, 1.0);
}`;
