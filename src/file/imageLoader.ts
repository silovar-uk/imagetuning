import PSD from 'psd.js';
import type { ImageObject } from '../document/types';
import { createId } from '../utils/ids';

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`${file.name}を読み込めませんでした。`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('画像のサイズを取得できませんでした。'));
    image.src = src;
  });
}

async function readPsd(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const psd = PSD.fromArrayBuffer(buffer);
  psd.parse();
  return psd.image.toPng().toDataURL('image/png');
}

export async function filesToImageObjects(files: File[], existingCount: number): Promise<ImageObject[]> {
  const results: ImageObject[] = [];

  for (const [index, file] of files.entries()) {
    const isPsd = file.name.toLowerCase().endsWith('.psd');
    if (!isPsd && !file.type.startsWith('image/')) continue;

    const src = isPsd ? await readPsd(file) : await readAsDataUrl(file);
    const size = await loadImageSize(src);
    const order = existingCount + index;

    results.push({
      id: createId('img'),
      name: file.name,
      src,
      mimeType: isPsd ? 'image/png' : file.type || 'image/png',
      x: order * 28,
      y: order * 28,
      width: size.width,
      height: size.height,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: order,
    });
  }

  return results;
}
