import React, { useState, useEffect, useCallback } from 'react';
import { CommentItemData } from '../../types';
import { commentsApi } from '../../api/comments';
import { CommentItem } from './CommentItem';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Send, Loader2, Sparkles } from 'lucide-react';
import { AvatarFrame } from '../common/AvatarFrame';

interface ChapterCommentsProps {
  chapterId: number;
}

export const ChapterComments: React.FC<ChapterCommentsProps> = ({ chapterId }) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [comments, setComments] = useState<CommentItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const data = await commentsApi.listComments(chapterId);
      setComments(data || []);
    } catch (err) {
      console.error("Failed to fetch comments", err);
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      await commentsApi.createComment(chapterId, { content: commentText.trim() });
      setCommentText('');
      await fetchComments();
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentId: number, text: string): Promise<boolean> => {
    try {
      await commentsApi.createComment(chapterId, { content: text, parent_id: parentId });
      await fetchComments();
      return true;
    } catch (err) {
      console.error("Failed to post reply", err);
      return false;
    }
  };

  const handleDelete = async (commentId: number): Promise<boolean> => {
    try {
      await commentsApi.deleteComment(commentId);
      await fetchComments();
      return true;
    } catch (err) {
      console.error("Failed to delete comment", err);
      return false;
    }
  };

  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  return (
    <section className="w-full max-w-3xl mx-auto my-12 p-6 rounded-3xl bg-studio-900 border border-studio-800 shadow-xl">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-studio-800 mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-400" />
          <h3 className="font-bold text-lg text-white">Sharhlar va Fikrlar</h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-studio-800 text-brand-400">
            {totalCount}
          </span>
        </div>
      </div>

      {/* Post Comment Input */}
      <div className="mb-8">
        {isAuthenticated && user ? (
          <form onSubmit={handlePostComment} className="flex gap-3 items-start">
            <AvatarFrame
              username={user.username}
              frameUrl={user.active_frame?.asset_url}
              size="md"
            />
            <div className="flex-1 space-y-2">
              <textarea
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Bob haqida o'z fikringizni qoldiring..."
                className="w-full p-3 bg-studio-800 border border-studio-700 rounded-2xl text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none transition-all"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !commentText.trim()}
                  className="px-5 py-2 rounded-xl font-bold bg-brand-500 text-studio-950 text-xs hover:bg-brand-400 active:scale-95 shadow-glow-brand transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Fikr bildirish</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-4 rounded-2xl bg-studio-800/60 border border-studio-700/60 text-center">
            <p className="text-xs text-studio-300 mb-2">
              Sharh yozish va muhokamalarda qatnashish uchun tizimga kiring:
            </p>
            <button
              onClick={() => openAuthModal('login')}
              className="px-4 py-1.5 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 transition-all shadow-glow-brand"
            >
              Kirish / Ro'yxatdan o'tish
            </button>
          </div>
        )}
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="py-8 flex justify-center items-center text-studio-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
          <span className="text-sm">Sharhlar yuklanmoqda...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center text-studio-500 text-xs">
          <Sparkles className="w-8 h-8 mx-auto text-studio-600 mb-2" />
          Birinchi bo'lib ushbu bobga sharh qoldiring!
        </div>
      ) : (
        <div className="space-y-1">
          {comments.map((comm) => (
            <CommentItem
              key={comm.id}
              id={comm.id}
              user={comm.user}
              content={comm.content}
              createdAt={comm.created_at}
              replies={comm.replies}
              onReply={handleReply}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
};
