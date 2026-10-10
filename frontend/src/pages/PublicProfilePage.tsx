import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usersApi } from '../api/users';
import { friendsApi } from '../api/friends';
import { PublicProfileData } from '../types';
import { AvatarFrame } from '../components/common/AvatarFrame';
import { ProfileWallpaper } from '../components/common/ProfileWallpaper';
import { getApiErrorMessage } from '../api/client';
import { CardCollectionPanel } from '../components/cards/CardCollectionPanel';
import {
  UserPlus,
  UserCheck,
  Clock,
  Shield,
  BookOpen,
  Bookmark,
  MessageSquare,
  Award,
  Calendar,
  AlertCircle,
  Loader2,
  Trash2,
  ExternalLink
} from 'lucide-react';

export const PublicProfilePage: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const { user: currentUser, isAuthenticated, openAuthModal } = useAuth();
  const { t, language } = useLanguage();
  const requestId = useRef(0);
  const actionLock = useRef(false);
  const actorIdentity = useRef(`${identifier}:${currentUser?.id ?? "guest"}`);
  actorIdentity.current = `${identifier}:${currentUser?.id ?? "guest"}`;

  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!identifier) return;
    const request = ++requestId.current;
    setIsLoading(true);
    setProfile(null);
    setActionMessage(null);
    setError(null);
    try {
      const res = await usersApi.getPublicProfile(identifier);
      if (request !== requestId.current) return;
      if (res.data) {
        setProfile(res.data);
      }
    } catch (err) {
      if (request === requestId.current) setError(getApiErrorMessage(err, t('socialFix.loadFailed')));
    } finally {
      if (request === requestId.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    return () => { requestId.current++; };
  }, [identifier, currentUser?.id]);

  const handleSendFriendRequest = async () => {
    const actor = actorIdentity.current;
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (!profile) return;
    if (actionLock.current) return;
    actionLock.current = true; setActionLoading(true);
    setActionMessage(null);
    try {
      const result = await friendsApi.sendFriendRequest({ user_id: profile.id });
      if (actor !== actorIdentity.current) return ;
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              friendship: { status: result.data?.status === 'accepted' ? 'friends' : 'pending_sent', friendship_id: result.data?.friendship_id },
            }
          : null
      );
      setActionMessage(t(result.data?.status === 'accepted' ? 'socialFix.requestAccepted' : 'socialFix.requestSent'));
    } catch (err) {
      if (actor === actorIdentity.current) setActionMessage(getApiErrorMessage(err, t('common.error')));
    } finally {
      actionLock.current = false; setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    const actor = actorIdentity.current;
    if (!profile?.friendship.friendship_id) return;
    if (actionLock.current) return;
    actionLock.current = true; setActionLoading(true);
    try {
      await friendsApi.acceptFriendRequest(profile.friendship.friendship_id);
      if (actor !== actorIdentity.current) return;
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              friendship: { status: 'friends' },
            }
          : null
      );
      setActionMessage(t('socialFix.requestAccepted'));
    } catch (err) {
      if (actor === actorIdentity.current) setActionMessage(getApiErrorMessage(err, t('common.error')));
    } finally {
      actionLock.current = false; setActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    const actor = actorIdentity.current;
    if (!profile) return;
    if (!window.confirm(t('socialFix.confirmRemove'))) return;
    if (actionLock.current) return;
    actionLock.current = true; setActionLoading(true);
    try {
      await friendsApi.removeFriend(profile.id);
      if (actor !== actorIdentity.current) return;
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              friendship: { status: 'none', friendship_id: null },
            }
          : null
      );
      setActionMessage(t('socialFix.friendRemoved'));
    } catch (err) {
      if (actor === actorIdentity.current) setActionMessage(getApiErrorMessage(err, t('common.error')));
    } finally {
      actionLock.current = false; setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    const actor = actorIdentity.current;
    if (!profile || actionLoading) return;
    if (actionLock.current) return;
    actionLock.current = true; setActionLoading(true);
    try { await friendsApi.removeFriend(profile.id); if (actor !== actorIdentity.current) return; await fetchProfile(); }
    catch (err) { if (actor === actorIdentity.current) setActionMessage(getApiErrorMessage(err, t('common.error'))); }
    finally { actionLock.current = false; setActionLoading(false); }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
        <span className="text-studio-400 font-medium">{t('common.loading')}</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[70vh] max-w-lg mx-auto px-4 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('common.error')}</h2>
        <p className="text-studio-400 text-sm mb-6">{error || t('common.notFound')}</p>
        <button onClick={fetchProfile} className="mb-4 px-5 py-3 rounded-xl bg-brand-500 text-studio-950">{t('socialFix.retry')}</button>
        <Link
          to="/"
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-studio-950 font-bold rounded-xl transition-all shadow-glow-brand"
        >
          {t('common.back')}
        </Link>
      </div>
    );
  }

  const isSelf = profile.friendship.status === 'self';
  const isFriends = profile.friendship.status === 'friends';
  const isPendingSent = profile.friendship.status === 'pending_sent';
  const isPendingReceived = profile.friendship.status === 'pending_received';

  return (
    <ProfileWallpaper key={profile.id} background={profile.active_background}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Card Header */}
        <div className="profile-panel bg-studio-900 border border-studio-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6 text-center sm:text-left">
              {/* Avatar with Equipped Animated Frame */}
              <div className="relative shrink-0">
                <AvatarFrame
                  username={profile.username}
                  avatarUrl={profile.avatar_url}
                  frameUrl={profile.active_frame?.asset_url}
                  size="xl"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-1.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight [overflow-wrap:anywhere]">
                    {profile.username}
                  </h1>

                  {/* Clan Badge */}
                  {profile.clan && (
                    <Link
                      to={`/clans/${profile.clan.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-xs hover:bg-purple-500/25 transition-all"
                    >
                      <Shield className="w-3.5 h-3.5 text-purple-400" />
                      <span>[{profile.clan.tag}] {profile.clan.name}</span>
                      <ExternalLink className="w-3 h-3 text-purple-400/70" />
                    </Link>
                  )}
                </div>

                {profile.bio ? (
                  <p className="text-studio-300 text-sm max-w-lg mb-3 italic [overflow-wrap:anywhere]">
                    "{profile.bio}"
                  </p>
                ) : (
                  <p className="text-studio-500 text-xs italic mb-3">
                    {t('socialFix.noBio')}
                  </p>
                )}

                <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-studio-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-400" />
                    <span>{t('publicProfile.memberSince')}: {new Date(profile.created_at).toLocaleDateString(language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US')}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Friendship Action Button */}
            <div className="flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
              {isSelf ? (
                <Link
                  to="/profile"
                  className="w-full sm:w-auto px-5 py-2.5 bg-studio-800 hover:bg-studio-700 text-white font-bold text-sm rounded-xl transition-all border border-studio-700 flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4 text-brand-400" />
                  <span>{t('nav.profile')}</span>
                </Link>
              ) : isFriends ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
                    <UserCheck className="w-4 h-4" />
                    <span>{t('socialFix.friends')}</span>
                  </span>
                  <button
                    onClick={handleRemoveFriend}
                    disabled={actionLoading}
                    title={t('socialFix.removeFriend')}
                    aria-label={t('socialFix.removeFriend')}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors border border-rose-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : isPendingSent ? (
                <button
                  onClick={handleCancelRequest}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-5 py-2.5 bg-studio-800 text-studio-400 font-semibold text-sm rounded-xl  flex items-center justify-center gap-2 border border-studio-700"
                >
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>{t('socialFix.cancelRequest')}</span>
                </button>
              ) : isPendingReceived ? (
                <button
                  onClick={handleAcceptRequest}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('friends.accept')}</span>
                </button>
              ) : (
                <button
                  onClick={handleSendFriendRequest}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-studio-950 font-bold text-sm rounded-xl shadow-glow-brand transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('publicProfile.addFriend')}</span>
                </button>
              )}

              {actionMessage && (
                <span role="status" className="text-xs text-brand-400 font-medium">{actionMessage}</span>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-studio-800/80">
            <div className="bg-studio-950/60 border border-studio-800/60 rounded-2xl p-4 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-studio-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <Bookmark className="w-3.5 h-3.5 text-brand-400" />
                <span>{t('publicProfile.bookmarks')}</span>
              </div>
              <div className="text-2xl font-black text-white">{profile.stats.bookmarks_count}</div>
            </div>

            <div className="bg-studio-950/60 border border-studio-800/60 rounded-2xl p-4 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-studio-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('publicProfile.readChapters')}</span>
              </div>
              <div className="text-2xl font-black text-white">{profile.stats.read_chapters_count}</div>
            </div>

            <div className="bg-studio-950/60 border border-studio-800/60 rounded-2xl p-4 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-studio-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('publicProfile.commentsCount')}</span>
              </div>
              <div className="text-2xl font-black text-white">{profile.stats.comments_count}</div>
            </div>

            <div className="bg-studio-950/60 border border-studio-800/60 rounded-2xl p-4 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-studio-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('publicProfile.clanContribution')}</span>
              </div>
              <div className="text-2xl font-black text-brand-400 font-mono">
                {profile.stats.clan_contribution} XP
              </div>
            </div>
          </div>
        </div>

        {profile.card_collection && <div className="mt-8"><CardCollectionPanel className="profile-panel" key={profile.id} summary={profile.card_collection} /></div>}

        {/* Equipped Assets Showcase */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Frame */}
          <div className="profile-panel bg-studio-900 border border-studio-800 rounded-3xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-400" />
              <span>{t('socialFix.equippedFrame')}</span>
            </h3>
            {profile.active_frame ? (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-studio-950 border border-studio-800">
                <div className="w-16 h-16 shrink-0 relative flex items-center justify-center">
                  <AvatarFrame
                    username={profile.username}
                    avatarUrl={profile.avatar_url}
                    frameUrl={profile.active_frame.asset_url}
                    size="lg"
                  />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">{profile.active_frame.name}</h4>
                  <span className="text-xs text-brand-400 font-medium">{t('shop.equipped')}</span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-studio-500 text-sm bg-studio-950/50 rounded-2xl border border-dashed border-studio-800">
                {t('socialFix.noFrame')}
              </div>
            )}
          </div>

          {/* Active Background */}
          <div className="profile-panel bg-studio-900 border border-studio-800 rounded-3xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              <span>{t('socialFix.equippedBackground')}</span>
            </h3>
            {profile.active_background ? (
              <div className="relative rounded-2xl overflow-hidden h-28 border border-studio-800">
                <img
                  src={profile.active_background.asset_preview_url || profile.active_background.asset_url}
                  alt={profile.active_background.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-studio-950 via-transparent to-transparent flex items-end p-3">
                  <span className="text-white font-bold text-sm drop-shadow">{profile.active_background.name}</span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-studio-500 text-sm bg-studio-950/50 rounded-2xl border border-dashed border-studio-800">
                {t('socialFix.noBackground')}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProfileWallpaper>
  );
};
