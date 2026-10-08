import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChapterReaderData, ReadingProgress } from '../types';
import { useAuth } from '../context/AuthContext';
import { progressApi } from '../api/progress';
import { readPosition, writePosition } from '../utils/readingStorage';
import { parseApiDate } from '../utils/date';

export type PositionChange = Pick<ReadingProgress, 'page_index' | 'anchor' | 'progress_percent' | 'completed'>;
interface CompletionReceipt {
  position: ReadingProgress;
  epoch: number;
  eligibleAt: number;
  attempted: boolean;
}

export function useReadingProgress(data: ChapterReaderData | null, restart: boolean) {
  const { user, isLoading } = useAuth();
  const [status, setStatus] = useState<'saved' | 'local' | 'saving'>('saved');
  const [ready, setReady] = useState(false);
  const readyRef = useRef(ready); readyRef.current = ready;
  const lastReported = useRef<ReadingProgress | null>(null);
  const pending = useRef<ReadingProgress | null>(null);
  const sessionEpoch = useRef(0);
  const pendingEpoch = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const receiptTimer = useRef<ReturnType<typeof setTimeout>>();
  const receipt = useRef<CompletionReceipt | null>(null);
  const receiptFlight = useRef<{ ownerId: number | undefined; completion: CompletionReceipt } | null>(null);
  const retryReceipt = useRef<() => Promise<void>>(() => Promise.resolve());
  const requests = useRef(Promise.resolve());
  const alive = useRef(true);
  const ownerId = user?.id;
  const currentOwner = useRef(ownerId);
  const currentChapter = useRef(data?.id);
  currentOwner.current = ownerId;
  currentChapter.current = data?.id;
  useEffect(() => {
    const endSession = () => {
      sessionEpoch.current++; pending.current = null; receipt.current = null; receiptFlight.current = null;
      clearTimeout(timer.current); clearTimeout(receiptTimer.current);
    };
    window.addEventListener('webtoonhub:auth-ended', endSession);
    return () => window.removeEventListener('webtoonhub:auth-ended', endSession);
  }, []);
  const initial = useMemo(() => {
    if (!data || restart) return undefined;
    const local = readPosition(data.webtoon_id, ownerId);
    const remote = data.reading_progress;
    const candidates = [remote, local].filter((p): p is ReadingProgress => !!p && p.chapter_id === data.id);
    return candidates.sort((a, b) => parseApiDate(b.updated_at || '').getTime() - parseApiDate(a.updated_at || '').getTime())[0];
  }, [data?.id, data?.reading_progress, ownerId, restart]);

  const queueSave = useCallback((position: ReadingProgress, epoch: number, completionAttempt = false) => {
    const authorized = () => ownerId !== undefined && currentOwner.current === ownerId && epoch === sessionEpoch.current && Boolean(localStorage.getItem('webtoonhub_access_token'));
    const current = () => alive.current && authorized() && currentChapter.current === position.chapter_id;
    if (!authorized()) return requests.current;
    if (current()) setStatus('saving');
    requests.current = requests.current.then(async () => {
      if (!authorized() || (completionAttempt && !current())) return;
      try {
        const saved = await progressApi.save(position.webtoon_id, position);
        if (!current()) return;
        if (saved.completed) {
          readyRef.current = true; setReady(true);
          receipt.current = null; clearTimeout(receiptTimer.current);
          // A completion receipt deliberately saves the end of the chapter.
          // Restore the latest actual reading position after that acknowledgement.
          const latest = lastReported.current;
          if (completionAttempt && latest && latest.chapter_id === position.chapter_id &&
            (latest.page_index !== position.page_index || latest.anchor !== position.anchor || latest.progress_percent !== position.progress_percent)) {
            await progressApi.save(latest.webtoon_id, latest);
            if (!current()) return;
          }
        } else if (position.completed && position.progress_percent >= 95 && saved.reward_eligible_at) {
          const eligibleAt = parseApiDate(saved.reward_eligible_at).getTime();
          const previous = receipt.current;
          const attempted = completionAttempt || Boolean(previous?.epoch === epoch && previous.position.chapter_id === position.chapter_id && previous.attempted);
          receipt.current = { position, epoch, eligibleAt, attempted };
          // One scheduled retry is enough. Clock skew or a repeated server refusal
          // leaves an explicit retry instead of a rapid background request loop.
          if (!attempted && Number.isFinite(eligibleAt)) {
            clearTimeout(receiptTimer.current);
            receiptTimer.current = setTimeout(() => { void retryReceipt.current(); }, Math.max(250, eligibleAt - Date.now() + 150));
          } else if (attempted) {
            setStatus('local');
            return;
          }
        }
        if (current()) setStatus('saved');
      } catch {
        if (current()) {
          const latest = lastReported.current;
          if (!pending.current && latest?.chapter_id === position.chapter_id) {
            pending.current = latest; pendingEpoch.current = epoch;
          }
          setStatus('local');
        }
      }
    });
    return requests.current;
  }, [ownerId]);

  const queueReceipt = useCallback(() => {
    const completion = receipt.current;
    const flight = receiptFlight.current;
    if (!completion || completion.epoch !== sessionEpoch.current || currentOwner.current !== ownerId || currentChapter.current !== completion.position.chapter_id ||
      (flight && flight.ownerId === ownerId && flight.completion.epoch === completion.epoch && flight.completion.position.chapter_id === completion.position.chapter_id)) return requests.current;
    completion.attempted = true;
    const marker = { ownerId, completion };
    receiptFlight.current = marker;
    clearTimeout(receiptTimer.current);
    const request = queueSave(completion.position, completion.epoch, true);
    void request.finally(() => { if (receiptFlight.current === marker) receiptFlight.current = null; });
    return request;
  }, [ownerId, queueSave]);
  retryReceipt.current = queueReceipt;

  const flush = useCallback(() => {
    const position = pending.current;
    const epoch = pendingEpoch.current;
    pending.current = null;
    clearTimeout(timer.current);
    if (position) queueSave(position, epoch);
    const completion = receipt.current;
    if (completion && completion.eligibleAt <= Date.now()) queueReceipt();
    return requests.current;
  }, [queueSave, queueReceipt]);

  const report = useCallback((change: PositionChange) => {
    if (!data || isLoading) return;
    const last = lastReported.current;
    if (last && last.webtoon_id === data.webtoon_id && last.chapter_id === data.id && last.page_index === change.page_index && last.anchor === change.anchor && last.progress_percent === change.progress_percent && last.completed === change.completed) return;
    const position: ReadingProgress = {
      ...change, webtoon_id: data.webtoon_id, chapter_id: data.id,
      progress_percent: Math.max(0, Math.min(100, change.progress_percent)),
      updated_at: new Date().toISOString(), webtoon_title: data.webtoon_title,
      chapter_number: data.chapter_number
    };
    writePosition(position, ownerId);
    lastReported.current = position;
    pending.current = position;
    pendingEpoch.current = sessionEpoch.current;
    clearTimeout(timer.current);
    // Completion must be saved before the reward action becomes available.
    if (change.completed && !readyRef.current) flush();
    else timer.current = setTimeout(flush, 750);
  }, [data?.id, data?.webtoon_id, data?.webtoon_title, data?.chapter_number, isLoading, ownerId, flush]);

  useEffect(() => {
    alive.current = true;
    if (lastReported.current?.chapter_id !== data?.id) lastReported.current = null;
    readyRef.current = Boolean(data?.reading_progress?.completed);
    setReady(readyRef.current);
    const onHidden = () => { if (document.visibilityState === 'hidden') flush(); };
    const onOnline = () => {
      if (data) {
        const latest = readPosition(data.webtoon_id, ownerId);
        if (latest?.chapter_id === data.id) pending.current = latest;
      }
      pendingEpoch.current = sessionEpoch.current;
      flush();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('online', onOnline);
    return () => {
      clearTimeout(timer.current); clearTimeout(receiptTimer.current);
      receipt.current = null; flush(); alive.current = false;
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('online', onOnline);
    };
  }, [data?.id, ownerId, flush]);

  return { initial, report, status, flush, ready };
}
