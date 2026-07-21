import type { AppDocument, CommentObject, ImageObject, ShapeObject } from './types';

export type LayerKind = 'image' | 'shape';
export type LayerDirection = 'front' | 'forward' | 'backward' | 'back';
export type LayerEntry =
  | { kind: 'image'; item: ImageObject }
  | { kind: 'shape'; item: ShapeObject };

function targetPosition(document: AppDocument, comment: CommentObject) {
  const target = comment.targetType === 'image'
    ? document.images.find((item) => item.id === comment.targetId)
    : document.shapes.find((item) => item.id === comment.targetId);
  return target ? { x: target.x, y: target.y } : { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER };
}

export function getOrderedLayers(document: AppDocument): LayerEntry[] {
  return [
    ...document.images.map((item) => ({ kind: 'image' as const, item })),
    ...document.shapes.map((item) => ({ kind: 'shape' as const, item })),
  ].sort((a, b) => a.item.zIndex - b.item.zIndex);
}

export function moveLayer(
  document: AppDocument,
  kind: LayerKind,
  id: string,
  direction: LayerDirection,
): AppDocument {
  const ordered = getOrderedLayers(document);
  const index = ordered.findIndex((entry) => entry.kind === kind && entry.item.id === id);
  if (index < 0 || ordered.length < 2) return document;

  let nextIndex = index;
  if (direction === 'front') nextIndex = ordered.length - 1;
  if (direction === 'forward') nextIndex = Math.min(ordered.length - 1, index + 1);
  if (direction === 'backward') nextIndex = Math.max(0, index - 1);
  if (direction === 'back') nextIndex = 0;
  if (nextIndex === index) return document;

  const [entry] = ordered.splice(index, 1);
  ordered.splice(nextIndex, 0, entry!);

  const zIndexByKey = new Map<string, number>();
  ordered.forEach((item, order) => zIndexByKey.set(`${item.kind}:${item.item.id}`, order));

  return {
    ...document,
    images: document.images.map((image) => ({
      ...image,
      zIndex: zIndexByKey.get(`image:${image.id}`) ?? image.zIndex,
    })),
    shapes: document.shapes.map((shape) => ({
      ...shape,
      zIndex: zIndexByKey.get(`shape:${shape.id}`) ?? shape.zIndex,
    })),
  };
}

export function getOrderedComments(document: AppDocument): CommentObject[] {
  if (document.canvas.numberingMode === 'created') return [...document.comments];

  return [...document.comments].sort((a, b) => {
    const pa = targetPosition(document, a);
    const pb = targetPosition(document, b);
    return pa.y - pb.y || pa.x - pb.x || a.createdAt.localeCompare(b.createdAt);
  });
}

export function getCommentNumberMap(document: AppDocument): Map<string, number> {
  const result = new Map<string, number>();
  getOrderedComments(document).forEach((comment, index) => result.set(comment.id, index + 1));
  return result;
}

export function getTargetLabel(document: AppDocument, comment: CommentObject): string {
  if (comment.targetType === 'image') {
    return document.images.find((item) => item.id === comment.targetId)?.name ?? '削除済みの画像';
  }
  const shape = document.shapes.find((item) => item.id === comment.targetId);
  if (!shape) return '削除済みの図形';
  return shape.text?.trim() || ({
    rect: '四角形',
    ellipse: '円',
    arrow: '矢印',
    pen: 'ペン',
    text: 'テキスト',
    'speech-bubble': '吹き出し',
    'color-tag': 'カラータグ',
  } as const)[shape.type];
}

export function commentsToMarkdown(document: AppDocument): string {
  const comments = getOrderedComments(document);
  if (comments.length === 0) return '# 修正コメント\n\nコメントはありません。';

  return [
    '# 修正コメント',
    '',
    ...comments.flatMap((comment, index) => [
      `## ${index + 1}. ${getTargetLabel(document, comment)}`,
      '',
      comment.text.trim() || '（コメント未入力）',
      '',
    ]),
  ].join('\n').trimEnd();
}
