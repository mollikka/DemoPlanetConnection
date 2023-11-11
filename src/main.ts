import { Rectangle } from "./Rectangle";
import { ShaderProgram } from "./ShaderProgram";
import { config } from "./config";
import vertexShaderSrc from "./glsl/default.vert";
import fragmentShaderSrc from "./glsl/lesson03.frag";
import { vec3 } from "./vectors";

export const init = async () => {
  const infoLoading =
    document.querySelector<HTMLCanvasElement>("#info-loading")!;
  const infoPlay = document.querySelector<HTMLCanvasElement>("#info-play")!;
  const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;

  canvas.style.width = "100%";
  canvas.width = config.canvas.width;
  canvas.height = config.canvas.height;

  const audio = new Audio("music.ogg");
  audio.currentTime = 0;

  const gl = canvas.getContext("webgl2")!;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const screen = new Rectangle(gl);
  const shader = new ShaderProgram(gl, vertexShaderSrc, fragmentShaderSrc);
  const [shaderVertexPos] = shader.vertexAttributes("VERTEX_POS");
  const bpm = 120;

  const renderNext = (time: DOMHighResTimeStamp) => {
    infoPlay.hidden = !audio.paused;

    const seconds = audio.currentTime;
    const beats = (seconds / 60.0) * bpm;

    screen.bind(shaderVertexPos);
    shader.use();
    shader.set({
      CAMERA_POS: vec3(0.0, 0.0, 3.0),
      CAMERA_LOOKAT: vec3(0.0, 0.0, 0.0),
      CAMERA_UP: vec3(0.0, 1.0, 0.0),
      BEATS: beats,
    });
    shader.setResolution(config.canvas.width, config.canvas.height);
    screen.render();
    requestAnimationFrame(renderNext);
  };

  infoLoading.hidden = true;

  requestAnimationFrame(renderNext);

  window.onkeydown = function (e) {
    console.log(e.key);
    if (e.key == "Enter") {
      audio.currentTime = 0;
      audio.play();
      return;
    }
    if (e.key == " ") {
      console.log("Pause");
      audio.paused ? audio.play() : audio.pause();
      return;
    }
    if (e.key == "ArrowRight") {
      audio.currentTime += 10;
      return;
    }
    if (e.key == "ArrowLeft") {
      audio.currentTime -= 10;
      return;
    }
  };

  return audio;
};
