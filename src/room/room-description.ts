import { Ajv, type JSONSchemaType } from 'ajv';

export const ROOM_COLORS = Object.freeze({
  cream: 0xd8cbb3,
  'warm-gray': 0xa9a393,
  slate: 0x515e68,
  teal: 0x4f6661,
  ochre: 0xb48a45,
  walnut: 0x51443b,
});

export type RoomColor = keyof typeof ROOM_COLORS;
export type FurnitureKind = 'table' | 'chair' | 'sofa' | 'shelf';
export type RoomDescription = {
  version: 1;
  width: number;
  depth: number;
  height: number;
  doorway: { placement: 'left' | 'center' | 'right'; width: number; height: number };
  colors: { wall: RoomColor; floor: RoomColor };
  furnishings: { kind: FurnitureKind; color: RoomColor }[];
};

const colorSchema = { type: 'string' as const, enum: Object.keys(ROOM_COLORS) as RoomColor[] };
export const ROOM_DESCRIPTION_SCHEMA: JSONSchemaType<RoomDescription> = {
  type: 'object',
  additionalProperties: false,
  required: ['version', 'width', 'depth', 'height', 'doorway', 'colors', 'furnishings'],
  properties: {
    version: { type: 'integer', const: 1 },
    width: { type: 'number', minimum: 4, maximum: 8 },
    depth: { type: 'number', minimum: 5, maximum: 8 },
    height: { type: 'number', minimum: 2.8, maximum: 4 },
    doorway: {
      type: 'object', additionalProperties: false, required: ['placement', 'width', 'height'],
      properties: {
        placement: { type: 'string', enum: ['left', 'center', 'right'] },
        width: { type: 'number', minimum: 1, maximum: 1.4 },
        height: { type: 'number', minimum: 2, maximum: 2.5 },
      },
    },
    colors: {
      type: 'object', additionalProperties: false, required: ['wall', 'floor'],
      properties: { wall: colorSchema, floor: colorSchema },
    },
    furnishings: {
      type: 'array', minItems: 0, maxItems: 8,
      items: {
        type: 'object', additionalProperties: false, required: ['kind', 'color'],
        properties: {
          kind: { type: 'string', enum: ['table', 'chair', 'sofa', 'shelf'] },
          color: colorSchema,
        },
      },
    },
  },
};

const validate = new Ajv({ strict: true, strictNumbers: true, ownProperties: true }).compile(ROOM_DESCRIPTION_SCHEMA);

function plainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Reflect.ownKeys(value).every(key => {
    const property = Object.getOwnPropertyDescriptor(value, key)!;
    return typeof key === 'string' && property.enumerable && 'value' in property;
  });
}

export function validateRoomDescription(input: unknown): RoomDescription {
  // Reject non-JSON accessors/prototypes before Ajv can read their properties.
  if (!plainRecord(input) || !plainRecord(input.doorway) || !plainRecord(input.colors)
    || !Array.isArray(input.furnishings) || Object.getPrototypeOf(input.furnishings) !== Array.prototype
    || input.furnishings.length > 8 || Reflect.ownKeys(input.furnishings).length !== input.furnishings.length + 1) {
    throw new Error('Invalid room description.');
  }
  for (let index = 0; index < input.furnishings.length; index += 1) {
    const entry = Object.getOwnPropertyDescriptor(input.furnishings, String(index));
    if (!entry?.enumerable || !('value' in entry) || !plainRecord(entry.value)) throw new Error('Invalid room description.');
  }
  if (!validate(input)) throw new Error('Invalid room description.');
  return {
    version: input.version, width: input.width, depth: input.depth, height: input.height,
    doorway: { ...input.doorway }, colors: { ...input.colors },
    furnishings: input.furnishings.map(item => ({ ...item })),
  };
}
