import type { AppState } from '../document/types';

export const GLOBAL_HISTORY_MAX_ENTRIES = 50;
export const GLOBAL_HISTORY_MAX_BYTES = 96 * 1024 * 1024;

export function estimateDataUrlBytes(source: string): number {
  if (!source.startsWith('data:')) return 0;
  const comma = source.indexOf(',');
  if (comma < 0) return 0;
  const payloadLength = source.length - comma - 1;
  return source.slice(0, comma).includes(';base64')
    ? Math.floor(payloadLength * 0.75)
    : payloadLength;
}

export function estimateStateBytes(state: AppState): number {
  const uniqueSources = new Set(state.document.images.map((image) => image.src));
  let bytes = 0;
  uniqueSources.forEach((source) => { bytes += estimateDataUrlBytes(source); });
  bytes += state.document.shapes.length * 320;
  bytes += state.document.comments.reduce((total, comment) => total + comment.text.length * 2 + 160, 0);
  return bytes;
}

export function trimHistoryStates(
  states: AppState[],
  maxEntries = GLOBAL_HISTORY_MAX_ENTRIES,
  maxBytes = GLOBAL_HISTORY_MAX_BYTES,
): AppState[] {
  const kept: AppState[] = [];
  let bytes = 0;
  for (let index = states.length - 1; index >= 0 && kept.length < maxEntries; index -= 1) {
    const state = states[index];
    if (!state) continue;
    const stateBytes = estimateStateBytes(state);
    if (kept.length > 0 && bytes + stateBytes > maxBytes) break;
    kept.unshift(state);
    bytes += stateBytes;
  }
  return kept;
}
