export class Rectangle {
  gl: WebGL2RenderingContext;
  vertexBuffer: WebGLBuffer;
  textureCoordBuffer: WebGLBuffer;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.vertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

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
    );
  }

  bind(vertexPos: number) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.vertexAttribPointer(vertexPos, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(vertexPos);
  }

  render() {
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}
