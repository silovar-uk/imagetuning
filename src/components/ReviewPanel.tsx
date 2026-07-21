import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Eye,
  EyeOff,
  Layers3,
  Lock,
  MessageSquarePlus,
  Search,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../app/AppContext';
import {
  commentsToMarkdown,
  getOrderedComments,
  getOrderedLayers,
  getTargetLabel,
} from '../document/order';
import { createId } from '../utils/ids';

function EditableComment({ id, initialText }: { id: string; initialText: string }) {
  const { dispatch } = useApp();
  const [text, setText] = useState(initialText);
  useEffect(() => setText(initialText), [initialText]);

  const commit = () => {
    if (text !== initialText) dispatch({ type: 'UPDATE_COMMENT', commentId: id, text });
  };

  return (
    <textarea
      value={text}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') event.currentTarget.blur();
      }}
      aria-label="コメント本文"
    />
  );
}

export function ReviewPanel() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<'comments' | 'layers'>('comments');
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [copied, setCopied] = useState(false);
  const selection = state.selection;

  const orderedComments = useMemo(() => getOrderedComments(state.document), [state.document]);
  const filteredComments = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return orderedComments.filter((comment) => {
      if (onlyEmpty && comment.text.trim()) return false;
      if (!keyword) return true;
      return `${getTargetLabel(state.document, comment)} ${comment.text}`.toLowerCase().includes(keyword);
    });
  }, [onlyEmpty, orderedComments, query, state.document]);

  const addComment = () => {
    const text = draft.trim();
    if (!selection || !text) return;
    dispatch({
      type: 'ADD_COMMENT',
      comment: {
        id: createId('comment'),
        targetType: selection.type,
        targetId: selection.id,
        text,
        createdAt: new Date().toISOString(),
      },
    });
    setDraft('');
  };

  const copyMarkdown = async () => {
    const markdown = commentsToMarkdown(state.document);
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = markdown;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const emptyCount = state.document.comments.filter((comment) => !comment.text.trim()).length;
  const layers = getOrderedLayers(state.document).reverse();

  return (
    <aside className="side-panel review-panel" aria-label="コメントとレイヤー">
      <div className="panel-tabs" role="tablist">
        <button className={tab === 'comments' ? 'is-active' : ''} type="button" onClick={() => setTab('comments')}>
          コメント <span>{state.document.comments.length}</span>
        </button>
        <button className={tab === 'layers' ? 'is-active' : ''} type="button" onClick={() => setTab('layers')}>
          レイヤー <span>{layers.length}</span>
        </button>
      </div>

      {tab === 'comments' ? (
        <>
          <section className="review-toolbar">
            <div className="section-heading"><span>番号順</span></div>
            <div className="segmented-actions">
              <button
                type="button"
                className={state.document.canvas.numberingMode === 'position' ? 'is-active' : ''}
                onClick={() => dispatch({ type: 'UPDATE_CANVAS', patch: { numberingMode: 'position' } })}
              >上から順</button>
              <button
                type="button"
                className={state.document.canvas.numberingMode === 'created' ? 'is-active' : ''}
                onClick={() => dispatch({ type: 'UPDATE_CANVAS', patch: { numberingMode: 'created' } })}
              >作成順</button>
            </div>
            <button className="secondary-button full-width" type="button" onClick={copyMarkdown}>
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? 'コピーしました' : 'Markdownをコピー'}
            </button>
          </section>

          <section className="comment-composer">
            <div className="section-heading">
              <span>コメント追加</span>
              <small>{selection ? '選択対象へ紐付け' : '対象を選択'}</small>
            </div>
            <textarea
              value={draft}
              disabled={!selection}
              placeholder={selection ? '修正内容を入力…' : '先に画像または図形を選択'}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') addComment();
              }}
            />
            <button className="secondary-button" type="button" disabled={!selection || !draft.trim()} onClick={addComment}>
              <MessageSquarePlus size={17} />
              コメントを追加
            </button>
          </section>

          <div className="review-filter-row">
            <div className="search-field">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="コメントを検索" />
            </div>
            <button
              className={`filter-button ${onlyEmpty ? 'is-active' : ''}`}
              type="button"
              onClick={() => setOnlyEmpty((current) => !current)}
              title="未入力コメントだけ表示"
            >未入力 {emptyCount}</button>
          </div>

          {emptyCount > 0 && (
            <div className="inline-warning"><AlertTriangle size={16} />未入力コメントが{emptyCount}件あります</div>
          )}

          <div className="review-list">
            {filteredComments.length === 0 ? (
              <div className="panel-empty compact"><p>条件に合うコメントはありません</p></div>
            ) : filteredComments.map((comment) => {
              const number = orderedComments.findIndex((item) => item.id === comment.id) + 1;
              const selected = selection?.type === comment.targetType && selection.id === comment.targetId;
              return (
                <article
                  key={comment.id}
                  className={`comment-item ${selected ? 'is-related' : ''} ${comment.text.trim() ? '' : 'is-empty'}`}
                  onClick={() => dispatch({ type: 'SET_SELECTION', selection: { type: comment.targetType, id: comment.targetId } })}
                >
                  <div className="comment-number">{number}</div>
                  <div className="comment-content">
                    <div className="comment-meta">
                      <span title={getTargetLabel(state.document, comment)}>{getTargetLabel(state.document, comment)}</span>
                      <button
                        type="button"
                        title="コメントを削除"
                        onClick={(event) => {
                          event.stopPropagation();
                          dispatch({ type: 'REMOVE_COMMENT', commentId: comment.id });
                        }}
                      ><Trash2 size={15} /></button>
                    </div>
                    <EditableComment id={comment.id} initialText={comment.text} />
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="review-list layer-list">
          {layers.length === 0 ? (
            <div className="panel-empty compact"><p>画像や図形を追加すると表示されます</p></div>
          ) : layers.map((entry) => {
            const selected = selection?.type === entry.kind && selection.id === entry.item.id;
            const title = entry.kind === 'image'
              ? entry.item.name
              : entry.item.text?.trim() || entry.item.type;
            const detail = entry.kind === 'image'
              ? `${Math.round(entry.item.width)} × ${Math.round(entry.item.height)}`
              : '図形';
            return (
              <article
                key={`${entry.kind}:${entry.item.id}`}
                className={`layer-item ${selected ? 'is-selected' : ''}`}
                onClick={() => dispatch({ type: 'SET_SELECTION', selection: { type: entry.kind, id: entry.item.id } })}
              >
                <span className="layer-icon"><Layers3 size={17} /></span>
                <div className="layer-name"><strong title={title}>{title}</strong><small>{detail}</small></div>
                <div className="layer-order-actions">
                  <button
                    type="button"
                    title="1つ前へ"
                    onClick={(event) => {
                      event.stopPropagation();
                      dispatch({ type: 'MOVE_LAYER', kind: entry.kind, id: entry.item.id, direction: 'forward' });
                    }}
                  ><ArrowUp size={15} /></button>
                  <button
                    type="button"
                    title="1つ後ろへ"
                    onClick={(event) => {
                      event.stopPropagation();
                      dispatch({ type: 'MOVE_LAYER', kind: entry.kind, id: entry.item.id, direction: 'backward' });
                    }}
                  ><ArrowDown size={15} /></button>
                </div>
                <button
                  type="button"
                  title="表示切替"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (entry.kind === 'image') dispatch({ type: 'UPDATE_IMAGE', imageId: entry.item.id, patch: { visible: !entry.item.visible } });
                    else dispatch({ type: 'UPDATE_SHAPE', shapeId: entry.item.id, patch: { visible: !entry.item.visible } });
                  }}
                >{entry.item.visible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                <button
                  type="button"
                  title="ロック切替"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (entry.kind === 'image') dispatch({ type: 'UPDATE_IMAGE', imageId: entry.item.id, patch: { locked: !entry.item.locked } });
                    else dispatch({ type: 'UPDATE_SHAPE', shapeId: entry.item.id, patch: { locked: !entry.item.locked } });
                  }}
                >{entry.item.locked ? <Lock size={16} /> : <Unlock size={16} />}</button>
              </article>
            );
          })}
        </div>
      )}
    </aside>
  );
}
