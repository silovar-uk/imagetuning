import {
  ArrowRight,
  BarChart3,
  Circle,
  Crop,
  Eraser,
  Hand,
  ImageMinus,
  LoaderCircle,
  MessageSquare,
  MousePointer2,
  Paintbrush,
  Palette,
  Pencil,
  Pipette,
  Square,
  Tag,
  Type,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../app/AppContext';
import { selectSelectedImage, selectSelectedShape } from '../app/selectors';
import { getShapeBounds, scalePointsToBounds } from '../canvas/resize';
import type { ToolId } from '../document/types';
import { analyzeImageSource, type ColorShare } from '../image-processing/colorAnalysis';

const tools: { id: ToolId; label: string; icon: typeof MousePointer2 }[] = [
  { id: 'select', label: '選択', icon: MousePointer2 },
  { id: 'pan', label: '移動', icon: Hand },
  { id: 'eyedropper', label: 'スポイト', icon: Pipette },
  { id: 'pen', label: 'ペン', icon: Pencil },
  { id: 'text', label: 'テキスト', icon: Type },
  { id: 'rect', label: '四角', icon: Square },
  { id: 'ellipse', label: '円', icon: Circle },
  { id: 'arrow', label: '矢印', icon: ArrowRight },
  { id: 'speech-bubble', label: '吹出', icon: MessageSquare },
  { id: 'color-tag', label: '色タグ', icon: Tag },
];

export function ToolPanel() {
  const { state, dispatch } = useApp();
  const image = selectSelectedImage(state);
  const shape = selectSelectedShape(state);
  const [opacity, setOpacity] = useState(100);
  const [colors, setColors] = useState<ColorShare[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (image) setOpacity(Math.round(image.opacity * 100));
    setColors([]);
    setAnalysisError(null);
  }, [image]);

  const analyzeColors = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      setColors(await analyzeImageSource(image.src, 6));
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : '色を分析できませんでした。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resizeSelectedShape = (nextWidth: number, nextHeight: number) => {
    if (!shape) return;
    const width = Math.max(1, Math.round(nextWidth));
    const height = Math.max(1, Math.round(nextHeight));
    const original = getShapeBounds(shape);
    const target = {
      left: original.left,
      top: original.top,
      right: original.left + width,
      bottom: original.top + height,
    };
    dispatch({
      type: 'UPDATE_SHAPE',
      shapeId: shape.id,
      patch: {
        x: target.left,
        y: target.top,
        width,
        height,
        ...(shape.type === 'pen' && shape.points
          ? { points: scalePointsToBounds(shape.points, original, target) }
          : {}),
      },
    });
  };

  return (
    <aside className="side-panel tool-panel">
      <section className="panel-section">
        <div className="section-heading"><span>ツール</span><small>選択してキャンバス操作</small></div>
        <div className="tool-grid">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                className={`tool-button ${state.activeTool === tool.id ? 'is-active' : ''}`}
                onClick={() => dispatch({ type: 'SET_TOOL', tool: tool.id })}
              >
                <Icon size={19} /><span>{tool.label}</span>
              </button>
            );
          })}
        </div>
        {state.activeTool === 'eyedropper' && (
          <div className="tool-hint"><Pipette size={15} />画像上をクリックすると描画色へ反映します</div>
        )}
      </section>

      <section className="panel-section">
        <div className="section-heading"><span>描画設定</span></div>
        <div className="settings-stack">
          <label className="field-row">
            色
            <span className="current-color-value">
              <i style={{ background: state.toolOptions.color }} />
              <code>{state.toolOptions.color}</code>
              <input
                type="color"
                value={state.toolOptions.color}
                onChange={(event) => dispatch({ type: 'SET_TOOL_OPTIONS', patch: { color: event.target.value } })}
              />
            </span>
          </label>
          <div className="field-group">
            <div className="field-label-row"><label>線の太さ</label><output>{state.toolOptions.lineWidth}px</output></div>
            <input
              type="range"
              min="1"
              max="20"
              value={state.toolOptions.lineWidth}
              onChange={(event) => dispatch({ type: 'SET_TOOL_OPTIONS', patch: { lineWidth: Number(event.target.value) } })}
            />
          </div>
          <div className="segmented-actions">
            <button className={state.toolOptions.lineStyle === 'solid' ? 'is-active' : ''} onClick={() => dispatch({ type: 'SET_TOOL_OPTIONS', patch: { lineStyle: 'solid' } })}>実線</button>
            <button className={state.toolOptions.lineStyle === 'dashed' ? 'is-active' : ''} onClick={() => dispatch({ type: 'SET_TOOL_OPTIONS', patch: { lineStyle: 'dashed' } })}>破線</button>
          </div>
        </div>
      </section>

      <section className="panel-section panel-section-grow">
        <div className="section-heading"><span>選択中</span><small>{image ? '画像' : shape ? '図形' : '未選択'}</small></div>
        {image ? (
          <div className="settings-stack">
            <strong>{image.name}</strong>
            <div className="field-group">
              <div className="field-label-row"><label>透明度</label><output>{opacity}%</output></div>
              <input
                type="range"
                min="0"
                max="100"
                value={opacity}
                onChange={(event) => setOpacity(Number(event.target.value))}
                onPointerUp={() => dispatch({ type: 'UPDATE_IMAGE', imageId: image.id, patch: { opacity: opacity / 100 } })}
              />
            </div>

            <button className="secondary-button" onClick={analyzeColors} disabled={isAnalyzing}>
              {isAnalyzing ? <LoaderCircle className="spin" size={17} /> : <BarChart3 size={17} />}
              {isAnalyzing ? '分析中…' : '主要色を分析'}
            </button>
            {analysisError && <p className="field-error">{analysisError}</p>}
            {colors.length > 0 && (
              <div className="color-analysis" aria-label="主要色と割合">
                {colors.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    className="color-share-row"
                    onClick={() => dispatch({ type: 'SET_TOOL_OPTIONS', patch: { color: color.hex } })}
                    title={`${color.hex}を描画色に設定`}
                  >
                    <i style={{ background: color.hex }} />
                    <code>{color.hex}</code>
                    <span>{color.percentage}%</span>
                    <b style={{ width: `${Math.min(100, color.percentage)}%` }} />
                  </button>
                ))}
              </div>
            )}

            <button className="secondary-button" onClick={() => dispatch({ type: 'SET_MODAL', modal: 'adjust' })}><Palette size={17} />画像補正</button>
            <button className="secondary-button" onClick={() => dispatch({ type: 'SET_MODAL', modal: 'retouch' })}><Paintbrush size={17} />画像修正</button>
            <button className="danger-button" onClick={() => dispatch({ type: 'REMOVE_IMAGE', imageId: image.id })}><ImageMinus size={17} />画像を削除</button>
          </div>
        ) : shape ? (
          <div className="settings-stack">
            <strong>{shape.type}</strong>
            <label className="field-row">
              色
              <input type="color" value={shape.color} onChange={(event) => dispatch({ type: 'UPDATE_SHAPE', shapeId: shape.id, patch: { color: event.target.value } })} />
            </label>
            <div className="field-group">
              <div className="field-label-row"><label>サイズ</label><output>{Math.round(Math.abs(shape.width))} × {Math.round(Math.abs(shape.height))}px</output></div>
              <div className="position-grid">
                <label>W<input aria-label="図形の幅" type="number" min="1" value={Math.round(Math.abs(shape.width))} onChange={(event) => resizeSelectedShape(Number(event.target.value), Math.abs(shape.height))} /></label>
                <label>H<input aria-label="図形の高さ" type="number" min="1" value={Math.round(Math.abs(shape.height))} onChange={(event) => resizeSelectedShape(Math.abs(shape.width), Number(event.target.value))} /></label>
              </div>
              {shape.type === 'pen' && <small className="field-note">ペン線の点列を比率変換して拡大・縮小します</small>}
            </div>
            {(shape.type === 'text' || shape.type === 'speech-bubble') && (
              <textarea value={shape.text ?? ''} onChange={(event) => dispatch({ type: 'UPDATE_SHAPE', shapeId: shape.id, patch: { text: event.target.value } })} />
            )}
            <button className="danger-button" onClick={() => dispatch({ type: 'REMOVE_SHAPE', shapeId: shape.id })}><Eraser size={17} />図形を削除</button>
          </div>
        ) : (
          <div className="panel-empty"><Crop size={23} /><p>画像または図形を選択</p></div>
        )}
      </section>
    </aside>
  );
}
