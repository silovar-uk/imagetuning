import { drawShape } from '../canvas/drawShape';
import { getOrderedComments, getOrderedLayers } from '../document/order';
import type { AppDocument, CanvasSettings } from '../document/types';

export type ExportOptions = {
  includeNumbers: boolean;
  background: CanvasSettings['background'];
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('書き出し用画像を読み込めませんでした。'));
    image.src = src;
  });
}

export async function renderDocumentToCanvas(
  documentData: AppDocument,
  options: boolean | Partial<ExportOptions> = true,
) {
  const normalized: ExportOptions = typeof options === 'boolean'
    ? { includeNumbers: options, background: documentData.canvas.background }
    : {
        includeNumbers: options.includeNumbers ?? true,
        background: options.background ?? documentData.canvas.background,
      };

  const canvas = document.createElement('canvas');
  canvas.width = documentData.canvas.width;
  canvas.height = documentData.canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvasを初期化できませんでした。');

  if (normalized.background !== 'transparent') {
    ctx.fillStyle = normalized.background === 'black' ? '#000000' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  for (const entry of getOrderedLayers(documentData)) {
    if (!entry.item.visible) continue;
    if (entry.kind === 'image') {
      const image = await loadImage(entry.item.src);
      ctx.save();
      ctx.globalAlpha = entry.item.opacity;
      ctx.drawImage(image, entry.item.x, entry.item.y, entry.item.width, entry.item.height);
      ctx.restore();
    } else {
      drawShape(ctx, entry.item, 1);
    }
  }

  if (normalized.includeNumbers) {
    getOrderedComments(documentData).forEach((comment, index) => {
      const target = comment.targetType === 'image'
        ? documentData.images.find((item) => item.id === comment.targetId && item.visible)
        : documentData.shapes.find((item) => item.id === comment.targetId && item.visible);
      if (!target) return;
      const x = target.x + 18;
      const y = target.y + 18;
      ctx.save();
      ctx.fillStyle = '#c42026';
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), x, y);
      ctx.restore();
    });
  }

  return canvas;
}

export async function documentToPngBlob(
  documentData: AppDocument,
  options: boolean | Partial<ExportOptions> = true,
) {
  const canvas = await renderDocumentToCanvas(documentData, options);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNGを書き出せませんでした。')), 'image/png');
  });
}
