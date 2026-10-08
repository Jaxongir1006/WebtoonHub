import { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const NOVEL_PAGE_TURN_MS = 320;
export const NOVEL_PAGE_RETURN_MS = 180;

export interface NovelPageMotion {
  from: number;
  to: number;
  direction: 1 | -1;
  offset: number;
  width: number;
  top: number;
  height: number;
  phase: 'dragging' | 'preparing' | 'turning' | 'returning';
}

interface NovelPageMotionOptions {
  page: number;
  pageCount: number;
  onCommit: (index: number) => void;
  contextKey: string;
  stageRef: RefObject<HTMLElement>;
  disabled?: boolean;
}

/** Preview a turn without changing the reader's position until the paper settles. */
export function useNovelPageMotion(options: NovelPageMotionOptions) {
  const { page, pageCount, contextKey, disabled = false } = options;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [motion, setMotion] = useState<NovelPageMotion | null>(null);
  const motionRef = useRef<NovelPageMotion | null>(null);
  const lockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const framesRef = useRef<number[]>([]);
  const mediaRef = useRef<MediaQueryList | null>(null);
  if (!mediaRef.current && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    mediaRef.current = window.matchMedia('(prefers-reduced-motion: reduce)');
  }
  const reducedRef = useRef(mediaRef.current?.matches ?? false);

  const publish = useCallback((next: NovelPageMotion | null) => {
    motionRef.current = next;
    setMotion(next);
  }, []);

  const clearScheduled = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    framesRef.current.forEach(frame => window.cancelAnimationFrame(frame));
    framesRef.current = [];
  }, []);

  const reset = useCallback((render = true) => {
    clearScheduled();
    lockedRef.current = false;
    motionRef.current = null;
    if (render) setMotion(null);
  }, [clearScheduled]);

  useLayoutEffect(() => {
    reset();
    return () => reset(false);
  }, [page, pageCount, contextKey, disabled, reset]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return () => reset(false);
    const onChange = () => {
      reducedRef.current = media.matches;
      reset();
    };
    reducedRef.current = media.matches;
    media.addEventListener('change', onChange);
    return () => { media.removeEventListener('change', onChange); reset(false); };
  }, [reset]);

  const measure = useCallback((direction: 1 | -1): NovelPageMotion | null => {
    const current = optionsRef.current;
    const target = current.page + direction;
    if (current.disabled || target < 0 || target >= current.pageCount) return null;
    const stage = current.stageRef.current;
    const rect = stage?.getBoundingClientRect();
    if (!stage || !rect || !Number.isFinite(rect.width) || rect.width <= 0) return null;
    return {
      from: current.page, to: target, direction, offset: 0,
      width: rect.width, top: Math.max(0, 80 - rect.top), height: stage.offsetHeight,
      phase: 'dragging'
    };
  }, []);

  const finishMotion = useCallback(() => {
    const current = motionRef.current;
    if (!current || (current.phase !== 'turning' && current.phase !== 'returning')) return;
    clearScheduled();
    publish(null);
    if (current.phase === 'turning') {
      // Keep the lock until the committed page renders, even when events share a batch.
      optionsRef.current.onCommit(current.to);
    } else {
      lockedRef.current = false;
    }
  }, [clearScheduled, publish]);

  const dragPage = useCallback((offsetX: number) => {
    if (lockedRef.current || optionsRef.current.disabled || reducedRef.current || !Number.isFinite(offsetX)) return;
    if (offsetX === 0) { publish(null); return; }
    const direction = offsetX < 0 ? 1 : -1;
    const measured = measure(direction);
    if (!measured) { publish(null); return; }
    publish({ ...measured, offset: Math.max(-measured.width, Math.min(measured.width, offsetX)) });
  }, [measure, publish]);

  const cancelDrag = useCallback(() => {
    const current = motionRef.current;
    if (lockedRef.current || !current || current.phase !== 'dragging') return;
    if (reducedRef.current || current.offset === 0) { reset(); return; }
    lockedRef.current = true;
    publish({ ...current, phase: 'returning', offset: 0 });
    timerRef.current = window.setTimeout(finishMotion, NOVEL_PAGE_RETURN_MS + 80);
  }, [finishMotion, publish, reset]);

  const turnPage = useCallback((delta: number) => {
    const current = optionsRef.current;
    if (lockedRef.current || current.disabled || !Number.isFinite(delta) || delta === 0) return;
    const direction = delta > 0 ? 1 : -1;
    const target = current.page + direction;
    if (target < 0 || target >= current.pageCount) { reset(); return; }
    lockedRef.current = true;
    const measured = measure(direction);
    if (reducedRef.current || !measured) {
      publish(null);
      current.onCommit(target);
      return;
    }
    const dragging = motionRef.current;
    const preparing: NovelPageMotion = {
      ...measured, phase: 'preparing',
      offset: dragging?.phase === 'dragging' && dragging.direction === direction ? dragging.offset : 0
    };
    clearScheduled();
    publish(preparing);
    // Paint the start position before enabling the CSS transition.
    const first = window.requestAnimationFrame(() => {
      const second = window.requestAnimationFrame(() => {
        framesRef.current = [];
        if (motionRef.current !== preparing) return;
        publish({ ...preparing, phase: 'turning', offset: -direction * preparing.width });
        timerRef.current = window.setTimeout(finishMotion, NOVEL_PAGE_TURN_MS + 80);
      });
      framesRef.current.push(second);
    });
    framesRef.current.push(first);
  }, [clearScheduled, finishMotion, measure, publish, reset]);

  return {
    motion, isSettling: motion !== null && motion.phase !== 'dragging',
    dragPage, cancelDrag, turnPage, finishMotion
  };
}
