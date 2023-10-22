#version 300 es
precision highp float;

uniform float TIME;
out vec4 FRAG_COLOR;

void main() {
    float phase = TIME * 0.01f;
    float red = 0.5f + 0.5f * sin(phase);
    float green = 0.5f + 0.5f * sin(phase + 2.1f);
    float blue = 0.5f + 0.5f * sin(phase - 2.1f);

    FRAG_COLOR = vec4(red, green, blue, 1.0f);
}