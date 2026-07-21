import type { AppState, ImageObject, ToolId } from '../document/types';

export type ViewportSnapshot = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

type Point = { x: number; y: number };

type DragState =
  | {
      mode: 'image';
      pointerId: number;
      imageId: string;
      startWorld: Point;
      originalX: number;
      originalY: number;
      draftX: number;
      draftY: number;
    }
  | {
      mode: 'pan';
      pointerId: number;
      startScreen: Point;
      originalOffsetX: number;
      originalOffsetY: number;
    };

export type CanvasEngineOptions = {
  onSelect: (imageId: string | null) => void;
  onCommitImagePosition: (imageId: string, x: number, y: number) => void;
  onViewportChange: (viewport: ViewportSnapshot) => void;
};

export class CanvasEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly options: CanvasEngineOptions;
  private readonly resizeObserver: ResizeObserver;
  private state: AppState | null = null;
  private activeTool: ToolId = 'select';
  private viewport: ViewportSnapshot = { zoom: 1, offsetX: 0, offsetY: 0 };
  private drag: DragState | null = null;
  private imageCache = new Map<string, HTMLImageElement>();
  private loadingImages = new Set<string>();
  private previousImageCount = 0;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: CanvasEngineOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvasを初期化できませんでした。');
    this.ctx = ctx;
    this.options = options;

    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(canvas);

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerCancel);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  destroy(): void {
    this.destroyed = true;
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancel);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.imageCache.clear();
    this.loadingImages.clear();
  }

  setState(state: AppState): void {
    this.state = state;
    this.activeTool = state.activeTool;

    const count = state.document.images.length;
    if (this.previousImageCount === 0 && count > 0) {
      queueMicrotask(() => this.fitToDocument());
    }
    this.previousImageCount = count;

    const activeIds = new Set(state.document.images.map((image) => image.id));
    for (const id of this.imageCache.keys()) {
      if (!activeIds.has(id)) this.imageCache.delete(id);
    }

    this.render();
  }

  fitToDocument(): void {
    if (!this.state) return;
    const rect = this.canvas.getBoundingClientRect();
    const { width, height } = this.state.document.canvas;
    if (rect.width <= 0 || rect.height <= 0 || width <= 0 || height <= 0) return;

    const zoom = Math.min((rect.width - 64) / width, (rect.height - 64) / height, 1);
    this.viewport = {
      zoom: Math.max(0.05, zoom),
      offsetX: (rect.width - width * zoom) / 2,
      offsetY: (rect.height - height * zoom) / 2,
    };
    this.emitViewport();
    this.render();
  }

  resetZoom(): void {
    if (!this.state) return;
    const rect = this.canvas.getBoundingClientRect();
    const { width, height } = this.state.document.canvas;
    this.viewport = {
      zoom: 1,
      offsetX: (rect.width - width) / 2,
      offsetY: (rect.height - height) / 2,
    };
    this.emitViewport();
    this.render();
  }

  private emitViewport(): void {
    this.options.onViewportChange({ ...this.viewport });
  }

  private ensureCanvasSize(): { width: number; height: number } {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(rect.width * dpr));
    const pixelHeight = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: rect.width, height: rect.height };
  }

  private getCachedImage(imageObject: ImageObject): HTMLImageElement | null {
    const cached = this.imageCache.get(imageObject.id);
    if (cached && cached.src === imageObject.src && cached.complete) return cached;
    if (this.loadingImages.has(imageObject.id)) return null;

    this.loadingImages.add(imageObject.id);
    const image = new Image();
    image.onload = () => {
      this.loadingImages.delete(imageObject.id);
      this.imageCache.set(imageObject.id, image);
      if (!this.destroyed) this.render();
    };
    image.onerror = () => {
      this.loadingImages.delete(imageObject.id);
    };
    image.src = imageObject.src;
    return null;
  }

  render(): void {
    if (!this.state || this.destroyed) return;
    const size = this.ensureCanvasSize();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, size.width, size.height);

    ctx.save();
    ctx.translate(this.viewport.offsetX, this.viewport.offsetY);
    ctx.scale(this.viewport.zoom, this.viewport.zoom);

    const { canvas, images, comments } = this.state.document;
    ctx.save();
    ctx.fillStyle = canvas.background === 'black' ? '#000000' : '#ffffff';
    if (canvas.background !== 'transparent') ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#c9cbc6';
    ctx.lineWidth = 1 / this.viewport.zoom;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const sortedImages = [...images].filter((image) => image.visible).sort((a, b) => a.zIndex - b.zIndex);
    for (const imageObject of sortedImages) {
      const image = this.getCachedImage(imageObject);
      if (!image) continue;
      const draft = this.drag?.mode === 'image' && this.drag.imageId === imageObject.id ? this.drag : null;
      const x = draft?.draftX ?? imageObject.x;
      const y = draft?.draftY ?? imageObject.y;
      ctx.save();
      ctx.globalAlpha = imageObject.opacity;
      ctx.drawImage(image, x, y, imageObject.width, imageObject.height);
      ctx.restore();
    }

    const selectedId = this.state.selection?.type === 'image' ? this.state.selection.id : null;
    if (selectedId) {
      const selected = images.find((image) => image.id === selectedId && image.visible);
      if (selected) {
        const draft = this.drag?.mode === 'image' && this.drag.imageId === selected.id ? this.drag : null;
        const x = draft?.draftX ?? selected.x;
        const y = draft?.draftY ?? selected.y;
        ctx.save();
        ctx.strokeStyle = '#c42026';
        ctx.lineWidth = 2 / this.viewport.zoom;
        ctx.setLineDash([8 / this.viewport.zoom, 5 / this.viewport.zoom]);
        ctx.strokeRect(x, y, selected.width, selected.height);
        ctx.restore();
      }
    }

    comments.forEach((comment, index) => {
      const target = images.find((image) => image.id === comment.targetId && image.visible);
      if (!target) return;
      const sameTargetBefore = comments.slice(0, index).filter((item) => item.targetId === comment.targetId).length;
      this.drawCommentBadge(index + 1, target.x + 20 + sameTargetBefore * 38, target.y + 20);
    });

    ctx.restore();
  }

  private drawCommentBadge(number: number, x: number, y: number): void {
    const ctx = this.ctx;
    const radius = 16 / this.viewport.zoom;
    ctx.save();
    ctx.fillStyle = '#c42026';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `${700} ${14 / this.viewport.zoom}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), x, y + 0.5 / this.viewport.zoom);
    ctx.restore();
  }

  private screenPoint(event: PointerEvent | WheelEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private screenToWorld(point: Point): Point {
    return {
      x: (point.x - this.viewport.offsetX) / this.viewport.zoom,
      y: (point.y - this.viewport.offsetY) / this.viewport.zoom,
    };
  }

  private hitTestImage(point: Point): ImageObject | null {
    if (!this.state) return null;
    const images = [...this.state.document.images]
      .filter((image) => image.visible)
      .sort((a, b) => b.zIndex - a.zIndex);
    return images.find((image) =>
      point.x >= image.x &&
      point.x <= image.x + image.width &&
      point.y >= image.y &&
      point.y <= image.y + image.height,
    ) ?? null;
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (!this.state) return;
    const screen = this.screenPoint(event);

    if (this.activeTool === 'pan' || event.button === 1) {
      this.drag = {
        mode: 'pan',
        pointerId: event.pointerId,
        startScreen: screen,
        originalOffsetX: this.viewport.offsetX,
        originalOffsetY: this.viewport.offsetY,
      };
      this.canvas.setPointerCapture(event.pointerId);
      this.canvas.classList.add('is-panning');
      return;
    }

    const world = this.screenToWorld(screen);
    const hit = this.hitTestImage(world);
    this.options.onSelect(hit?.id ?? null);
    if (!hit || hit.locked) {
      this.render();
      return;
    }

    this.drag = {
      mode: 'image',
      pointerId: event.pointerId,
      imageId: hit.id,
      startWorld: world,
      originalX: hit.x,
      originalY: hit.y,
      draftX: hit.x,
      draftY: hit.y,
    };
    this.canvas.setPointerCapture(event.pointerId);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    const screen = this.screenPoint(event);

    if (this.drag.mode === 'pan') {
      this.viewport.offsetX = this.drag.originalOffsetX + screen.x - this.drag.startScreen.x;
      this.viewport.offsetY = this.drag.originalOffsetY + screen.y - this.drag.startScreen.y;
      this.emitViewport();
      this.render();
      return;
    }

    const world = this.screenToWorld(screen);
    this.drag.draftX = this.drag.originalX + world.x - this.drag.startWorld.x;
    this.drag.draftY = this.drag.originalY + world.y - this.drag.startWorld.y;
    this.render();
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    const drag = this.drag;
    this.drag = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    this.canvas.classList.remove('is-panning');

    if (drag.mode === 'image' && (drag.draftX !== drag.originalX || drag.draftY !== drag.originalY)) {
      this.options.onCommitImagePosition(drag.imageId, Math.round(drag.draftX), Math.round(drag.draftY));
    }
    this.render();
  };

  private handlePointerCancel = (event: PointerEvent): void => {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    this.drag = null;
    this.canvas.classList.remove('is-panning');
    this.render();
  };

  private handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const screen = this.screenPoint(event);
    const worldBefore = this.screenToWorld(screen);
    const factor = Math.exp(-event.deltaY * 0.0012);
    const nextZoom = Math.min(4, Math.max(0.05, this.viewport.zoom * factor));

    this.viewport.zoom = nextZoom;
    this.viewport.offsetX = screen.x - worldBefore.x * nextZoom;
    this.viewport.offsetY = screen.y - worldBefore.y * nextZoom;
    this.emitViewport();
    this.render();
  };
}
