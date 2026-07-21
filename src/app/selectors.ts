import type { AppState, ImageObject } from '../document/types';

export function selectSelectedImage(state: AppState): ImageObject | null {
  if (state.selection?.type !== 'image') return null;
  return state.document.images.find((image) => image.id === state.selection?.id) ?? null;
}
