import { describe, expect, it } from 'vitest';
import { createHistoryState, historyReducer } from '../src/app/appReducer';
import type { ImageObject } from '../src/document/types';

const image: ImageObject = {
  id: 'img_1',
  name: 'sample.png',
  src: 'data:image/png;base64,AA==',
  mimeType: 'image/png',
  x: 0,
  y: 0,
  width: 100,
  height: 80,
  opacity: 1,
  visible: true,
  locked: false,
  zIndex: 0,
};

describe('historyReducer', () => {
  it('画像追加をUndo/Redoできる', () => {
    let state = createHistoryState();
    state = historyReducer(state, { type: 'ADD_IMAGES', images: [image] });
    expect(state.present.document.images).toHaveLength(1);

    state = historyReducer(state, { type: 'UNDO' });
    expect(state.present.document.images).toHaveLength(0);

    state = historyReducer(state, { type: 'REDO' });
    expect(state.present.document.images).toHaveLength(1);
  });

  it('選択変更はUndo履歴を増やさない', () => {
    let state = createHistoryState();
    state = historyReducer(state, { type: 'SET_SELECTION', selection: { type: 'image', id: 'img_1' } });
    expect(state.past).toHaveLength(0);
  });
});
