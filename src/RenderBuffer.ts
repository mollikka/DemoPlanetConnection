import { config } from "./config";

const level = 0;

export class RenderBuffer {
  gl: WebGL2RenderingContext;
  vertexBuffer: WebGLBuffer;
  //textureCoordBuffer: WebGLBuffer;
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.vertexBuffer = gl.createBuffer()!;
    this.framebuffer = gl.createFramebuffer()!;
    /*gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    const vertexPositions = [1.0, -1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0];
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(vertexPositions),
      gl.STATIC_DRAW
    );

    const texturePositions = [1, 0, 0, 0, 1, 1, 0, 1];
    this.textureCoordBuffer = gl.createBuffer()!;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(texturePositions),
      gl.STATIC_DRAW
    );*/

    // create to render to
    const targetTextureWidth = config.canvas.width;
    const targetTextureHeight = config.canvas.height;
    this.texture = this.gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // define size and format of level 0
    const internalFormat = gl.RGBA;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const data = null;
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      targetTextureWidth,
      targetTextureHeight,
      border,
      format,
      type,
      data
    );

    // set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  bind(vertexPos: number) {
    /*this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.vertexAttribPointer(vertexPos, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(vertexPos);*/

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

    // Create and bind the framebuffer
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);

    // attach the texture as the first color attachment
    const attachmentPoint = this.gl.COLOR_ATTACHMENT0;
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      attachmentPoint,
      this.gl.TEXTURE_2D,
      this.texture,
      level
    );
  }

  render() {
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}
