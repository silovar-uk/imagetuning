import { Download, FileInput, FileJson, FolderOpen, Redo2, RotateCcw, Undo2 } from 'lucide-react';
import { useRef } from 'react';

type TopBarProps = {
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  filename: string;
  onFilenameChange: (value: string) => void;
  onFiles: (files: File[]) => void;
  onImportJson: (file: File) => void;
  onExportJson: () => void;
  onExportPng: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onNewDocument: () => void;
};

export function TopBar(props: TopBarProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">IT</div>
        <div>
          <div className="brand-title-row">
            <h1>Image Tuning</h1>
            {props.isDirty && <span className="dirty-indicator">変更あり</span>}
          </div>
          <p>画像への指示を、見える形でまとめる</p>
        </div>
      </div>

      <div className="topbar-file-name">
        <label htmlFor="project-name">ファイル名</label>
        <input
          id="project-name"
          value={props.filename}
          onChange={(event) => props.onFilenameChange(event.target.value)}
          placeholder="image-feedback"
        />
      </div>

      <div className="topbar-actions" aria-label="ファイルと履歴の操作">
        <button className="icon-button" type="button" onClick={() => imageInputRef.current?.click()} title="画像を開く">
          <FolderOpen size={18} />
          <span>画像</span>
        </button>
        <input
          ref={imageInputRef}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp,.psd"
          multiple
          onChange={(event) => {
            props.onFiles(Array.from(event.target.files ?? []));
            event.currentTarget.value = '';
          }}
        />

        <button className="icon-button" type="button" onClick={() => jsonInputRef.current?.click()} title="JSONを読み込む">
          <FileInput size={18} />
          <span>読込</span>
        </button>
        <input
          ref={jsonInputRef}
          hidden
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) props.onImportJson(file);
            event.currentTarget.value = '';
          }}
        />

        <span className="toolbar-divider" />

        <button className="icon-button" type="button" onClick={props.onUndo} disabled={!props.canUndo} title="元に戻す">
          <Undo2 size={18} />
        </button>
        <button className="icon-button" type="button" onClick={props.onRedo} disabled={!props.canRedo} title="やり直す">
          <Redo2 size={18} />
        </button>

        <span className="toolbar-divider" />

        <button className="icon-button" type="button" onClick={props.onExportJson} title="JSONを書き出す">
          <FileJson size={18} />
          <span>JSON</span>
        </button>
        <button className="primary-button" type="button" onClick={props.onExportPng}>
          <Download size={18} />
          PNG書出し
        </button>
        <button className="icon-button danger-quiet" type="button" onClick={props.onNewDocument} title="新規作成">
          <RotateCcw size={18} />
        </button>
      </div>
    </header>
  );
}
