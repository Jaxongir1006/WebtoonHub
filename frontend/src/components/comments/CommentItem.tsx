import React, { useState } from 'react';
import { CommentAuthor } from '../../types';
import { AvatarFrame } from '../common/AvatarFrame';
import { formatRelativeTimeUz } from '../../utils/date';
import { Reply, Trash2, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CommentItemProps {
  id: number;
  user: CommentAuthor;
  content: string;
  createdAt: string;
  replies?: Array<{
    id: number;
    parent_id: number;
    user: CommentAuthor;
    content: string;
    created_at: string;
  }>;
  onReply?: (parentId: number, text: string) => Promise<boolean>;
  onDelete?: (commentId: number) => Promise<boolean>;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  id,
  user,
  content,
  createdAt,
  replies = [],
  onReply,
  onDelete
}) => {
  const { user: currentUser, isAuthenticated, openAuthModal } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = currentUser?.id === user.id;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (!replyText.trim() || !onReply) return;

    setIsSubmitting(true);
    const success = await onReply(id, replyText.trim());
    setIsSubmitting(false);
    if (success) {
      setReplyText('');
      setReplyOpen(false);
    }
  };

  const handleDelete = async (targetId: number) => {
    if (!onDelete) return;
    if (!window.confirm("Rostdan ham ushbu sharhni o'chirmoqchimisiz?")) return;
    setIsDeleting(true);
    await onDelete(targetId);
    setIsDeleting(false);
  };

  return (
    <div className="flex gap-3 py-3 border-b border-studio-850 last:border-b-0">
      {/* Author Avatar with Frame */}
      <AvatarFrame
        username={user.username}
        frameUrl={user.active_frame_url}
        size="md"
        className="mt-0.5"
      />

      <div className="flex-1 min-w-0">
        {/* Author Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white hover:text-brand-400 transition-colors">
              {user.username}
            </span>
            <span className="text-[11px] text-studio-500">
              {formatRelativeTimeUz(createdAt)}
            </span>
          </div>

          {isAuthor && onDelete && (
            <button
              onClick={() => handleDelete(id)}
              disabled={isDeleting}
              className="text-studio-500 hover:text-rose-400 p-1 rounded transition-colors"
              title="Sharhni o'chirish"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Comment Content */}
        <p className="text-sm text-studio-200 mt-1 whitespace-pre-wrap leading-relaxed break-words">
          {content}
        </p>

        {/* Reply Trigger */}
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={() => {
              if (!isAuthenticated) {
                openAuthModal('login');
                return;
              }
              setReplyOpen(!replyOpen);
            }}
            className="text-xs font-semibold text-studio-400 hover:text-brand-400 flex items-center gap-1 transition-colors"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Javob qaytarish</span>
          </button>
        </div>

        {/* Inline Reply Form */}
        {replyOpen && (
          <form onSubmit={handleSendReply} className="mt-3 flex gap-2">
            <input
              type="text"
              required
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`@${user.username} ga javob...`}
              className="flex-1 bg-studio-800 border border-studio-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={isSubmitting || !replyText.trim()}
              className="px-3 py-1.5 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 disabled:opacity-40 transition-all flex items-center gap-1 shadow-glow-brand"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Yuborish</span>
            </button>
          </form>
        )}

        {/* Nested Replies */}
        {replies.length > 0 && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-studio-800">
            {replies.map((reply) => {
              const isReplyAuthor = currentUser?.id === reply.user.id;
              return (
                <div key={reply.id} className="flex gap-2.5">
                  <AvatarFrame
                    username={reply.user.username}
                    frameUrl={reply.user.active_frame_url}
                    size="sm"
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">
                          {reply.user.username}
                        </span>
                        <span className="text-[10px] text-studio-500">
                          {formatRelativeTimeUz(reply.created_at)}
                        </span>
                      </div>
                      {isReplyAuthor && onDelete && (
                        <button
                          onClick={() => handleDelete(reply.id)}
                          className="text-studio-500 hover:text-rose-400 p-1 rounded transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-studio-300 mt-0.5 whitespace-pre-wrap break-words">
                      {reply.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
