export type BlobSnapshot = {
  blob: Blob;
  bytes: number;
};

export const RETOUCH_HISTORY_MAX_ENTRIES = 20;
export const RETOUCH_HISTORY_MAX_BYTES = 80 * 1024 * 1024;

export function captureCanvasSnapshot(canvas: HTMLCanvasElement): Promise<BlobSnapshot> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('画像履歴を保存できませんでした。'));
        return;
      }
      resolve({ blob, bytes: blob.size });
    }, 'image/png');
  });
}

export function trimBlobSnapshots(
  snapshots: BlobSnapshot[],
  maxEntries = RETOUCH_HISTORY_MAX_ENTRIES,
  maxBytes = RETOUCH_HISTORY_MAX_BYTES,
): BlobSnapshot[] {
  const kept: BlobSnapshot[] = [];
  let bytes = 0;
  for (let index = snapshots.length - 1; index >= 0 && kept.length < maxEntries; index -= 1) {
    const snapshot = snapshots[index];
    if (!snapshot) continue;
    if (kept.length > 0 && bytes + snapshot.bytes > maxBytes) break;
    kept.unshift(snapshot);
    bytes += snapshot.bytes;
  }
  return kept;
}

export async function restoreBlobSnapshot(snapshot: BlobSnapshot, canvas: HTMLCanvasElement): Promise<void> {
  const url = URL.createObjectURL(snapshot.blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('画像履歴を復元できませんでした。'));
      element.src = url;
    });
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvasを初期化できませんでした。');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function totalSnapshotBytes(snapshots: BlobSnapshot[]): number {
  return snapshots.reduce((total, snapshot) => total + snapshot.bytes, 0);
}
