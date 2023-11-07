#version 300 es
precision highp float;

const int MAX_MARCHING_STEPS = 256;
const float MIN_DIST = 0.0f;
const float FOG_DIST = 40.0f;
const float MAX_DIST = 50.0f;
const float EPSILON = 0.0001f;
const float STEP_CORRECTION = 1.0f; // lower -> better quality, but slower
const float PI = 3.14159265359f;

uniform float BEATS;
uniform vec3 CAMERA_POS;
uniform vec3 CAMERA_LOOKAT;
uniform vec3 CAMERA_UP;

in vec2 RESOLUTION;
in mat4 VIEW_MATRIX;

out vec4 FRAG_COLOR;

float SCENE1_START = 8.0;
float SCENE1_END = 6.0*4.0+8.0;
float TRANSITION1_END = 7.0*4.0+2.0+8.0;
float SCENE2_END = 10.0*4.0+8.0;
float SCENE3_END = 20.0*4.0+8.0;
float SCENE4_END = 24.0*4.0+8.0;
float TRANSITION2_END = 28.0*4.0+2.+8.0;
float SCENE5_END = 52.0*4.0+8.0;
float DEMO_END = 56.0*4.0+4.0+8.0;
float ENCORE_END = 56.0*4.0+24.0+8.0;

float atan2(vec2 dir) {
    if (dir.x < 0.0) {
        return atan(dir.y / dir.x) + PI;
    }
    return atan(dir.y / dir.x);
}

// cosine based palette, 4 vec3 params
vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
{
    return a + b*cos( 6.28318*(c*t+d) );
}

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

float sdCappedCone( vec3 p, vec3 a, vec3 b, float ra, float rb )
{
  float rba  = rb-ra;
  float baba = dot(b-a,b-a);
  float papa = dot(p-a,p-a);
  float paba = dot(p-a,b-a)/baba;
  float x = sqrt( papa - paba*paba*baba );
  float cax = max(0.0,x-((paba<0.5)?ra:rb));
  float cay = abs(paba-0.5)-0.5;
  float k = rba*rba + baba;
  float f = clamp( (rba*(x-ra)+paba*baba)/k, 0.0, 1.0 );
  float cbx = x-ra - f*rba;
  float cby = paba - f;
  float s = (cbx<0.0 && cay<0.0) ? -1.0 : 1.0;
  return s*sqrt( min(cax*cax + cay*cay*baba,
                     cbx*cbx + cby*cby*baba) );
}
float sdPill( vec3 p, vec3 pos1, vec3 pos2, float r1, float r2) {
    //float ball1 = sphereSDF(p, pos1,r1);   
    float connector = sdCappedCone(p,pos1, pos2, r1, r2);
    //float ball2 = sphereSDF(p, pos2,r2); 
    return connector;
    //return opUnion(ball1, opUnion(ball2, connector));
}

float moduloFilter() {
  return mod(gl_FragCoord.x, 4.0f);
}

float sinTimeFilter(float frequency) {
  return 0.5*sin(frequency*BEATS)+0.5;
}

// lerp / activator functions

float activate(float x) {
    if (x<-4.0) return 0.0;
    if (x>4.0) return 1.0;
    return tanh(x*5.0)*0.5+0.5;
}

float bezier(float x, float start, float end) {
    if (x<start) return 0.0;
    if (x>end) return 1.0;
    float t = ((x-end)/(end-start))+1.0;
    return t*t * (3.0f - 2.0f * t);
}

vec3 colorBezier(float x, float start, vec3 colorStart, float end, vec3 colorEnd) {
    float b = bezier(x, start, end);
    return colorStart*(1.0-b) + colorEnd*(b);
}

// common items in the demo

float standardTorus(vec3 p, vec2 rMultiplier) {
    return sdTorus(rotateX(PI/2.0f)*p, rMultiplier*vec2(1.0f, 0.1f));
}

// 2d SCENES

vec3 spiralShader(vec2 xy, float beats) {
    vec2 center = RESOLUTION.xy/2.0;
    float distCenter = length(xy-center);
    float dir = atan2(xy-center);
    float A = 0.1;
    return vec3(sin((dir+distCenter*A+beats)),sin((dir+distCenter*A+beats)),sin((dir+distCenter*A+beats)));
}

float curtainsHeight(vec2 xy, float beats) {
    vec2 xyCentered = xy-vec2(RESOLUTION.x,RESOLUTION.y)/2.;
    float easeInRotation = bezier(beats, 16.0, 32.0);
    vec2 xyTwisted = (  rotateX(easeInRotation*(beats*0.00001))*
                        rotateY(easeInRotation*(beats*0.001))*
                        rotateZ(easeInRotation*(beats*length(xyCentered)*0.0001))*
                        vec3(xyCentered.x,xyCentered.y,0.0)).xy;
    float x = xyTwisted.x/RESOLUTION.x;
    float y = xyTwisted.y/RESOLUTION.y;
    float phase = (0.4*sin(beats*2.1+x*80.)+sin(beats*1.15+x*40.3)+2.*sin(beats/2.+x*20.)+2.0)/8.0;
    return phase;
}

vec3 curtainsShader(vec2 xy, float beats) {
    float phase = curtainsHeight(xy, beats)*2.;
    vec3 color1 = vec3(0.4f, 0.13f, 0.88f);
    vec3 color2 = vec3(0.29f, 0.04f, 0.44f);
    vec3 color3 = vec3(0.29f, 0.1f, 0.36f);
    vec3 color4 = vec3(0.09f, 0.06f, 0.14f);
    return color1*bezier(phase,0.0,1.0) + color3*bezier(phase,1.0,0.0);
}

/*vec3 curtainsShader(vec2 xy, float beats) {
    float R = curtainsHeight(vec2(xy.x+EPSILON, xy.y), beats);
    float L = curtainsHeight(vec2(xy.x-EPSILON, xy.y), beats);
    float T = curtainsHeight(vec2(xy.x, xy.y-EPSILON), beats);
    float B = curtainsHeight(vec2(xy.x, xy.y+EPSILON), beats);
    vec3 normal = -1.*normalize(vec3((L-R), (T-B), -2.0));
    return normal;
}*/

vec3 waterPoolShader(vec2 xy, float beats) {
    vec2 center = RESOLUTION.xy/2.0;
    float distCenter = length(xy-center);
    float s =   (sin(beats + xy.x/30.0) + 
                cos(beats + xy.y/30.0) +
                sin(distCenter/(20.1+sin(beats+distCenter))))/3.0;

    vec3 color1 = vec3(0.88f, 0.13f, 0.48f);
    vec3 color2 = vec3(0.29f, 0.04f, 0.44f);
    vec3 color3 = vec3(0.0f, 0.0f, 0.22f);
    vec3 color4 = vec3(0.09f, 0.06f, 0.14f);
    return 2.0*(s*color1 + (1.0-s)*color3);
}

bool portalRadiusCheck(vec2 xy) {
    float intoThePortalTransition = bezier(BEATS, SCENE4_END, TRANSITION2_END);
    float portalRadius = 200.0 + 8000.0*intoThePortalTransition*intoThePortalTransition;
    vec2 center = RESOLUTION.xy/2.0;
    return (length(xy-center) < portalRadius);
}

vec3 portalShader(vec2 xy, float beats) {
    if (portalRadiusCheck(xy)) {
        return vec3(1.0,1.0,1.0);
    }
    return vec3(0.0,0.0,0.0);
}

float rand(vec2 uv) {
    const highp float a = 12.9898;
    const highp float b = 78.233;
    const highp float c = 43758.5453;
    highp float dt = dot(uv, vec2(a, b));
    highp float sn = mod(dt, 3.1415);
    return fract(sin(sn) * c);
}

vec3 starfieldShader(vec2 xy, float beats) {
    float t = sin(beats * rand(-xy)) * 0.5 + 0.5;
  
    float star = (smoothstep(0.995, 1.0, rand(xy)) * t);
    return vec3(star);
}

vec3 scene2dShaderBack(vec2 xy) {
    vec3 starfieldShader = starfieldShader(xy, BEATS);
    vec3 portalFilter = colorBezier(BEATS, SCENE2_END, vec3(0.0,0.0,0.0), SCENE3_END,portalShader(xy, BEATS));
    vec3 invPortalFilter = vec3(1.0,1.0,1.0) - portalFilter;
    vec3 spiralFilter = colorBezier(BEATS, 
        SCENE3_END, vec3(1.0,1.0,1.0), 
        SCENE4_END, spiralShader(xy, BEATS));
    vec3 curtainsFilter =   colorBezier(BEATS, TRANSITION2_END+20.0, vec3(0.,0.,0.), TRANSITION2_END+16.0+20.0, vec3(1.,1.,1.));
                            colorBezier(BEATS, DEMO_END-9.0, vec3(1.,1.,1.), DEMO_END+8.0, vec3(0.,0.,0.));        
    vec3 invCurtainsFilter = vec3(1.0,1.0,1.0) - curtainsFilter;

    vec3 backToRealWorldFilter = colorBezier(BEATS, SCENE5_END, vec3(1.0,1.0,1.0), DEMO_END-10.0, vec3(0.0,0.0,0.0));
    vec3 invBackToTheRealWorldFilter = vec3(1.0,1.0,1.0) - backToRealWorldFilter;

    vec3 color = starfieldShader*invPortalFilter + 
    waterPoolShader(xy, BEATS)*spiralFilter*portalFilter * invCurtainsFilter +
    curtainsFilter*curtainsShader(xy, BEATS-TRANSITION2_END-18.)*backToRealWorldFilter + 
    invBackToTheRealWorldFilter*starfieldShader;
    
    return color;
}

vec3 scene3dShaderMultiply(vec2 xy) {
    if (BEATS < SCENE5_END) return vec3(1.0,1.0,1.0);
    if (BEATS < DEMO_END) {
        vec3 endingFadeIn = colorBezier(BEATS, SCENE5_END, vec3(0.0,0.0,0.0), SCENE5_END+2.0,vec3(1.0,1.0,1.0));
        vec3 endingFadeOut = colorBezier(BEATS, DEMO_END-6.0, vec3(1.0,1.0,1.0), DEMO_END-2.0,vec3(0.0,0.0,0.0));
        return endingFadeIn*endingFadeOut;
    }
    return vec3(1.0,1.0,1.0);
}

// 3d SCENES

float introScene(vec3 p, float beats) {
    mat3 rot = rotateZ(PI*bezier(beats, 4.0*4.0, 6.0*4.0))*rotateX(PI/4.0*bezier(beats, 4.0*4.0+2.0, 6.0*4.0));
    float popIn = activate(beats-1.5f)*0.2f;

    float ballE01 = sphereSDF(p,activate(beats-5.0*4.0)*rot*vec3(0,1.0,1.0),popIn); 
    float ballE02 = sphereSDF(p,activate(beats-5.0*4.0)*rot*vec3(0,-1.0,-1.0),popIn); 
    float ballE03 = sphereSDF(p,activate(beats-5.0*4.0)*rot*vec3(0,1.0,-1.0),popIn); 
    float ballE04 = sphereSDF(p,activate(beats-5.0*4.0)*rot*vec3(0,-1.0,1.0), popIn); 
        
    float ballE05 = sphereSDF(p, activate(beats-6.0*4.0)*rot*vec3(1.0,0,1.0), popIn); 
    float ballE06 = sphereSDF(p, activate(beats-6.0*4.0)*rot*vec3(-1.0,0,-1.0), popIn); 
    float ballE07 = sphereSDF(p, activate(beats-6.0*4.0)*rot*vec3(1.,0,-1.0), popIn); 
    float ballE08 = sphereSDF(p, activate(beats-6.0*4.0)*rot*vec3(-1.0,0,1.0), popIn);     
    
    float ballE09 = sphereSDF(p, activate(beats-1.0*4.0-1.5)*rot*vec3(1.0,1.0,0), popIn); 
    float ballE10 = sphereSDF(p, activate(beats-2.0*4.0-1.5)*rot*vec3(-1.0,-1.0,0), popIn); 
    float ballE11 = sphereSDF(p, activate(beats-3.0*4.0-1.5)*rot*vec3(1.0,-1.0,0), popIn); 
    float ballE12 = sphereSDF(p, activate(beats-4.0*4.0-1.5)*rot*vec3(-1.0,1.0,0), popIn); 

    float lilballs = opSmoothUnion(ballE01,opSmoothUnion(ballE02,opSmoothUnion(ballE03,opSmoothUnion(ballE04,opSmoothUnion(ballE05,opSmoothUnion(ballE06,opSmoothUnion(ballE07,opSmoothUnion(ballE08,opSmoothUnion(ballE09,opSmoothUnion(ballE10,opSmoothUnion(ballE11,ballE12,0.6),0.6),0.6),0.6),0.6),0.6),0.6),0.6),0.6),0.6),0.6);

    float monster10 = lilballs;

    return monster10;
}

float sceneRingWithBallsEaseIn(vec3 p, float beats) {  
    float rot = PI/3.0*beats;

    float easeIn = bezier(beats, 0.0, 2.0);
    float easeOut = bezier(beats, 6.0, 12.0);
    mat3 startRot = rotateZ(PI)*rotateX(PI/4.0);

    vec3 ball1Start = startRot*vec3(0,1.0,1.0); 
    vec3 ball2Start = startRot*vec3(0,-1.0,-1.0); 
    vec3 ball3Start = startRot*vec3(0,1.0,-1.0); 
    vec3 ball4Start = startRot*vec3(0,-1.0,1.0); 
        
    vec3 ball5Start = startRot*vec3(1.0,0,1.0); 
    vec3 ball6Start = startRot*vec3(-1.0,0,-1.0); 
    vec3 ball7Start = startRot*vec3(1.,0,-1.0); 
    vec3 ball8Start = startRot*vec3(-1.0,0,1.0);     
    
    vec3 ball9Start = startRot*vec3(1.0,1.0,0); 
    vec3 ball10Start = startRot*vec3(-1.0,-1.0,0); 
    vec3 ball11Start = startRot*vec3(1.0,-1.0,0); 
    vec3 ball12Start = startRot*vec3(-1.0,1.0,0); 

    vec3 ball1Main = vec3(sin(rot+PI/3.0*3.0),cos(rot+PI/3.0*3.0),0); 
    vec3 ball2Main = vec3(sin(rot),cos(rot),0); 
    vec3 ball5Main = vec3(sin(rot+PI/3.0*4.0),cos(rot+PI/3.0*4.0),0); 
    vec3 ball8Main = vec3(sin(rot+PI/3.0*2.0),cos(rot+PI/3.0*2.0),0); 
    vec3 ball10Main = vec3(sin(rot+PI/3.0*1.0),cos(rot+PI/3.0*1.0),0); 
    vec3 ball11Main = vec3(sin(rot+PI/3.0*5.0),cos(rot+PI/3.0*5.0),0); 

    vec3 fuckOffPlace = vec3(0,0,-MAX_DIST*1.5); 

    vec3 ballP1 = (1.0-easeIn)*ball1Start + easeIn*ball1Main;
    vec3 ballP2 = (1.0-easeIn)*ball2Start + easeIn*ball2Main;
    vec3 ballP3 = (1.0-easeIn)*ball3Start + easeOut*fuckOffPlace;
    vec3 ballP4 = (1.0-easeIn)*ball4Start + easeOut*fuckOffPlace;
    vec3 ballP5 = (1.0-easeIn)*ball5Start + easeIn*ball5Main;
    vec3 ballP6 = (1.0-easeIn)*ball6Start + easeOut*fuckOffPlace;
    vec3 ballP7 = (1.0-easeIn)*ball7Start + easeOut*fuckOffPlace;
    vec3 ballP8 = (1.0-easeIn)*ball8Start + easeIn*ball8Main;
    vec3 ballP9 = (1.0-easeIn)*ball9Start + easeOut*fuckOffPlace;
    vec3 ballP10 = (1.0-easeIn)*ball10Start + easeIn*ball10Main;
    vec3 ballP11 = (1.0-easeIn)*ball11Start + easeIn*ball11Main;
    vec3 ballP12 = (1.0-easeIn)*ball12Start + easeOut*fuckOffPlace;

    float ballE01 = sphereSDF(p, ballP1,0.2f);   
    float ballE02 = sphereSDF(p, ballP2,0.2f);  
    float ballE03x = sphereSDF(p, ballP3,0.2f*(1.0-easeIn));  
    float ballE04x = sphereSDF(p, ballP4,0.2f*(1.0-easeIn));
    float ballE05 = sphereSDF(p, ballP5,0.2f);
    float ballE06x = sphereSDF(p, ballP6,0.2f*(1.0-easeIn));
    float ballE07x = sphereSDF(p, ballP7,0.2f*(1.0-easeIn));
    float ballE08 = sphereSDF(p, ballP8,0.2f);
    float ballE09x = sphereSDF(p, ballP9,0.2f*(1.0-easeIn));
    float ballE10 = sphereSDF(p, ballP10,0.2f);
    float ballE11 = sphereSDF(p, ballP11,0.2f);
    float ballE12x = sphereSDF(p, ballP12,0.2f*(1.0-easeIn));


    float blorbos = opSmoothUnion(ballE01,opSmoothUnion(ballE02,opSmoothUnion(ballE03x,opSmoothUnion(ballE04x,opSmoothUnion(ballE05,opSmoothUnion(ballE06x,opSmoothUnion(ballE07x,opSmoothUnion(ballE08,opSmoothUnion(ballE09x,opSmoothUnion(ballE10,opSmoothUnion(ballE11,ballE12x,0.6),0.6),0.6),0.6),0.6),0.6),0.6),0.6),0.6),0.6),0.6);

    return opSmoothUnion(blorbos,standardTorus(p, vec2(1.0, 1.0)), 0.1);;
}

float sceneRingWithBallsJuggle(vec3 p, float beats) {  
    float rot = PI/3.0*beats;

    vec3 pos1 = vec3(sin(rot),cos(rot),0);
    vec3 pos2 = vec3(sin(rot+PI/3.0*1.0),cos(rot+PI/3.0*1.0),0); 
    vec3 pos3 = vec3(sin(rot+PI/3.0*2.0),cos(rot+PI/3.0*2.0),0); 
    vec3 pos4 = vec3(sin(rot+PI/3.0*3.0),cos(rot+PI/3.0*3.0),0); 
    vec3 pos5 = vec3(sin(rot+PI/3.0*4.0),cos(rot+PI/3.0*4.0),0); 
    vec3 pos6 = vec3(sin(rot+PI/3.0*5.0),cos(rot+PI/3.0*5.0),0); 

    float t1A = (1.0-bezier(beats, 8.0, 11.5));
    float t1B = (bezier(beats, 8.5, 12.0));

    float t2A = (1.0-bezier(beats, 16.0, 19.5));
    float t2B = (bezier(beats, 16.5, 20.0));

    float easeOut1 = bezier(beats, 24.0, 34.0);
    float chunkyTransform = (bezier(beats, 8.5, 12.0));

    vec3 fuckOffPlace = vec3(0,0,-MAX_DIST*2.0); 

    vec3 ballPA = pos1 * t2A + pos4 * t2B + easeOut1*fuckOffPlace;
    vec3 ballPB = pos2 * t1A + pos4 * t1B;
    vec3 ballPC = pos3 * t2A + pos6 * t2B + easeOut1*fuckOffPlace;
    vec3 ballPD = pos4* t1A + pos6 * t1B;
    vec3 ballPE = pos5 * t2A + pos2 * t2B + easeOut1*fuckOffPlace;
    vec3 ballPF = pos6* t1A + pos2 * t1B;

    float ballA = sphereSDF(p, ballPA,0.2f+0.3f*easeOut1*moduloFilter());   
    float ballB = sphereSDF(p, ballPB,0.2f+chunkyTransform*0.2f);  
    float ballC = sphereSDF(p, ballPC,0.2f+0.3f*easeOut1*moduloFilter());
    float ballD = sphereSDF(p, ballPD,0.2f+chunkyTransform*0.2f);
    float ballE = sphereSDF(p, ballPE,0.2f+0.3f*easeOut1*moduloFilter());
    float ballF = sphereSDF(p, ballPF,0.2f+chunkyTransform*0.2f);

    float blorbos = opSmoothUnion(ballA,opSmoothUnion(ballB,opSmoothUnion(ballC,opSmoothUnion(ballD,opSmoothUnion(ballE,ballF,0.6),0.6),0.6),0.6),0.6);

    //float torusesBouncingSpeed = 1.0+3.0*(bezier(beats, 8., 24.*4.0));
    //vec2 torusSize = vec2(1.0+6.0*bezier(beats, 4., 16.*4.0), 1.0);
    //float toruses = opSmoothUnion(
    //        standardTorus(p-vec3(0.0,0,sin(beats*torusesBouncingSpeed)), torusSize), 
    //        standardTorus(p-vec3(0.0,0,sin(beats*torusesBouncingSpeed+PI)), torusSize), 
    //        0.5);

    return opSmoothUnion(blorbos,standardTorus(p, vec2(1.0, 1.0)), 0.1); 
    //return opUnion(toruses,opSmoothUnion(blorbos,standardTorus(p, vec2(1.0, 1.0)), 0.1));;
}

float sceneRingWithBallsAndDistortionAppears(vec3 p, float beats) {  
    float rot = PI/3.0*beats;

    vec3 pos2 = vec3(sin(rot+PI/3.0*1.0),cos(rot+PI/3.0*1.0),0); 
    vec3 pos4 = vec3(sin(rot+PI/3.0*3.0),cos(rot+PI/3.0*3.0),0); 
    vec3 pos6 = vec3(sin(rot+PI/3.0*5.0),cos(rot+PI/3.0*5.0),0); 

    vec3 ballPA = pos4;
    vec3 ballPC = pos6;
    vec3 ballPF = pos2;

    float ballA = sphereSDF(p, ballPA,0.4f);   
    float ballC = sphereSDF(p, ballPC,0.4f);
    float ballF = sphereSDF(p, ballPF,0.4f);

    float blorbos = opSmoothUnion(ballA,opSmoothUnion(ballC,ballF,0.6),0.6);
    float portal = opSmoothUnion(blorbos,standardTorus(p, vec2(1.0, 1.0)), 0.1);


    float torusesEaseIn = bezier(beats,0.0,8.0);
    float torusA = sdTorus(rotateX(beats*PI/4.0+PI/2.0)*rotateY(beats*PI/9.0+PI)*p, vec2(1.5, 0.05));
    float torusB = sdTorus(rotateX(beats*PI/7.0+PI/2.0)*rotateZ(beats*PI/6.0+PI)*p, vec2(1.5, 0.05));
    float torusClipBehind = sdCappedCone(p, vec3(0.0,0.0,0.0), vec3(0.0,0.0,-2.0), 1.0, 2.0);
    float toruses = opSubtraction(torusClipBehind,opSmoothUnion(torusA, torusB, (1.0-torusesEaseIn)*5.0*moduloFilter() + 0.5));

    return opUnion(toruses, portal);
}

float sceneStrangeWorldBlorbo(vec3 p, float beats) {    
    vec3 runWayEnterPos = vec3(5.0,0.0,0.0);
    vec3 runWayExitPos = vec3(-5.0,0.0,0.0);

    float easeInMonster1 = bezier(beats, 0.0, 8.0);
    float easeOutMonster1 = bezier(beats, 12.0, 20.0);
    vec3 monster1P = runWayEnterPos* (1.0-easeInMonster1) + runWayExitPos* (easeOutMonster1) + p;

    vec3 ball1 = vec3(sin(beats), cos(beats), 0.0f);
    vec3 ball2 = vec3(sin(beats + 2.0f/3.0f*PI), cos(beats + 2.0f/3.0f*PI), 0.0f);
    vec3 ball3 = vec3(sin(beats + 4.0f/3.0f*PI), cos(beats + 4.0f/3.0f*PI), 0.0f);

    float dist1 = sphereSDF(monster1P, ball1,0.5f);   
    float dist2 = sphereSDF(monster1P, ball2,0.5f);  
    float dist3 = sphereSDF(monster1P, ball3,0.5f);  

    vec3 ball4 = vec3(sin(0.0f), cos(0.0f), 0.0f);
    float dist4 = sphereSDF(p, ball4,0.5f);


    float torus = sdTorus(rotateX(PI/2.0)*rotateY(beats*1.2)*rotateZ(beats*1.5)*monster1P, 
                            vec2(0.6f, 0.4f));
    float blorbos = opSmoothUnion(opSmoothUnion( opSmoothUnion(dist1, dist2, 0.5f), dist3, 0.5f), dist4, 0.5f);

    float monster1 = opSmoothSubtraction(blorbos, torus,0.3f*moduloFilter()*(1.0-easeInMonster1+easeOutMonster1) + 0.3*easeInMonster1);


    mat3 xrot = rotateX(PI/2.0f+beats);
    float torusD = sdTorus(rotateX(gl_FragCoord.x/200.f+beats*3.0)*rotateZ(gl_FragCoord.y/200.f+beats*3.0)*p , vec2(1.5f, 0.1f));
    float torusE = sdTorus(xrot*p , vec2(1.5f, 0.1f));
    
    float monster5 = opSmoothUnion(torusD, torusE, 0.5f);



    return monster1;
}

float sceneStrangeWorldOrgan(vec3 p, float beats) {
    float easeIn = bezier(beats, 0.0, 8.0);
    float easeInTwist = bezier(beats, 6.0, 10.0);
    float invEaseInTwist = 1.0-easeInTwist;
    float easeInFinalPosition = bezier(beats, 64.,76.);
    float invEaseInFinalPosition = 1.-easeInFinalPosition;
    float easeOutScene = bezier(beats, 62., 100.0);

    float angle = beats/8.0*PI;
    float fifth = 2.*PI/5.0;
    vec3 otherEnd = vec3(6.0*easeIn, 0.0, 0.0);
    vec3 pos1 = vec3(-3.0*easeIn,sin(angle),cos(angle));
    vec3 pos2 = vec3(-3.0*easeIn,sin(angle+fifth),cos(angle+fifth));
    vec3 pos3 = vec3(-3.0*easeIn,sin(angle+fifth*2.),cos(angle+fifth*2.));
    vec3 pos4 = vec3(-3.0*easeIn,sin(angle+fifth*3.),cos(angle+fifth*3.));
    vec3 pos5 = vec3(-3.0*easeIn,sin(angle+fifth*4.),cos(angle+fifth*4.));


    vec3 finalPos1L = vec3(-3.0,-1.0,sin(beats/4.+PI/5.*0.));
    vec3 finalPos2L = vec3(-3.0,-0.5,sin(beats/4.+PI/5.*1.));
    vec3 finalPos3L = vec3(-3.0,0.0,sin(beats/4.+PI/5.*2.));
    vec3 finalPos4L = vec3(-3.0,0.5,sin(beats/4.+PI/5.*3.));
    vec3 finalPos5L = vec3(-3.0,1.0,sin(beats/4.+PI/5.*4.));

    vec3 finalPos1R = vec3(3.0,-1.0,sin(beats/4.+PI+PI/5.*0.));
    vec3 finalPos2R = vec3(3.0,-0.5,sin(beats/4.+PI+PI/5.*1.));
    vec3 finalPos3R = vec3(3.0,0.0,sin(beats/4.+PI+PI/5.*2.));
    vec3 finalPos4R = vec3(3.0,0.5,sin(beats/4.+PI+PI/5.*3.));
    vec3 finalPos5R = vec3(3.0,1.0,sin(beats/4.+PI+PI/5.*4.));

    float pill1 = sdPill(p, pos1*invEaseInFinalPosition + easeInFinalPosition*finalPos1L, (pos1*invEaseInTwist + easeInTwist*pos3+otherEnd)*invEaseInFinalPosition + easeInFinalPosition*finalPos1R, 0.15,0.15);
    float pill2 = sdPill(p, pos2*invEaseInFinalPosition + easeInFinalPosition*finalPos2L, (pos2*invEaseInTwist + easeInTwist*pos4+otherEnd)*invEaseInFinalPosition + easeInFinalPosition*finalPos2R, 0.15,0.15);
    float pill3 = sdPill(p, pos3*invEaseInFinalPosition + easeInFinalPosition*finalPos3L, (pos3*invEaseInTwist + easeInTwist*pos5+otherEnd)*invEaseInFinalPosition + easeInFinalPosition*finalPos3R, 0.15,0.15);
    float pill4 = sdPill(p, pos4*invEaseInFinalPosition + easeInFinalPosition*finalPos4L, (pos4*invEaseInTwist + easeInTwist*pos1+otherEnd)*invEaseInFinalPosition + easeInFinalPosition*finalPos4R, 0.15,0.15);
    float pill5 = sdPill(p, pos5*invEaseInFinalPosition + easeInFinalPosition*finalPos5L, (pos5*invEaseInTwist + easeInTwist*pos2+otherEnd)*invEaseInFinalPosition + easeInFinalPosition*finalPos5R, 0.15,0.15);


    /*float pillS1 = sdPill(p, pos1, pos1*invEaseInTwist + easeInTwist*pos3+otherEnd, 0.05,0.05);
    float pillS2 = sdPill(p, pos2, pos2*invEaseInTwist + easeInTwist*pos4+otherEnd, 0.05,0.05);
    float pillS3 = sdPill(p, pos3, pos3*invEaseInTwist + easeInTwist*pos5+otherEnd, 0.05,0.05);
    float pillS4 = sdPill(p, pos4, pos4*invEaseInTwist + easeInTwist*pos1+otherEnd, 0.05,0.05);
    float pillS5 = sdPill(p, pos5, pos5*invEaseInTwist + easeInTwist*pos2+otherEnd, 0.05,0.05);
    */
    float backgroundBleedingIn = sphereSDF(p, vec3(0.,0.,0.), float(curtainsHeight(gl_FragCoord.xy, BEATS-TRANSITION2_END-18.) > (2.-2.2*easeOutScene))*(10.)   );

    vec2 center = RESOLUTION.xy/2.0;
    float distCenter = length(gl_FragCoord.xy-center);

    float easeOutNegaball1 = bezier(beats, 2.0, 4.0);
    //float easeInNegaball4 = bezier(beats, 92., 96.0);
    float ball1 = sphereSDF(p, vec3(0,0,0), 1.5-easeOutNegaball1*1.5);
    //float ball4 = sphereSDF(p, vec3(0,0,0), easeInNegaball4*8.0);

    float bitemarksEaseIn = bezier(beats, 40., 48.0);
    float bitemarksDistortion = bezier(beats, 40., 70.0);
    float invBitemarksDistortion = 1.0-bitemarksDistortion;
    float bitemarks = sdPill(p, vec3(-3.0, 0.0,easeInFinalPosition*100.), vec3(3.0,0.0,easeInFinalPosition*3.),
    bitemarksEaseIn*(0.2+moduloFilter()/32.0*bitemarksDistortion + sin(gl_FragCoord.x/20.0+beats) * invBitemarksDistortion),
    bitemarksEaseIn*(0.2+sin(gl_FragCoord.x/20.0+PI+beats) * bitemarksDistortion + moduloFilter()/32.0*invBitemarksDistortion ));

    float animateNegaball2 = bezier(beats, 10., 40.);
    float easeInNegaball3 = bezier(beats, 30.-1., 38.-1.);
    vec3 negaball2Pos = vec3(0.0,0.0,-3.0) + animateNegaball2*vec3(0.0, 0.0, 6.0);
    float ball2 = sphereSDF(p, negaball2Pos, 0.8+sin(distCenter*0.1+BEATS/2.));
    float ball3 = sphereSDF(p, vec3(-10.0,0.0,0.0) + vec3(20.,0.0,0.0)*easeInNegaball3, 0.5+sin(BEATS+gl_FragCoord.x/10.));
    float negaballs = opUnion(ball1, opUnion(ball2, ball3));//, ball4);
    float pills = opUnion(pill1, opUnion(pill2, opUnion(pill3, opUnion(pill4, pill5))));
    
    return opSubtraction(backgroundBleedingIn,opSmoothSubtraction(opUnion(negaballs,bitemarks),pills,  0.1)) ;
}

float sceneReturnToOurWorld(vec3 p, float beats) {

    float easeInMonster7 = bezier(beats, 0.0, 4.0);
    float easeOutMonster7 = bezier(beats, 12.0, 20.0);

    float rot = PI/3.0*beats;

    float multiplier = -4.0 + easeInMonster7*4.0 + easeOutMonster7*5.0;

    vec3 pos2 = vec3(sin(rot+PI/3.0*1.0),cos(rot+PI/3.0*1.0),0); 
    vec3 pos4 = vec3(sin(rot+PI/3.0*3.0),cos(rot+PI/3.0*3.0),0); 
    vec3 pos6 = vec3(sin(rot+PI/3.0*5.0),cos(rot+PI/3.0*5.0),0); 

    float dist1 = sphereSDF(p, pos2,0.5f);   
    float dist2 = sphereSDF(p, pos4,0.5f);  
    float dist3 = sphereSDF(p, pos6,0.5f); 
    
    float blorbos = opSmoothUnion( opSmoothUnion(dist1, dist2, 0.5f), dist3, 0.5f);
    float torus2 = sdTorus(rotateX(PI/2.0f)*p, vec2(1.0f, 0.1f));

    float monster7 = opSmoothUnion(blorbos, torus2, 0.2*(1.0-multiplier) + multiplier*sin(length(vec2(gl_FragCoord.x, gl_FragCoord.y)-RESOLUTION.xy/2.0)/16.f));

    return monster7;
}

float sceneSDF(vec3 p) {
    /*vec3 ball1 = vec3(sin(TIME/1000.f), cos(TIME/1000.f), 0.0f);
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
    float beat = 0.5*exp2(sin(BEATS*2.0*PI));*/
    
    if (BEATS < SCENE1_START)
    return introScene(p, 0.0);

    if (BEATS < SCENE1_END)
    return introScene(p, BEATS - SCENE1_START);

    if (BEATS < TRANSITION1_END)
    return opSmoothUnion(introScene(p, BEATS), standardTorus(p, vec2(bezier(BEATS, SCENE1_END, TRANSITION1_END))),0.1);

    if (BEATS < SCENE2_END)
    return sceneRingWithBallsEaseIn(p, BEATS-TRANSITION1_END);

    if (BEATS < SCENE3_END)
    return sceneRingWithBallsJuggle(p, BEATS-SCENE2_END);

    if (BEATS < SCENE4_END)
    return sceneRingWithBallsAndDistortionAppears(p, BEATS-SCENE3_END);

    if (BEATS < TRANSITION2_END) {
        vec3 tPos = p+bezier(BEATS, SCENE4_END, TRANSITION2_END)*vec3(0.0,0.0,-10.0);
        return opUnion(sceneRingWithBallsJuggle(tPos, BEATS-SCENE3_END), sceneRingWithBallsAndDistortionAppears(tPos, BEATS-SCENE3_END));
    }

    if (BEATS < SCENE5_END)
    return sceneStrangeWorldOrgan(p, BEATS - TRANSITION2_END);
    
    if (BEATS < DEMO_END)
    return sceneReturnToOurWorld(p, BEATS - SCENE5_END);

    if (BEATS < ENCORE_END)
    return sceneStrangeWorldBlorbo(p, BEATS - DEMO_END);

    return 5.0;

    /*if ((TIME + gl_FragCoord.x) <17000.f) {
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
    return monster6;*/
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

    float portalShaderFadeIn = bezier(BEATS, SCENE2_END, SCENE3_END);
    //portal light 1
    vec3 i_light1Pos = vec3(0.5*sin(BEATS/10.f), 0.5*sin(BEATS/10.f), -1.0f);
    vec3 i_light1Intensity = portalShaderFadeIn*vec3(0.8f, 0.2f, 0.6f);
    vec3 i_light1 = phongContribForLight(k_d, k_s, alpha, p, eye, i_light1Pos, i_light1Intensity);

    //portal light 2
    vec3 i_light2Pos = vec3(0.0f, 0.0, 0.0f);
    vec3 i_light2Intensity = portalShaderFadeIn*vec3(0.1f, 0.0f, 0.4f);
    vec3 i_light2 = phongContribForLight(k_d, k_s, alpha, p, eye, i_light2Pos, i_light2Intensity);

    //sun
    vec3 i_light3Pos = vec3(2.0f, 8.0f, 0.0f);
    vec3 i_light3Intensity = vec3(1.7f, 1.7f, 1.7f);
    vec3 i_light3 = phongContribForLight(k_d, k_s, alpha, p, eye, i_light3Pos, i_light3Intensity);

    return i_ambientColor + i_light1 + i_light2 + i_light3;
}

vec3 calcEnvMaterial(vec3 p, vec3 eye) {
    float strangeWorld = bezier(BEATS, SCENE4_END, TRANSITION2_END) * (1.0-bezier(BEATS, SCENE5_END, DEMO_END));

    vec3 ambientInSpace = vec3(0.0, 0.0, 0.0);
    vec3 ambientInStrangeWorld = vec3(0.01, 0.0, 0.03);
    vec3 i_K_a = (1.0-strangeWorld)*ambientInSpace + strangeWorld*ambientInStrangeWorld;
    
    vec3 diffuseInSpace = vec3(0.2, 0.2, 0.2);
    vec3 diffuseInStrangeWorld = vec3(0.1, 0.0, 0.4);
    vec3 i_K_d = (1.0-strangeWorld)*diffuseInSpace + strangeWorld*diffuseInStrangeWorld;

    vec3 shinyInSpace = vec3(1.0, 1.0, 1.0);
    vec3 shinyInStrangeWorld = vec3(0.8, 0.1, 0.8);
    vec3 i_K_s = (1.0-strangeWorld)*shinyInSpace + strangeWorld*shinyInStrangeWorld;

    float i_shininess = 10.0f;
    return phongIllumination(i_K_a, i_K_d, i_K_s, i_shininess, p, eye);
}

void main() {
    vec3 viewDir = rayDirection(60.0f, RESOLUTION.xy, gl_FragCoord.xy);
    vec3 worldDir = (VIEW_MATRIX * vec4(viewDir, 0.0f)).xyz;

    float distance = shortestDistanceToSurface(CAMERA_POS, worldDir);

    vec3 color;
    vec3 backgroundColor = scene2dShaderBack(gl_FragCoord.xy);
    if (distance > MAX_DIST - EPSILON) {
    // Didn't hit anything
        color = backgroundColor;
    } else {
        vec3 p = CAMERA_POS + distance * worldDir;
        color = calcEnvMaterial(p, CAMERA_POS);

        vec3 pNormal = estimateNormal(p);
        vec3 reflectionDirection = reflect(worldDir, pNormal);
        float reflectionDistance = shortestDistanceToSurface(p+pNormal*0.01, reflectionDirection);
        
        if ((BEATS < TRANSITION2_END || BEATS > SCENE5_END) && reflectionDistance <= MAX_DIST - EPSILON) {
            vec3 reflectionHit = p + reflectionDistance * reflectionDirection;

            color = color + calcEnvMaterial(reflectionHit, CAMERA_POS);
        }

        if (distance > FOG_DIST) {
            float fogMultiplier = (MAX_DIST-distance)/(MAX_DIST-FOG_DIST);
            color = fogMultiplier*color + (1.0-fogMultiplier)*backgroundColor;
        }

        vec3 multiplier = scene3dShaderMultiply(gl_FragCoord.xy);
        color = color*multiplier + backgroundColor*(vec3(1)-multiplier);
    }

    FRAG_COLOR = vec4(color, 1.0f);
}