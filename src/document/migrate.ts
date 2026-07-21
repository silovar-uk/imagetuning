import { createEmptyDocument, type AppDocument, type CommentObject, type ImageObject, type ShapeObject } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function migrateImage(value: unknown, index: number): ImageObject | null {
  if (!isRecord(value)) return null;
  const src = stringValue(value.src ?? value.dataUrl ?? value.url);
  if (!src) return null;

  return {
    id: stringValue(value.id, `img_migrated_${index}`),
    name: stringValue(value.name, `画像 ${index + 1}`),
    src,
    mimeType: stringValue(value.mimeType, src.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'),
    x: finiteNumber(value.x, 0),
    y: finiteNumber(value.y, 0),
    width: Math.max(1, finiteNumber(value.width, 100)),
    height: Math.max(1, finiteNumber(value.height, 100)),
    opacity: Math.min(1, Math.max(0, finiteNumber(value.opacity, 1))),
    visible: booleanValue(value.visible, true),
    locked: booleanValue(value.locked, false),
    zIndex: finiteNumber(value.zIndex, index),
  };
}

function migrateComment(value: unknown, index: number): CommentObject | null {
  if (!isRecord(value)) return null;
  const targetId = stringValue(value.targetId ?? value.objectId);
  if (!targetId) return null;
  return {
    id: stringValue(value.id, `comment_migrated_${index}`),
    targetType: 'image',
    targetId,
    text: stringValue(value.text ?? value.comment),
    createdAt: stringValue(value.createdAt, new Date(0).toISOString()),
  };
}

function migrateShape(value: unknown, index: number): ShapeObject | null {
  if (!isRecord(value)) return null;
  const allowed = new Set(['rect', 'ellipse', 'arrow', 'pen', 'text', 'speech-bubble', 'color-tag']);
  const type = stringValue(value.type);
  if (!allowed.has(type)) return null;
  return {
    id: stringValue(value.id, `shape_migrated_${index}`),
    type: type as ShapeObject['type'],
    x: finiteNumber(value.x, 0),
    y: finiteNumber(value.y, 0),
    width: finiteNumber(value.width, 0),
    height: finiteNumber(value.height, 0),
    color: stringValue(value.color, '#c42026'),
    commentId: typeof value.commentId === 'string' ? value.commentId : undefined,
  };
}

export function migrateDocument(input: unknown): AppDocument {
  if (!isRecord(input)) throw new Error('JSONの形式が正しくありません。');

  const source = isRecord(input.document) ? input.document : input;
  const fallback = createEmptyDocument();
  const canvasSource = isRecord(source.canvas) ? source.canvas : {};
  const imagesSource = Array.isArray(source.images)
    ? source.images
    : Array.isArray(source.imageObjects)
      ? source.imageObjects
      : [];
  const commentsSource = Array.isArray(source.comments) ? source.comments : [];
  const shapesSource = Array.isArray(source.shapes)
    ? source.shapes
    : Array.isArray(source.drawings)
      ? source.drawings
      : [];

  const images = imagesSource.map(migrateImage).filter((value): value is ImageObject => value !== null);
  const comments = commentsSource.map(migrateComment).filter((value): value is CommentObject => value !== null);
  const shapes = shapesSource.map(migrateShape).filter((value): value is ShapeObject => value !== null);

  return {
    schemaVersion: 2,
    canvas: {
      width: Math.max(1, finiteNumber(canvasSource.width, fallback.canvas.width)),
      height: Math.max(1, finiteNumber(canvasSource.height, fallback.canvas.height)),
      background: canvasSource.background === 'transparent' || canvasSource.background === 'black'
        ? canvasSource.background
        : 'white',
    },
    images,
    shapes,
    comments: comments.filter((comment) => images.some((image) => image.id === comment.targetId)),
  };
}
