import type { AppState } from '../document/types';
export const selectSelectedImage=(s:AppState)=>s.selection?.type==='image'?s.document.images.find(i=>i.id===s.selection!.id)??null:null;
export const selectSelectedShape=(s:AppState)=>s.selection?.type==='shape'?s.document.shapes.find(i=>i.id===s.selection!.id)??null:null;
