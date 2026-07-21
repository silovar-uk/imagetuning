import type { Point, ShapeObject } from '../document/types';

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
export type ShapeBounds = { left: number; top: number; right: number; bottom: number };

export function getShapeBounds(shape: Pick<ShapeObject, 'x' | 'y' | 'width' | 'height'>): ShapeBounds {
  return {
    left: Math.min(shape.x, shape.x + shape.width),
    top: Math.min(shape.y, shape.y + shape.height),
    right: Math.max(shape.x, shape.x + shape.width),
    bottom: Math.max(shape.y, shape.y + shape.height),
  };
}

export function getHandlePoints(bounds: ShapeBounds): Record<ResizeHandle, Point> {
  return {
    nw: { x: bounds.left, y: bounds.top },
    ne: { x: bounds.right, y: bounds.top },
    sw: { x: bounds.left, y: bounds.bottom },
    se: { x: bounds.right, y: bounds.bottom },
  };
}

export function hitResizeHandle(point: Point, bounds: ShapeBounds, radius: number): ResizeHandle | null {
  const handles = getHandlePoints(bounds);
  for (const handle of ['nw', 'ne', 'sw', 'se'] as const) {
    const target = handles[handle];
    if (Math.abs(point.x - target.x) <= radius && Math.abs(point.y - target.y) <= radius) return handle;
  }
  return null;
}

export function resizeShapeBounds(
  original: ShapeBounds,
  handle: ResizeHandle,
  point: Point,
  minimumSize = 12,
): { x: number; y: number; width: number; height: number } {
  let { left, top, right, bottom } = original;
  if (handle.includes('w')) left = Math.min(point.x, right - minimumSize);
  if (handle.includes('e')) right = Math.max(point.x, left + minimumSize);
  if (handle.includes('n')) top = Math.min(point.y, bottom - minimumSize);
  if (handle.includes('s')) bottom = Math.max(point.y, top + minimumSize);
  return { x: left, y: top, width: right - left, height: bottom - top };
}
