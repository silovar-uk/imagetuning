import { PNG } from 'pngjs';

export type VisualSignature = {
  width: number;
  height: number;
  cols: number;
  rows: number;
  rgb: number[];
};

export function createVisualSignature(buffer: Buffer, cols = 16, rows = 9): VisualSignature {
  const png = PNG.sync.read(buffer);
  const rgb: number[] = [];

  for (let row = 0; row < rows; row += 1) {
    const top = Math.floor((row * png.height) / rows);
    const bottom = Math.floor(((row + 1) * png.height) / rows);
    for (let col = 0; col < cols; col += 1) {
      const left = Math.floor((col * png.width) / cols);
      const right = Math.floor(((col + 1) * png.width) / cols);
      let red = 0;
      let green = 0;
      let blue = 0;
      let pixels = 0;

      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const offset = (png.width * y + x) * 4;
          red += png.data[offset] ?? 0;
          green += png.data[offset + 1] ?? 0;
          blue += png.data[offset + 2] ?? 0;
          pixels += 1;
        }
      }

      rgb.push(
        Math.round(red / pixels),
        Math.round(green / pixels),
        Math.round(blue / pixels),
      );
    }
  }

  return { width: png.width, height: png.height, cols, rows, rgb };
}

export function compareVisualSignatures(actual: VisualSignature, expected: VisualSignature) {
  if (
    actual.width !== expected.width
    || actual.height !== expected.height
    || actual.cols !== expected.cols
    || actual.rows !== expected.rows
    || actual.rgb.length !== expected.rgb.length
  ) {
    return { meanDifference: Number.POSITIVE_INFINITY, changedRatio: 1 };
  }

  let totalDifference = 0;
  let changedChannels = 0;
  for (let index = 0; index < actual.rgb.length; index += 1) {
    const difference = Math.abs((actual.rgb[index] ?? 0) - (expected.rgb[index] ?? 0));
    totalDifference += difference;
    if (difference > 10) changedChannels += 1;
  }

  return {
    meanDifference: totalDifference / actual.rgb.length,
    changedRatio: changedChannels / actual.rgb.length,
  };
}
