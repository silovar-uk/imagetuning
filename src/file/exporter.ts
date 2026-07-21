import type { AppDocument, ImageObject } from '../document/types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('書き出し用画像を読み込めませんでした。'));
    image.src = src;
  });
}

function drawNumberBadge(ctx: CanvasRenderingContext2D, number: number, image: ImageObject, offset: number) {
  const radius = 16;
  const x = image.x + 20 + offset * 38;
  const y = image.y + 20;
  ctx.save();
  ctx.fillStyle = '#c42026';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), x, y + 0.5);
  ctx.restore();
}

export async function renderDocumentToCanvas(document: AppDocument, includeNumbers: boolean): Promise<HTMLCanvasElement> {
  const canvas = window.document.createElement('canvas');
  canvas.width = document.canvas.width;
  canvas.height = document.canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvasを初期化できませんでした。');

  if (document.canvas.background !== 'transparent') {
    ctx.fillStyle = document.canvas.background === 'black' ? '#000000' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const sortedImages = [...document.images]
    .filter((image) => image.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const imageObject of sortedImages) {
    const image = await loadImage(imageObject.src);
    ctx.save();
    ctx.globalAlpha = imageObject.opacity;
    ctx.drawImage(image, imageObject.x, imageObject.y, imageObject.width, imageObject.height);
    ctx.restore();
  }

  if (includeNumbers) {
    document.comments.forEach((comment, index) => {
      const image = document.images.find((candidate) => candidate.id === comment.targetId && candidate.visible);
      if (!image) return;
      const sameTargetBefore = document.comments
        .slice(0, index)
        .filter((candidate) => candidate.targetId === comment.targetId).length;
      drawNumberBadge(ctx, index + 1, image, sameTargetBefore);
    });
  }

  return canvas;
}

export async function documentToPngBlob(document: AppDocument, includeNumbers: boolean): Promise<Blob> {
  const canvas = await renderDocumentToCanvas(document, includeNumbers);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNGを書き出せませんでした。'));
    }, 'image/png');
  });
}
