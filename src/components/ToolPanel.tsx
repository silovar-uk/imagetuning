import { Eye, EyeOff, Hand, ImageMinus, Lock, MousePointer2, Unlock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../app/AppContext';
import { selectSelectedImage } from '../app/selectors';

export function ToolPanel() {
  const { state, dispatch } = useApp();
  const selectedImage = selectSelectedImage(state);
  const [opacity, setOpacity] = useState(100);
  const [position, setPosition] = useState({ x: '0', y: '0' });

  useEffect(() => {
    if (!selectedImage) return;
    setOpacity(Math.round(selectedImage.opacity * 100));
    setPosition({ x: String(Math.round(selectedImage.x)), y: String(Math.round(selectedImage.y)) });
  }, [selectedImage]);

  const commitOpacity = () => {
    if (!selectedImage) return;
    const next = opacity / 100;
    if (next !== selectedImage.opacity) {
      dispatch({ type: 'UPDATE_IMAGE', imageId: selectedImage.id, patch: { opacity: next } });
    }
  };

  const commitPosition = () => {
    if (!selectedImage) return;
    const x = Number(position.x);
    const y = Number(position.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x !== selectedImage.x || y !== selectedImage.y) {
      dispatch({ type: 'UPDATE_IMAGE', imageId: selectedImage.id, patch: { x, y } });
    }
  };

  return (
    <aside className="side-panel tool-panel" aria-label="ツールと設定">
      <section className="panel-section">
        <div className="section-heading">
          <span>基本ツール</span>
          <small>V / H</small>
        </div>
        <div className="tool-grid">
          <button
            className={`tool-button ${state.activeTool === 'select' ? 'is-active' : ''}`}
            type="button"
            onClick={() => dispatch({ type: 'SET_TOOL', tool: 'select' })}
          >
            <MousePointer2 size={20} />
            <span>選択</span>
          </button>
          <button
            className={`tool-button ${state.activeTool === 'pan' ? 'is-active' : ''}`}
            type="button"
            onClick={() => dispatch({ type: 'SET_TOOL', tool: 'pan' })}
          >
            <Hand size={20} />
            <span>移動</span>
          </button>
        </div>
      </section>

      <section className="panel-section panel-section-grow">
        <div className="section-heading">
          <span>選択中の画像</span>
          <small>{selectedImage ? '編集可能' : '未選択'}</small>
        </div>

        {!selectedImage ? (
          <div className="panel-empty">
            <MousePointer2 size={24} />
            <p>キャンバスまたは右のレイヤーから画像を選択</p>
          </div>
        ) : (
          <div className="settings-stack">
            <div className="selected-object-name">
              <span className="file-type-pill">IMG</span>
              <strong title={selectedImage.name}>{selectedImage.name}</strong>
            </div>

            <div className="field-group">
              <div className="field-label-row">
                <label htmlFor="opacity">透明度</label>
                <output>{opacity}%</output>
              </div>
              <input
                id="opacity"
                type="range"
                min="0"
                max="100"
                value={opacity}
                onChange={(event) => setOpacity(Number(event.target.value))}
                onPointerUp={commitOpacity}
                onKeyUp={commitOpacity}
              />
            </div>

            <div className="position-grid">
              <label>
                X
                <input
                  value={position.x}
                  inputMode="numeric"
                  onChange={(event) => setPosition((current) => ({ ...current, x: event.target.value }))}
                  onBlur={commitPosition}
                  onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
                />
              </label>
              <label>
                Y
                <input
                  value={position.y}
                  inputMode="numeric"
                  onChange={(event) => setPosition((current) => ({ ...current, y: event.target.value }))}
                  onBlur={commitPosition}
                  onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
                />
              </label>
            </div>

            <div className="segmented-actions">
              <button
                type="button"
                className={selectedImage.visible ? 'is-active' : ''}
                onClick={() => dispatch({
                  type: 'UPDATE_IMAGE',
                  imageId: selectedImage.id,
                  patch: { visible: !selectedImage.visible },
                })}
              >
                {selectedImage.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                表示
              </button>
              <button
                type="button"
                className={selectedImage.locked ? 'is-active' : ''}
                onClick={() => dispatch({
                  type: 'UPDATE_IMAGE',
                  imageId: selectedImage.id,
                  patch: { locked: !selectedImage.locked },
                })}
              >
                {selectedImage.locked ? <Lock size={16} /> : <Unlock size={16} />}
                固定
              </button>
            </div>

            <button
              className="danger-button"
              type="button"
              onClick={() => dispatch({ type: 'REMOVE_IMAGE', imageId: selectedImage.id })}
            >
              <ImageMinus size={17} />
              画像を削除
            </button>
          </div>
        )}
      </section>

      <section className="panel-section next-phase-section">
        <div className="section-heading"><span>次の実装</span></div>
        <ul className="compact-list">
          <li>描画・注釈ツール</li>
          <li>色置換・2階調化</li>
          <li>消去・塗り・ぼかし</li>
        </ul>
      </section>
    </aside>
  );
}
