import { describe, expect, it } from 'vitest';
import { analyzeImageData, rgbToHex } from '../src/image-processing/colorAnalysis';

function imageData(pixels: number[][]): ImageData {
  return {
    data: new Uint8ClampedArray(pixels.flat()),
    width: pixels.length,
    height: 1,
    colorSpace: 'srgb',
  } as ImageData;
}

describe('rgbToHex', () => {
  it('RGBを大文字のHEXへ変換する', () => {
    expect(rgbToHex(12, 34, 255)).toBe('#0C22FF');
  });
});

describe('analyzeImageData', () => {
  it('透明色を除外して主要色と割合を返す', () => {
    const result = analyzeImageData(imageData([
      [250, 10, 10, 255],
      [245, 12, 12, 255],
      [10, 20, 245, 255],
      [0, 0, 0, 0],
    ]), 4);

    expect(result).toHaveLength(2);
    expect(result[0]?.hex).toBe('#FF0000');
    expect(result[0]?.percentage).toBeCloseTo(66.7, 1);
    expect(result[1]?.hex).toBe('#0020FF');
  });

  it('表示ピクセルがない場合は空配列を返す', () => {
    expect(analyzeImageData(imageData([[0, 0, 0, 0]]))).toEqual([]);
  });
});
