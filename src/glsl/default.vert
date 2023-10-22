#version 300 es

in vec4 VERTEX_POS;
in vec2 BUFFER_RESOLUTION;

out vec2 RESOLUTION;
out mat4 VIEW_MATRIX;

uniform vec3 CAMERA_POS;
uniform vec3 CAMERA_LOOKAT;
uniform vec3 CAMERA_UP;

mat4 viewMatrix(vec3 eye, vec3 center, vec3 up) {
    vec3 i_f = normalize(center - eye);
    vec3 i_s = normalize(cross(i_f, up));
    vec3 i_u = cross(i_s, i_f);
    return mat4(vec4(i_s, 0.0f), vec4(i_u, 0.0f), vec4(-i_f, 0.0f), vec4(0.0f, 0.0f, 0.0f, 1));
}

void main() {
    gl_Position = VERTEX_POS;
    RESOLUTION = BUFFER_RESOLUTION;
    VIEW_MATRIX = viewMatrix(CAMERA_POS, CAMERA_LOOKAT, CAMERA_UP);
}