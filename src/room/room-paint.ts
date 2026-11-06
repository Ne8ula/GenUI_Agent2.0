import { Box3, Color, Matrix4, PerspectiveCamera, ShaderMaterial, type Camera, type Object3D, type Texture } from 'three';
import { CENTER_VIEWPOINT, setFixtureViewpoint } from './spatial-fixture.ts';

// Atlas generation grid; the painting is the room seen from the centre viewpoint with the fixture lens.
export const PAINT_WIDTH = 1280;
export const PAINT_HEIGHT = 720;
const PAINT_FOV = 55;

export function paintCamera() {
  const camera = new PerspectiveCamera(PAINT_FOV, PAINT_WIDTH / PAINT_HEIGHT, 0.05, 20);
  setFixtureViewpoint(camera, CENTER_VIEWPOINT);
  return camera;
}

// Atlas PinholeCamera: camera-to-world RUB pose (Three's own camera axes), XYZW quaternion, pixel intrinsics.
export function paintPinholeCamera() {
  const camera = paintCamera();
  const focal = PAINT_HEIGHT / (2 * Math.tan(PAINT_FOV * Math.PI / 360));
  const { x, y, z, w } = camera.quaternion;
  return {
    extrinsics: { position: camera.position.toArray(), quaternion: [x, y, z, w], coordinateSystem: 'rub' as const },
    intrinsics: { fx: focal, fy: focal, cx: PAINT_WIDTH / 2, cy: PAINT_HEIGHT / 2, width: PAINT_WIDTH, height: PAINT_HEIGHT },
  };
}

// Planar view-space depth per pixel (row 0 = top); 0 marks no surface, such as an open doorway.
// shortcut: exact only for axis-aligned boxes (procedural rooms turn in 90° steps); upgrade to triangle ray casting for free-form meshes.
export function renderPaintDepth(root: Object3D): Float32Array {
  root.updateMatrixWorld(true);
  const boxes: Box3[] = [];
  root.traverse(object => { if ((object as { isMesh?: boolean }).isMesh && object.visible) boxes.push(new Box3().setFromObject(object)); });
  const camera = paintCamera();
  const { fx, fy, cx, cy } = paintPinholeCamera().intrinsics;
  const m = camera.matrixWorld.elements, o = camera.position;
  const depth = new Float32Array(PAINT_WIDTH * PAINT_HEIGHT);
  const lo = [0, 0, 0], hi = [0, 0, 0], origin = [o.x, o.y, o.z], direction = [0, 0, 0];
  for (let v = 0; v < PAINT_HEIGHT; v += 1) for (let u = 0; u < PAINT_WIDTH; u += 1) {
    // Camera ray with a unit optical-axis component, so the hit parameter is planar depth.
    const a = (u + 0.5 - cx) / fx, b = -(v + 0.5 - cy) / fy;
    direction[0] = m[0] * a + m[4] * b - m[8]; direction[1] = m[1] * a + m[5] * b - m[9]; direction[2] = m[2] * a + m[6] * b - m[10];
    let best = Infinity;
    for (const box of boxes) {
      lo[0] = box.min.x; lo[1] = box.min.y; lo[2] = box.min.z; hi[0] = box.max.x; hi[1] = box.max.y; hi[2] = box.max.z;
      let near = 0.01, far = best;
      for (let axis = 0; axis < 3 && near <= far; axis += 1) {
        const d = direction[axis], p = origin[axis];
        if (Math.abs(d) < 1e-12) { if (p < lo[axis] || p > hi[axis]) near = Infinity; continue; }
        let t0 = (lo[axis] - p) / d, t1 = (hi[axis] - p) / d;
        if (t0 > t1) [t0, t1] = [t1, t0];
        if (t0 > near) near = t0;
        if (t1 < far) far = t1;
      }
      if (near <= far && near < best) best = near;
    }
    depth[v * PAINT_WIDTH + u] = Number.isFinite(best) ? best : 0;
  }
  return depth;
}

// Projects the painting from its camera (the app's centre lens unless a fixture supplies its own) onto whatever surface is drawn;
// hidden surfaces receive stretched paint. progress reveals it over baseMap/baseColor: wash 0 fades, wash 1 spreads from the image edges inward.
export function createPaintMaterial(texture: Texture, camera: Camera = paintCamera()) {
  return new ShaderMaterial({
    uniforms: {
      paintMap: { value: texture },
      paintMatrix: { value: new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse) },
      baseMap: { value: null as Texture | null },
      hasBase: { value: 0 },
      baseColor: { value: new Color(0x8a857a) },
      progress: { value: 1 },
      wash: { value: 0 },
    },
    vertexShader: `uniform mat4 paintMatrix;
varying vec4 vPaint;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPaint = paintMatrix * world;
  gl_Position = projectionMatrix * viewMatrix * world;
}`,
    // Row 0 of the image is its top; the texture is uploaded unflipped.
    fragmentShader: `uniform sampler2D paintMap;
uniform sampler2D baseMap;
uniform vec3 baseColor;
uniform float hasBase;
uniform float progress;
uniform float wash;
varying vec4 vPaint;
void main() {
  vec2 uv = clamp(vPaint.xy / max(vPaint.w, 1e-4) * 0.5 + 0.5, 0.0, 1.0);
  vec2 st = vec2(uv.x, 1.0 - uv.y);
  vec4 base = mix(vec4(baseColor, 1.0), texture2D(baseMap, st), hasBase);
  float edge = 2.0 * min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float front = progress * 1.15;
  gl_FragColor = mix(base, texture2D(paintMap, st), mix(progress, 1.0 - smoothstep(front - 0.15, front, edge), wash));
  #include <colorspace_fragment>
}`,
  });
}
