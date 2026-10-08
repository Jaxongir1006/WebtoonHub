import React, { useState, useEffect, useRef } from 'react';
import { CommentItemData, CommentAuthor } from '../../types';
import { commentsApi } from '../../api/comments';
import { getApiErrorMessage } from '../../api/client';
import { CommentItem } from './CommentItem';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { AvatarFrame } from '../common/AvatarFrame';
import { COMMENT_MAX_LENGTH } from '../../utils/comments';

export const ChapterComments: React.FC<{ chapterId: number }> = ({ chapterId }) => {
  const { user, isAuthenticated, isLoading: checkingAccount, openAuthModal } = useAuth(); const { t } = useLanguage();
  const [comments, setComments] = useState<CommentItemData[]>([]); const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState(''); const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  const [hasMore, setHasMore] = useState(false); const [loadingMore, setLoadingMore] = useState(false);
  const [replyLoading, setReplyLoading] = useState<number | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const busy = mutationBusy || loadingMore || replyLoading !== null;
  const generation = useRef(0); const mutation = useRef(false); const moreFlight = useRef(false); const repliesFlight = useRef(false);
  const identity = `${chapterId}:${user?.id || 'guest'}`; const current = useRef(identity); current.current = identity;
  useEffect(() => { setCommentText(''); }, [chapterId, user?.id]);
  useEffect(() => {
    const request = ++generation.current; setComments([]); setLoading(true); setError(''); setHasMore(false);
    commentsApi.listComments(chapterId).then(items => { if (request === generation.current) { setComments(items); setHasMore(items.length === 50); } }).catch(reason => { if (request === generation.current) setError(getApiErrorMessage(reason, t('readerFix.loadError'))); }).finally(() => { if (request === generation.current) setLoading(false); });
    return () => { generation.current++; };
  }, [chapterId, user?.id, retry]);
  const author = (): CommentAuthor => ({ id: user!.id, username: user!.username, active_frame_url: user!.active_frame?.asset_url });
  const post = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) { openAuthModal('login'); return; }
    if (commentText.trim().length > COMMENT_MAX_LENGTH) { setError(t('comments.tooLong', { limit: COMMENT_MAX_LENGTH })); return; }
    if (mutation.current || moreFlight.current || repliesFlight.current || !commentText.trim()) return;
    mutation.current = true; setMutationBusy(true); setIsSubmitting(true); setError(''); const captured = identity;
    try {
      const response = await commentsApi.createComment(chapterId, { content: commentText.trim() });
      if (captured === current.current) { setComments(items => [{ ...response.data, user: author(), replies: [], reply_count: 0 }, ...items]); setCommentText(''); }
    } catch (reason) { if (captured === current.current) setError(getApiErrorMessage(reason, t('readerFix.saveError'))); }
    finally { mutation.current = false; setMutationBusy(false); setIsSubmitting(false); }
  };
  const reply = async (rootId: number, text: string): Promise<boolean> => {
    if (mutation.current || moreFlight.current || repliesFlight.current || !user) return false;
    if (text.trim().length > COMMENT_MAX_LENGTH) { setError(t('comments.tooLong', { limit: COMMENT_MAX_LENGTH })); return false; }
    mutation.current = true; setMutationBusy(true); setError(''); const captured = identity;
    try {
      const response = await commentsApi.createComment(chapterId, { content: text, parent_id: rootId });
      if (captured === current.current) setComments(items => items.map(item => item.id === rootId ? { ...item, replies: [...item.replies, { ...response.data, parent_id: rootId, user: author() }], reply_count: (item.reply_count ?? item.replies.length) + 1 } : item));
      return true;
    } catch (reason) { if (captured === current.current) setError(getApiErrorMessage(reason, t('readerFix.saveError'))); return false; }
    finally { mutation.current = false; setMutationBusy(false); }
  };
  const remove = async (id: number): Promise<boolean> => {
    if (mutation.current || moreFlight.current || repliesFlight.current) return false;
    mutation.current = true; setMutationBusy(true); setError(''); const captured = identity;
    try {
      await commentsApi.deleteComment(id);
      if (captured === current.current) setComments(items => items.filter(item => item.id !== id).map(item => ({ ...item, replies: item.replies.filter(child => child.id !== id), reply_count: item.replies.some(child => child.id === id) ? Math.max(0, (item.reply_count ?? item.replies.length) - 1) : item.reply_count, next_reply_offset: item.replies.some(child => child.id === id) ? Math.max(0, (item.next_reply_offset ?? item.replies.length) - 1) : item.next_reply_offset })));
      return true;
    } catch (reason) { if (captured === current.current) setError(getApiErrorMessage(reason, t('readerFix.saveError'))); return false; }
    finally { mutation.current = false; setMutationBusy(false); }
  };
  const more = async () => {
    if (moreFlight.current || repliesFlight.current || mutation.current) return; moreFlight.current = true; setLoadingMore(true); setError(''); const captured = identity; const request = generation.current;
    try { const items = await commentsApi.listComments(chapterId, comments.length); if (captured === current.current && request === generation.current) { setComments(previous => [...previous, ...items.filter(item => !previous.some(existing => existing.id === item.id))]); setHasMore(items.length === 50); } }
    catch (reason) { if (captured === current.current) setError(getApiErrorMessage(reason, t('readerFix.loadError'))); }
    finally { moreFlight.current = false; setLoadingMore(false); }
  };
  const moreReplies = async (item: CommentItemData) => {
    if (repliesFlight.current || moreFlight.current || mutation.current) return; repliesFlight.current = true; setReplyLoading(item.id); setError(''); const captured = identity;
    try {
      const result = await commentsApi.listReplies(item.id, item.next_reply_offset ?? item.replies.length);
      if (captured === current.current) setComments(items => items.map(parent => parent.id === item.id ? { ...parent, replies: [...parent.replies, ...result.items.filter(replyItem => !parent.replies.some(existing => existing.id === replyItem.id))].sort((a,b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id - b.id), reply_count: result.total, has_more_replies: result.has_more, next_reply_offset: result.offset + result.items.length } : parent));
    } catch (reason) { if (captured === current.current) setError(getApiErrorMessage(reason, t('readerFix.loadError'))); }
    finally { repliesFlight.current = false; setReplyLoading(null); }
  };
  return <section className="w-full max-w-3xl mx-auto my-12 p-4 sm:p-6 rounded-3xl bg-studio-900 border border-studio-800">
    <h3 className="flex items-center gap-2 font-bold text-lg text-white mb-6"><MessageSquare className="w-5 h-5 text-brand-400" />{t('comments.title')}</h3>
    {checkingAccount ? <p role="status">{t('readerFix.checking')}</p> : user && isAuthenticated ? <form onSubmit={post} className="flex gap-3 mb-6">
      <AvatarFrame username={user.username} avatarUrl={user.avatar_url} frameUrl={user.active_frame?.asset_url} size="md" />
      <div className="flex-1 min-w-0"><label htmlFor={`chapter-comment-${chapterId}`} className="block text-sm text-studio-300 mb-2">{t('comments.placeholder')}</label><textarea id={`chapter-comment-${chapterId}`} disabled={isSubmitting} maxLength={COMMENT_MAX_LENGTH} aria-describedby={`chapter-comment-count-${chapterId}`} rows={3} value={commentText} onChange={event => setCommentText(event.target.value)} className="w-full p-3 bg-studio-800 border border-studio-700 rounded-2xl text-sm text-white" /><p id={`chapter-comment-count-${chapterId}`} className="mt-1 text-xs text-studio-400">{t('comments.characterCount', { count: commentText.length, limit: COMMENT_MAX_LENGTH })}</p><button disabled={busy || !commentText.trim() || commentText.trim().length > COMMENT_MAX_LENGTH} className="mt-2 min-h-[44px] px-5 rounded-xl bg-brand-500 text-studio-950 font-bold text-sm disabled:opacity-50 inline-flex items-center gap-2">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{t('comments.sendBtn')}</button></div>
    </form> : <div className="mb-6"><p className="text-sm text-studio-300">{t('comments.loginToComment')}</p><button onClick={() => openAuthModal('login')} className="min-h-[44px] px-4 mt-2 rounded-xl bg-brand-500 text-studio-950 font-bold">{t('nav.login')}</button></div>}
    {error && <div role="alert" className="mb-4 text-sm text-rose-200">{error}{!comments.length && <button onClick={() => setRetry(retry + 1)} className="min-h-[44px] px-3 underline">{t('common.retry')}</button>}</div>}
    {loading ? <p role="status" className="py-8 text-center">{t('common.loading')}</p> : !comments.length && !error ? <p className="py-8 text-center text-studio-400">{t('comments.empty')}</p> : comments.map(item => <div key={`${identity}:${item.id}`}><CommentItem id={item.id} user={item.user} content={item.content} createdAt={item.created_at} replies={item.replies} onReply={reply} onDelete={remove} disabled={busy} />{item.has_more_replies && <button disabled={busy} onClick={() => moreReplies(item)} className="min-h-[44px] px-4 ml-12 text-brand-400 text-sm font-semibold">{replyLoading === item.id ? t('common.loading') : `${t('ux.loadMore')} · ${Math.max(0, (item.reply_count || 0) - item.replies.length)}`}</button>}</div>)}
    {hasMore && <button disabled={busy} onClick={more} className="min-h-[44px] w-full mt-4 rounded-xl bg-studio-800 text-white font-semibold">{loadingMore ? t('common.loading') : t('ux.loadMore')}</button>}
  </section>;
};
