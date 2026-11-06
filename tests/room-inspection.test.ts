import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Scene, Vector3 } from 'three';
import { createRoomCompositionController } from '../src/room/room-composition.ts';
import { createRoomDisplay } from '../src/room/room-display.ts';
import { createRoomInspectionGesture } from '../src/room/room-inspection.ts';
import { inspectionFixture } from './fixtures/room-inspection-fixture.ts';

// Synthetic pointer coordinates and injected endpoint fixture; no browser or live fetch.
test('a deliberate click retains its starting case unit and consumes the pointer once', () => {
  const gesture = createRoomInspectionGesture();
  const unit = Symbol('displayed fixture case');
  assert.equal(gesture.start(1, 100, 200, unit), true);
  assert.equal(gesture.start(2, 100, 200, unit), false);
  assert.equal(gesture.move(2, 150, 250), null);
  assert.equal(gesture.end(2, 100, 200), null);
  assert.deepEqual(gesture.move(1, 102, 201), { x: 2, y: 1 });
  assert.deepEqual(gesture.end(1, 102, 201), { unit, x: 102, y: 201 });
  assert.equal(gesture.end(1, 102, 201), null);
});

test('drag excursion, including a return to origin or a distant pointerup, cannot become inspection', () => {
  const unit = Symbol('displayed fixture case');
  for (const returns of [false, true]) {
    const gesture = createRoomInspectionGesture();
    gesture.start(1, 100, 200, unit);
    assert.deepEqual(gesture.move(1, 140, 220), { x: 40, y: 20 });
    if (returns) assert.deepEqual(gesture.move(1, 100, 200), { x: -40, y: -20 });
    assert.equal(gesture.end(1, returns ? 100 : 140, returns ? 200 : 220), null);
  }
  const gesture = createRoomInspectionGesture();
  gesture.start(1, 100, 200, unit);
  assert.equal(gesture.end(1, 150, 200), null, 'pointerup movement matters even without a move event');
});

test('cancel/lost capture and authored-room gestures never inspect; a new gesture still works', () => {
  const gesture = createRoomInspectionGesture();
  const unit = Symbol('displayed fixture case');
  gesture.start(1, 100, 200, unit);
  gesture.cancel();
  gesture.cancel();
  assert.equal(gesture.end(1, 100, 200), null);
  gesture.start(2, 100, 200, null);
  assert.deepEqual(gesture.move(2, 120, 200), { x: 20, y: 0 }, 'authored room retains viewpoint drag');
  assert.equal(gesture.end(2, 120, 200), null);
  gesture.start(3, 100, 200, null);
  assert.equal(gesture.end(3, 100, 200), null);
  gesture.start(4, 100, 200, unit);
  assert.deepEqual(gesture.end(4, 100, 200), { unit, x: 100, y: 200 });
});

test('real scene picks and object-list identities enter the same case-bound discovery action', async () => {
  const controller = createRoomCompositionController({
    fetch: async () => new Response(JSON.stringify(inspectionFixture()), { headers: { 'content-type': 'application/json' } }),
    yieldToBuild: () => Promise.resolve(),
  });
  const camera = new PerspectiveCamera(60, 2, 0.05, 30);
  const display = createRoomDisplay({ initial: { scene: new Scene(), dispose() {} }, camera, draw: () => {} });
  const bounds = { left: 100, top: 50, width: 400, height: 200 };
  const point = new Vector3();
  try {
    assert.equal(await controller.compose('four teal chairs', 41), true);
    assert.equal(controller.reveal((room, binding) => {
      const group = binding.bindings.get('object-1')!;
      room.scene.updateMatrixWorld(true);
      group.getWorldPosition(point);
      camera.position.set(point.x, 2, point.z);
      camera.lookAt(point.x, 0.5, point.z);
      return display.install(room, binding);
    }), true);
    const view = controller.getState().inspection!;
    const picked = display.pick(300, 150, bounds);
    assert.deepEqual(picked, { unit: view.unit, objectId: 'object-1' });
    assert.equal(controller.inspect(picked!.unit, picked!.objectId), true);
    const pointerDiscovery = controller.getState().inspection;
    const listObject = view.objects.find(item => item.id === 'object-1')!;
    assert.equal(controller.inspect(view.unit, listObject.id), true);
    assert.deepEqual(controller.getState().inspection, pointerDiscovery);
    assert.equal(controller.inspect(view.unit, 'object-3'), true);
    assert.equal(controller.getState().inspection!.selectedObjectId, 'object-3');
    assert.equal(controller.getState().inspection!.discoveredClues.filter(item => item.objectId === 'object-3').length, 0);
    await controller.compose('same words, new installed case', 41);
    assert.equal(controller.reveal(display.install), true);
    const replacement = controller.getState().inspection;
    assert.equal(controller.inspect(picked!.unit, picked!.objectId), false, 'a queued old scene result cannot select a reused ID');
    assert.deepEqual(controller.getState().inspection, replacement);
    display.dispose();
    assert.equal(display.pick(300, 150, bounds), null);
  } finally { controller.dispose(); display.dispose(); }
});
