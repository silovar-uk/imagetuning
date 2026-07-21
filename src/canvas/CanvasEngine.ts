import { getOrderedComments, getOrderedLayers } from '../document/order';
import type { AppState, ImageObject, Point, ShapeObject, ToolId } from '../document/types';
import { sampleImageColor } from '../image-processing/colorAnalysis';
import { createId } from '../utils/ids';
import { drawShape } from './drawShape';
import {
  getHandlePoints,
  getShapeBounds,
  hitResizeHandle,
  resizeShapeBounds,
  type ResizeHandle,
  type ShapeBounds,
} from './resize';

export type ViewportSnapshot = { zoom: number; offsetX: number; offsetY: number };
type Drag =
  | { mode: 'pan'; pointerId: number; start: Point; ox: number; oy: number }
  | { mode: 'image'; pointerId: number; id: string; start: Point; ox: number; oy: number; dx: number; dy: number }
  | { mode: 'shape-move'; pointerId: number; id: string; start: Point; ox: number; oy: number; dx: number; dy: number }
  | { mode: 'shape-resize'; pointerId: number; id: string; handle: ResizeHandle; original: ShapeBounds; draft: { x: number; y: number; width: number; height: number } }
  | { mode: 'shape-new'; pointerId: number; shape: ShapeObject };

export type CanvasEngineOptions = {
  onSelect: (selection: { type: 'image' | 'shape'; id: string } | null) => void;
  onCommitImagePosition: (id: string, x: number, y: number) => void;
  onCommitShape: (shape: ShapeObject) => void;
  onCommitShapePatch: (id: string, patch: Partial<ShapeObject>) => void;
  onColorPicked: (color: string, imageId: string) => void;
  onViewportChange: (viewport: ViewportSnapshot) => void;
};

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: CanvasEngineOptions;
  private resizeObserver: ResizeObserver;
  private state: AppState | null = null;
  private tool: ToolId = 'select';
  private viewport: ViewportSnapshot = { zoom: 1, offsetX: 0, offsetY: 0 };
  private drag: Drag | null = null;
  private cache = new Map<string, HTMLImageElement>();
  private loading = new Set<string>();
  private previousImageCount = 0;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: CanvasEngineOptions) {
    this.canvas = canvas;
    this.options = options;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvasを初期化できませんでした。');
    this.ctx = ctx;
    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(canvas);
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerCancel);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  destroy() {
    this.destroyed = true;
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancel);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.cache.clear();
  }

  setState(state: AppState) {
    this.state = state;
    this.tool = state.activeTool;
    if (this.previousImageCount === 0 && state.document.images.length > 0) queueMicrotask(() => this.fitToDocument());
    this.previousImageCount = state.document.images.length;
    this.render();
  }

  fitToDocument() {
    if (!this.state) return;
    const rect = this.canvas.getBoundingClientRect();
    const documentData = this.state.document;
    const zoom = Math.min((rect.width - 64) / documentData.canvas.width, (rect.height - 64) / documentData.canvas.height, 1);
    this.viewport = {
      zoom: Math.max(0.05, zoom),
      offsetX: (rect.width - documentData.canvas.width * zoom) / 2,
      offsetY: (rect.height - documentData.canvas.height * zoom) / 2,
    };
    this.emitViewport();
    this.render();
  }

  resetZoom() {
    if (!this.state) return;
    const rect = this.canvas.getBoundingClientRect();
    const documentData = this.state.document;
    this.viewport = {
      zoom: 1,
      offsetX: (rect.width - documentData.canvas.width) / 2,
      offsetY: (rect.height - documentData.canvas.height) / 2,
    };
    this.emitViewport();
    this.render();
  }

  private emitViewport() {
    this.options.onViewportChange({ ...this.viewport });
  }

  private resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: rect.width, height: rect.height };
  }

  private getImage(object: ImageObject) {
    const cached = this.cache.get(object.id);
    if (cached && cached.src === object.src && cached.complete) return cached;
    if (this.loading.has(object.id)) return null;
    this.loading.add(object.id);
    const image = new Image();
    image.onload = () => {
      this.loading.delete(object.id);
      this.cache.set(object.id, image);
      if (!this.destroyed) this.render();
    };
    image.onerror = () => this.loading.delete(object.id);
    image.src = object.src;
    return null;
  }

  render() {
    if (!this.state || this.destroyed) return;
    const size = this.resizeCanvas();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.save();
    ctx.translate(this.viewport.offsetX, this.viewport.offsetY);
    ctx.scale(this.viewport.zoom, this.viewport.zoom);

    const documentData = this.state.document;
    if (documentData.canvas.background !== 'transparent') {
      ctx.fillStyle = documentData.canvas.background === 'black' ? '#000000' : '#ffffff';
      ctx.fillRect(0, 0, documentData.canvas.width, documentData.canvas.height);
    }
    ctx.strokeStyle = '#c9cbc6';
    ctx.lineWidth = 1 / this.viewport.zoom;
    ctx.strokeRect(0, 0, documentData.canvas.width, documentData.canvas.height);

    for (const entry of getOrderedLayers(documentData)) {
      if (!entry.item.visible) continue;
      if (entry.kind === 'image') {
        const image = this.getImage(entry.item);
        if (!image) continue;
        const draft = this.drag?.mode === 'image' && this.drag.id === entry.item.id ? this.drag : null;
        ctx.save();
        ctx.globalAlpha = entry.item.opacity;
        ctx.drawImage(image, draft?.dx ?? entry.item.x, draft?.dy ?? entry.item.y, entry.item.width, entry.item.height);
        ctx.restore();
      } else {
        let shown = entry.item;
        if (this.drag?.mode === 'shape-move' && this.drag.id === entry.item.id) shown = { ...entry.item, x: this.drag.dx, y: this.drag.dy };
        if (this.drag?.mode === 'shape-resize' && this.drag.id === entry.item.id) shown = { ...entry.item, ...this.drag.draft };
        drawShape(ctx, shown, this.viewport.zoom);
      }
    }

    if (this.drag?.mode === 'shape-new') drawShape(ctx, this.drag.shape, this.viewport.zoom);

    const selection = this.state.selection;
    if (selection) {
      const box = selection.type === 'image'
        ? documentData.images.find((item) => item.id === selection.id)
        : documentData.shapes.find((item) => item.id === selection.id);
      if (box) {
        let shown = box;
        if (selection.type === 'image' && this.drag?.mode === 'image' && this.drag.id === selection.id) shown = { ...box, x: this.drag.dx, y: this.drag.dy };
        if (selection.type === 'shape' && this.drag?.mode === 'shape-move' && this.drag.id === selection.id) shown = { ...box, x: this.drag.dx, y: this.drag.dy };
        if (selection.type === 'shape' && this.drag?.mode === 'shape-resize' && this.drag.id === selection.id) shown = { ...box, ...this.drag.draft };
        this.drawSelection(shown.x, shown.y, shown.width, shown.height);
        if (selection.type === 'shape' && (shown as ShapeObject).type !== 'pen' && !shown.locked) {
          this.drawResizeHandles(getShapeBounds(shown));
        }
      }
    }

    if (this.state.settings.showCommentNumbers) {
      getOrderedComments(documentData).forEach((comment, index) => {
        const target = comment.targetType === 'image'
          ? documentData.images.find((item) => item.id === comment.targetId && item.visible)
          : documentData.shapes.find((item) => item.id === comment.targetId && item.visible);
        if (target) this.drawBadge(index + 1, target.x + 18, target.y + 18);
      });
    }
    ctx.restore();
  }

  private drawSelection(x: number, y: number, width: number, height: number) {
    const bounds = getShapeBounds({ x, y, width, height });
    this.ctx.save();
    this.ctx.strokeStyle = '#c42026';
    this.ctx.lineWidth = 2 / this.viewport.zoom;
    this.ctx.setLineDash([8 / this.viewport.zoom, 5 / this.viewport.zoom]);
    this.ctx.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
    this.ctx.restore();
  }

  private drawResizeHandles(bounds: ShapeBounds) {
    const size = 9 / this.viewport.zoom;
    this.ctx.save();
    this.ctx.setLineDash([]);
    this.ctx.lineWidth = 2 / this.viewport.zoom;
    this.ctx.strokeStyle = '#c42026';
    this.ctx.fillStyle = '#ffffff';
    Object.values(getHandlePoints(bounds)).forEach((point) => {
      this.ctx.beginPath();
      this.ctx.rect(point.x - size / 2, point.y - size / 2, size, size);
      this.ctx.fill();
      this.ctx.stroke();
    });
    this.ctx.restore();
  }

  private drawBadge(number: number, x: number, y: number) {
    const radius = 16 / this.viewport.zoom;
    this.ctx.save();
    this.ctx.fillStyle = '#c42026';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `700 ${14 / this.viewport.zoom}px system-ui`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(String(number), x, y);
    this.ctx.restore();
  }

  private screenPoint(event: PointerEvent | WheelEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private worldPoint(point: Point) {
    return {
      x: (point.x - this.viewport.offsetX) / this.viewport.zoom,
      y: (point.y - this.viewport.offsetY) / this.viewport.zoom,
    };
  }

  private hitTest(point: Point) {
    if (!this.state) return null;
    const layers = getOrderedLayers(this.state.document).reverse();
    for (const entry of layers) {
      if (!entry.item.visible) continue;
      const padding = entry.kind === 'shape' ? 8 : 0;
      const left = Math.min(entry.item.x, entry.item.x + entry.item.width) - padding;
      const right = Math.max(entry.item.x, entry.item.x + entry.item.width) + padding;
      const top = Math.min(entry.item.y, entry.item.y + entry.item.height) - padding;
      const bottom = Math.max(entry.item.y, entry.item.y + entry.item.height) + padding;
      if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) return entry;
    }
    return null;
  }

  private selectedResizeTarget(point: Point) {
    if (!this.state || this.state.selection?.type !== 'shape') return null;
    const shape = this.state.document.shapes.find((item) => item.id === this.state?.selection?.id);
    if (!shape || shape.type === 'pen' || shape.locked || !shape.visible) return null;
    const bounds = getShapeBounds(shape);
    const handle = hitResizeHandle(point, bounds, 10 / this.viewport.zoom);
    return handle ? { shape, bounds, handle } : null;
  }

  private pickColor(point: Point) {
    if (!this.state) return;
    const imageObject = getOrderedLayers(this.state.document)
      .reverse()
      .find((entry) => entry.kind === 'image'
        && entry.item.visible
        && point.x >= entry.item.x
        && point.x <= entry.item.x + entry.item.width
        && point.y >= entry.item.y
        && point.y <= entry.item.y + entry.item.height);
    if (!imageObject || imageObject.kind !== 'image') return;
    const image = this.getImage(imageObject.item);
    if (!image?.complete || image.naturalWidth === 0) return;
    const sourceX = ((point.x - imageObject.item.x) / imageObject.item.width) * image.naturalWidth;
    const sourceY = ((point.y - imageObject.item.y) / imageObject.item.height) * image.naturalHeight;
    const color = sampleImageColor(image, sourceX, sourceY);
    if (!color) return;
    this.options.onSelect({ type: 'image', id: imageObject.item.id });
    this.options.onColorPicked(color, imageObject.item.id);
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (!this.state) return;
    const screen = this.screenPoint(event);
    if (this.tool === 'pan' || event.button === 1) {
      this.drag = { mode: 'pan', pointerId: event.pointerId, start: screen, ox: this.viewport.offsetX, oy: this.viewport.offsetY };
      this.canvas.setPointerCapture(event.pointerId);
      return;
    }

    const world = this.worldPoint(screen);
    if (this.tool === 'eyedropper') {
      this.pickColor(world);
      return;
    }
    if (this.tool === 'select') {
      const resizeTarget = this.selectedResizeTarget(world);
      if (resizeTarget) {
        this.drag = {
          mode: 'shape-resize',
          pointerId: event.pointerId,
          id: resizeTarget.shape.id,
          handle: resizeTarget.handle,
          original: resizeTarget.bounds,
          draft: resizeShapeBounds(resizeTarget.bounds, resizeTarget.handle, world),
        };
        this.canvas.setPointerCapture(event.pointerId);
        return;
      }

      const hit = this.hitTest(world);
      this.options.onSelect(hit ? { type: hit.kind, id: hit.item.id } : null);
      if (!hit || hit.item.locked) return;
      if (hit.kind === 'image') {
        this.drag = { mode: 'image', pointerId: event.pointerId, id: hit.item.id, start: world, ox: hit.item.x, oy: hit.item.y, dx: hit.item.x, dy: hit.item.y };
      } else {
        this.drag = { mode: 'shape-move', pointerId: event.pointerId, id: hit.item.id, start: world, ox: hit.item.x, oy: hit.item.y, dx: hit.item.x, dy: hit.item.y };
      }
      this.canvas.setPointerCapture(event.pointerId);
      return;
    }

    const options = this.state.toolOptions;
    const shape: ShapeObject = {
      id: createId('shape'),
      type: this.tool as ShapeObject['type'],
      x: world.x,
      y: world.y,
      width: 1,
      height: 1,
      color: options.color,
      fillColor: this.tool === 'color-tag' ? options.color : options.fillColor,
      lineWidth: options.lineWidth,
      lineStyle: options.lineStyle,
      text: '',
      points: this.tool === 'pen' ? [world] : undefined,
      zIndex: Date.now(),
      visible: true,
      locked: false,
    };
    this.drag = { mode: 'shape-new', pointerId: event.pointerId, shape };
    this.canvas.setPointerCapture(event.pointerId);
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    const screen = this.screenPoint(event);
    if (this.drag.mode === 'pan') {
      this.viewport.offsetX = this.drag.ox + screen.x - this.drag.start.x;
      this.viewport.offsetY = this.drag.oy + screen.y - this.drag.start.y;
      this.emitViewport();
    } else {
      const world = this.worldPoint(screen);
      if (this.drag.mode === 'image' || this.drag.mode === 'shape-move') {
        this.drag.dx = this.drag.ox + world.x - this.drag.start.x;
        this.drag.dy = this.drag.oy + world.y - this.drag.start.y;
      } else if (this.drag.mode === 'shape-resize') {
        this.drag.draft = resizeShapeBounds(this.drag.original, this.drag.handle, world);
      } else if (this.drag.shape.type === 'pen') {
        this.drag.shape.points!.push(world);
      } else {
        this.drag.shape.width = world.x - this.drag.shape.x;
        this.drag.shape.height = world.y - this.drag.shape.y;
      }
    }
    this.render();
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    const drag = this.drag;
    this.drag = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    if (drag.mode === 'image') {
      this.options.onCommitImagePosition(drag.id, Math.round(drag.dx), Math.round(drag.dy));
    } else if (drag.mode === 'shape-move') {
      this.options.onCommitShapePatch(drag.id, { x: Math.round(drag.dx), y: Math.round(drag.dy) });
    } else if (drag.mode === 'shape-resize') {
      this.options.onCommitShapePatch(drag.id, {
        x: Math.round(drag.draft.x),
        y: Math.round(drag.draft.y),
        width: Math.round(drag.draft.width),
        height: Math.round(drag.draft.height),
      });
    } else if (drag.mode === 'shape-new') {
      if (drag.shape.type === 'pen' && drag.shape.points?.length) {
        const xs = drag.shape.points.map((point) => point.x);
        const ys = drag.shape.points.map((point) => point.y);
        drag.shape.x = Math.min(...xs);
        drag.shape.y = Math.min(...ys);
        drag.shape.width = Math.max(...xs) - drag.shape.x;
        drag.shape.height = Math.max(...ys) - drag.shape.y;
      } else {
        const bounds = getShapeBounds(drag.shape);
        drag.shape.x = bounds.left;
        drag.shape.y = bounds.top;
        drag.shape.width = Math.max(12, bounds.right - bounds.left);
        drag.shape.height = Math.max(12, bounds.bottom - bounds.top);
        if (drag.shape.type === 'text' || drag.shape.type === 'speech-bubble') {
          drag.shape.text = window.prompt('テキストを入力', '修正指示') ?? '';
          if (drag.shape.width < 60) drag.shape.width = 220;
          if (drag.shape.height < 30) drag.shape.height = 70;
        }
      }
      this.options.onCommitShape(drag.shape);
    }
    this.render();
  };

  private handlePointerCancel = (event: PointerEvent) => {
    if (this.drag?.pointerId === event.pointerId) {
      this.drag = null;
      this.render();
    }
  };

  private handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const screen = this.screenPoint(event);
    const before = this.worldPoint(screen);
    const zoom = Math.min(4, Math.max(0.05, this.viewport.zoom * Math.exp(-event.deltaY * 0.0012)));
    this.viewport = {
      zoom,
      offsetX: screen.x - before.x * zoom,
      offsetY: screen.y - before.y * zoom,
    };
    this.emitViewport();
    this.render();
  };
}
