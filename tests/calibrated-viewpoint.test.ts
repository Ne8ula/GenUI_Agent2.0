import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { createSpatialFixture } from '../src/room/spatial-fixture.ts';
import {
  calibrationMatchesGeometry,
  createViewpointCalibration,
  displacementFromLandmark,
  mapViewportToDisplay,
  resetNeutralReference,
  setCalibratedViewpoint,
  updateTrackedViewpoint,
  type CalibrationInput,
} from '../src/room/calibrated-viewpoint.ts';

function measurements(): CalibrationInput {
  return {
    geometry: {
      displayMm: { width: 600, height: 400 },
      contentDisplayMm: { x: 60, y: 40, width: 480, height: 320 },
      contentCss: { width: 1200, height: 800 },
      viewportCss: { x: 300, y: 100, width: 600, height: 500 },
      screenCss: { x: 0, y: 0, width: 1920, height: 1280 },
      windowCss: { x: 100, y: 80, width: 1280, height: 900 },
      devicePixelRatio: 1,
      viewportScale: 1,
    },
    eye: { xMm: 20, yMm: -10, distanceMm: 600 },
    neutral: { x: 0.5, y: 0.5 },
    horizontal: { point: { x: 0.6, y: 0.5 }, displacementMm: 50 },
    vertical: { point: { x: 0.5, y: 0.4 }, displacementMm: 50 },
  };
}

function calibrated(input = measurements()) {
  const calibration = createViewpointCalibration(input);
  assert.ok(calibration);
  return calibration;
}

function close(actual: number, expected: number, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);
}

test('viewport mapping includes the measured browser placement and framed CSS offset', () => {
  const geometry = measurements().geometry;
  assert.deepEqual(mapViewportToDisplay(geometry), { x: 180, y: 80, width: 240, height: 200 });
  geometry.windowCss.x += 100;
  geometry.windowCss.y += 50;
  assert.deepEqual(mapViewportToDisplay(geometry), { x: 180, y: 80, width: 240, height: 200 });
});

test('invalid, out-of-display and degenerate measurements cannot create a calibration', () => {
  const mutations: ((input: CalibrationInput) => void)[] = [
    input => { input.geometry.displayMm.width = 0; },
    input => { input.geometry.displayMm.height = 10000; },
    input => { input.geometry.contentDisplayMm.x = -1; },
    input => { input.geometry.contentDisplayMm.width = 600; },
    input => { input.geometry.contentDisplayMm.y = 300; },
    input => { input.geometry.contentCss.height = 0; },
    input => { input.geometry.viewportCss.x = -1; },
    input => { input.geometry.viewportCss.y = 500; },
    input => { input.geometry.viewportCss.width = 0; },
    input => { input.geometry.viewportCss.height = 0.000001; },
    input => { input.geometry.devicePixelRatio = 0; },
    input => { input.geometry.viewportScale = 0; },
    input => { input.geometry.screenCss.width = 0; },
    input => { input.geometry.windowCss.height = 0; },
    input => { input.eye.distanceMm = -600; },
    input => { input.eye.distanceMm = 1; },
    input => { input.eye.xMm = 10000; },
    input => { input.eye.yMm = 10000; },
  ];
  for (const mutate of mutations) {
    const input = measurements();
    mutate(input);
    assert.equal(createViewpointCalibration(input), null);
  }
  for (const invalid of [NaN, Infinity, -Infinity]) {
    const mutations: ((input: CalibrationInput) => void)[] = [
      input => { input.geometry.displayMm.width = invalid; },
      input => { input.geometry.contentDisplayMm.x = invalid; },
      input => { input.geometry.contentCss.width = invalid; },
      input => { input.geometry.viewportCss.width = invalid; },
      input => { input.geometry.screenCss.x = invalid; },
      input => { input.geometry.windowCss.y = invalid; },
      input => { input.geometry.devicePixelRatio = invalid; },
      input => { input.geometry.viewportScale = invalid; },
      input => { input.eye.distanceMm = invalid; },
      input => { input.eye.xMm = invalid; },
      input => { input.eye.yMm = invalid; },
    ];
    for (const mutate of mutations) {
      const input = measurements();
      mutate(input);
      assert.equal(createViewpointCalibration(input), null);
    }
  }
});

test('neutral and measured camera axes recover signed millimetre displacements', () => {
  const calibration = calibrated();
  const neutral = displacementFromLandmark(calibration, { x: 0.5, y: 0.5 });
  assert.ok(neutral);
  close(neutral.x, 0);
  close(neutral.y, 0);
  const moved = displacementFromLandmark(calibration, { x: 0.55, y: 0.55 });
  assert.ok(moved);
  close(moved.x, 25);
  close(moved.y, -25);
});

test('two measured axes invert a mirrored and rolled camera without assuming image directions', () => {
  const input = measurements();
  input.horizontal.point = { x: 0.42, y: 0.56 };
  input.vertical.point = { x: 0.44, y: 0.42 };
  const moved = displacementFromLandmark(calibrated(input), { x: 0.43, y: 0.49 });
  assert.ok(moved);
  close(moved.x, 25);
  close(moved.y, 25);
  input.horizontal.displacementMm = -50;
  const signed = displacementFromLandmark(calibrated(input), input.horizontal.point);
  assert.ok(signed);
  close(signed.x, -50);
  close(signed.y, 0);
});

test('neutral reset requires a measured eye position and preserves display geometry and camera axes', () => {
  const calibration = calibrated();
  const next = resetNeutralReference(calibration, { x: 0.52, y: 0.48 }, { xMm: 30, yMm: 5, distanceMm: 600 });
  assert.ok(next);
  assert.deepEqual(next.geometry, calibration.geometry);
  assert.deepEqual(next.inverse, calibration.inverse);
  assert.deepEqual(calibration.neutral, { x: 0.5, y: 0.5 });
  assert.deepEqual(calibration.eye, { xMm: 20, yMm: -10, distanceMm: 600 });
  const neutral = displacementFromLandmark(next, { x: 0.52, y: 0.48 });
  const moved = displacementFromLandmark(next, { x: 0.54, y: 0.46 });
  assert.ok(neutral && moved);
  close(neutral.x, 0);
  close(neutral.y, 0);
  close(moved.x, 10);
  close(moved.y, 10);
  const camera = new PerspectiveCamera();
  assert.equal(setCalibratedViewpoint(camera, next, { x: 0, y: 0 }), true);
  close(camera.position.x, 0.3);
  close(camera.position.y, 1.75);
  close(camera.position.z, 8.5);
  assert.equal(resetNeutralReference(calibration, { x: 0.5, y: 0.5 }, { ...calibration.eye, distanceMm: 650 }), null);
  assert.equal(resetNeutralReference(calibration, { x: 1.1, y: 0.5 }, calibration.eye), null);
  assert.equal(resetNeutralReference(calibration, { x: 0.5, y: 0.5 }, { ...calibration.eye, xMm: NaN }), null);
});

test('singular, near-singular, noisy, disproportionate and out-of-range camera measurements reject', () => {
  const mutations: ((input: CalibrationInput) => void)[] = [
    input => { input.horizontal.point = { ...input.neutral }; },
    input => { input.vertical.point = { ...input.horizontal.point }; },
    input => { input.vertical.point = { x: 0.7, y: 0.50001 }; },
    input => { input.horizontal.point.x = 0.500001; },
    input => { input.vertical.point = { x: 0.5, y: -0.1 }; },
    input => { input.neutral.x = NaN; },
    input => { input.horizontal.point.y = Infinity; },
    input => { input.horizontal.displacementMm = 0; },
    input => { input.horizontal.displacementMm = 1; },
    input => { input.vertical.displacementMm = 1000; },
    input => { input.vertical.displacementMm = NaN; },
    input => { input.horizontal.displacementMm = 10; input.vertical.displacementMm = 300; },
  ];
  for (const mutate of mutations) {
    const input = measurements();
    mutate(input);
    assert.equal(createViewpointCalibration(input), null);
  }
});

test('measured screen corners stay at NDC corners at every permitted camera bound', () => {
  const calibration = calibrated();
  const camera = new PerspectiveCamera();
  for (const x of [-65, 0, 65]) {
    for (const y of [-35, 0, 35]) {
      assert.equal(setCalibratedViewpoint(camera, calibration, { x, y }), true);
      close(camera.position.x, 0.2 + x * 0.01);
      close(camera.position.y, 1.6 + y * 0.01);
      close(camera.position.z, 8.5);
      close(camera.near, 6);
      close(camera.far, 26);
      assert.deepEqual(camera.quaternion.toArray(), [0, 0, 0, 1]);
      for (const [worldX, worldY, ndcX, ndcY] of [
        [-1.2, 0.9, -1, -1], [-1.2, 2.9, -1, 1],
        [1.2, 0.9, 1, -1], [1.2, 2.9, 1, 1],
      ]) {
        const projected = new Vector3(worldX, worldY, 2.5).project(camera);
        close(projected.x, ndcX);
        close(projected.y, ndcY);
        close(projected.z, -1);
      }
      assert.ok(camera.projectionMatrix.elements.every(Number.isFinite));
      assert.ok(camera.projectionMatrixInverse.elements.every(Number.isFinite));
      const identity = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.projectionMatrixInverse);
      identity.elements.forEach((value, index) => close(value, index % 5 === 0 ? 1 : 0));
    }
  }
});

test('extreme accepted display and distance measurements retain valid projection at their bounds', () => {
  for (const width of [100, 5000]) {
    for (const height of [100, 5000]) {
      for (const distanceMm of [100, 5000]) {
        const input = measurements();
        input.geometry.displayMm = { width, height };
        input.geometry.contentDisplayMm = { x: 0, y: 0, width, height };
        input.eye = { xMm: width, yMm: -height, distanceMm };
        const calibration = calibrated(input);
        const camera = new PerspectiveCamera();
        for (const x of [-calibration.limitsMm.x, calibration.limitsMm.x]) {
          for (const y of [-calibration.limitsMm.y, calibration.limitsMm.y]) {
            assert.equal(setCalibratedViewpoint(camera, calibration, { x, y }), true);
            assert.ok(camera.near > 0 && camera.far > camera.near);
            assert.ok(camera.projectionMatrix.elements.every(Number.isFinite));
            assert.ok(camera.projectionMatrixInverse.elements.every(Number.isFinite));
            const identity = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.projectionMatrixInverse);
            identity.elements.forEach((value, index) => close(value, index % 5 === 0 ? 1 : 0, 1e-7));
          }
        }
      }
    }
  }
});

test('off-axis camera clips the front wall, preserves room objects, and does not orbit', t => {
  const fixture = createSpatialFixture();
  t.after(fixture.dispose);
  const roomBefore = fixture.scene.toJSON();
  const table = fixture.scene.getObjectByName('table');
  const calibration = calibrated();
  assert.equal(setCalibratedViewpoint(fixture.camera, calibration, { x: 60, y: -30 }), true);
  for (const z of [3, 3.08, 3.16]) assert.ok(new Vector3(0, 1.7, z).project(fixture.camera).z < -1);
  const roomPoint = new Vector3(0, 1.7, -3).project(fixture.camera);
  assert.ok(roomPoint.z > -1 && roomPoint.z < 1);
  assert.deepEqual(fixture.scene.toJSON(), roomBefore);
  assert.equal(fixture.scene.getObjectByName('table'), table);
  const direction = fixture.camera.getWorldDirection(new Vector3());
  close(direction.x, 0);
  close(direction.y, 0);
  close(direction.z, -1);
});

test('invalid projection input leaves the previously held camera unchanged', () => {
  const camera = new PerspectiveCamera();
  const calibration = calibrated();
  assert.equal(setCalibratedViewpoint(camera, calibration, { x: 20, y: 10 }), true);
  const before = camera.toJSON();
  for (const point of [{ x: NaN, y: 0 }, { x: 0, y: Infinity }, { x: 66, y: 0 }, { x: 0, y: -36 }]) {
    assert.equal(setCalibratedViewpoint(camera, calibration, point), false);
    assert.deepEqual(camera.toJSON(), before);
  }
  for (const invalid of [
    { ...calibration, worldUnitsPerMm: NaN },
    { ...calibration, viewportMm: { ...calibration.viewportMm, width: 0 } },
    { ...calibration, eye: { ...calibration.eye, distanceMm: -1 } },
  ]) {
    assert.equal(setCalibratedViewpoint(camera, invalid, { x: 0, y: 0 }), false);
    assert.deepEqual(camera.toJSON(), before);
  }
});

test('geometry comparison snapshots every measured and observed geometry field', () => {
  const input = measurements();
  const calibration = calibrated(input);
  assert.equal(calibrationMatchesGeometry(calibration, structuredClone(input.geometry), input.eye), true);
  for (const group of ['displayMm', 'contentDisplayMm', 'contentCss', 'viewportCss', 'screenCss', 'windowCss'] as const) {
    for (const key of Object.keys(input.geometry[group])) {
      const changed = structuredClone(input.geometry);
      (changed[group] as unknown as Record<string, number>)[key] += 1;
      assert.equal(calibrationMatchesGeometry(calibration, changed, input.eye), false, `${group}.${key}`);
    }
  }
  for (const field of ['devicePixelRatio', 'viewportScale'] as const) {
    const changed = structuredClone(input.geometry);
    changed[field] += 0.1;
    assert.equal(calibrationMatchesGeometry(calibration, changed, input.eye), false, field);
  }
  for (const field of ['xMm', 'yMm', 'distanceMm'] as const) {
    const eye = { ...input.eye, [field]: input.eye[field] + 1 };
    assert.equal(calibrationMatchesGeometry(calibration, input.geometry, eye), false, field);
  }
  input.geometry.contentDisplayMm.x += 1;
  assert.equal(calibrationMatchesGeometry(calibration, input.geometry, input.eye), false);
  close(calibration.viewportMm.x, 180);
});

test('timestamps smooth measured movement without changing the raw speed reference', () => {
  const calibration = calibrated();
  const first = updateTrackedViewpoint(calibration, null, { point: { x: 0.5, y: 0.5 }, timestampMs: 1000 }, 1000);
  assert.ok(first);
  const before = structuredClone(first);
  const next = updateTrackedViewpoint(calibration, first, { point: { x: 0.6, y: 0.5 }, timestampMs: 1100 }, 1100);
  assert.ok(next);
  close(next.rawMm.x, 50);
  close(next.offsetMm.x, 35.6747601569905);
  close(next.offsetMm.y, 0);
  assert.deepEqual(first, before);
  let held = next;
  for (let timestampMs = 1200; timestampMs <= 2000; timestampMs += 100) {
    const next = updateTrackedViewpoint(calibration, held, { point: { x: 0.6, y: 0.5 }, timestampMs }, timestampMs);
    assert.ok(next);
    assert.ok(next.offsetMm.x >= held.offsetMm.x && next.offsetMm.x <= 50 + 1e-9);
    held = next;
  }
  close(held.offsetMm.x, 50, 0.001);
});

test('plausible movements clamp to existing manual limits; impossible movement rejects instead', () => {
  const calibration = calibrated();
  const state = updateTrackedViewpoint(calibration, null, { point: { x: 0.74, y: 0.66 }, timestampMs: 1000 }, 1000);
  assert.ok(state);
  close(state.rawMm.x, 120);
  close(state.rawMm.y, -80);
  close(state.offsetMm.x, 65);
  close(state.offsetMm.y, -35);
  const input = measurements();
  input.horizontal.point = { x: 0.52, y: 0.5 };
  input.vertical.point = { x: 0.5, y: 0.48 };
  assert.equal(displacementFromLandmark(calibrated(input), { x: 0.9, y: 0.5 }), null);
});

test('invalid, stale, future, duplicate, out-of-order and implausibly fast samples never change held state', () => {
  const calibration = calibrated();
  const first = updateTrackedViewpoint(calibration, null, { point: { x: 0.5, y: 0.5 }, timestampMs: 1000 }, 1000);
  assert.ok(first);
  const before = structuredClone(first);
  for (const [timestampMs, nowMs, point] of [
    [1000, 1010, { x: 0.5, y: 0.5 }],
    [999, 1010, { x: 0.5, y: 0.5 }],
    [1010, 1211, { x: 0.5, y: 0.5 }],
    [1010, 1009, { x: 0.5, y: 0.5 }],
    [NaN, 1010, { x: 0.5, y: 0.5 }],
    [1010, Infinity, { x: 0.5, y: 0.5 }],
    [1010, 1010, { x: NaN, y: 0.5 }],
    [1010, 1010, { x: 1.1, y: 0.5 }],
    [1010, 1010, { x: 0.5, y: -0.1 }],
    [1010, 1010, { x: 0.7, y: 0.5 }],
    [1300, 1300, { x: 0.5, y: 0.5 }],
    [1150, 1300, { x: 0.5, y: 0.5 }],
  ] as const) {
    assert.equal(updateTrackedViewpoint(calibration, first, { point, timestampMs }, nowMs), null);
    assert.deepEqual(first, before);
  }
  assert.equal(updateTrackedViewpoint(calibration, null, { point: { x: 0.5, y: 0.5 }, timestampMs: -1 }, 0), null);
  assert.equal(updateTrackedViewpoint(calibration, null, { point: { x: 0.5, y: 0.5 }, timestampMs: 1000 }, 1201), null);
});

test('bad held state cannot poison smoothing and dropped samples do not extrapolate', () => {
  const calibration = calibrated();
  const first = updateTrackedViewpoint(calibration, null, { point: { x: 0.5, y: 0.5 }, timestampMs: 1000 }, 1000);
  assert.ok(first);
  for (const bad of [
    { ...first, timestampMs: NaN },
    { ...first, rawMm: { x: Infinity, y: 0 } },
    { ...first, offsetMm: { x: 0, y: 36 } },
  ]) assert.equal(updateTrackedViewpoint(calibration, bad, { point: { x: 0.51, y: 0.5 }, timestampMs: 1100 }, 1100), null);
  assert.equal(updateTrackedViewpoint(calibration, first, { point: { x: 0.7, y: 0.5 }, timestampMs: 1010 }, 1010), null);
  const recovered = updateTrackedViewpoint(calibration, first, { point: { x: 0.52, y: 0.5 }, timestampMs: 1100 }, 1100);
  assert.ok(recovered);
  assert.ok(recovered.offsetMm.x > 0 && recovered.offsetMm.x < 10);
  close(recovered.offsetMm.y, 0);
});
