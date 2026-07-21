export type ToolId = 'select' | 'pan' | 'pen' | 'rect' | 'ellipse' | 'arrow' | 'text' | 'speech-bubble' | 'color-tag';
export type ModalId = 'adjust' | 'retouch' | null;

export type CanvasSettings = { width: number; height: number; background: 'transparent' | 'white' | 'black' };
export type ImageObject = { id:string; name:string; src:string; mimeType:string; x:number; y:number; width:number; height:number; opacity:number; visible:boolean; locked:boolean; zIndex:number };
export type CommentObject = { id:string; targetType:'image'|'shape'; targetId:string; text:string; createdAt:string };
export type Point = { x:number; y:number };
export type ShapeObject = {
  id:string; type:'rect'|'ellipse'|'arrow'|'pen'|'text'|'speech-bubble'|'color-tag';
  x:number; y:number; width:number; height:number; color:string; fillColor?:string; lineWidth:number; lineStyle:'solid'|'dashed';
  text?:string; points?:Point[]; zIndex:number; visible:boolean; locked:boolean;
};
export type AppDocument = { schemaVersion:2; canvas:CanvasSettings; images:ImageObject[]; shapes:ShapeObject[]; comments:CommentObject[] };
export type SelectionState = { type:'image'|'shape'; id:string } | null;
export type ToolOptions = { color:string; fillColor:string; lineWidth:number; lineStyle:'solid'|'dashed'; fontSize:number };
export type AppState = { document:AppDocument; selection:SelectionState; activeTool:ToolId; toolOptions:ToolOptions; modal:ModalId; isDirty:boolean };

export function createEmptyDocument(): AppDocument { return { schemaVersion:2, canvas:{width:1600,height:900,background:'white'}, images:[], shapes:[], comments:[] }; }
export function createInitialState(): AppState { return { document:createEmptyDocument(), selection:null, activeTool:'select', toolOptions:{color:'#c42026',fillColor:'transparent',lineWidth:4,lineStyle:'solid',fontSize:22}, modal:null, isDirty:false }; }
