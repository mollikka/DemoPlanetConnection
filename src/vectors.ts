export type Vec = Vec2 | Vec3;

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export const vec2 = (x: number, y: number): Vec2 => [x, y];
export const vec3 = (x: number, y: number, z: number): Vec3 => [x, y, z];

export const length = (v: Vec): number =>
  Math.sqrt(v.map((a) => a * a).reduce((a, b) => a + b));

export const multiply = <T extends Vec>(v: T, coef: number): T =>
  v.map((a) => a * coef) as T;

export const normalize = <T extends Vec>(v: T): T => multiply(v, 1 / length(v));
