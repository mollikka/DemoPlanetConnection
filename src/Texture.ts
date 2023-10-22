export const loadTexture = (
  gl: WebGL2RenderingContext,
  url: URL
): Promise<WebGLTexture> =>
  new Promise((resolve, reject) => {
    const texture = gl.createTexture()!;
    const image = new Image();

    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);

      resolve(texture);
    };

    image.onerror = reject;
    image.src = url.href;
  });
