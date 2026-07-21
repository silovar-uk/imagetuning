import type { AppDocument, CommentObject, ImageObject, SelectionState, ToolId } from '../document/types';

export type EditorAction =
  | { type: 'ADD_IMAGES'; images: ImageObject[] }
  | { type: 'UPDATE_IMAGE'; imageId: string; patch: Partial<ImageObject> }
  | { type: 'REMOVE_IMAGE'; imageId: string }
  | { type: 'ADD_COMMENT'; comment: CommentObject }
  | { type: 'UPDATE_COMMENT'; commentId: string; text: string }
  | { type: 'REMOVE_COMMENT'; commentId: string }
  | { type: 'SET_SELECTION'; selection: SelectionState }
  | { type: 'SET_TOOL'; tool: ToolId }
  | { type: 'LOAD_DOCUMENT'; document: AppDocument }
  | { type: 'MARK_SAVED' }
  | { type: 'NEW_DOCUMENT' };

export type HistoryAction = EditorAction | { type: 'UNDO' } | { type: 'REDO' };

export const undoableActionTypes = new Set<EditorAction['type']>([
  'ADD_IMAGES',
  'UPDATE_IMAGE',
  'REMOVE_IMAGE',
  'ADD_COMMENT',
  'UPDATE_COMMENT',
  'REMOVE_COMMENT',
  'LOAD_DOCUMENT',
  'NEW_DOCUMENT',
]);
