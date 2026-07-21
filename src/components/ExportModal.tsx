import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../app/AppContext';
import type { CanvasSettings } from '../document/types';
import { downloadBlob, safeFilename } from '../file/download';
import { documentToPngBlob, renderDocumentToCanvas } from '../file/exporter';

type ExportModalProps = {
  open: boolean;
  filename: string;
  onClose: () => void;
  onNotice: (message: string) => void;
};

export function ExportModal({ open, filename, onClose, onNotice }: ExportModalProps) {
  const { state } = useApp();
  const [background, setBackground] = useState<CanvasSettings['background']>(state.document.canvas.background);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBackground(state.document.canvas.background);
    setIncludeNumbers(state.settings.showCommentNumbers);
  }, [open, state.document.canvas.background, state.settings.showCommentNumbers]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let nextUrl: string | null = null;
    setBusy(true);
    void renderDocumentToCanvas(state.document, { background, includeNumbers })
      .then((canvas) => new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('プレビューを生成できませんでした。')), 'image/png');
      }))
      .then((blob) => {
        if (cancelled) return;
        nextUrl = URL.createObjectURL(blob);
        setPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return nextUrl;
        });
      })
      .catch((error) => {
        if (!cancelled) onNotice(error instanceof Error ? error.message : 'プレビューを生成できませんでした。');
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [background, includeNumbers, onNotice, open, state.document]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  if (!open) return null;

  const download = async () => {
    setBusy(true);
    try {
      const blob = await documentToPngBlob(state.document, { background, includeNumbers });
      downloadBlob(blob, `${safeFilename(filename, 'image-feedback')}.png`);
      onNotice('PNGを書き出しました。');
      onClose();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'PNGを書き出せませんでした。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="PNG書き出しプレビュー">
      <div className="export-modal">
        <header className="export-modal-header">
          <div><strong>PNG書き出し</strong><small>背景とコメント番号を確認</small></div>
          <button type="button" onClick={onClose} title="閉じる"><X size={20} /></button>
        </header>

        <div className="export-modal-body">
          <aside className="export-options">
            <div className="section-heading"><span>背景</span></div>
            <div className="segmented-actions export-background-options">
              {(['white', 'black', 'transparent'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={background === value ? 'is-active' : ''}
                  onClick={() => setBackground(value)}
                >{value === 'white' ? '白' : value === 'black' ? '黒' : '透過'}</button>
              ))}
            </div>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={includeNumbers}
                onChange={(event) => setIncludeNumbers(event.target.checked)}
              />
              コメント番号を表示
            </label>

            <div className="export-summary">
              <span>サイズ</span>
              <strong>{state.document.canvas.width} × {state.document.canvas.height}px</strong>
              <span>コメント</span>
              <strong>{state.document.comments.length}件</strong>
            </div>
          </aside>

          <div className={`export-preview ${background === 'transparent' ? 'is-transparent' : ''}`}>
            {busy && <div className="preview-loading"><span className="spinner" />生成中…</div>}
            {previewUrl && <img src={previewUrl} alt="PNG書き出しプレビュー" />}
          </div>
        </div>

        <footer className="export-modal-footer">
          <button type="button" onClick={onClose}>キャンセル</button>
          <button className="primary-button" type="button" disabled={busy} onClick={download}>
            <Download size={18} />PNGをダウンロード
          </button>
        </footer>
      </div>
    </div>
  );
}
