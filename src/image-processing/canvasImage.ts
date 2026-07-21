export async function srcToCanvas(src:string){const img=await new Promise<HTMLImageElement>((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error('画像を読み込めませんでした。'));i.src=src});const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d')!.drawImage(img,0,0);return c}
export function canvasToDataUrl(c:HTMLCanvasElement){return c.toDataURL('image/png')}
export function cloneCanvas(src:HTMLCanvasElement){const c=document.createElement('canvas');c.width=src.width;c.height=src.height;c.getContext('2d')!.drawImage(src,0,0);return c}
export function hexToRgb(hex:string){const n=parseInt(hex.replace('#',''),16);return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}}
