import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { clansApi } from '../api/clans';
import { ClanDetail, ClanMemberItem, ClanMessageItem } from '../types';
import { AvatarFrame } from '../components/common/AvatarFrame';
import { getApiErrorMessage } from '../api/client';
import {
  Shield,
  Users,
  Award,
  Zap,
  ArrowUpCircle,
  MessageSquare,
  Send,
  LogOut,
  UserPlus,
  Crown,
  Trash2,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
  Info,
  X,
  Image,
  Upload
} from 'lucide-react';

export const ClanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const clanId = parseInt(id || '0', 10);
  const { user: currentUser, isAuthenticated, openAuthModal, updateCoinsLocally } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [clan, setClan] = useState<ClanDetail | null>(null);
  const [members, setMembers] = useState<ClanMemberItem[]>([]);
  const [messages, setMessages] = useState<ClanMessageItem[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Settings & Customization modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [editDesc, setEditDesc] = useState<string>('');
  const [editAvatar, setEditAvatar] = useState<string>('');
  const [editFrame, setEditFrame] = useState<string | null>(null);
  const [editBanner, setEditBanner] = useState<string | null>(null);
  const [editRecruiting, setEditRecruiting] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const frameFileInputRef = useRef<HTMLInputElement>(null);

  // Chat message input
  const [chatInput, setChatInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const loadClanData = async () => {
    if (!clanId) return;
    setIsLoading(true);
    setActionError(null);
    try {
      const [clanRes, membersRes] = await Promise.all([
        clansApi.getClanDetail(clanId),
        clansApi.getClanMembers(clanId),
      ]);
      setClan(clanRes.data);
      setMembers(membersRes.data || []);
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Klan ma'lumotlarini yuklashda xatolik"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClanData();
  }, [clanId, currentUser]);

  // Load chat messages and initialize WebSocket
  useEffect(() => {
    if (!clanId || !clan?.my_role) return;

    // 1. Fetch initial REST history
    clansApi.getClanMessages(clanId, 50).then((res) => {
      setMessages(res.data || []);
      scrollToBottom();
    });

    // 2. Connect to WebSocket
    const token = localStorage.getItem('webtoonhub_access_token');
    if (!token) return;

    const apiBase = new URL(import.meta.env.VITE_API_URL || '/api/v1', window.location.origin);
    const wsProtocol = apiBase.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsPath = `${apiBase.pathname.replace(/\/$/, '')}/clans/${clanId}/chat/ws`;
    const wsUrl = `${wsProtocol}//${apiBase.host}${wsPath}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const newMsg: ClanMessageItem = JSON.parse(event.data);
        setMessages((prev) => [...prev, newMsg]);
        scrollToBottom();
      } catch (e) {
        console.error("WS Parse error", e);
      }
    };

    ws.onclose = () => {
      // ws closed
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [clanId, clan?.my_role]);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending) return;

    const text = chatInput.trim();
    setChatInput('');
    setIsSending(true);

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ content: text }));
      } else {
        // Fallback REST endpoint
        const res = await clansApi.sendClanMessage(clanId, text);
        if (res.data) {
          setMessages((prev) => [...prev, res.data]);
          scrollToBottom();
        }
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setIsSending(false);
    }
  };

  // Join Clan
  const handleJoinClan = async () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await clansApi.joinClan(clanId);
      setActionSuccess(res.message || "Klanga muvaffaqiyatli qo'shildingiz!");
      loadClanData();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Klanga qo'shilishda xatolik"));
    } finally {
      setActionLoading(false);
    }
  };

  // Leave Clan
  const handleLeaveClan = async () => {
    if (!window.confirm("Rostdan ham klandan chiqmoqchimisiz?")) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await clansApi.leaveClan(clanId);
      setActionSuccess(res.message || "Klandan chiqdingiz");
      navigate('/clans');
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Klandan chiqishda xatolik"));
    } finally {
      setActionLoading(false);
    }
  };

  // Kick member
  const handleKickMember = async (userId: number, username: string) => {
    if (!window.confirm(`${username} ni klandan haydamoqchimisiz?`)) return;
    setActionLoading(true);
    try {
      await clansApi.kickMember(clanId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      setActionSuccess(`${username} klandan chetlatildi`);
    } catch (err) {
      setActionError(getApiErrorMessage(err, "A'zoni chetlatishda xatolik"));
    } finally {
      setActionLoading(false);
    }
  };

  // Upgrade clan level
  const handleUpgradeLevel = async () => {
    if (!clan) return;
    if (!clan.can_upgrade) {
      setActionError(t('clans.fullXpRequired'));
      return;
    }

    if (!window.confirm(`Klan darajasini oshirish uchun ${clan.upgrade_cost_coins} ⚡ to'laysizmi?`)) {
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await clansApi.upgradeClanLevel(clanId);
      setActionSuccess(res.message || t('clans.upgradeSuccess'));
      if (currentUser && currentUser.lightning_coins >= clan.upgrade_cost_coins) {
        updateCoinsLocally(currentUser.lightning_coins - clan.upgrade_cost_coins);
      }
      loadClanData();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Daraja oshirishda xatolik"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadClanAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clan) return;
    setUploadingFile(true);
    setSettingsError(null);
    try {
      const res = await clansApi.uploadClanAvatar(clan.id, file);
      if (res.data?.avatar_url) {
        setEditAvatar(res.data.avatar_url);
        setSettingsSuccess("Klan logosi yuklandi!");
      }
    } catch (err) {
      setSettingsError(getApiErrorMessage(err, "Logo yuklashda xatolik"));
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleUploadClanBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clan) return;
    setUploadingFile(true);
    setSettingsError(null);
    try {
      const res = await clansApi.uploadClanBanner(clan.id, file);
      if (res.data?.banner_url) {
        setEditBanner(res.data.banner_url);
        setSettingsSuccess("Klan foni yuklandi!");
      }
    } catch (err) {
      setSettingsError(getApiErrorMessage(err, "Fon yuklashda xatolik"));
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleUploadClanFrame = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clan) return;
    setUploadingFile(true);
    setSettingsError(null);
    try {
      const res = await clansApi.uploadClanFrame(clan.id, file);
      if (res.data?.frame_url) {
        setEditFrame(res.data.frame_url);
        setSettingsSuccess("Klan ramkasi yuklandi!");
      }
    } catch (err) {
      setSettingsError(getApiErrorMessage(err, "Ramka yuklashda xatolik"));
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleOpenSettingsModal = () => {
    if (!clan) return;
    setEditDesc(clan.description || '');
    setEditAvatar(clan.avatar_url || '');
    setEditFrame(clan.frame_url || null);
    setEditBanner(clan.banner_url || null);
    setEditRecruiting(clan.is_recruiting);
    setSettingsError(null);
    setSettingsSuccess(null);
    setIsSettingsModalOpen(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clan) return;
    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      const res = await clansApi.updateClan(clan.id, {
        description: editDesc.trim(),
        avatar_url: editAvatar || '',
        frame_url: editFrame || '',
        banner_url: editBanner || '',
        is_recruiting: editRecruiting,
      });

      setSettingsSuccess(res.message || "Klan sozlamalari va bezaklari muvaffaqiyatli saqlandi!");
      await loadClanData();
      setTimeout(() => {
        setIsSettingsModalOpen(false);
      }, 900);
    } catch (err) {
      setSettingsError(getApiErrorMessage(err, "Sozlamalarni saqlashda xatolik yuz berdi"));
    } finally {
      setSavingSettings(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
        <span className="text-studio-400 font-medium">{t('common.loading')}</span>
      </div>
    );
  }

  if (!clan) {
    return (
      <div className="min-h-[70vh] max-w-lg mx-auto px-4 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
        <h2 className="text-2xl font-bold text-white mb-2">{t('common.notFound')}</h2>
        <Link to="/clans" className="text-brand-400 font-bold text-sm">
          Klanlar ro'yxatiga qaytish
        </Link>
      </div>
    );
  }

  const isLeaderOrCoLeader = clan.my_role === 'leader' || clan.my_role === 'co_leader';
  const xpPercentage = Math.min(100, Math.floor((clan.xp / (clan.required_xp || 1)) * 100));

  return (
    <div className="min-h-screen bg-studio-950 pb-20">
      {/* Banner */}
      <div className="relative w-full h-64 sm:h-72 bg-gradient-to-r from-purple-950 via-studio-900 to-indigo-950 border-b border-studio-800 overflow-hidden">
        {clan.banner_url ? (
          <img
            src={clan.banner_url}
            alt={clan.name}
            className="w-full h-full object-cover filter brightness-70"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-purple-900/60 to-indigo-950/60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-studio-950 via-transparent to-black/40" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20">
        {/* Clan Card Header */}
        <div className="bg-studio-900/95 backdrop-blur-xl border border-studio-800 rounded-3xl p-6 sm:p-8 shadow-2xl mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <AvatarFrame
                username={clan.name}
                avatarUrl={clan.avatar_url || undefined}
                frameUrl={clan.frame_url}
                size="xl"
                className="shrink-0 drop-shadow-2xl"
              />

              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-extrabold border border-purple-500/40 font-mono">
                    [{clan.tag}]
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-white">{clan.name}</h1>
                  <span className="px-3 py-1 rounded-full bg-brand-500/15 text-brand-400 font-bold text-xs border border-brand-500/30">
                    Daraja {clan.level}
                  </span>
                </div>

                <p className="text-studio-300 text-sm max-w-xl mb-3">
                  {clan.description || "Ushbu klan haqida ma'lumot kiritilmagan"}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-studio-400">
                  <span className="flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Yetakchi: <Link to={`/users/${clan.leader_username}`} className="text-white hover:text-brand-400 font-bold">{clan.leader_username}</Link></span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>A'zolar: <strong className="text-white">{clan.member_count}</strong> / {clan.max_members}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Actions (Join / Settings / Leave) */}
            <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
              {!clan.my_role ? (
                <button
                  onClick={handleJoinClan}
                  disabled={actionLoading || !clan.is_recruiting || clan.member_count >= clan.max_members}
                  className="px-6 py-3 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-studio-950 font-black rounded-xl shadow-glow-brand transition-all flex items-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>{t('clans.joinClan')}</span>
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-xs">
                    Rolingiz: {clan.my_role.toUpperCase()}
                  </span>

                  {isLeaderOrCoLeader && (
                    <button
                      onClick={handleOpenSettingsModal}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Klan Sozlamalari & Bezaklar</span>
                    </button>
                  )}

                  <button
                    onClick={handleLeaveClan}
                    disabled={actionLoading}
                    title="Klandan chiqish"
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors border border-rose-500/20"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {actionError && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          {actionSuccess && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Clan XP Leveling & Progression Bar */}
          <div className="mt-8 pt-6 border-t border-studio-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-studio-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                  <span>{t('clans.xpProgress')}</span>
                </span>
                <div className="text-sm font-black text-white mt-0.5">
                  {clan.xp} / {clan.required_xp} XP ({xpPercentage}%)
                </div>
              </div>

              {/* Upgrade Button (visible for Leader & Co-Leader) */}
              {isLeaderOrCoLeader && (
                <div>
                  {clan.can_upgrade ? (
                    <button
                      onClick={handleUpgradeLevel}
                      disabled={actionLoading}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-brand-500 hover:from-amber-400 hover:to-brand-400 text-studio-950 font-black text-xs rounded-xl shadow-glow-brand transition-all flex items-center gap-2 animate-bounce-subtle"
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                      <span>{t('clans.upgradeLevel')} ({clan.upgrade_cost_coins} ⚡)</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-studio-400 bg-studio-950 px-3.5 py-2 rounded-xl border border-studio-800">
                      <Info className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Keyingi darajaga: {clan.upgrade_cost_coins} ⚡ (XP to'lishi kutilmoqda)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Progress Bar Track */}
            <div className="w-full h-3 bg-studio-950 rounded-full overflow-hidden border border-studio-800">
              <div
                className={`h-full transition-all duration-500 ${
                  clan.can_upgrade
                    ? 'bg-gradient-to-r from-amber-400 to-brand-400 shadow-glow-brand'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                }`}
                style={{ width: `${xpPercentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-studio-500 mt-2 font-mono">
              <span>{clan.next_level_perks || "Boblar mutolaasi orqali har bir bob uchun +25 XP qo'shiladi"}</span>
              <span>Keyingi sig'im: {clan.next_level_max_members || clan.max_members} kishi</span>
            </div>
          </div>
        </div>

        {/* 2 Main Tabs: Clan Chat & Clan Members */}
        <div className="flex border-b border-studio-800 mb-6 gap-6">
          <button
            onClick={() => setActiveTab('chat')}
            className={`pb-3 font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'chat'
                ? 'text-white border-brand-500'
                : 'text-studio-400 border-transparent hover:text-studio-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t('clans.chatTab')}</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'members'
                ? 'text-white border-brand-500'
                : 'text-studio-400 border-transparent hover:text-studio-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('clans.membersTab')} ({members.length})</span>
          </button>
        </div>

        {/* Tab 1: Real-time Clan Chat */}
        {activeTab === 'chat' && (
          <div className="bg-studio-900 border border-studio-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
            {/* Chat Messages Log */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
              {!clan.my_role ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <Shield className="w-12 h-12 text-studio-600 mb-3" />
                  <h4 className="text-white font-bold text-base mb-1">Klan ichki chati</h4>
                  <p className="text-studio-400 text-xs max-w-sm mb-4">
                    Klan a'zolari bilan real vaqtda suhbatlashish uchun avval klanga a'zo bo'ling.
                  </p>
                  <button
                    onClick={handleJoinClan}
                    className="px-5 py-2 bg-brand-500 text-studio-950 font-bold text-xs rounded-xl"
                  >
                    Klanga qo'shilish
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-studio-500 text-sm">
                  Klan chatida hali xabarlar yo'q. Birinchi bo'lib salom yo'llang!
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isSystem = msg.message_type === 'system';
                  const isMe = msg.user_id === currentUser?.id;

                  if (isSystem) {
                    return (
                      <div key={msg.id || index} className="flex justify-center my-2">
                        <div className="px-4 py-1.5 rounded-full bg-studio-950 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>{msg.content}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id || index}
                      className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                    >
                      <AvatarFrame
                        username={msg.username || 'User'}
                        avatarUrl={msg.avatar_url}
                        frameUrl={msg.active_frame_svg}
                        size="sm"
                      />

                      <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            to={`/users/${msg.username}`}
                            className="font-bold text-xs text-studio-200 hover:text-brand-400"
                          >
                            {msg.username}
                          </Link>

                          {msg.role === 'leader' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                              Yetakchi
                            </span>
                          )}
                          {msg.role === 'co_leader' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                              O'rinbosar
                            </span>
                          )}

                          <span className="text-[10px] text-studio-500">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMe
                              ? 'bg-brand-500 text-studio-950 font-medium rounded-tr-none'
                              : 'bg-studio-800 text-white rounded-tl-none border border-studio-700'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            {/* Chat Input Field */}
            {clan.my_role && (
              <form onSubmit={handleSendMessage} className="p-4 bg-studio-950 border-t border-studio-800 flex items-center gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={t('clans.sendMessage')}
                  maxLength={500}
                  className="flex-1 px-4 py-3 bg-studio-900 border border-studio-800 rounded-2xl text-white placeholder-studio-500 focus:outline-none focus:border-brand-500 text-sm shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isSending}
                  className="px-5 py-3 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-studio-950 font-bold rounded-2xl shadow-glow-brand transition-all flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Clan Members */}
        {activeTab === 'members' && (
          <div className="bg-studio-900 border border-studio-800 rounded-3xl p-6 shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="bg-studio-950/80 border border-studio-800 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-studio-700 transition-all"
                >
                  <Link
                    to={`/users/${member.username}`}
                    className="flex items-center gap-3 min-w-0"
                  >
                    <AvatarFrame
                      username={member.username}
                      avatarUrl={member.avatar_url}
                      frameUrl={member.active_frame?.asset_url}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate hover:text-brand-400">
                          {member.username}
                        </span>
                        {member.role === 'leader' && (
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-studio-400 flex items-center gap-2 mt-0.5">
                        <span className="capitalize font-medium text-[11px] text-purple-300">
                          {member.role}
                        </span>
                        <span>•</span>
                        <span className="text-brand-400 font-mono text-[11px]">
                          {member.contribution_points} XP
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Kick Action for Leader/Co-Leader */}
                  {isLeaderOrCoLeader && member.user_id !== currentUser?.id && member.role !== 'leader' && (
                    <button
                      onClick={() => handleKickMember(member.user_id, member.username)}
                      title={t('clans.kickMember')}
                      className="p-2 text-studio-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clan Customization & Settings Modal (Leader & Co-Leader) */}
      {isSettingsModalOpen && clan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-studio-900 border border-studio-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-studio-800 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Klan Bezaklari & Sozlamalari</h3>
                  <p className="text-xs text-studio-400">Klan ramkasi, fon rasmi va ma'lumotlarini sozlash</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 rounded-xl text-studio-400 hover:text-white hover:bg-studio-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {settingsError && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{settingsError}</span>
              </div>
            )}

            {settingsSuccess && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            {/* LIVE PREVIEW BOX */}
            <div className="mb-6 rounded-2xl border border-studio-800 p-4 bg-studio-950 relative overflow-hidden shadow-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-studio-400 block mb-2">
                Jonli Ko'rinish (Live Preview):
              </span>
              <div className="relative rounded-xl overflow-hidden p-4 sm:p-6 min-h-[120px] flex items-center gap-4">
                {/* Banner backdrop preview */}
                {editBanner && (
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                    style={{ backgroundImage: `url(${editBanner})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-studio-950/95 via-studio-950/80 to-studio-950/60" />
                  </div>
                )}
                <div className="relative z-10 flex items-center gap-4">
                  <AvatarFrame
                    username={clan.name}
                    avatarUrl={editAvatar || undefined}
                    frameUrl={editFrame}
                    size="lg"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-extrabold border border-purple-500/40 font-mono">
                        [{clan.tag}]
                      </span>
                      <h4 className="text-lg font-black text-white">{clan.name}</h4>
                    </div>
                    <p className="text-xs text-studio-300 mt-0.5 line-clamp-1">
                      {editDesc || clan.description || "Klan tavsifi..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* 1. CLAN RAMKASI (AVATAR FRAME) */}
              <div>
                <label className="block text-xs font-bold text-studio-300 uppercase tracking-wider mb-2">
                  1. Klan Ramkasi (Avatar Frame)
                </label>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="file"
                    ref={frameFileInputRef}
                    onChange={handleUploadClanFrame}
                    accept=".svg,.png,.webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => frameFileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="px-3.5 py-2 rounded-xl bg-studio-800 hover:bg-studio-700 text-xs font-bold text-studio-200 border border-studio-700 hover:border-purple-500/50 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-purple-400" />
                    <span>O'z ramkangizni yuklash (SVG / PNG)</span>
                  </button>
                  {editFrame && <button type="button" onClick={() => setEditFrame(null)} className="text-xs text-studio-400 hover:text-white">Ramkani olib tashlash</button>}
                  {uploadingFile && <span className="text-xs text-purple-400 animate-pulse">Yuklanmoqda...</span>}
                </div>
              </div>

              {/* 2. CLAN BACKGROUND (FON / BANNER) */}
              <div>
                <label className="block text-xs font-bold text-studio-300 uppercase tracking-wider mb-2">
                  2. Klan Foni (Background Banner)
                </label>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="file"
                    ref={bannerFileInputRef}
                    onChange={handleUploadClanBanner}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="px-3.5 py-2 rounded-xl bg-studio-800 hover:bg-studio-700 text-xs font-bold text-studio-200 border border-studio-700 hover:border-purple-500/50 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-purple-400" />
                    <span>O'z fon rasmingizni yuklash (JPG / PNG)</span>
                  </button>
                  {editBanner && <button type="button" onClick={() => setEditBanner(null)} className="text-xs text-studio-400 hover:text-white">Fonni olib tashlash</button>}
                  {uploadingFile && <span className="text-xs text-purple-400 animate-pulse">Yuklanmoqda...</span>}
                </div>
              </div>

              {/* 3. CLAN AVATAR (LOGO) */}
              <div>
                <label className="block text-xs font-bold text-studio-300 uppercase tracking-wider mb-2">
                  3. Klan Logosi (Avatar)
                </label>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="file"
                    ref={avatarFileInputRef}
                    onChange={handleUploadClanAvatar}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="px-3.5 py-2 rounded-xl bg-studio-800 hover:bg-studio-700 text-xs font-bold text-studio-200 border border-studio-700 hover:border-purple-500/50 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-purple-400" />
                    <span>O'z logongizni yuklash (JPG / PNG / SVG)</span>
                  </button>
                  {editAvatar && <button type="button" onClick={() => setEditAvatar('')} className="text-xs text-studio-400 hover:text-white">Logoni olib tashlash</button>}
                  {uploadingFile && <span className="text-xs text-purple-400 animate-pulse">Yuklanmoqda...</span>}
                </div>
              </div>

              {/* 4. CLAN TAVSIFI & A'ZO QABULI */}
              <div className="space-y-3 pt-2 border-t border-studio-800">
                <div>
                  <label className="block text-xs font-bold text-studio-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Klan Tavsifi (Description)</span>
                    <span className="text-[10px] text-studio-500 font-mono">{editDesc.length}/500</span>
                  </label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Klaningiz haqida, maqsad va qoidalar..."
                    className="w-full px-3.5 py-2.5 bg-studio-950 border border-studio-800 rounded-xl text-xs text-white placeholder-studio-500 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-studio-950 border border-studio-800">
                  <div>
                    <span className="text-xs font-bold text-white block">Yangi a'zolarni qabul qilish</span>
                    <span className="text-[11px] text-studio-400">
                      {editRecruiting ? "Ochiq: Boshqa o'quvchilar qo'shilishi mumkin" : "Yopiq: Yangi a'zolar qabul qilinmaydi"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditRecruiting(!editRecruiting)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      editRecruiting ? 'bg-purple-600' : 'bg-studio-800'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        editRecruiting ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-studio-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-studio-400 hover:text-white"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {savingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Bezaklarni saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
