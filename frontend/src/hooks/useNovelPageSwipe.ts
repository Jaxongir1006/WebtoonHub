import { useEffect, useRef, TouchEventHandler } from 'react';
import { isInteractiveTarget } from '../utils/reading';

interface NovelPageSwipeOptions {
  onTurnPage: (direction: -1 | 1) => void;
  onDrag?: (offsetX: number) => void;
  onCancel?: () => void;
  pageKey: string;
  enabled?: boolean;
}

interface SwipeStart {
  identifier: number;
  x: number;
  y: number;
  scrollY: number;
  time: number;
  pageKey: string;
  dragging: boolean;
}

/** Keep native scrolling, selection and pinch zoom independent from page turns. */
export function useNovelPageSwipe({ onTurnPage, onDrag, onCancel, pageKey, enabled = true }: NovelPageSwipeOptions) {
  const startRef = useRef<SwipeStart | null>(null);
  const hasSelection = () => window.getSelection()?.isCollapsed === false;
  const isZoomed = () => (window.visualViewport?.scale ?? 1) > 1.05;
  const cancel = () => {
    const started = startRef.current !== null;
    startRef.current = null;
    if (started) onCancel?.();
  };

  useEffect(() => {
    cancel();
    return () => { startRef.current = null; };
  }, [pageKey, enabled]);

  const onTouchStart: TouchEventHandler<HTMLElement> = event => {
    cancel();
    if (!enabled || event.defaultPrevented || event.touches.length !== 1 || hasSelection() || isZoomed() ||
        (event.target && isInteractiveTarget(event.target))) return;
    const touch = event.touches[0];
    startRef.current = {
      identifier: touch.identifier, x: touch.clientX, y: touch.clientY,
      scrollY: window.scrollY, time: event.timeStamp, pageKey, dragging: false
    };
  };

  const onTouchMove: TouchEventHandler<HTMLElement> = event => {
    const start = startRef.current;
    if (!start) return;
    const touch = Array.from(event.touches).find(item => item.identifier === start.identifier);
    if (event.defaultPrevented || event.touches.length !== 1 || !touch || hasSelection() || isZoomed() ||
        Math.abs(window.scrollY - start.scrollY) >= 8 || event.timeStamp - start.time > 750) {
      cancel(); return;
    }
    const horizontal = Math.abs(touch.clientX - start.x);
    const vertical = Math.abs(touch.clientY - start.y);
    // Once the user starts scrolling, a sideways finish must not turn the page.
    if (vertical >= 16 && vertical >= horizontal) { cancel(); return; }
    if (horizontal >= 12 && horizontal >= vertical * 1.5) {
      start.dragging = true;
      onDrag?.(touch.clientX - start.x);
    } else if (start.dragging) {
      start.dragging = false;
      onDrag?.(0);
    }
  };

  const onTouchEnd: TouchEventHandler<HTMLElement> = event => {
    const start = startRef.current;
    startRef.current = null;
    if (!start) return;
    if (!enabled || start.pageKey !== pageKey || event.defaultPrevented || event.touches.length || event.changedTouches.length !== 1 ||
        hasSelection() || isZoomed() || Math.abs(window.scrollY - start.scrollY) >= 8) { onCancel?.(); return; }
    const touch = Array.from(event.changedTouches).find(item => item.identifier === start.identifier);
    const elapsed = event.timeStamp - start.time;
    if (!touch || elapsed < 0 || elapsed > 750) { onCancel?.(); return; }
    const horizontal = touch.clientX - start.x;
    const vertical = Math.abs(touch.clientY - start.y);
    if (Math.abs(horizontal) >= 60 && Math.abs(horizontal) >= vertical * 1.5) {
      onTurnPage(horizontal < 0 ? 1 : -1);
    } else onCancel?.();
  };

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: cancel };
}
