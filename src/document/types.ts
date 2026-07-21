export type ToolId = 'select' | 'pan';

export type CanvasSettings = {
  width: number;
  height: number;
  background: 'transparent' | 'white' | 'black';
};

export type ImageObject = {
  id: string;
  name: string;
  src: string;
  mimeType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
};

export type CommentObject = {
  id: string;
  targetType: 'image';
  targetId: string;
  text: string;
  createdAt: string;
};

export type ShapeObject = {
  id: string;
  type: 'rect' | 'ellipse' | 'arrow' | 'pen' | 'text' | 'speech-bubble' | 'color-tag';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  commentId?: string;
};

export type AppDocument = {
  schemaVersion: 2;
  canvas: CanvasSettings;
  images: ImageObject[];
  shapes: ShapeObject[];
  comments: CommentObject[];
};

export type SelectionState =
  | { type: 'image'; id: string }
  | null;

export type AppState = {
  document: AppDocument;
  selection: SelectionState;
  activeTool: ToolId;
  isDirty: boolean;
};

export function createEmptyDocument(): AppDocument {
  return {
    schemaVersion: 2,
    canvas: {
      width: 1600,
      height: 900,
      background: 'white',
    },
    images: [],
    shapes: [],
    comments: [],
  };
}

export function createInitialState(): AppState {
  return {
    document: createEmptyDocument(),
    selection: null,
    activeTool: 'select',
    isDirty: false,
  };
}
