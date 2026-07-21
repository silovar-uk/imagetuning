import { createInitialState, type AppState, type ImageObject } from '../document/types';
import type { EditorAction, HistoryAction } from './actions';
import { undoableActionTypes } from './actions';
export type HistoryState={past:AppState[];present:AppState;future:AppState[]};
export const createHistoryState=():HistoryState=>({past:[],present:createInitialState(),future:[]});
function resizeCanvasToImages(images:ImageObject[], fallback:AppState['document']['canvas']) { if(!images.length)return fallback; return {...fallback,width:Math.max(fallback.width,...images.map(i=>Math.ceil(i.x+i.width))),height:Math.max(fallback.height,...images.map(i=>Math.ceil(i.y+i.height)))} }
export function editorReducer(state:AppState, action:EditorAction):AppState {
 switch(action.type){
 case 'ADD_IMAGES':{const images=[...state.document.images,...action.images];return {...state,document:{...state.document,images,canvas:resizeCanvasToImages(images,state.document.canvas)},selection:action.images.length?{type:'image',id:action.images.at(-1)!.id}:state.selection,isDirty:true}}
 case 'UPDATE_IMAGE':{const images=state.document.images.map(i=>i.id===action.imageId?{...i,...action.patch}:i);return {...state,document:{...state.document,images,canvas:resizeCanvasToImages(images,state.document.canvas)},isDirty:true}}
 case 'REMOVE_IMAGE':return {...state,document:{...state.document,images:state.document.images.filter(i=>i.id!==action.imageId),comments:state.document.comments.filter(c=>!(c.targetType==='image'&&c.targetId===action.imageId))},selection:state.selection?.id===action.imageId?null:state.selection,isDirty:true};
 case 'ADD_SHAPE':return {...state,document:{...state.document,shapes:[...state.document.shapes,action.shape]},selection:{type:'shape',id:action.shape.id},isDirty:true};
 case 'UPDATE_SHAPE':return {...state,document:{...state.document,shapes:state.document.shapes.map(s=>s.id===action.shapeId?{...s,...action.patch}:s)},isDirty:true};
 case 'REMOVE_SHAPE':return {...state,document:{...state.document,shapes:state.document.shapes.filter(s=>s.id!==action.shapeId),comments:state.document.comments.filter(c=>!(c.targetType==='shape'&&c.targetId===action.shapeId))},selection:state.selection?.id===action.shapeId?null:state.selection,isDirty:true};
 case 'ADD_COMMENT':return {...state,document:{...state.document,comments:[...state.document.comments,action.comment]},isDirty:true};
 case 'UPDATE_COMMENT':return {...state,document:{...state.document,comments:state.document.comments.map(c=>c.id===action.commentId?{...c,text:action.text}:c)},isDirty:true};
 case 'REMOVE_COMMENT':return {...state,document:{...state.document,comments:state.document.comments.filter(c=>c.id!==action.commentId)},isDirty:true};
 case 'SET_SELECTION':return {...state,selection:action.selection}; case 'SET_TOOL':return {...state,activeTool:action.tool}; case 'SET_TOOL_OPTIONS':return {...state,toolOptions:{...state.toolOptions,...action.patch}}; case 'SET_MODAL':return {...state,modal:action.modal};
 case 'LOAD_DOCUMENT':return {...state,document:action.document,selection:null,isDirty:false}; case 'MARK_SAVED':return {...state,isDirty:false}; case 'NEW_DOCUMENT':return createInitialState(); default:return state;
 }}
export function historyReducer(state:HistoryState,action:HistoryAction):HistoryState {if(action.type==='UNDO'){const p=state.past.at(-1);return p?{past:state.past.slice(0,-1),present:{...p,isDirty:true},future:[state.present,...state.future]}:state} if(action.type==='REDO'){const n=state.future[0];return n?{past:[...state.past,state.present],present:{...n,isDirty:true},future:state.future.slice(1)}:state} const next=editorReducer(state.present,action); if(next===state.present)return state; if(!undoableActionTypes.has(action.type)||action.type==='MARK_SAVED')return {...state,present:next}; return {past:[...state.past.slice(-49),state.present],present:next,future:[]};}
