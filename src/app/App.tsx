import { useCallback, useEffect, useState } from 'react';
import { CanvasWorkspace } from '../components/CanvasWorkspace';
import { ReviewPanel } from '../components/ReviewPanel';
import { StatusBar } from '../components/StatusBar';
import { ToolPanel } from '../components/ToolPanel';
import { TopBar } from '../components/TopBar';
import type { ViewportSnapshot } from '../canvas/CanvasEngine';
import { migrateDocument } from '../document/migrate';
import { serializeDocument } from '../document/serialize';
import { downloadBlob, safeFilename } from '../file/download';
import { documentToPngBlob } from '../file/exporter';
import { filesToImageObjects } from '../file/imageLoader';
import { useApp } from './AppContext';

export function App() {
  const { state, dispatch, canUndo, canRedo } = useApp();
  const [filename, setFilename] = useState('image-feedback');
  const [viewport, setViewport] = useState<ViewportSnapshot>({ zoom: 1, offsetX: 0, offsetY: 0 });
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => current === message ? null : current), 2800);
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsBusy(true);
    try {
      const images = await filesToImageObjects(files, state.document.images.length);
      if (images.length === 0) throw new Error('対応する画像が見つかりませんでした。');
      dispatch({ type: 'ADD_IMAGES', images });
      showNotice(`${images.length}件の画像を追加しました。`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : '画像を読み込めませんでした。');
    } finally {
      setIsBusy(false);
    }
  }, [dispatch, showNotice, state.document.images.length]);

  const handleImportJson = useCallback(async (file: File) => {
    setIsBusy(true);
    try {
      const text = await file.text();
      const document = migrateDocument(JSON.parse(text));
      dispatch({ type: 'LOAD_DOCUMENT', document });
      setFilename(file.name.replace(/\.json$/i, '') || 'image-feedback');
      showNotice('JSONを読み込みました。');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'JSONを読み込めませんでした。');
    } finally {
      setIsBusy(false);
    }
  }, [dispatch, showNotice]);

  const handleExportJson = useCallback(() => {
    const blob = new Blob([serializeDocument(state.document)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `${safeFilename(filename, 'image-feedback')}.json`);
    dispatch({ type: 'MARK_SAVED' });
    showNotice('JSONを書き出しました。');
  }, [dispatch, filename, showNotice, state.document]);

  const handleExportPng = useCallback(async () => {
    if (state.document.images.length === 0) {
      showNotice('先に画像を追加してください。');
      return;
    }
    setIsBusy(true);
    try {
      const blob = await documentToPngBlob(state.document, true);
      downloadBlob(blob, `${safeFilename(filename, 'image-feedback')}.png`);
      showNotice('PNGを書き出しました。');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'PNGを書き出せませんでした。');
    } finally {
      setIsBusy(false);
    }
  }, [filename, showNotice, state.document]);

  const handleNewDocument = useCallback(() => {
    if (state.isDirty && !window.confirm('保存していない変更があります。新規作成しますか？')) return;
    dispatch({ type: 'NEW_DOCUMENT' });
    setFilename('image-feedback');
    showNotice('新しいキャンバスを作成しました。');
  }, [dispatch, showNotice, state.isDirty]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!state.isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.isDirty]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches('input, textarea, select, [contenteditable="true"]');
      if (typing) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? 'REDO' : 'UNDO' });
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        dispatch({ type: 'REDO' });
        return;
      }
      if (event.key.toLowerCase() === 'v') dispatch({ type: 'SET_TOOL', tool: 'select' });
      if (event.key.toLowerCase() === 'h') dispatch({ type: 'SET_TOOL', tool: 'pan' });
    };

    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.type.startsWith('image/'))
        .map((item, index) => {
          const blob = item.getAsFile();
          return blob ? new File([blob], `pasted-image-${Date.now()}-${index + 1}.png`, { type: blob.type }) : null;
        })
        .filter((file): file is File => file !== null);
      if (files.length > 0) void handleFiles(files);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [dispatch, handleFiles]);

  return (
    <div className="app-shell">
      <TopBar
        isDirty={state.isDirty}
        canUndo={canUndo}
        canRedo={canRedo}
        filename={filename}
        onFilenameChange={setFilename}
        onFiles={handleFiles}
        onImportJson={handleImportJson}
        onExportJson={handleExportJson}
        onExportPng={handleExportPng}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onNewDocument={handleNewDocument}
      />

      <ToolPanel />
      <CanvasWorkspace onFiles={handleFiles} onViewportChange={setViewport} />
      <ReviewPanel />
      <StatusBar
        tool={state.activeTool}
        zoom={viewport.zoom}
        imageCount={state.document.images.length}
        commentCount={state.document.comments.length}
        canvasSize={state.document.canvas}
      />

      {isBusy && <div className="busy-overlay" role="status"><span className="spinner" />処理中…</div>}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
