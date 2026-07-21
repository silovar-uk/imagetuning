import { createInitialState, type AppState, type ImageObject } from '../document/types';
import type { EditorAction, HistoryAction } from './actions';
import { undoableActionTypes } from './actions';

export type HistoryState = {
  past: AppState[];
  present: AppState;
  future: AppState[];
};

export function createHistoryState(): HistoryState {
  return {
    past: [],
    present: createInitialState(),
    future: [],
  };
}

function resizeCanvasToImages(images: ImageObject[], fallback: AppState['document']['canvas']) {
  if (images.length === 0) return fallback;
  const width = Math.max(fallback.width, ...images.map((image) => Math.ceil(image.x + image.width)));
  const height = Math.max(fallback.height, ...images.map((image) => Math.ceil(image.y + image.height)));
  return { ...fallback, width, height };
}

export function editorReducer(state: AppState, action: EditorAction): AppState {
  switch (action.type) {
    case 'ADD_IMAGES': {
      const images = [...state.document.images, ...action.images];
      return {
        ...state,
        document: {
          ...state.document,
          images,
          canvas: resizeCanvasToImages(images, state.document.canvas),
        },
        selection: action.images.length > 0
          ? { type: 'image', id: action.images[action.images.length - 1]!.id }
          : state.selection,
        isDirty: true,
      };
    }
    case 'UPDATE_IMAGE': {
      const images = state.document.images.map((image) =>
        image.id === action.imageId ? { ...image, ...action.patch } : image,
      );
      return {
        ...state,
        document: {
          ...state.document,
          images,
          canvas: resizeCanvasToImages(images, state.document.canvas),
        },
        isDirty: true,
      };
    }
    case 'REMOVE_IMAGE':
      return {
        ...state,
        document: {
          ...state.document,
          images: state.document.images.filter((image) => image.id !== action.imageId),
          comments: state.document.comments.filter((comment) => comment.targetId !== action.imageId),
        },
        selection: state.selection?.id === action.imageId ? null : state.selection,
        isDirty: true,
      };
    case 'ADD_COMMENT':
      return {
        ...state,
        document: {
          ...state.document,
          comments: [...state.document.comments, action.comment],
        },
        isDirty: true,
      };
    case 'UPDATE_COMMENT':
      return {
        ...state,
        document: {
          ...state.document,
          comments: state.document.comments.map((comment) =>
            comment.id === action.commentId ? { ...comment, text: action.text } : comment,
          ),
        },
        isDirty: true,
      };
    case 'REMOVE_COMMENT':
      return {
        ...state,
        document: {
          ...state.document,
          comments: state.document.comments.filter((comment) => comment.id !== action.commentId),
        },
        isDirty: true,
      };
    case 'SET_SELECTION':
      return { ...state, selection: action.selection };
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool };
    case 'LOAD_DOCUMENT':
      return {
        ...state,
        document: action.document,
        selection: null,
        isDirty: false,
      };
    case 'MARK_SAVED':
      return { ...state, isDirty: false };
    case 'NEW_DOCUMENT':
      return createInitialState();
    default:
      return state;
  }
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === 'UNDO') {
    const previous = state.past[state.past.length - 1];
    if (!previous) return state;
    return {
      past: state.past.slice(0, -1),
      present: { ...previous, isDirty: true },
      future: [state.present, ...state.future],
    };
  }

  if (action.type === 'REDO') {
    const next = state.future[0];
    if (!next) return state;
    return {
      past: [...state.past, state.present],
      present: { ...next, isDirty: true },
      future: state.future.slice(1),
    };
  }

  const nextPresent = editorReducer(state.present, action);
  if (nextPresent === state.present) return state;

  if (!undoableActionTypes.has(action.type) || action.type === 'MARK_SAVED') {
    return { ...state, present: nextPresent };
  }

  return {
    past: [...state.past.slice(-49), state.present],
    present: nextPresent,
    future: [],
  };
}
