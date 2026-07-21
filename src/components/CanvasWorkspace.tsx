import { ImagePlus, Maximize2, ScanSearch } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useApp } from '../app/AppContext';
import { CanvasEngine, type ViewportSnapshot } from '../canvas/CanvasEngine';

type CanvasWorkspaceProps = {
  onFiles: (files: File[]) => void;
  onViewportChange: (viewport: ViewportSnapshot) => void;
};

export function CanvasWorkspace({ onFiles, onViewportChange }: CanvasWorkspaceProps) {
  const { state, dispatch } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new CanvasEngine(canvasRef.current, {
      onSelect: (imageId) => dispatch({
        type: 'SET_SELECTION',
        selection: imageId ? { type: 'image', id: imageId } : null,
      }),
      onCommitImagePosition: (imageId, x, y) => dispatch({
        type: 'UPDATE_IMAGE',
        imageId,
        patch: { x, y },
      }),
      onViewportChange,
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [dispatch, onViewportChange]);

  useEffect(() => {
    engineRef.current?.setState(state);
  }, [state]);

  return (
    <main
      className="workspace"
      onDragOver={(event) => {
        event.preventDefault();
        event.currentTarget.classList.add('is-dragging-over');
      }}
      onDragLeave={(event) => event.currentTarget.classList.remove('is-dragging-over')}
      onDrop={(event) => {
        event.preventDefault();
        event.currentTarget.classList.remove('is-dragging-over');
        onFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <canvas ref={canvasRef} className={`editor-canvas tool-${state.activeTool}`} />

      {state.document.images.length === 0 && (
        <button className="empty-state" type="button" onClick={() => fileInputRef.current?.click()}>
          <span className="empty-state-icon"><ImagePlus size={32} /></span>
          <strong>画像をここにドロップ</strong>
          <span>またはクリックして選択</span>
          <small>PNG / JPG / WEBP / PSD　・　Ctrl＋Vでも貼り付け</small>
        </button>
      )}
      <input
        ref={fileInputRef}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,.psd"
        multiple
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.currentTarget.value = '';
        }}
      />

      <div className="canvas-floating-controls" aria-label="表示倍率">
        <button type="button" onClick={() => engineRef.current?.fitToDocument()} title="全体表示">
          <Maximize2 size={17} />
        </button>
        <button type="button" onClick={() => engineRef.current?.resetZoom()} title="100%表示">
          <ScanSearch size={17} />
        </button>
      </div>
    </main>
  );
}
