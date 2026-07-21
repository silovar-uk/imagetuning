import { describe, expect, it } from 'vitest';
import { getShapeBounds, hitResizeHandle, resizeShapeBounds } from '../src/canvas/resize';

describe('shape resize geometry', () => {
  it('負の幅と高さを正規化する', () => {
    expect(getShapeBounds({ x: 100, y: 80, width: -40, height: -30 })).toEqual({
      left: 60,
      top: 50,
      right: 100,
      bottom: 80,
    });
  });

  it('四隅のハンドルを判定する', () => {
    const bounds = { left: 10, top: 20, right: 110, bottom: 120 };
    expect(hitResizeHandle({ x: 12, y: 22 }, bounds, 5)).toBe('nw');
    expect(hitResizeHandle({ x: 109, y: 118 }, bounds, 5)).toBe('se');
    expect(hitResizeHandle({ x: 60, y: 70 }, bounds, 5)).toBeNull();
  });

  it('最小サイズを保って北西方向へリサイズする', () => {
    const resized = resizeShapeBounds(
      { left: 10, top: 20, right: 110, bottom: 120 },
      'nw',
      { x: 108, y: 119 },
      12,
    );
    expect(resized).toEqual({ x: 98, y: 108, width: 12, height: 12 });
  });
});
