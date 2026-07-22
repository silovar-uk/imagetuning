import { ImagePlus, Maximize2, ScanSearch } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../app/AppContext';
import { CanvasEngine, type ViewportSnapshot } from '../canvas/CanvasEngine';
import { PenResizeOverlay } from './PenResizeOverlay';

type Props = {
  onFiles: (files: File[]) => void;
  onViewportChange: (viewport: ViewportSnapshot) => void;
};

const initialViewport: ViewportSnapshot = { zoom: 1, offsetX: 0, offsetY: 0 };

export function CanvasWorkspace({ onFiles, onViewportChange }: Props) {
  const { state, dispatch } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewport, setViewport] = useState<ViewportSnapshot>(initialViewport);

  const reportViewport = useCallback((nextViewport: ViewportSnapshot) => {
    setViewport(nextViewport);
    onViewportChange(nextViewport);
  }, [onViewportChange]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new CanvasEngine(canvasRef.current, {
      onSelect: (selection) => dispatch({ type: 'SET_SELECTION', selection }),
      onCommitImagePosition: (id, x, y) => dispatch({ type: 'UPDATE_IMAGE', imageId: id, patch: { x, y } }),
      onCommitShape: (shape) => dispatch({ type: 'ADD_SHAPE', shape }),
      onCommitShapePatch: (id, patch) => dispatch({ type: 'UPDATE_SHAPE', shapeId: id, patch }),
      onColorPicked: (color) => dispatch({ type: 'SET_TOOL_OPTIONS', patch: { color } }),
      onViewportChange: reportViewport,
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [dispatch, reportViewport]);

  useEffect(() => engineRef.current?.setState(state), [state]);

  const selectedPen = state.selection?.type === 'shape'
    ? state.document.shapes.find((shape) => shape.id === state.selection?.id && shape.type === 'pen') ?? null
    : null;
  const isEmpty = state.document.images.length === 0 && state.document.shapes.length === 0;

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
      {selectedPen && state.activeTool === 'select' && !selectedPen.locked && selectedPen.visible && (
        <PenResizeOverlay
          shape={selectedPen}
          viewport={viewport}
          onCommit={(patch) => dispatch({ type: 'UPDATE_SHAPE', shapeId: selectedPen.id, patch })}
        />
      )}
      {isEmpty && (
        <button className="empty-state" onClick={() => fileInputRef.current?.click()}>
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
      <div className="canvas-floating-controls">
        <button onClick={() => engineRef.current?.fitToDocument()}><Maximize2 size={17} /></button>
        <button onClick={() => engineRef.current?.resetZoom()}><ScanSearch size={17} /></button>
      </div>
    </main>
  );
}
