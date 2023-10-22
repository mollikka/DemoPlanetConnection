#version 300 es
precision highp float;

const int MAX_MARCHING_STEPS = 256;
const float MIN_DIST = 0.0f;
const float MAX_DIST = 50.0f;
const float EPSILON = 0.0001f;
const float STEP_CORRECTION = 1.0f; // lower -> better quality, but slower
const float PI = 3.14159265359f;

uniform float TIME;
uniform vec3 CAMERA_POS;
uniform vec3 CAMERA_LOOKAT;
uniform vec3 CAMERA_UP;

in vec2 RESOLUTION;
in mat4 VIEW_MATRIX;

out vec4 FRAG_COLOR;

float sphereSDF(vec3 p) {
    return length(p) - 1.0f;
}

float sceneSDF(vec3 p) {
    return sphereSDF(p);
}

vec3 rayDirection(float fieldOfView, vec2 size, vec2 fragCoord) {
    size *= 0.5f;
    vec2 i_xy = fragCoord - size;
    float i_z = size.y / tan(radians(fieldOfView) / 2.0f);
    return normalize(vec3(i_xy, -i_z));
}

float shortestDistanceToSurface(vec3 eye, vec3 marchingDirection) {
    float depth = MIN_DIST;
    for (int i = 0; i < MAX_MARCHING_STEPS; i++) {
        vec3 p = eye + depth * marchingDirection;
        float dist = sceneSDF(p);
        if (dist < EPSILON) {
            return depth;
        }
        depth += dist;
        if (depth >= MAX_DIST) {
            return MAX_DIST;
        }
    }
    return MAX_DIST;
}

void main() {
    vec3 viewDir = rayDirection(60.0f, RESOLUTION.xy, gl_FragCoord.xy);
    vec3 worldDir = (VIEW_MATRIX * vec4(viewDir, 0.0f)).xyz;

    float distance = shortestDistanceToSurface(CAMERA_POS, worldDir);

    vec3 color;
    if (distance > MAX_DIST - EPSILON) {
    // Didn't hit anything
        color = vec3(0.0f, 0.0f, 0.0f);
    } else {
        vec3 p = CAMERA_POS + distance * worldDir;
        color = vec3(1.0f, 0.0f, 0.0f);
    }

    FRAG_COLOR = vec4(color, 1.0f);
}