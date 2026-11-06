import { ROOM_COLORS, type FurnitureKind, type RoomColor } from './room-description.ts';
import type { FurnishingEnvelope } from './procedural-room.ts';

// Three local preparations/case bound visual slots to three; one may be outstanding.
// These are not server submission allowances or permission to spend.
export const PROP_REQUEST_LIMITS = Object.freeze({ descriptionLength: 240, descriptionBytes: 960, requestsPerCase: 3 });
export type RoomRenderIdentity = Readonly<{ unit: symbol; revision: number }>;
export type RoomPropRequest = Readonly<{
  owner: Readonly<{ unit: symbol; objectId: string; generation: number; revision: number }>;
  visual: Readonly<{ kind: FurnitureKind; color: RoomColor; description: string }>;
  envelope: Readonly<FurnishingEnvelope>;
}>;
export type RoomPropState = {
  availability: 'disabled' | 'unconfigured' | 'ready';
  phase: 'idle' | 'prepared' | 'reference-image' | 'mesh' | 'retrieving' | 'admitting' | 'installing'
    | 'rejected' | 'failed' | 'cancelled' | 'stale' | 'installed';
  request: RoomPropRequest | null;
  remainingRequests: number;
  reason: 'invalid_request' | 'stale_owner' | 'unavailable_object' | 'limit_reached'
    | 'stopped' | 'reconstruction_changed' | 'disposed' | 'admission_failed' | 'install_failed' | 'generation_failed' | null;
};
export const EMPTY_ROOM_PROPS: Readonly<RoomPropState> = Object.freeze({
  availability: 'unconfigured', phase: 'idle', request: null, remainingRequests: PROP_REQUEST_LIMITS.requestsPerCase, reason: null,
});

export function validatePropRequestInput(input: unknown): { objectId: string; description: string } {
  if (!input || typeof input !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(input))
    || Reflect.ownKeys(input).length !== 2 || !['objectId', 'description'].every(key => {
      const property = Object.getOwnPropertyDescriptor(input, key);
      return property?.enumerable && 'value' in property;
    })) throw new Error('Invalid prop request.');
  const value = input as Record<string, unknown>;
  if (typeof value.objectId !== 'string' || !/^object-[1-8]$/.test(value.objectId)
    || typeof value.description !== 'string' || /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(value.description)) {
    throw new Error('Invalid prop request.');
  }
  const description = value.description.trim();
  if (!description || description.length > PROP_REQUEST_LIMITS.descriptionLength
    || new TextEncoder().encode(description).byteLength > PROP_REQUEST_LIMITS.descriptionBytes) throw new Error('Invalid prop request.');
  return { objectId: value.objectId, description };
}

export function validatePropVisual(input: unknown): RoomPropRequest['visual'] {
  if (!input || typeof input !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(input))
    || Reflect.ownKeys(input).length !== 3 || !['kind', 'color', 'description'].every(key => {
      const property = Object.getOwnPropertyDescriptor(input, key);
      return property?.enumerable && 'value' in property;
    })) throw new Error('Invalid prop visual.');
  const value = input as Record<string, unknown>;
  if (typeof value.kind !== 'string' || !['table', 'chair', 'sofa', 'shelf'].includes(value.kind)
    || typeof value.color !== 'string' || !Object.hasOwn(ROOM_COLORS, value.color)
    || typeof value.description !== 'string' || /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(value.description)) {
    throw new Error('Invalid prop visual.');
  }
  const description = value.description.trim();
  if (!description || description.length > PROP_REQUEST_LIMITS.descriptionLength
    || new TextEncoder().encode(description).byteLength > PROP_REQUEST_LIMITS.descriptionBytes) throw new Error('Invalid prop visual.');
  return { kind: value.kind as FurnitureKind, color: value.color as RoomColor, description };
}

export function snapshotPropRequest(request: RoomPropRequest): RoomPropRequest {
  return { owner: { ...request.owner }, visual: { ...request.visual }, envelope: { ...request.envelope } };
}
