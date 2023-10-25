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



// Rotation matrix around the X axis.
mat3 rotateX(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(1, 0, 0),
        vec3(0, c, -s),
        vec3(0, s, c)
    );
}

// Rotation matrix around the Y axis.
mat3 rotateY(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(c, 0, s),
        vec3(0, 1, 0),
        vec3(-s, 0, c)
    );
}

// Rotation matrix around the Z axis.
mat3 rotateZ(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(c, -s, 0),
        vec3(s, c, 0),
        vec3(0, 0, 1)
    );
}




float opUnion( float d1, float d2 ) { return min(d1,d2); }

float opSubtraction( float d1, float d2 ) { return max(-d1,d2); }

float opIntersection( float d1, float d2 ) { return max(d1,d2); }


float opSmoothUnion( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h); }


float opSmoothSubtraction( float d1, float d2, float k ) {
    float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
    return mix( d2, -d1, h ) + k*h*(1.0-h); }


float sphereSDF(vec3 p, vec3 ball, float r) {
    return length(p - ball) - r;
}

float sdTorus( vec3 p, vec2 t ) {
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

float moduloFilter() {
  return mod(gl_FragCoord.x, 4.0f);
}

float sinTimeFilter(float frequency) {
  return 0.5*sin(frequency*TIME/1000.0)+0.5;
}

float sceneSDF(vec3 p) {
    vec3 ball1 = vec3(sin(TIME/1000.f), cos(TIME/1000.f), 0.0f);
    vec3 ball2 = vec3(sin(TIME/1000.f + 2.0f/3.0f*PI), cos(TIME/1000.f + 2.0f/3.0f*PI), 0.0f);
    vec3 ball3 = vec3(sin(TIME/1000.f + 4.0f/3.0f*PI), cos(TIME/1000.f + 4.0f/3.0f*PI), 0.0f);

    float dist1 = sphereSDF(p, ball1,0.5f);   
    float dist2 = sphereSDF(p, ball2,0.5f);  
    float dist3 = sphereSDF(p, ball3,0.5f);  

    vec3 ball4 = vec3(sin(0.0f), cos(0.0f), 0.0f);
    float dist4 = sphereSDF(p, ball4,0.5f);

    float torus = sdTorus(rotateZ(0.4f*TIME/490.f)*rotateX(TIME/1000.f)*p, vec2(0.6f, 0.4f));

    float torus2 = sdTorus(rotateX(PI/2.0f)*p, vec2(1.0f, 0.1f));


    float blorbos = opSmoothUnion(opSmoothUnion( opSmoothUnion(dist1, dist2, 0.5f), dist3, 0.5f), dist4, 0.5f);

    float monster1 = opSmoothSubtraction(blorbos, torus,0.4f);

    float monster2 = opSmoothUnion(blorbos, torus2, 0.2f);

    float bigBall = sphereSDF(p, vec3(0,0,0),1.0f + cos(TIME/5000.f));

    float monster3 = opSmoothUnion(dist1, torus2, mod(gl_FragCoord.x, 4.0f)/4.0);


    mat3 xrot = rotateX(PI/2.0f+TIME/800.f);
    mat3 yrot = rotateY(PI/2.0f+TIME/900.f);
    mat3 zrot = rotateZ(PI/2.0f+TIME/1000.f);

    float torusA = sdTorus(xrot*yrot*p, vec2(1.5f, 0.1f));
    float torusB = sdTorus(yrot*zrot*p, vec2(1.4f, 0.1f));
    float torusC = sdTorus(zrot*xrot*p, vec2(1.3f, 0.1f));



    float ballA = sphereSDF(p, vec3(0,0,0),1.0f+(cos(gl_FragCoord.x/6.f+TIME/200.f)+sin(gl_FragCoord.x/5.f+TIME/200.f))/6.0);
    float ballB = sphereSDF(p, vec3(0,0,0),0.7f+moduloFilter()/10.0f+(sin(TIME/500.f)*0.5+0.5)/4.0 ); 
     
    float monster4 = opSmoothUnion(ballB,opSmoothUnion(torusA, opSmoothUnion(torusB, torusC, 0.5), 0.5), 0.5);

    float torusD = sdTorus(rotateX(gl_FragCoord.x/200.f+TIME/300.f)*rotateZ(gl_FragCoord.y/200.f+TIME/300.f)*p , vec2(1.5f, 0.1f));
    float torusE = sdTorus(xrot*p , vec2(1.5f, 0.1f));
    
    float monster5 = opSmoothUnion(torusD, torusE, 0.5f);




    float monster6 = sdTorus(xrot*p , vec2(1.5f, sinTimeFilter(1.0+gl_FragCoord.x/1000.0)));

    float multiplier = (TIME-6000.0)/1000.f;
    float monster7 = opSmoothUnion(blorbos, torus2, 0.2*(1.0-multiplier) + multiplier*sin(length(vec2(gl_FragCoord.x, gl_FragCoord.y)-RESOLUTION.xy/2.0)/8.f));

    float ballC1 = sphereSDF(p, rotateZ(1.*PI/3.0f+TIME/1000.f)*vec3(0.0,4.0-TIME/2000.f,1.-TIME/2000.f),0.5f); 
    float ballC2 = sphereSDF(p, rotateZ(2.*PI/3.0f+TIME/1000.f)*vec3(0.0,4.0-TIME/2000.f,1.-TIME/2000.f),0.5f); 
    float ballC3 = sphereSDF(p, rotateZ(3.*PI/3.0f+TIME/1000.f)*vec3(0.0,4.0-TIME/2000.f,1.-TIME/2000.f),0.5f); 
    float ballC4 = sphereSDF(p, rotateZ(4.*PI/3.0f+TIME/1000.f)*vec3(0.0,4.0-TIME/2000.f,1.-TIME/2000.f),0.5f); 
    float ballC5 = sphereSDF(p, rotateZ(5.*PI/3.0f+TIME/1000.f)*vec3(0.0,4.0-TIME/2000.f,1.-TIME/2000.f),0.5f); 
    float ballC6 = sphereSDF(p, rotateZ(6.*PI/3.0f+TIME/1000.f)*vec3(0.0,4.0-TIME/2000.f,1.-TIME/2000.f),0.5f); 

    float monster8 = opSmoothUnion(ballC1,opSmoothUnion(ballC2,opSmoothUnion(ballC3,opSmoothUnion(ballC4, opSmoothUnion(ballC5, ballC6,3.0),2.5),2.0),1.5),1.0);


    float ballD1 = sphereSDF(p, rotateX(TIME/5000.)*vec3(0.0,1.0,1.0),0.5f); 
    float ballD2 = sphereSDF(p, rotateY(TIME/5000.)*vec3(1.0,0.0,1.0),0.5f); 
    float ballD3 = sphereSDF(p, vec3(-2.0,-1.0,-2.0),0.5f); 
    float ballD5 = sphereSDF(p, vec3(.0,sin(TIME/5000.),0.0),0.5f); 

    float monster9 = opUnion(ballD1, opUnion(ballD2,opUnion(ballD3,ballD5)));


    /*if ((TIME) <6000.f) {
        return monster2;
    }
    return monster7;*/

    if ((TIME + gl_FragCoord.x) <17000.f) {
    return opUnion(opIntersection(monster1, bigBall),opSubtraction(bigBall,monster2)) ;}
    if ((TIME + gl_FragCoord.x) < 22000.f) {
        return monster3;
    }
    if ((TIME + gl_FragCoord.x) < 26000.f) {
        return monster4;
    }
    if ((TIME + gl_FragCoord.x) < 35000.f) {
        return monster5;
    }
    return monster6;
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


bool rayObscured(vec3 lightPos, vec3 p) {
    vec3 pN = estimateNormal(p);
    vec3 lightToP = normalize(p-lightPos);
    float rayDistance = shortestDistanceToSurface(lightPos, lightToP);
    vec3 hitPosition = lightPos + rayDistance * lightToP;

    return distance(hitPosition, p) > 0.01;
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
    if (rayObscured(lightPos, p)) return vec3(0,0,0);

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

    vec3 i_light3Pos = vec3(0.0f, 4.0f, 0.0f);
    vec3 i_light3Intensity = vec3(1.7f, 1.7f, 1.7f);
    vec3 i_light3 = phongContribForLight(k_d, k_s, alpha, p, eye, i_light3Pos, i_light3Intensity);

    return i_ambientColor + i_light1 + i_light2 + i_light3;
}

vec3 calcEnvMaterial(vec3 p, vec3 eye) {
    vec3 i_K_a = vec3(0.0f, 0.0f, 0.0f);
    vec3 i_K_d = vec3(0.2f, 0.2, 0.2f);
    vec3 i_K_s = vec3(1.0f, 1.0f, 1.0f);
    float i_shininess = 10.0f;
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

        vec3 pNormal = estimateNormal(p);
        vec3 reflectionDirection = reflect(worldDir, pNormal);
        float reflectionDistance = shortestDistanceToSurface(p+pNormal*0.01, reflectionDirection);
        
        if (reflectionDistance <= MAX_DIST - EPSILON) {
            vec3 reflectionHit = p + reflectionDistance * reflectionDirection;

            color = color*0.5 + calcEnvMaterial(reflectionHit, CAMERA_POS)*0.5;
        }
    }

    FRAG_COLOR = vec4(color, 1.0f);
}