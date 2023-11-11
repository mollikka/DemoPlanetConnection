#version 300 es

precision highp float;

uniform sampler2D FRAME;

in vec2 RESOLUTION;
uniform float BEATS;

out vec4 FRAG_COLOR;

void main()
{
    vec2 uv = gl_FragCoord.xy/RESOLUTION.xy;
    vec2 delta = vec2(2.0/RESOLUTION.x, 2.0/RESOLUTION.y);
    
    vec4 color = vec4(0.0);
    float k = 1.0;
    float total = 0.0;

    for (float i = 0.0; i<3.0; i++) {
        for (float j = 0.0; j<3.0; j++) {
            if (i==0.0 && j==0.0) continue; 
            color += k*texture(FRAME, uv+delta*vec2(i,j));
            color += k*texture(FRAME, uv+delta*vec2(-i,j));
            color += k*texture(FRAME, uv+delta*vec2(-i,-j));
            color += k*texture(FRAME, uv+delta*vec2(i,-j));
            total += 4.0 * k;
            k = sqrt(k/4.0);
        }
    }

    
    FRAG_COLOR = 0.6*texture(FRAME, uv) +0.8*color/total;
}