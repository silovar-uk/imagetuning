import { ImagePlus, Maximize2, ScanSearch } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useApp } from '../app/AppContext';
import { CanvasEngine, type ViewportSnapshot } from '../canvas/CanvasEngine';
type Props={onFiles:(files:File[])=>void;onViewportChange:(v:ViewportSnapshot)=>void};
export function CanvasWorkspace({onFiles,onViewportChange}:Props){const{state,dispatch}=useApp();const canvasRef=useRef<HTMLCanvasElement>(null),engineRef=useRef<CanvasEngine|null>(null),fileInputRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(!canvasRef.current)return;const e=new CanvasEngine(canvasRef.current,{onSelect:selection=>dispatch({type:'SET_SELECTION',selection}),onCommitImagePosition:(id,x,y)=>dispatch({type:'UPDATE_IMAGE',imageId:id,patch:{x,y}}),onCommitShape:shape=>dispatch({type:'ADD_SHAPE',shape}),onCommitShapePatch:(id,patch)=>dispatch({type:'UPDATE_SHAPE',shapeId:id,patch}),onViewportChange});engineRef.current=e;return()=>{e.destroy();engineRef.current=null}},[dispatch,onViewportChange]);
 useEffect(()=>engineRef.current?.setState(state),[state]);
 return <main className="workspace" onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('is-dragging-over')}} onDragLeave={e=>e.currentTarget.classList.remove('is-dragging-over')} onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('is-dragging-over');onFiles(Array.from(e.dataTransfer.files))}}>
 <canvas ref={canvasRef} className={`editor-canvas tool-${state.activeTool}`}/>
 {!state.document.images.length&&<button className="empty-state" onClick={()=>fileInputRef.current?.click()}><span className="empty-state-icon"><ImagePlus size={32}/></span><strong>画像をここにドロップ</strong><span>またはクリックして選択</span><small>PNG / JPG / WEBP / PSD　・　Ctrl＋Vでも貼り付け</small></button>}
 <input ref={fileInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp,.psd" multiple onChange={e=>{onFiles(Array.from(e.target.files??[]));e.currentTarget.value=''}}/>
 <div className="canvas-floating-controls"><button onClick={()=>engineRef.current?.fitToDocument()}><Maximize2 size={17}/></button><button onClick={()=>engineRef.current?.resetZoom()}><ScanSearch size={17}/></button></div></main>}
