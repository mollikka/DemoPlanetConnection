import { Rectangle } from "./Rectangle";
import { ShaderProgram } from "./ShaderProgram";
import { config } from "./config";
import vertexShaderSrc from "./glsl/default.vert";
import lesson01Src from "./glsl/lesson01.frag";

const run = async () => {
  const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;
  canvas.style.width = "100%";
  canvas.width = config.canvas.width;
  canvas.height = config.canvas.height;

  const gl = canvas.getContext("webgl2")!;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const screen = new Rectangle(gl);
  const shader = new ShaderProgram(gl, vertexShaderSrc, lesson01Src);
  const [shaderVertexPos] = shader.vertexAttributes("VERTEX_POS");

  const renderNext = (time: DOMHighResTimeStamp) => {
    screen.bind(shaderVertexPos);
    shader.use();
    shader.set({ TIME: time });
    shader.setResolution(config.canvas.width, config.canvas.height);
    screen.render();
    requestAnimationFrame(renderNext);
  };

  requestAnimationFrame(renderNext);
};

run();
