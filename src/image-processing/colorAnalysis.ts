export type ColorShare = {
  hex: string;
  percentage: number;
  count: number;
};

function channelToHex(value: number) {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');
}

export function rgbToHex(red: number, green: number, blue: number) {
  return `#${channelToHex(red)}${channelToHex(green)}${channelToHex(blue)}`.toUpperCase();
}

function quantize(value: number, step: number) {
  return Math.min(255, Math.round(value / step) * step);
}

export function analyzeImageData(imageData: ImageData, limit = 6, step = 32): ColorShare[] {
  const buckets = new Map<string, number>();
  let visiblePixels = 0;

  for (let index = 0; index < imageData.data.length; index += 4) {
    const alpha = imageData.data[index + 3] ?? 0;
    if (alpha < 48) continue;
    const red = quantize(imageData.data[index] ?? 0, step);
    const green = quantize(imageData.data[index + 1] ?? 0, step);
    const blue = quantize(imageData.data[index + 2] ?? 0, step);
    const key = `${red},${green},${blue}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
    visiblePixels += 1;
  }

  if (visiblePixels === 0) return [];

  return [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => {
      const [red, green, blue] = key.split(',').map(Number);
      return {
        hex: rgbToHex(red ?? 0, green ?? 0, blue ?? 0),
        percentage: Math.round((count / visiblePixels) * 1000) / 10,
        count,
      };
    });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('色分析用の画像を読み込めませんでした。'));
    image.src = source;
  });
}

export async function analyzeImageSource(source: string, limit = 6): Promise<ColorShare[]> {
  const image = await loadImage(source);
  const maximum = 256;
  const scale = Math.min(1, maximum / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('色分析を初期化できませんでした。');
  context.drawImage(image, 0, 0, width, height);
  return analyzeImageData(context.getImageData(0, 0, width, height), limit);
}

export function sampleImageColor(
  image: HTMLImageElement,
  sourceX: number,
  sourceY: number,
): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  const x = Math.max(0, Math.min(image.naturalWidth - 1, Math.floor(sourceX)));
  const y = Math.max(0, Math.min(image.naturalHeight - 1, Math.floor(sourceY)));
  context.drawImage(image, x, y, 1, 1, 0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0, alpha = 0] = context.getImageData(0, 0, 1, 1).data;
  return alpha < 16 ? null : rgbToHex(red, green, blue);
}
