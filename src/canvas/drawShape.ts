import type { ShapeObject } from '../document/types';
export function drawShape(ctx:CanvasRenderingContext2D,s:ShapeObject,scale=1){
 if(!s.visible)return; ctx.save(); ctx.strokeStyle=s.color; ctx.fillStyle=s.fillColor&&s.fillColor!=='transparent'?s.fillColor:'transparent'; ctx.lineWidth=s.lineWidth/scale; ctx.setLineDash(s.lineStyle==='dashed'?[10/scale,6/scale]:[]); ctx.lineCap='round';ctx.lineJoin='round';
 const x=s.x,y=s.y,w=s.width,h=s.height;
 if(s.type==='rect'||s.type==='color-tag'){if(s.fillColor&&s.fillColor!=='transparent')ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h)}
 else if(s.type==='ellipse'){ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,Math.abs(w/2),Math.abs(h/2),0,0,Math.PI*2);if(s.fillColor&&s.fillColor!=='transparent')ctx.fill();ctx.stroke()}
 else if(s.type==='arrow'){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y+h);ctx.stroke();const a=Math.atan2(h,w),len=16/scale;ctx.beginPath();ctx.moveTo(x+w,y+h);ctx.lineTo(x+w-len*Math.cos(a-Math.PI/6),y+h-len*Math.sin(a-Math.PI/6));ctx.moveTo(x+w,y+h);ctx.lineTo(x+w-len*Math.cos(a+Math.PI/6),y+h-len*Math.sin(a+Math.PI/6));ctx.stroke()}
 else if(s.type==='pen'&&s.points?.length){ctx.beginPath();ctx.moveTo(s.points[0]!.x,s.points[0]!.y);for(const p of s.points.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke()}
 else if(s.type==='text'||s.type==='speech-bubble'){if(s.type==='speech-bubble'){ctx.fillStyle=s.fillColor&&s.fillColor!=='transparent'?s.fillColor:'#fff';ctx.strokeRect(x,y,w,h);ctx.fillRect(x,y,w,h)}ctx.fillStyle=s.color;ctx.font=`700 ${Math.max(12,Math.min(48,h||22))}px system-ui,sans-serif`;ctx.textBaseline='top';wrapText(ctx,s.text??'',x+6,y+6,Math.max(20,w-12),Math.max(14,h||22))}
 ctx.restore();
}
function wrapText(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,maxWidth:number,lineHeight:number){let line='';for(const ch of text){const test=line+ch;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y);line=ch;y+=lineHeight}else line=test}if(line)ctx.fillText(line,x,y)}
