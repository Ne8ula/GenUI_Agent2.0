import { Matrix4, Vector3, type PerspectiveCamera } from 'three';
import { VIEWPOINT_LIMITS, type Viewpoint } from './spatial-fixture.ts';

type Size = { width: number; height: number };
type Rect = Size & { x: number; y: number };
type NeutralEye = { xMm: number; yMm: number; distanceMm: number };

// Rectangles use top-left origins (+y down); eye/displacement use display center (+y up), in mm.
export type CalibrationGeometry = {
  displayMm: Size;
  contentDisplayMm: Rect;
  contentCss: Size;
  viewportCss: Rect;
  // Observed desktop/browser geometry only invalidates measurements; it never estimates physical placement.
  screenCss: Rect;
  windowCss: Rect;
  devicePixelRatio: number;
  viewportScale: number;
};

export type CalibrationInput = {
  geometry: CalibrationGeometry;
  eye: NeutralEye;
  neutral: Viewpoint;
  horizontal: { point: Viewpoint; displacementMm: number };
  vertical: { point: Viewpoint; displacementMm: number };
};

export type ViewpointCalibration = {
  readonly geometry: CalibrationGeometry;
  readonly eye: NeutralEye;
  readonly neutral: Viewpoint;
  readonly inverse: readonly [number, number, number, number];
  readonly viewportMm: Rect;
  readonly worldUnitsPerMm: number;
  readonly limitsMm: Viewpoint;
};

export type TrackedViewpoint = {
  timestampMs: number;
  rawMm: Viewpoint;
  offsetMm: Viewpoint;
};

export const MAX_SAMPLE_AGE_MS = 200;
const MAX_DISPLACEMENT_MM = 300;
const MAX_SPEED_MM_PER_SECOND = 1500;
const SMOOTHING_MS = 80;

function inRange(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function validSize(size: Size) {
  return inRange(size.width, 1, 100000) && inRange(size.height, 1, 100000);
}

function validRect(rect: Rect) {
  return validSize(rect) && Number.isFinite(rect.x) && Number.isFinite(rect.y);
}

function contained(rect: Rect, size: Size) {
  return validRect(rect) && rect.x >= 0 && rect.y >= 0
    && rect.x + rect.width <= size.width && rect.y + rect.height <= size.height;
}

function normalized(point: Viewpoint) {
  return inRange(point.x, 0, 1) && inRange(point.y, 0, 1);
}

function within(point: Viewpoint, limits: Viewpoint) {
  return inRange(point.x, -limits.x, limits.x) && inRange(point.y, -limits.y, limits.y);
}

export function mapViewportToDisplay(geometry: CalibrationGeometry): Rect | null {
  const { displayMm, contentDisplayMm, contentCss, viewportCss } = geometry;
  // Acceptance limits, not guessed hardware defaults: 0.1–5 m displays and >=1 mm visible rectangles.
  if (!inRange(displayMm.width, 100, 5000) || !inRange(displayMm.height, 100, 5000)
    || !contained(contentDisplayMm, displayMm) || !validSize(contentCss) || !contained(viewportCss, contentCss)
    || !validRect(geometry.screenCss) || !validRect(geometry.windowCss)
    || !inRange(geometry.devicePixelRatio, 0.1, 16) || !inRange(geometry.viewportScale, 0.1, 16)) return null;
  const scaleX = contentDisplayMm.width / contentCss.width;
  const scaleY = contentDisplayMm.height / contentCss.height;
  const viewportMm = {
    x: contentDisplayMm.x + viewportCss.x * scaleX,
    y: contentDisplayMm.y + viewportCss.y * scaleY,
    width: viewportCss.width * scaleX,
    height: viewportCss.height * scaleY,
  };
  return contained(viewportMm, displayMm) ? viewportMm : null;
}

function validEye(eye: NeutralEye, displayMm: Size) {
  return inRange(eye.distanceMm, 100, 5000) && inRange(eye.xMm, -displayMm.width, displayMm.width)
    && inRange(eye.yMm, -displayMm.height, displayMm.height);
}

export function createViewpointCalibration(input: CalibrationInput): ViewpointCalibration | null {
  const viewportMm = mapViewportToDisplay(input.geometry);
  const { eye, neutral, horizontal, vertical } = input;
  if (!viewportMm || !validEye(eye, input.geometry.displayMm)
    || !normalized(neutral) || !normalized(horizontal.point) || !normalized(vertical.point)
    || !inRange(Math.abs(horizontal.displacementMm), 10, MAX_DISPLACEMENT_MM)
    || !inRange(Math.abs(vertical.displacementMm), 10, MAX_DISPLACEMENT_MM)) return null;

  const hx = horizontal.point.x - neutral.x;
  const hy = horizontal.point.y - neutral.y;
  const vx = vertical.point.x - neutral.x;
  const vy = vertical.point.y - neutral.y;
  const hLength = Math.hypot(hx, hy);
  const vLength = Math.hypot(vx, vy);
  const determinant = hx * vy - hy * vx;
  const gainRatio = (hLength / Math.abs(horizontal.displacementMm)) / (vLength / Math.abs(vertical.displacementMm));
  // Reject noise-sized baselines, nearly parallel axes and >10:1 directional sensitivity.
  if (hLength < 0.01 || vLength < 0.01 || Math.abs(determinant) < 0.15 * hLength * vLength
    || !inRange(gainRatio, 0.1, 10)) return null;

  // Fictional scale: the full measured display spans the existing room's 6-unit interior width.
  const worldUnitsPerMm = 6 / input.geometry.displayMm.width;
  const calibration: ViewpointCalibration = {
    geometry: structuredClone(input.geometry),
    eye: { ...eye },
    neutral: { ...neutral },
    inverse: [
      horizontal.displacementMm * vy / determinant, -horizontal.displacementMm * vx / determinant,
      -vertical.displacementMm * hy / determinant, vertical.displacementMm * hx / determinant,
    ],
    viewportMm,
    worldUnitsPerMm,
    limitsMm: {
      x: Math.min(MAX_DISPLACEMENT_MM, VIEWPOINT_LIMITS.x * input.geometry.displayMm.width / 6),
      y: Math.min(MAX_DISPLACEMENT_MM, VIEWPOINT_LIMITS.y * input.geometry.displayMm.width / 6),
    },
  };
  if (!calibration.inverse.every(Number.isFinite)) return null;
  return validProjectionBounds(calibration) ? calibration : null;
}

function validProjectionBounds(calibration: ViewpointCalibration) {
  for (const x of [-calibration.limitsMm.x, 0, calibration.limitsMm.x]) {
    for (const y of [-calibration.limitsMm.y, 0, calibration.limitsMm.y]) {
      if (!projectionFor(calibration, { x, y })) return false;
    }
  }
  return true;
}

// Neutral reset retains axes; the caller clears sample history. Changed distance requires new measured axes.
export function resetNeutralReference(calibration: ViewpointCalibration, neutral: Viewpoint, eye: NeutralEye): ViewpointCalibration | null {
  if (!normalized(neutral) || !validEye(eye, calibration.geometry.displayMm) || eye.distanceMm !== calibration.eye.distanceMm) return null;
  const next = { ...calibration, neutral: { ...neutral }, eye: { ...eye } };
  return validProjectionBounds(next) ? next : null;
}

export function calibrationMatchesGeometry(calibration: ViewpointCalibration, geometry: CalibrationGeometry, eye: NeutralEye) {
  const previous = calibration.geometry;
  for (const group of ['displayMm', 'contentDisplayMm', 'contentCss', 'viewportCss', 'screenCss', 'windowCss'] as const) {
    const before = previous[group];
    const after = geometry[group];
    if (before.width !== after.width || before.height !== after.height) return false;
    if ('x' in before && 'x' in after && (before.x !== after.x || before.y !== after.y)) return false;
  }
  return previous.devicePixelRatio === geometry.devicePixelRatio && previous.viewportScale === geometry.viewportScale
    && calibration.eye.xMm === eye.xMm && calibration.eye.yMm === eye.yMm && calibration.eye.distanceMm === eye.distanceMm;
}

// shortcut: local 2D approximation at the measured distance; recalibrate when distance/camera placement changes, not live depth or rotation.
export function displacementFromLandmark(calibration: ViewpointCalibration, point: Viewpoint): Viewpoint | null {
  if (!normalized(point)) return null;
  const x = point.x - calibration.neutral.x;
  const y = point.y - calibration.neutral.y;
  const [xx, xy, yx, yy] = calibration.inverse;
  const displacement = { x: xx * x + xy * y, y: yx * x + yy * y };
  return within(displacement, { x: MAX_DISPLACEMENT_MM, y: MAX_DISPLACEMENT_MM }) ? displacement : null;
}

// All times share one monotonic clock. A null result holds the view; a >200 ms gap needs explicit reacquisition by the caller.
export function updateTrackedViewpoint(
  calibration: ViewpointCalibration,
  previous: TrackedViewpoint | null,
  sample: { point: Viewpoint; timestampMs: number },
  nowMs: number,
): TrackedViewpoint | null {
  if (!Number.isFinite(nowMs) || !inRange(sample.timestampMs, 0, nowMs)
    || nowMs - sample.timestampMs > MAX_SAMPLE_AGE_MS) return null;
  const rawMm = displacementFromLandmark(calibration, sample.point);
  if (!rawMm) return null;
  const bounded = {
    x: Math.max(-calibration.limitsMm.x, Math.min(calibration.limitsMm.x, rawMm.x)),
    y: Math.max(-calibration.limitsMm.y, Math.min(calibration.limitsMm.y, rawMm.y)),
  };
  if (!within(bounded, calibration.limitsMm)) return null;
  if (!previous) return { timestampMs: sample.timestampMs, rawMm, offsetMm: bounded };
  const elapsedMs = sample.timestampMs - previous.timestampMs;
  if (!inRange(previous.timestampMs, 0, sample.timestampMs) || elapsedMs <= 0 || elapsedMs > MAX_SAMPLE_AGE_MS
    || nowMs - previous.timestampMs > MAX_SAMPLE_AGE_MS
    || !within(previous.rawMm, { x: MAX_DISPLACEMENT_MM, y: MAX_DISPLACEMENT_MM })
    || !within(previous.offsetMm, calibration.limitsMm)
    || Math.hypot(rawMm.x - previous.rawMm.x, rawMm.y - previous.rawMm.y) * 1000 / elapsedMs > MAX_SPEED_MM_PER_SECOND) return null;
  const alpha = -Math.expm1(-elapsedMs / SMOOTHING_MS);
  return {
    timestampMs: sample.timestampMs,
    rawMm,
    offsetMm: {
      x: previous.offsetMm.x + (bounded.x - previous.offsetMm.x) * alpha,
      y: previous.offsetMm.y + (bounded.y - previous.offsetMm.y) * alpha,
    },
  };
}

function projectionFor(calibration: ViewpointCalibration, offsetMm: Viewpoint) {
  if (!within(offsetMm, calibration.limitsMm)) return null;
  const { geometry, eye, viewportMm, worldUnitsPerMm: scale } = calibration;
  const eyeX = (eye.xMm + offsetMm.x) * scale;
  const eyeY = (eye.yMm + offsetMm.y) * scale;
  const distance = eye.distanceMm * scale;
  // Display center is fixed at (0, 1.7, 2.5); clipping at that plane removes the front wall at z=3..3.16.
  const position = new Vector3(eyeX, 1.7 + eyeY, 2.5 + distance);
  const near = distance;
  const far = near + 20;
  const left = (viewportMm.x - geometry.displayMm.width / 2) * scale - eyeX;
  const right = left + viewportMm.width * scale;
  const top = (geometry.displayMm.height / 2 - viewportMm.y) * scale - eyeY;
  const bottom = top - viewportMm.height * scale;
  if (![scale, ...position.toArray(), near, far, left, right, top, bottom].every(Number.isFinite)
    || scale <= 0 || near <= 0 || far <= near || left >= right || bottom >= top) return null;
  // near equals eye-to-display distance, so the measured screen bounds are also the near-plane bounds.
  const matrix = new Matrix4().makePerspective(left, right, top, bottom, near, far);
  const determinant = matrix.determinant();
  if (!matrix.elements.every(Number.isFinite) || !Number.isFinite(determinant) || determinant === 0) return null;
  const inverse = matrix.clone().invert();
  if (!inverse.elements.every(Number.isFinite)) return null;
  return { position, matrix, inverse, near, far, aspect: (right - left) / (top - bottom) };
}

// The consumer must invalidate on geometry change, not call updateProjectionMatrix() over this measured frustum.
export function setCalibratedViewpoint(camera: PerspectiveCamera, calibration: ViewpointCalibration, offsetMm: Viewpoint): boolean {
  const projection = projectionFor(calibration, offsetMm);
  if (!projection) return false;
  camera.position.copy(projection.position);
  camera.quaternion.identity();
  camera.near = projection.near;
  camera.far = projection.far;
  camera.aspect = projection.aspect;
  camera.projectionMatrix.copy(projection.matrix);
  camera.projectionMatrixInverse.copy(projection.inverse);
  camera.updateMatrixWorld();
  return true;
}
