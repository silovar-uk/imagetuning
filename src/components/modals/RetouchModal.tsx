import { Redo2, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useApp } from '../../app/AppContext';
import { selectSelectedImage } from '../../app/selectors';
import {
  captureCanvasSnapshot,
  restoreBlobSnapshot,
  totalSnapshotBytes,
  trimBlobSnapshots,
  type BlobSnapshot,
} from '../../history/blobSnapshots';
import { canvasToDataUrl, cloneCanvas, srcToCanvas } from '../../image-processing/canvasImage';

type Mode = 'erase' | 'paint' | 'blur';
type CanvasPoint = { x: number; y: number };

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function RetouchModal() {
  const { state, dispatch } = useApp();
  const image = selectSelectedImage(state);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<CanvasPoint | null>(null);
  const snapshotsRef = useRef<BlobSnapshot[]>([]);
  const snapshotIndexRef = useRef(-1);
  const captureQueueRef = useRef<Promise<void>>(Promise.resolve());

  const [mode, setMode] = useState<Mode>('erase');
  const [size, setSize] = useState(40);
  const [opacity, setOpacity] = useState(100);
  const [color, setColor] = useState('#ffffff');
  const [blur, setBlur] = useState(10);
  const [showBefore, setShowBefore] = useState(false);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [historyBytes, setHistoryBytes] = useState(0);
  const [historyBusy, setHistoryBusy] = useState(false);

  const syncHistoryUi = (snapshots: BlobSnapshot[], index: number) => {
    snapshotsRef.current = snapshots;
    snapshotIndexRef.current = index;
    setHistoryIndex(index);
    setHistoryBytes(totalSnapshotBytes(snapshots));
  };

  useEffect(() => {
    if (!image) return;
    let active = true;
    setHistoryBusy(true);
    void srcToCanvas(image.src)
      .then(async (sourceCanvas) => {
        if (!active || !canvasRef.current) return;
        originalRef.current = sourceCanvas;
        setBeforeUrl(sourceCanvas.toDataURL('image/png'));
        const canvas = canvasRef.current;
        canvas.width = sourceCanvas.width;
        canvas.height = sourceCanvas.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvasを初期化できませんでした。');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(sourceCanvas, 0, 0);
        const firstSnapshot = await captureCanvasSnapshot(canvas);
        if (active) syncHistoryUi([firstSnapshot], 0);
      })
      .finally(() => {
        if (active) setHistoryBusy(false);
      });
    return () => {
      active = false;
      snapshotsRef.current = [];
      snapshotIndexRef.current = -1;
    };
  }, [image?.id, image?.src]);

  if (!image) return null;

  const point = (event: ReactPointerEvent<HTMLCanvasElement>): CanvasPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * event.currentTarget.width) / rect.width,
      y: ((event.clientY - rect.top) * event.currentTarget.height) / rect.height,
    };
  };

  const stroke = (from: CanvasPoint, to: CanvasPoint) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = size;
    context.globalAlpha = opacity / 100;

    if (mode === 'erase') {
      context.globalCompositeOperation = 'destination-out';
      context.strokeStyle = '#000000';
    } else if (mode === 'paint') {
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = color;
    } else {
      const temporary = cloneCanvas(canvas);
      const temporaryContext = temporary.getContext('2d');
      if (!temporaryContext) {
        context.restore();
        return;
      }
      temporaryContext.filter = `blur(${blur}px)`;
      temporaryContext.drawImage(canvas, 0, 0);
      context.beginPath();
      context.arc(to.x, to.y, size / 2, 0, Math.PI * 2);
      context.clip();
      context.drawImage(temporary, 0, 0);
      context.restore();
      return;
    }

    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    context.restore();
  };

  const captureCurrentState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistoryBusy(true);
    captureQueueRef.current = captureQueueRef.current
      .then(async () => {
        const snapshot = await captureCanvasSnapshot(canvas);
        const currentBranch = snapshotsRef.current.slice(0, snapshotIndexRef.current + 1);
        const snapshots = trimBlobSnapshots([...currentBranch, snapshot]);
        syncHistoryUi(snapshots, snapshots.length - 1);
      })
      .finally(() => setHistoryBusy(false));
  };

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    captureCurrentState();
  };

  const restoreAt = async (index: number) => {
    const canvas = canvasRef.current;
    const snapshot = snapshotsRef.current[index];
    if (!canvas || !snapshot || historyBusy) return;
    setHistoryBusy(true);
    try {
      await restoreBlobSnapshot(snapshot, canvas);
      snapshotIndexRef.current = index;
      setHistoryIndex(index);
    } finally {
      setHistoryBusy(false);
    }
  };

  const apply = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    await captureQueueRef.current;
    dispatch({
      type: 'UPDATE_IMAGE',
      imageId: image.id,
      patch: { src: canvasToDataUrl(canvas), mimeType: 'image/png' },
    });
    dispatch({ type: 'SET_MODAL', modal: null });
  };

  const canUndo = historyIndex > 0 && !historyBusy;
  const canRedo = historyIndex >= 0 && historyIndex < snapshotsRef.current.length - 1 && !historyBusy;

  return (
    <div className="modal-backdrop">
      <div className="editor-modal retouch-modal">
        <header>
          <div><strong>画像修正</strong><small>消去・単色塗り・ぼかし</small></div>
          <button onClick={() => dispatch({ type: 'SET_MODAL', modal: null })}>×</button>
        </header>

        <div className="modal-body two-column">
          <aside className="modal-controls">
            <div className="segmented-actions">
              <button className={mode === 'erase' ? 'is-active' : ''} onClick={() => setMode('erase')}>消去</button>
              <button className={mode === 'paint' ? 'is-active' : ''} onClick={() => setMode('paint')}>塗る</button>
              <button className={mode === 'blur' ? 'is-active' : ''} onClick={() => setMode('blur')}>ぼかす</button>
            </div>

            {mode === 'paint' && (
              <label>色<input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
            )}
            <label>ブラシサイズ {size}px<input type="range" min="4" max="160" value={size} onChange={(event) => setSize(Number(event.target.value))} /></label>
            <label>不透明度 {opacity}%<input type="range" min="10" max="100" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /></label>
            {mode === 'blur' && (
              <label>ぼかし強度 {blur}px<input type="range" min="2" max="30" value={blur} onChange={(event) => setBlur(Number(event.target.value))} /></label>
            )}

            <div className="retouch-history-actions">
              <button className="secondary-button" disabled={!canUndo} onClick={() => void restoreAt(historyIndex - 1)}><Undo2 size={16} />元に戻す</button>
              <button className="secondary-button" disabled={!canRedo} onClick={() => void restoreAt(historyIndex + 1)}><Redo2 size={16} />やり直す</button>
            </div>
            <small className="retouch-history-status">
              履歴 {Math.max(0, historyIndex + 1)} / {snapshotsRef.current.length}件・{formatBytes(historyBytes)}
            </small>

            <button
              className="secondary-button"
              onPointerDown={() => setShowBefore(true)}
              onPointerUp={() => setShowBefore(false)}
              onPointerLeave={() => setShowBefore(false)}
            >長押しで修正前</button>
          </aside>

          <div className="modal-canvas-wrap">
            <canvas
              ref={canvasRef}
              style={{ visibility: showBefore ? 'hidden' : 'visible' }}
              onPointerDown={(event) => {
                if (historyBusy) return;
                drawingRef.current = true;
                lastPointRef.current = point(event);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!drawingRef.current || !lastPointRef.current) return;
                const nextPoint = point(event);
                stroke(lastPointRef.current, nextPoint);
                lastPointRef.current = nextPoint;
              }}
              onPointerUp={finishStroke}
              onPointerCancel={finishStroke}
            />
            {showBefore && beforeUrl && <img className="before-image" src={beforeUrl} alt="修正前" />}
          </div>
        </div>

        <footer>
          <button onClick={() => dispatch({ type: 'SET_MODAL', modal: null })}>キャンセル</button>
          <button className="primary-button" disabled={historyBusy} onClick={() => void apply()}>元画像へ適用</button>
        </footer>
      </div>
    </div>
  );
}
