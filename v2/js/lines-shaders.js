// Standard's full-screen pass (lines.js): the same two targets the sketch's geometry pass fills
// (sketch-shaders.js), drawn as line work on a plain ground, then smoothed. The desk is near the
// ground's colour, its silhouettes and creases fine lines in the line colour; screens show their
// picture.

export const linesFragment = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tShade;
uniform sampler2D tData;
uniform vec2 resolution;
uniform float pixel;
uniform float far;
uniform vec3 ground;
uniform vec3 solid;
uniform vec3 line;
uniform float night;
out vec4 outColor;

float depthAt(vec2 uv) {
    vec4 d = texture(tData, uv);
    return (d.z * 255.0 * 256.0 + d.w * 255.0) / 65535.0 * far;
}
vec3 normalAt(vec2 uv) {
    vec2 xy = texture(tData, uv).xy * 2.0 - 1.0;
    return vec3(xy, sqrt(max(1.0 - dot(xy, xy), 0.0)));
}

// Where a silhouette or a crease passes through uv: jumps in depth and bends in the surface,
// creases picked up early, so the desk reads as line work.
float edge(vec2 uv) {
    vec2 px = pixel / resolution;
    float d0 = depthAt(uv);
    vec3 n0 = normalAt(uv);
    float e = 0.0;
    for (int i = 0; i < 2; i++) {
        vec2 o = i == 0 ? vec2(px.x, 0) : vec2(0, px.y);
        float da = depthAt(uv + o), db = depthAt(uv - o);
        float ref = max(min(d0, min(da, db)), 0.05);
        e = max(e, smoothstep(0.03, 0.09, max(abs(da + db - 2.0 * d0) / ref * 1.4, abs(da - db) / ref * 0.5)));
        float bend = 1.0 - min(dot(n0, normalAt(uv + o)), dot(n0, normalAt(uv - o)));
        e = max(e, smoothstep(0.12, 0.3, bend));
    }
    return e;
}

void main() {
    vec2 uv = vUv;
    vec4 shade = texture(tShade, uv);
    float kind = shade.a;
    vec3 color = ground;
    float ink = 0.0;
    if (kind > 0.92) {
        // A solid: near the ground, a little lighter where it faces the light, its edges in line.
        float lum = dot(shade.rgb, vec3(0.299, 0.587, 0.114));
        color = mix(ground, solid, smoothstep(0.1, 1.0, lum));
        ink = edge(uv) * 0.9;
    } else if (kind > 0.75) {
        // The room: the ground itself, with only its seams in line.
        ink = edge(uv) * 0.3;
    } else if (kind > 0.25) {
        color = shade.rgb * mix(1.0, 0.86, night);
        ink = edge(uv) * 0.6;
    }
    outColor = vec4(mix(color, line, ink), 1.0);
}`;

// The line work smoothed (FXAA, after Timothy Lottes): where the colour's brightness changes sharply,
// the pass blends along the edge rather than across it, so a line stepping along a slant reads
// as one straight stroke. `tColor` is the line work drawn whole into a target of its own.
export const smoothFragment = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tColor;
uniform vec2 resolution;
out vec4 outColor;

const float REDUCE_MIN = 1.0 / 128.0;
const float REDUCE_MUL = 1.0 / 8.0;
const float SPAN_MAX = 8.0;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
    vec2 px = 1.0 / resolution;
    vec3 middle = texture(tColor, vUv).rgb;
    float nw = luma(texture(tColor, vUv + vec2(-1.0, -1.0) * px).rgb);
    float ne = luma(texture(tColor, vUv + vec2(1.0, -1.0) * px).rgb);
    float sw = luma(texture(tColor, vUv + vec2(-1.0, 1.0) * px).rgb);
    float se = luma(texture(tColor, vUv + vec2(1.0, 1.0) * px).rgb);
    float m = luma(middle);
    float least = min(m, min(min(nw, ne), min(sw, se)));
    float most = max(m, max(max(nw, ne), max(sw, se)));
    // Along the edge: across the brightness's steepest change, turned a quarter.
    vec2 along = vec2(-((nw + ne) - (sw + se)), (nw + sw) - (ne + se));
    float reduce = max((nw + ne + sw + se) * 0.25 * REDUCE_MUL, REDUCE_MIN);
    along = clamp(along / (min(abs(along.x), abs(along.y)) + reduce), -SPAN_MAX, SPAN_MAX) * px;
    vec3 near = 0.5 * (texture(tColor, vUv + along * (1.0 / 3.0 - 0.5)).rgb + texture(tColor, vUv + along * (2.0 / 3.0 - 0.5)).rgb);
    vec3 far = near * 0.5 + 0.25 * (texture(tColor, vUv - along * 0.5).rgb + texture(tColor, vUv + along * 0.5).rgb);
    float l = luma(far);
    outColor = vec4(l < least || l > most ? near : far, 1.0);
}`;
