import type { Object3D } from 'three';

export type RoomInspectionBinding = { unit: symbol; bindings: ReadonlyMap<string, Object3D> };
export type RoomSelection = { unit: symbol; objectId: string };
export type RoomInspectionState = {
  unit: symbol;
  objects: { id: string; label: string }[];
  selectedObjectId: string | null;
  discoveredClues: { id: string; objectId: string; text: string }[];
};

export function createRoomInspectionGesture() {
  let pointer: { id: number; startX: number; startY: number; x: number; y: number; unit: symbol | null; moved: boolean } | null = null;
  function start(id: number, x: number, y: number, unit: symbol | null) {
    if (pointer) return false;
    pointer = { id, startX: x, startY: y, x, y, unit, moved: false };
    return true;
  }
  function move(id: number, x: number, y: number) {
    if (!pointer || pointer.id !== id) return null;
    const delta = { x: x - pointer.x, y: y - pointer.y };
    // Remember excursion: dragging away and back must never become a click.
    pointer.moved ||= Math.hypot(x - pointer.startX, y - pointer.startY) > 5;
    pointer.x = x;
    pointer.y = y;
    return delta;
  }
  function end(id: number, x: number, y: number) {
    if (!pointer || pointer.id !== id) return null;
    move(id, x, y);
    const ended = pointer;
    pointer = null;
    return !ended.moved && ended.unit !== null ? { unit: ended.unit, x, y } : null;
  }
  function cancel() { pointer = null; }
  return { start, move, end, cancel };
}
