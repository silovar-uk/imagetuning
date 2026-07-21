import { getOrderedLayers, moveLayer } from '../document/order';
import { createInitialState, type AppState, type ImageObject } from '../document/types';
import type { EditorAction, HistoryAction } from './actions';
import { undoableActionTypes } from './actions';

export type HistoryState = { past: AppState[]; present: AppState; future: AppState[] };
export const createHistoryState = (): HistoryState => ({ past: [], present: createInitialState(), future: [] });

function resizeCanvasToImages(images: ImageObject[], fallback: AppState['document']['canvas']) {
  if (!images.length) return fallback;
  return {
    ...fallback,
    width: Math.max(fallback.width, ...images.map((image) => Math.ceil(image.x + image.width))),
    height: Math.max(fallback.height, ...images.map((image) => Math.ceil(image.y + image.height))),
  };
}

function nextZIndex(state: AppState) {
  return Math.max(-1, ...state.document.images.map((item) => item.zIndex), ...state.document.shapes.map((item) => item.zIndex)) + 1;
}

function normalizeZ(state: AppState): AppState {
  const zIndexByKey = new Map<string, number>();
  getOrderedLayers(state.document).forEach((entry, index) => zIndexByKey.set(`${entry.kind}:${entry.item.id}`, index));
  return {
    ...state,
    document: {
      ...state.document,
      images: state.document.images.map((image) => ({ ...image, zIndex: zIndexByKey.get(`image:${image.id}`) ?? image.zIndex })),
      shapes: state.document.shapes.map((shape) => ({ ...shape, zIndex: zIndexByKey.get(`shape:${shape.id}`) ?? shape.zIndex })),
    },
  };
}

export function editorReducer(state: AppState, action: EditorAction): AppState {
  switch (action.type) {
    case 'ADD_IMAGES': {
      const startZ = nextZIndex(state);
      const incoming = action.images.map((image, index) => ({ ...image, zIndex: startZ + index }));
      const images = [...state.document.images, ...incoming];
      return {
        ...state,
        document: { ...state.document, images, canvas: resizeCanvasToImages(images, state.document.canvas) },
        selection: incoming.length ? { type: 'image', id: incoming.at(-1)!.id } : state.selection,
        isDirty: true,
      };
    }
    case 'UPDATE_IMAGE': {
      const images = state.document.images.map((image) => image.id === action.imageId ? { ...image, ...action.patch } : image);
      return {
        ...state,
        document: { ...state.document, images, canvas: resizeCanvasToImages(images, state.document.canvas) },
        isDirty: true,
      };
    }
    case 'REMOVE_IMAGE':
      return normalizeZ({
        ...state,
        document: {
          ...state.document,
          images: state.document.images.filter((image) => image.id !== action.imageId),
          comments: state.document.comments.filter((comment) => !(comment.targetType === 'image' && comment.targetId === action.imageId)),
        },
        selection: state.selection?.type === 'image' && state.selection.id === action.imageId ? null : state.selection,
        isDirty: true,
      });
    case 'ADD_SHAPE':
      return {
        ...state,
        document: {
          ...state.document,
          shapes: [...state.document.shapes, { ...action.shape, zIndex: nextZIndex(state) }],
        },
        selection: { type: 'shape', id: action.shape.id },
        isDirty: true,
      };
    case 'UPDATE_SHAPE':
      return {
        ...state,
        document: {
          ...state.document,
          shapes: state.document.shapes.map((shape) => shape.id === action.shapeId ? { ...shape, ...action.patch } : shape),
        },
        isDirty: true,
      };
    case 'REMOVE_SHAPE':
      return normalizeZ({
        ...state,
        document: {
          ...state.document,
          shapes: state.document.shapes.filter((shape) => shape.id !== action.shapeId),
          comments: state.document.comments.filter((comment) => !(comment.targetType === 'shape' && comment.targetId === action.shapeId)),
        },
        selection: state.selection?.type === 'shape' && state.selection.id === action.shapeId ? null : state.selection,
        isDirty: true,
      });
    case 'ADD_COMMENT':
      return { ...state, document: { ...state.document, comments: [...state.document.comments, action.comment] }, isDirty: true };
    case 'UPDATE_COMMENT':
      return {
        ...state,
        document: {
          ...state.document,
          comments: state.document.comments.map((comment) => comment.id === action.commentId ? { ...comment, text: action.text } : comment),
        },
        isDirty: true,
      };
    case 'REMOVE_COMMENT':
      return {
        ...state,
        document: { ...state.document, comments: state.document.comments.filter((comment) => comment.id !== action.commentId) },
        isDirty: true,
      };
    case 'SET_SELECTION':
      return { ...state, selection: action.selection };
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool };
    case 'SET_TOOL_OPTIONS':
      return { ...state, toolOptions: { ...state.toolOptions, ...action.patch } };
    case 'SET_MODAL':
      return { ...state, modal: action.modal };
    case 'PATCH_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'UPDATE_CANVAS':
      return { ...state, document: { ...state.document, canvas: { ...state.document.canvas, ...action.patch } }, isDirty: true };
    case 'MOVE_LAYER': {
      const document = moveLayer(state.document, action.kind, action.id, action.direction);
      return document === state.document ? state : { ...state, document, isDirty: true };
    }
    case 'LOAD_DOCUMENT':
      return { ...state, document: action.document, selection: null, activeTool: 'select', modal: null, isDirty: false };
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
    const previous = state.past.at(-1);
    return previous
      ? { past: state.past.slice(0, -1), present: { ...previous, isDirty: true }, future: [state.present, ...state.future] }
      : state;
  }
  if (action.type === 'REDO') {
    const next = state.future[0];
    return next
      ? { past: [...state.past, state.present], present: { ...next, isDirty: true }, future: state.future.slice(1) }
      : state;
  }

  const nextPresent = editorReducer(state.present, action);
  if (nextPresent === state.present) return state;
  if (!undoableActionTypes.has(action.type) || action.type === 'MARK_SAVED') return { ...state, present: nextPresent };
  return { past: [...state.past.slice(-49), state.present], present: nextPresent, future: [] };
}
