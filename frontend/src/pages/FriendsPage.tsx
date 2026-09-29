import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { friendsApi } from '../api/friends';
import { FriendRequestItem, FriendUserSummary } from '../types';
import { AvatarFrame } from '../components/common/AvatarFrame';
import { getApiErrorMessage } from '../api/client';
import {
  Users,
  UserPlus,
  UserCheck,
  Search,
  Check,
  X,
  Trash2,
  Clock,
  Shield,
  Loader2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

export const FriendsPage: React.FC = () => {
  const { user: currentUser, isAuthenticated, openAuthModal } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [friends, setFriends] = useState<FriendUserSummary[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [friendsRes, reqRes] = await Promise.all([
        friendsApi.getFriends(),
        friendsApi.getFriendRequests(),
      ]);
      setFriends(friendsRes.data || []);
      setIncomingRequests(reqRes.data?.incoming || []);
      setOutgoingRequests(reqRes.data?.outgoing || []);
    } catch (err) {
      console.error("Error loading friends:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  // Search users effect
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await friendsApi.searchUsers(searchQuery.trim());
        setSearchResults(res.data || []);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendRequest = async (userId: number) => {
    try {
      await friendsApi.sendFriendRequest({ user_id: userId });
      setFeedbackMessage("Do'stlik so'rovi yuborildi!");
      // Update search result status
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, friendship: { ...u.friendship, status: 'pending_sent' } }
            : u
        )
      );
      loadData();
    } catch (err) {
      setFeedbackMessage(getApiErrorMessage(err, "Xatolik yuz berdi"));
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await friendsApi.acceptFriendRequest(requestId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await friendsApi.rejectFriendRequest(requestId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    if (!window.confirm("Haqiqatan ham bu foydalanuvchini do'stlikdan o'chirmoqchimisiz?")) return;
    try {
      await friendsApi.removeFriend(friendId);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] max-w-lg mx-auto px-4 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4 text-brand-400">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('friends.title')}</h2>
        <p className="text-studio-400 text-sm mb-6">{t('friends.subtitle')}</p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-studio-950 font-bold rounded-xl shadow-glow-brand transition-all"
        >
          {t('nav.login')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-studio-950 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-400" />
            <span>{t('friends.title')}</span>
          </h1>
          <p className="text-studio-400 text-sm mt-1">{t('friends.subtitle')}</p>
        </div>

        {/* User Search Bar */}
        <div className="relative mb-8">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-studio-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('friends.searchPlaceholder')}
              className="w-full pl-12 pr-4 py-3.5 bg-studio-900 border border-studio-800 rounded-2xl text-white placeholder-studio-500 focus:outline-none focus:border-brand-500 transition-all shadow-inner"
            />
            {isSearching && (
              <div className="absolute right-4">
                <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
              </div>
            )}
          </div>

          {/* Autocomplete / Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-studio-900 border border-studio-800 rounded-2xl shadow-2xl p-3 z-30 space-y-2 max-h-80 overflow-y-auto">
              <div className="text-xs font-semibold text-studio-400 px-2 py-1 uppercase tracking-wider">
                Qidiruv natijalari ({searchResults.length})
              </div>
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-studio-800 transition-colors"
                >
                  <Link
                    to={`/users/${result.username}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <AvatarFrame
                      username={result.username}
                      avatarUrl={result.avatar_url}
                      frameUrl={result.active_frame?.asset_url}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm truncate flex items-center gap-2">
                        <span>{result.username}</span>
                        {result.clan && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                            [{result.clan.tag}]
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div>
                    {result.friendship.status === 'friends' ? (
                      <span className="text-xs text-emerald-400 font-medium px-3 py-1.5 bg-emerald-500/10 rounded-lg">
                        Do'stsiz
                      </span>
                    ) : result.friendship.status === 'pending_sent' ? (
                      <span className="text-xs text-amber-400 font-medium px-3 py-1.5 bg-amber-500/10 rounded-lg flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Kutilmoqda
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(result.id)}
                        className="px-3 py-1.5 bg-brand-500 hover:bg-brand-400 text-studio-950 font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{t('friends.addFriend')}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {feedbackMessage && (
            <div className="mt-2 text-xs text-brand-400 font-medium">{feedbackMessage}</div>
          )}
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-studio-800 mb-8 gap-6">
          <button
            onClick={() => setActiveTab('friends')}
            className={`pb-3 font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'friends'
                ? 'text-white border-brand-500'
                : 'text-studio-400 border-transparent hover:text-studio-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{t('friends.myFriends')}</span>
            <span className="px-2 py-0.5 rounded-full bg-studio-800 text-xs font-mono text-studio-300">
              {friends.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-3 font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'text-white border-brand-500'
                : 'text-studio-400 border-transparent hover:text-studio-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('friends.requests')}</span>
            {incomingRequests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-brand-500 text-studio-950 text-xs font-bold font-mono">
                {incomingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: My Friends */}
        {activeTab === 'friends' && (
          <div>
            {isLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
              </div>
            ) : friends.length === 0 ? (
              <div className="bg-studio-900/50 border border-dashed border-studio-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-studio-800 flex items-center justify-center text-studio-400 mx-auto mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-white font-bold text-base mb-1">{t('friends.emptyFriends')}</h3>
                <p className="text-studio-500 text-xs">
                  Yuqoridagi qidiruv paneli orqali boshqa kitobxonlarni topib, do'stlik so'rovi yuboring.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="relative bg-studio-900 border border-studio-800 rounded-2xl p-5 hover:border-studio-700 transition-all flex flex-col justify-between overflow-hidden group shadow-lg"
                  >
                    {/* Background preview if equipped */}
                    {friend.active_background && (
                      <div className="absolute inset-0 h-16 overflow-hidden pointer-events-none opacity-25">
                        <img
                          src={friend.active_background.asset_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="relative z-10 flex items-start gap-4">
                      <AvatarFrame
                        username={friend.username}
                        avatarUrl={friend.avatar_url}
                        frameUrl={friend.active_frame?.asset_url}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={`/users/${friend.username}`}
                            className="font-extrabold text-white text-base hover:text-brand-400 transition-colors truncate"
                          >
                            {friend.username}
                          </Link>
                          {friend.clan && (
                            <Link
                              to={`/clans/${friend.clan.id}`}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30"
                            >
                              [{friend.clan.tag}]
                            </Link>
                          )}
                        </div>
                        {friend.bio ? (
                          <p className="text-xs text-studio-400 italic line-clamp-1 mt-1">"{friend.bio}"</p>
                        ) : (
                          <p className="text-xs text-studio-500 mt-1">Kitobxon</p>
                        )}
                      </div>
                    </div>

                    <div className="relative z-10 mt-5 pt-3 border-t border-studio-800/80 flex items-center justify-between">
                      <Link
                        to={`/users/${friend.username}`}
                        className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1"
                      >
                        <span>{t('friends.viewProfile')}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>

                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        title="Do'stlikdan o'chirish"
                        className="p-1.5 text-studio-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Friend Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-8">
            {/* Incoming Requests */}
            <div>
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-400" />
                <span>Qabul qilinishi kutilayotgan so'rovlar ({incomingRequests.length})</span>
              </h3>

              {incomingRequests.length === 0 ? (
                <div className="bg-studio-900/40 border border-studio-800 rounded-2xl p-6 text-center text-studio-500 text-sm">
                  {t('friends.emptyRequests')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-studio-900 border border-studio-800 rounded-2xl p-4 flex items-center justify-between gap-4"
                    >
                      <Link
                        to={`/users/${req.username}`}
                        className="flex items-center gap-3 min-w-0"
                      >
                        <AvatarFrame
                          username={req.username}
                          avatarUrl={req.avatar_url}
                          frameUrl={req.active_frame?.asset_url}
                          size="md"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-white text-sm truncate block hover:text-brand-400">
                            {req.username}
                          </span>
                          {req.clan_tag && (
                            <span className="text-[10px] text-purple-400">
                              Klan: [{req.clan_tag}]
                            </span>
                          )}
                        </div>
                      </Link>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{t('friends.accept')}</span>
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-3 py-1.5 bg-studio-800 hover:bg-studio-700 text-studio-400 hover:text-white text-xs font-semibold rounded-xl transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Siz yuborgan so'rovlar ({outgoingRequests.length})</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-studio-900 border border-studio-800 rounded-2xl p-4 flex items-center justify-between gap-4"
                    >
                      <Link
                        to={`/users/${req.username}`}
                        className="flex items-center gap-3 min-w-0"
                      >
                        <AvatarFrame
                          username={req.username}
                          avatarUrl={req.avatar_url}
                          frameUrl={req.active_frame?.asset_url}
                          size="sm"
                        />
                        <span className="font-bold text-white text-sm truncate hover:text-brand-400">
                          {req.username}
                        </span>
                      </Link>

                      <span className="text-xs text-amber-400 font-semibold px-3 py-1 bg-amber-500/10 rounded-lg flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-pulse" />
                        <span>Kutilmoqda</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
