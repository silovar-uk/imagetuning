import { describe, expect, it } from 'vitest';
import { getOrderedComments, getOrderedLayers, moveLayer } from '../src/document/order';
import { createEmptyDocument, type AppDocument, type ImageObject, type ShapeObject } from '../src/document/types';

const image = (id: string, x: number, y: number, zIndex: number): ImageObject => ({
  id,
  name: `${id}.png`,
  src: 'data:image/png;base64,AA==',
  mimeType: 'image/png',
  x,
  y,
  width: 100,
  height: 80,
  opacity: 1,
  visible: true,
  locked: false,
  zIndex,
});

const shape = (id: string, zIndex: number): ShapeObject => ({
  id,
  type: 'rect',
  x: 20,
  y: 20,
  width: 50,
  height: 50,
  color: '#c42026',
  fillColor: 'transparent',
  lineWidth: 4,
  lineStyle: 'solid',
  zIndex,
  visible: true,
  locked: false,
});

function documentFixture(): AppDocument {
  const document = createEmptyDocument();
  document.images = [image('lower', 400, 400, 0), image('upper', 100, 50, 1)];
  document.shapes = [shape('shape', 2)];
  document.comments = [
    { id: 'comment-lower', targetType: 'image', targetId: 'lower', text: '下', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'comment-upper', targetType: 'image', targetId: 'upper', text: '上', createdAt: '2026-01-02T00:00:00.000Z' },
  ];
  return document;
}

describe('comment ordering', () => {
  it('位置順では上にある対象から番号を付ける', () => {
    const document = documentFixture();
    document.canvas.numberingMode = 'position';
    expect(getOrderedComments(document).map((comment) => comment.id)).toEqual(['comment-upper', 'comment-lower']);
  });

  it('作成順では元のコメント順を保つ', () => {
    const document = documentFixture();
    document.canvas.numberingMode = 'created';
    expect(getOrderedComments(document).map((comment) => comment.id)).toEqual(['comment-lower', 'comment-upper']);
  });
});

describe('layer ordering', () => {
  it('画像と図形をまたいで前後移動できる', () => {
    const document = documentFixture();
    const moved = moveLayer(document, 'image', 'lower', 'front');
    expect(getOrderedLayers(moved).map((entry) => entry.item.id)).toEqual(['upper', 'shape', 'lower']);
  });
});
