import { Vec2, Vec3 } from "./vectors";
import { Defines, loadShader } from "./webgl";

export class ShaderProgram {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  resolutionLocation: number;

  constructor(
    gl: WebGL2RenderingContext,
    vertexShader: string,
    fragmentShader: string,
    defines?: Defines
  ) {
    this.gl = gl;

    const vs = loadShader(gl, gl.VERTEX_SHADER, vertexShader, defines);
    const fs = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShader, defines);

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw (
        "Unable to initialize the shader program: " +
        gl.getProgramInfoLog(this.program)
      );
    }

    this.resolutionLocation = this.vertexAttribute("BUFFER_RESOLUTION");
  }

  use() {
    this.gl.useProgram(this.program);
  }

  setResolution(width: number, height: number) {
    this.gl.vertexAttrib2f(this.resolutionLocation, width, height);
  }

  set(params: object) {
    Object.entries(params).forEach(([name, value]) => {
      if (typeof value === "number") {
        this.float(name)(value);
      } else if (Array.isArray(value)) {
        if (value.length === 2) {
          this.vec2(name)(value as Vec2);
        }
        if (value.length === 3) {
          this.vec3(name)(value as Vec3);
        }
      }
    });
  }

  float(name: string) {
    const location = this.uniform(name);
    return (value: number) => {
      return this.gl.uniform1f(location, value);
    };
  }

  vec2(name: string) {
    const location = this.uniform(name);
    return (v: Vec2) => {
      return this.gl.uniform2f(location, ...v);
    };
  }

  vec3(name: string) {
    const location = this.uniform(name);
    return (v: Vec3) => {
      return this.gl.uniform3f(location, ...v);
    };
  }

  setupSamplers(...names: string[]) {
    this.use();
    names.forEach((name, index) => {
      this.sampler(name)(index);
    });
  }

  sampler(name: string) {
    const location = this.uniform(name);
    return (value: number) => this.gl.uniform1i(location, value);
  }

  uniform(name: string): WebGLUniformLocation | null {
    const location = this.gl.getUniformLocation(this.program, name);
    // if (location === null) {
    //   console.warn(`Uniform ${name} does not exist`);
    // }
    return location;
  }

  uniforms(...names: string[]): (WebGLUniformLocation | null)[] {
    return names.map(this.uniform.bind(this));
  }

  vertexAttribute(name: string): number {
    const location = this.gl.getAttribLocation(this.program, name);
    if (location < 0) {
      console.warn(`Vertex attribute ${name} does not exist`);
    }
    return location;
  }

  vertexAttributes(...names: string[]): number[] {
    return names.map(this.vertexAttribute.bind(this));
  }
}
