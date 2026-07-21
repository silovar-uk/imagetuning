import { useCallback, useEffect, useState } from 'react';
import { CanvasWorkspace } from '../components/CanvasWorkspace';
import { ExportModal } from '../components/ExportModal';
import { ReviewPanel } from '../components/ReviewPanel';
import { StatusBar } from '../components/StatusBar';
import { ToolPanel } from '../components/ToolPanel';
import { TopBar } from '../components/TopBar';
import { ImageAdjustModal } from '../components/modals/ImageAdjustModal';
import { RetouchModal } from '../components/modals/RetouchModal';
import type { ViewportSnapshot } from '../canvas/CanvasEngine';
import { migrateDocument } from '../document/migrate';
import { serializeDocument } from '../document/serialize';
import { downloadBlob, safeFilename } from '../file/download';
import { filesToImageObjects } from '../file/imageLoader';
import {
  clearAutosave,
  hasMeaningfulContent,
  loadAutosave,
  saveAutosave,
  type AutosaveSnapshot,
} from '../persistence/autosave';
import { useApp } from './AppContext';

export function App() {
  const { state, dispatch, canUndo, canRedo } = useApp();
  const [filename, setFilename] = useState('image-feedback');
  const [viewport, setViewport] = useState<ViewportSnapshot>({ zoom: 1, offsetX: 0, offsetY: 0 });
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [restoreSnapshot, setRestoreSnapshot] = useState<AutosaveSnapshot | null>(null);
  const [autosaveReady, setAutosaveReady] = useState(false);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<string | null>(null);

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
      await clearAutosave().catch(() => undefined);
      setRestoreSnapshot(null);
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
    void clearAutosave().catch(() => undefined);
    setRestoreSnapshot(null);
    showNotice('JSONを書き出しました。');
  }, [dispatch, filename, showNotice, state.document]);

  const handleExportPng = useCallback(() => {
    if (state.document.images.length === 0) {
      showNotice('先に画像を追加してください。');
      return;
    }
    setExportOpen(true);
  }, [showNotice, state.document.images.length]);

  const handleNewDocument = useCallback(() => {
    if (state.isDirty && !window.confirm('保存していない変更があります。新規作成しますか？')) return;
    dispatch({ type: 'NEW_DOCUMENT' });
    setFilename('image-feedback');
    setRestoreSnapshot(null);
    setLastAutosavedAt(null);
    void clearAutosave().catch(() => undefined);
    showNotice('新しいキャンバスを作成しました。');
  }, [dispatch, showNotice, state.isDirty]);

  useEffect(() => {
    let active = true;
    void loadAutosave()
      .then((snapshot) => {
        if (!active) return;
        if (snapshot && hasMeaningfulContent(snapshot.document)) setRestoreSnapshot(snapshot);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setAutosaveReady(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!autosaveReady || !state.isDirty || !hasMeaningfulContent(state.document)) return;
    const timeout = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      void saveAutosave({ document: state.document, filename, savedAt })
        .then(() => setLastAutosavedAt(savedAt))
        .catch(() => undefined);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [autosaveReady, filename, state.document, state.isDirty]);

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
      if (event.key.toLowerCase() === 'i') dispatch({ type: 'SET_TOOL', tool: 'eyedropper' });
      if (event.key.toLowerCase() === 'p') dispatch({ type: 'SET_TOOL', tool: 'pen' });
      if (event.key.toLowerCase() === 'r') dispatch({ type: 'SET_TOOL', tool: 'rect' });
      if (event.key.toLowerCase() === 'a') dispatch({ type: 'SET_TOOL', tool: 'arrow' });
      if (event.key.toLowerCase() === 't') dispatch({ type: 'SET_TOOL', tool: 'text' });
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (state.selection?.type === 'image') dispatch({ type: 'REMOVE_IMAGE', imageId: state.selection.id });
        if (state.selection?.type === 'shape') dispatch({ type: 'REMOVE_SHAPE', shapeId: state.selection.id });
      }
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
  }, [dispatch, handleFiles, state.selection]);

  return (
    <div className="app-shell">
      <TopBar
        isDirty={state.isDirty}
        canUndo={canUndo}
        canRedo={canRedo}
        filename={filename}
        showCommentNumbers={state.settings.showCommentNumbers}
        onFilenameChange={setFilename}
        onFiles={handleFiles}
        onImportJson={handleImportJson}
        onExportJson={handleExportJson}
        onExportPng={handleExportPng}
        onToggleCommentNumbers={() => dispatch({
          type: 'PATCH_SETTINGS',
          patch: { showCommentNumbers: !state.settings.showCommentNumbers },
        })}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onNewDocument={handleNewDocument}
      />

      {restoreSnapshot && (
        <div className="restore-banner" role="status">
          <div>
            <strong>前回の作業を復元できます</strong>
            <span>{new Date(restoreSnapshot.savedAt).toLocaleString('ja-JP')} に自動保存</span>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              dispatch({ type: 'LOAD_DOCUMENT', document: restoreSnapshot.document });
              setFilename(restoreSnapshot.filename || 'image-feedback');
              setRestoreSnapshot(null);
              setLastAutosavedAt(restoreSnapshot.savedAt);
              showNotice('前回の作業を復元しました。');
            }}
          >復元</button>
          <button
            type="button"
            onClick={() => {
              setRestoreSnapshot(null);
              void clearAutosave().catch(() => undefined);
            }}
          >破棄</button>
        </div>
      )}

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
      {lastAutosavedAt && (
        <div className="autosave-status">自動保存済み {new Date(lastAutosavedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
      )}
      {isBusy && <div className="busy-overlay" role="status"><span className="spinner" />処理中…</div>}
      {state.modal === 'adjust' && <ImageAdjustModal />}
      {state.modal === 'retouch' && <RetouchModal />}
      <ExportModal open={exportOpen} filename={filename} onClose={() => setExportOpen(false)} onNotice={showNotice} />
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
