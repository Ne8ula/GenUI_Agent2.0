import { BufferAttribute, BufferGeometry, Color, Matrix4, Mesh, Points, ShaderMaterial, Vector3, type Camera, type Material, type Object3D, type Texture } from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

// Replay construction looks. Room surfaces change area by area: particles lift off an area, drift and settle back carrying the
// new look, and the surface under them takes it halfway through. Objects grow outward from where they touch the floor or table.
// No crossfades, no screen effects.

// When each area of the room changes, as a share of the stage: a smooth field over world position (metres), in [0, 1].
const AREA_GLSL = `float areaTime(vec3 p) {
  float a = sin(p.x * 1.3 + sin(p.z * 0.9) * 1.7) * cos(p.y * 1.1 - p.z * 0.6) + 0.6 * sin(p.z * 1.7 + p.y * 0.8 + 1.3) * cos(p.x * 0.7 + 2.1);
  return clamp(0.5 + a / 3.2, 0.0, 1.0);
}
float areaProgress(vec3 p, float progress) { return clamp((progress - 0.7 * areaTime(p)) / 0.3, 0.0, 1.0); }`;
const SHADE_GLSL = 'float shade(vec3 n) { return 0.55 + 0.45 * max(dot(normalize(n), normalize(vec3(-0.4, 0.8, 0.45))), 0.0); }';

// What a surface shows: nothing, shaded grey clay, the projected stage image, or the object's own texture (shaded).
export const LOOK = { none: 0, grey: 1, image: 2, self: 3 } as const;
export type Look = typeof LOOK[keyof typeof LOOK];
// How it changes from base to top: not at all (top shown), area by area through particles, or growing from a contact point.
export const REVEAL = { still: 0, areas: 1, grow: 2 } as const;

const projected = `vec2 projectedSt(vec4 p) { vec2 uv = clamp(p.xy / max(p.w, 1e-4) * 0.5 + 0.5, 0.0, 1.0); return vec2(uv.x, 1.0 - uv.y); }`;

// Surfaces of the room and, in the paint and final stages, of the objects. The stage images are projected from the fixture camera.
// For an object, idMap/selfId mark where the recorded image shows it hidden behind something else; there it uses the behind images
// (its own surrounding paint), or its own texture without them.
export function createRevealMaterial(projector: Camera, grey: Color, rim: Color) {
  return new ShaderMaterial({
    uniforms: {
      paintMatrix: { value: new Matrix4().multiplyMatrices(projector.projectionMatrix, projector.matrixWorldInverse) },
      topMap: { value: null as Texture | null }, baseMap: { value: null as Texture | null },
      topLook: { value: LOOK.grey as number }, baseLook: { value: LOOK.none as number }, reveal: { value: REVEAL.still as number },
      progress: { value: 1 }, contact: { value: new Vector3() }, reach: { value: 1 },
      greyColor: { value: grey }, rimColor: { value: rim },
      idMap: { value: null as Texture | null }, selfId: { value: 0 }, selfMap: { value: null as Texture | null }, hasSelf: { value: 0 },
      topBehind: { value: null as Texture | null }, baseBehind: { value: null as Texture | null }, hasBehind: { value: 0 },
    },
    vertexShader: `uniform mat4 paintMatrix;
varying vec4 vPaint;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPaint = paintMatrix * world;
  vUv = uv;
  vNormalW = mat3(modelMatrix) * normal;
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`,
    fragmentShader: `uniform sampler2D topMap;
uniform sampler2D baseMap;
uniform sampler2D idMap;
uniform sampler2D selfMap;
uniform int topLook;
uniform int baseLook;
uniform int reveal;
uniform float progress;
uniform vec3 contact;
uniform float reach;
uniform vec3 greyColor;
uniform vec3 rimColor;
uniform float selfId;
uniform float hasSelf;
uniform sampler2D topBehind;
uniform sampler2D baseBehind;
uniform float hasBehind;
varying vec4 vPaint;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorld;
${AREA_GLSL}
${SHADE_GLSL}
${projected}
void main() {
  vec2 st = projectedSt(vPaint);
  bool hidden = selfId > 0.0 && abs(texture2D(idMap, st).r - selfId) > 0.03;
  bool top = true;
  float rim = 0.0;
  if (reveal == 1) {
    // While its particles are in flight the surface changes underneath them, halfway through.
    top = areaProgress(vWorld, progress) >= 0.5;
  } else if (reveal == 2) {
    float d = length(vWorld - contact), front = progress * reach;
    top = d < front;
    rim = progress > 0.0 && progress < 1.0 ? 1.0 - smoothstep(0.0, 0.012 + 0.02 * reach, abs(d - front)) : 0.0;
  }
  int look = top ? topLook : baseLook;
  if (look == 0) discard;
  vec3 self = mix(greyColor, texture2D(selfMap, vUv).rgb, hasSelf) * shade(vNormalW);
  vec3 behind = hasBehind > 0.5 ? (top ? texture2D(topBehind, st).rgb : texture2D(baseBehind, st).rgb) : self;
  vec3 c = look == 1 ? greyColor * shade(vNormalW) : look == 3 ? self : hidden ? behind : (top ? texture2D(topMap, st).rgb : texture2D(baseMap, st).rgb);
  gl_FragColor = vec4(mix(c, rimColor, rim * 0.85), 1.0);
  #include <colorspace_fragment>
}`,
  });
}

// Patches a real material (an object's own, or its outline) to grow from a contact point: beyond `clay` it is not there yet,
// between `colour` and `clay` it is grey clay, inside `colour` it is itself. A thin rim marks the clay front. invert keeps only
// what has not grown yet (for the object's outline lines).
export type GrowUniforms = { contact: { value: Vector3 }; clay: { value: number }; colour: { value: number }; reach: { value: number } };
export function createGrowUniforms(): GrowUniforms {
  return { contact: { value: new Vector3() }, clay: { value: 0 }, colour: { value: 0 }, reach: { value: 1 } };
}
export function growMaterial<M extends Material>(original: M, grow: GrowUniforms, options: { grey: Color; rim: Color; invert?: boolean }): M {
  const material = original.clone() as M;
  const invert = Boolean(options.invert);
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { growContact: grow.contact, growClay: grow.clay, growColour: grow.colour, growReach: grow.reach, growGrey: { value: options.grey }, growRim: { value: options.rim } });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrowWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvGrowWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    const head = '#include <common>\nvarying vec3 vGrowWorld;\nuniform vec3 growContact;\nuniform float growClay;\nuniform float growColour;\nuniform float growReach;\nuniform vec3 growGrey;\nuniform vec3 growRim;';
    const front = 'float growD = length(vGrowWorld - growContact) / max(growReach, 1e-4);';
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', head);
    if (invert) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${front}\nif (growD < growClay) discard;`);
    } else {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${front}\nif (growD > growClay) discard;`)
        .replace('#include <map_fragment>', '#include <map_fragment>\nif (growD > growColour) diffuseColor.rgb = growGrey;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nif (growClay < 1.0) totalEmissiveRadiance += growRim * (1.0 - smoothstep(0.0, 0.03, abs(growD - growClay)));');
    }
  };
  material.customProgramCacheKey = () => `${original.customProgramCacheKey()}|grow${invert ? '-outline' : ''}`;
  return material;
}

// Room outlines leave each area as it reaches halfway through its change; progress < 0 keeps them all.
export function areaClipLines(material: Material, progress: { value: number }) {
  material.onBeforeCompile = shader => {
    shader.uniforms.areaLineProgress = progress;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vAreaWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvAreaWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vAreaWorld;\nuniform float areaLineProgress;\n${AREA_GLSL}`)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (areaLineProgress >= 0.0 && areaProgress(vAreaWorld, areaLineProgress) >= 0.5) discard;');
  };
  material.customProgramCacheKey = () => 'area-lines';
}

// Room particles: points sampled over the given meshes (in `parent`'s space). A point is visible only while its area changes:
// it lifts off along the surface normal, drifts, and settles back, carrying the old look until halfway and the new look after.
export function createRoomParticles(meshes: readonly Mesh[], parent: Object3D, count: number, surface: ShaderMaterial) {
  parent.updateMatrixWorld(true);
  const toParent = new Matrix4().copy(parent.matrixWorld).invert();
  const parts = meshes.map(mesh => {
    const geometry = mesh.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(toParent, mesh.matrixWorld));
    const position = geometry.attributes.position, a = new Vector3(), b = new Vector3(), c = new Vector3();
    let area = 0;
    const faces = (geometry.index?.count ?? position.count) / 3;
    for (let f = 0; f < faces; f++) {
      const [i, j, k] = [0, 1, 2].map(n => geometry.index ? geometry.index.getX(f * 3 + n) : f * 3 + n);
      a.fromBufferAttribute(position, i); b.fromBufferAttribute(position, j); c.fromBufferAttribute(position, k);
      area += b.sub(a).cross(c.sub(a)).length() / 2;
    }
    return { geometry, area };
  });
  const total = parts.reduce((sum, part) => sum + part.area, 0);
  const positions: number[] = [], normals: number[] = [], seeds: number[] = [];
  const p = new Vector3(), n = new Vector3();
  for (const part of parts) {
    const sampler = new MeshSurfaceSampler(new Mesh(part.geometry)).build();
    const share = Math.round(count * part.area / Math.max(total, 1e-6));
    for (let s = 0; s < share; s++) { sampler.sample(p, n); positions.push(p.x, p.y, p.z); normals.push(n.x, n.y, n.z); seeds.push(Math.random()); }
    part.geometry.dispose();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('aNormal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(seeds), 1));
  const u = surface.uniforms;
  const material = new ShaderMaterial({
    // Shares the surface's uniform objects, so particles always match what their surface is doing.
    uniforms: { paintMatrix: u.paintMatrix, topMap: u.topMap, baseMap: u.baseMap, topLook: u.topLook, baseLook: u.baseLook, reveal: u.reveal, progress: u.progress, greyColor: u.greyColor, pointScale: { value: 1 } },
    vertexShader: `attribute vec3 aNormal;
attribute float aSeed;
uniform mat4 paintMatrix;
uniform float progress;
uniform int reveal;
uniform float pointScale;
varying vec4 vPaint;
varying float vLp;
varying vec3 vN;
${AREA_GLSL}
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vN = mat3(modelMatrix) * aNormal;
  vPaint = paintMatrix * world;
  float lp = areaProgress(world.xyz, progress + (aSeed - 0.5) * 0.04);
  vLp = lp;
  float lift = sin(3.14159265 * lp);
  vec3 drift = vec3(sin(aSeed * 40.0 + lp * 4.0), 0.6 * cos(aSeed * 23.0 + lp * 3.0), cos(aSeed * 31.0 + lp * 4.0));
  world.xyz += (normalize(vN) * 0.22 + drift * 0.1) * lift;
  vec4 view = viewMatrix * world;
  gl_Position = projectionMatrix * view;
  bool flying = reveal == 1 && lp > 0.0 && lp < 1.0;
  gl_PointSize = flying ? (1.2 + 1.6 * lift) * pointScale * clamp(5.0 / max(-view.z, 0.5), 0.7, 1.3) : 0.0;
}`,
    fragmentShader: `uniform sampler2D topMap;
uniform sampler2D baseMap;
uniform int topLook;
uniform int baseLook;
uniform vec3 greyColor;
varying vec4 vPaint;
varying float vLp;
varying vec3 vN;
${SHADE_GLSL}
${projected}
void main() {
  if (vLp <= 0.0 || vLp >= 1.0 || length(gl_PointCoord - 0.5) > 0.5) discard;
  bool top = vLp >= 0.5;
  int look = top || baseLook == 0 ? topLook : baseLook;
  vec2 st = projectedSt(vPaint);
  vec3 c = look == 2 ? (top || baseLook == 0 ? texture2D(topMap, st).rgb : texture2D(baseMap, st).rgb) : greyColor * shade(vN);
  gl_FragColor = vec4(c * (1.0 + 0.35 * sin(3.14159265 * vLp)), 1.0);
  #include <colorspace_fragment>
}`,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
