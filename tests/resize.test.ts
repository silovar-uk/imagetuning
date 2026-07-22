import { describe, expect, it } from 'vitest';
import {
  getShapeBounds,
  hitResizeHandle,
  resizeShapeBounds,
  scalePointsToBounds,
} from '../src/canvas/resize';

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

  it('ペン線の点列を新しい選択枠へ比率変換する', () => {
    expect(scalePointsToBounds(
      [{ x: 10, y: 20 }, { x: 60, y: 70 }, { x: 110, y: 120 }],
      { left: 10, top: 20, right: 110, bottom: 120 },
      { left: 30, top: 40, right: 230, bottom: 90 },
    )).toEqual([
      { x: 30, y: 40 },
      { x: 130, y: 65 },
      { x: 230, y: 90 },
    ]);
  });

  it('幅が0の縦線は新しい枠の中央へ配置する', () => {
    expect(scalePointsToBounds(
      [{ x: 20, y: 10 }, { x: 20, y: 90 }],
      { left: 20, top: 10, right: 20, bottom: 90 },
      { left: 100, top: 30, right: 140, bottom: 190 },
    )).toEqual([
      { x: 120, y: 30 },
      { x: 120, y: 190 },
    ]);
  });
});
