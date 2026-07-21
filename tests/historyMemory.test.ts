import { describe, expect, it } from 'vitest';
import { trimBlobSnapshots } from '../src/history/blobSnapshots';
import { estimateDataUrlBytes, trimHistoryStates } from '../src/history/memory';
import { createInitialState, type AppState } from '../src/document/types';

function stateWithSource(source: string): AppState {
  const state = createInitialState();
  state.document.images = [{
    id: source,
    name: 'image.png',
    src: source,
    mimeType: 'image/png',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 0,
  }];
  return state;
}

describe('history memory', () => {
  it('Base64 Data URLの概算バイト数を返す', () => {
    expect(estimateDataUrlBytes(`data:image/png;base64,${'A'.repeat(400)}`)).toBe(300);
    expect(estimateDataUrlBytes('https://example.com/image.png')).toBe(0);
  });

  it('件数上限では新しい状態を残す', () => {
    const states = ['one', 'two', 'three'].map((value) => stateWithSource(`data:image/png;base64,${value}`));
    expect(trimHistoryStates(states, 2, Number.MAX_SAFE_INTEGER).map((state) => state.document.images[0]?.id))
      .toEqual(['data:image/png;base64,two', 'data:image/png;base64,three']);
  });

  it('Blob履歴も新しいスナップショットから容量内に残す', () => {
    const snapshots = [
      { blob: new Blob(['a'.repeat(6)]), bytes: 6 },
      { blob: new Blob(['b'.repeat(6)]), bytes: 6 },
      { blob: new Blob(['c'.repeat(6)]), bytes: 6 },
    ];
    const trimmed = trimBlobSnapshots(snapshots, 10, 12);
    expect(trimmed).toHaveLength(2);
    expect(trimmed[0]?.bytes).toBe(6);
    expect(trimmed[1]?.bytes).toBe(6);
  });
});
