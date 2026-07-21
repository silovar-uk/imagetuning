import { Eye, EyeOff, Layers3, Lock, MessageSquarePlus, Search, Trash2, Unlock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../app/AppContext';
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
  const selectedImageId = state.selection?.type === 'image' ? state.selection.id : null;

  const filteredComments = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return state.document.comments;
    return state.document.comments.filter((comment) => comment.text.toLowerCase().includes(keyword));
  }, [query, state.document.comments]);

  const addComment = () => {
    const text = draft.trim();
    if (!selectedImageId || !text) return;
    dispatch({
      type: 'ADD_COMMENT',
      comment: {
        id: createId('comment'),
        targetType: 'image',
        targetId: selectedImageId,
        text,
        createdAt: new Date().toISOString(),
      },
    });
    setDraft('');
  };

  return (
    <aside className="side-panel review-panel" aria-label="コメントとレイヤー">
      <div className="panel-tabs" role="tablist">
        <button className={tab === 'comments' ? 'is-active' : ''} type="button" onClick={() => setTab('comments')}>
          コメント <span>{state.document.comments.length}</span>
        </button>
        <button className={tab === 'layers' ? 'is-active' : ''} type="button" onClick={() => setTab('layers')}>
          レイヤー <span>{state.document.images.length}</span>
        </button>
      </div>

      {tab === 'comments' ? (
        <>
          <section className="comment-composer">
            <div className="section-heading">
              <span>コメント追加</span>
              <small>{selectedImageId ? '選択画像へ紐付け' : '画像を選択'}</small>
            </div>
            <textarea
              value={draft}
              disabled={!selectedImageId}
              placeholder={selectedImageId ? '修正内容を入力…' : '先に画像を選択してください'}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') addComment();
              }}
            />
            <button className="secondary-button" type="button" disabled={!selectedImageId || !draft.trim()} onClick={addComment}>
              <MessageSquarePlus size={17} />
              コメントを追加
            </button>
          </section>

          <div className="search-field">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="コメントを検索" />
          </div>

          <div className="review-list">
            {filteredComments.length === 0 ? (
              <div className="panel-empty compact"><p>コメントはまだありません</p></div>
            ) : filteredComments.map((comment) => {
              const number = state.document.comments.findIndex((item) => item.id === comment.id) + 1;
              const image = state.document.images.find((item) => item.id === comment.targetId);
              const selected = selectedImageId === comment.targetId;
              return (
                <article
                  key={comment.id}
                  className={`comment-item ${selected ? 'is-related' : ''}`}
                  onClick={() => dispatch({ type: 'SET_SELECTION', selection: { type: 'image', id: comment.targetId } })}
                >
                  <div className="comment-number">{number}</div>
                  <div className="comment-content">
                    <div className="comment-meta">
                      <span title={image?.name}>{image?.name ?? '画像'}</span>
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
          {state.document.images.length === 0 ? (
            <div className="panel-empty compact"><p>画像を追加すると表示されます</p></div>
          ) : [...state.document.images].sort((a, b) => b.zIndex - a.zIndex).map((image) => {
            const selected = selectedImageId === image.id;
            return (
              <article
                key={image.id}
                className={`layer-item ${selected ? 'is-selected' : ''}`}
                onClick={() => dispatch({ type: 'SET_SELECTION', selection: { type: 'image', id: image.id } })}
              >
                <span className="layer-icon"><Layers3 size={17} /></span>
                <div className="layer-name">
                  <strong title={image.name}>{image.name}</strong>
                  <small>{Math.round(image.width)} × {Math.round(image.height)}</small>
                </div>
                <button
                  type="button"
                  title="表示切替"
                  onClick={(event) => {
                    event.stopPropagation();
                    dispatch({ type: 'UPDATE_IMAGE', imageId: image.id, patch: { visible: !image.visible } });
                  }}
                >{image.visible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                <button
                  type="button"
                  title="ロック切替"
                  onClick={(event) => {
                    event.stopPropagation();
                    dispatch({ type: 'UPDATE_IMAGE', imageId: image.id, patch: { locked: !image.locked } });
                  }}
                >{image.locked ? <Lock size={16} /> : <Unlock size={16} />}</button>
              </article>
            );
          })}
        </div>
      )}
    </aside>
  );
}
