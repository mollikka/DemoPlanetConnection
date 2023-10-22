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

vec3 estimateNormal(vec3 p) {
    return normalize(vec3(sceneSDF(vec3(p.x + EPSILON, p.y, p.z)) - sceneSDF(vec3(p.x - EPSILON, p.y, p.z)), sceneSDF(vec3(p.x, p.y + EPSILON, p.z)) - sceneSDF(vec3(p.x, p.y - EPSILON, p.z)), sceneSDF(vec3(p.x, p.y, p.z + EPSILON)) - sceneSDF(vec3(p.x, p.y, p.z - EPSILON))));
}

/**
 * Lighting contribution of a single point light source via Phong illumination.
 * 
 * The vec3 returned is the RGB color of the light's contribution.
 *
 * k_a: Ambient color
 * k_d: Diffuse color
 * k_s: Specular color
 * alpha: Shininess coefficient
 * p: position of point being lit
 * eye: the position of the camera
 * lightPos: the position of the light
 * lightIntensity: color/intensity of the light
 *
 * See https://en.wikipedia.org/wiki/Phong_reflection_model#Description
 */
vec3 phongContribForLight(vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye, vec3 lightPos, vec3 lightIntensity) {
    vec3 i_N = estimateNormal(p);
    vec3 i_L = normalize(lightPos - p);
    vec3 i_V = normalize(eye - p);
    vec3 i_R = normalize(reflect(-i_L, i_N));

    float dotLN = dot(i_L, i_N);
    float dotRV = dot(i_R, i_V);

    if (dotLN < 0.0f) {
    // Light not visible from this point on the surface
        return vec3(0.0f, 0.0f, 0.0f);
    }

    if (dotRV < 0.0f) {
    // Light reflection in opposite direction as viewer, apply only diffuse
    // component
        return lightIntensity * (k_d * dotLN);
    }
    return lightIntensity * (k_d * dotLN + k_s * pow(dotRV, alpha));
}

/**
 * Lighting via Phong illumination.
 * 
 * The vec3 returned is the RGB color of that point after lighting is applied.
 * k_a: Ambient color
 * k_d: Diffuse color
 * k_s: Specular color
 * alpha: Shininess coefficient
 * p: position of point being lit
 * eye: the position of the camera
 *
 * See https://en.wikipedia.org/wiki/Phong_reflection_model#Description
 */
vec3 phongIllumination(vec3 k_a, vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye) {
    const vec3 ambientLight = vec3(0.5f, 0.5f, 0.5f);
    vec3 i_ambientColor = ambientLight * k_a;
    float i_y = 4.0f;

    vec3 i_light1Pos = vec3(3.0f, 0.0f, 3.0f);
    vec3 i_light1Intensity = vec3(0.4f, 0.4f, 0.4f);
    vec3 i_light1 = phongContribForLight(k_d, k_s, alpha, p, eye, i_light1Pos, i_light1Intensity);

    vec3 i_light2Pos = vec3(3.0f, i_y, 3.0f);
    vec3 i_light2Intensity = vec3(0.4f, 0.4f, 0.4f);
    vec3 i_light2 = phongContribForLight(k_d, k_s, alpha, p, eye, i_light2Pos, i_light2Intensity);

    return i_ambientColor + i_light1 + i_light2;
}

vec3 calcEnvMaterial(vec3 p, vec3 eye) {
    vec3 i_K_a = vec3(0.0f, 0.15f, 0.2f);
    vec3 i_K_d = vec3(0.0f, 0.2f, 0.7f);
    vec3 i_K_s = vec3(0.5f, 1.0f, 0.8f);
    float i_shininess = 50.0f;
    return phongIllumination(i_K_a, i_K_d, i_K_s, i_shininess, p, eye);
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
        color = calcEnvMaterial(p, CAMERA_POS);
    }

    FRAG_COLOR = vec4(color, 1.0f);
}