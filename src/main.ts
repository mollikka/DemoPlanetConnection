import { Rectangle } from "./Rectangle";
import { ShaderProgram } from "./ShaderProgram";
import { config } from "./config";
import vertexShaderSrc from "./glsl/default.vert";
import fragmentShaderSrc from "./glsl/lesson03.frag";
import { vec3 } from "./vectors";

const run = async () => {
  const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;
  canvas.style.width = "100%";
  canvas.width = config.canvas.width;
  canvas.height = config.canvas.height;

  const gl = canvas.getContext("webgl2")!;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const screen = new Rectangle(gl);
  const shader = new ShaderProgram(gl, vertexShaderSrc, fragmentShaderSrc);
  const [shaderVertexPos] = shader.vertexAttributes("VERTEX_POS");

  const startTime = new Date().getTime();
  const bpm = 100;

  const renderNext = (time: DOMHighResTimeStamp) => {
    const now = new Date().getTime() - startTime;
    const seconds = now * 0.001;
    const beats = (seconds / 60.0) * bpm;

    screen.bind(shaderVertexPos);
    shader.use();
    shader.set({
      CAMERA_POS: vec3(0.0, 0.0, 3.0),
      CAMERA_LOOKAT: vec3(0.0, 0.0, 0.0),
      CAMERA_UP: vec3(0.0, 1.0, 0.0),
      TIME: time,
      BEATS: beats,
    });
    shader.setResolution(config.canvas.width, config.canvas.height);
    screen.render();
    requestAnimationFrame(renderNext);
  };

  requestAnimationFrame(renderNext);
};

run();
