import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ViewportSnapshot } from '../canvas/CanvasEngine';
import {
  getHandlePoints,
  getShapeBounds,
  resizeShapeBounds,
  scalePointsToBounds,
  type ResizeHandle,
  type ShapeBounds,
} from '../canvas/resize';
import type { Point, ShapeObject } from '../document/types';

type Draft = {
  bounds: ShapeBounds;
  points: Point[];
};

type DragState = {
  handle: ResizeHandle;
  originalBounds: ShapeBounds;
  originalPoints: Point[];
};

type Props = {
  shape: ShapeObject;
  viewport: ViewportSnapshot;
  onCommit: (patch: Partial<ShapeObject>) => void;
};

export function PenResizeOverlay({ shape, viewport, onCommit }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const points = draft?.points ?? shape.points ?? [];
  const bounds = draft?.bounds ?? getShapeBounds(shape);

  const screenPoints = useMemo(() => points.map((point) => ({
    x: viewport.offsetX + point.x * viewport.zoom,
    y: viewport.offsetY + point.y * viewport.zoom,
  })), [points, viewport]);

  const screenHandles = useMemo(() => {
    const handles = getHandlePoints(bounds);
    return Object.entries(handles).map(([handle, point]) => ({
      handle: handle as ResizeHandle,
      x: viewport.offsetX + point.x * viewport.zoom,
      y: viewport.offsetY + point.y * viewport.zoom,
    }));
  }, [bounds, viewport]);

  const worldPoint = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (event.clientX - rect.left - viewport.offsetX) / viewport.zoom,
      y: (event.clientY - rect.top - viewport.offsetY) / viewport.zoom,
    };
  };

  const updateDraft = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const point = worldPoint(event);
    if (!drag || !point) return;
    const resized = resizeShapeBounds(drag.originalBounds, drag.handle, point);
    const targetBounds = getShapeBounds(resized);
    setDraft({
      bounds: targetBounds,
      points: scalePointsToBounds(drag.originalPoints, drag.originalBounds, targetBounds),
    });
  };

  const finish = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = draft;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (current) {
      onCommit({
        x: Math.round(current.bounds.left),
        y: Math.round(current.bounds.top),
        width: Math.round(current.bounds.right - current.bounds.left),
        height: Math.round(current.bounds.bottom - current.bounds.top),
        points: current.points.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) })),
      });
    }
    setDraft(null);
  };

  return (
    <div ref={overlayRef} className="pen-resize-overlay" aria-label="ペン線のリサイズ">
      {draft && screenPoints.length > 1 && (
        <svg className="pen-resize-preview" aria-hidden="true">
          <polyline
            points={screenPoints.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={shape.color}
            strokeWidth={Math.max(1, shape.lineWidth * viewport.zoom)}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={shape.lineStyle === 'dashed' ? '8 6' : undefined}
          />
        </svg>
      )}
      {screenHandles.map(({ handle, x, y }) => (
        <button
          key={handle}
          type="button"
          className={`pen-resize-handle is-${handle}`}
          data-handle={handle}
          aria-label={`ペン線を${handle}方向へリサイズ`}
          style={{ transform: `translate(${x}px, ${y}px)` }}
          onPointerDown={(event) => {
            event.stopPropagation();
            dragRef.current = {
              handle,
              originalBounds: getShapeBounds(shape),
              originalPoints: (shape.points ?? []).map((point) => ({ ...point })),
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;
            updateDraft(event);
          }}
          onPointerUp={finish}
          onPointerCancel={finish}
        />
      ))}
    </div>
  );
}
