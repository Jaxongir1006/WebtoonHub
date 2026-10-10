import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { clansApi } from '../api/clans';
import { ClanDetail, ClanMemberItem, ClanMessageItem } from '../types';
import { AvatarFrame } from '../components/common/AvatarFrame';
import { ProfileWallpaper } from '../components/common/ProfileWallpaper';
import { ClanShopPanel } from '../components/clans/ClanShopPanel';
import { getApiErrorMessage } from '../api/client';
import { Modal } from '../components/common/Modal';
import {
  Shield,
  Users,
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
  Upload,
  Store
} from 'lucide-react';

export const ClanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const clanId = parseInt(id || '0', 10);
  const { user: currentUser, isAuthenticated, isLoading: authLoading, openAuthModal, updateCoinsLocally, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [clan, setClan] = useState<ClanDetail | null>(null);
  const [members, setMembers] = useState<ClanMemberItem[]>([]);
  const [messages, setMessages] = useState<ClanMessageItem[]>([]);
  const messagesRef = useRef(messages); messagesRef.current = messages;
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'shop'>('chat');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Settings & Customization modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [editDesc, setEditDesc] = useState<string>('');
  const [editAvatar, setEditAvatar] = useState<string>('');
  const [editRecruiting, setEditRecruiting] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Chat message input
  const [chatInput, setChatInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesPaneRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const sendLock = useRef(false);
  const draftMessage = useRef<{ content: string; id: string } | null>(null);
  const chatScope = useRef(0);
  const actionLock = useRef(false);
  const loadRequest = useRef(0);
  const entityIdentity = useRef('');
  entityIdentity.current = `${clanId}:${currentUser?.id ?? "guest"}`;
  const [connectionState, setConnectionState] = useState<'connecting' | 'online' | 'reconnecting'>('connecting');
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [newMessages, setNewMessages] = useState(false);

  const loadClanData = async () => {
    if (!clanId) { setIsLoading(false); return; }
    const request = ++loadRequest.current;
    const identity = entityIdentity.current;
    if (!clan) setIsLoading(true);
    setActionError(null);
    try {
      const [clanRes, membersRes] = await Promise.all([
        clansApi.getClanDetail(clanId),
        clansApi.getClanMembers(clanId),
      ]);
      if (request !== loadRequest.current || identity !== entityIdentity.current) return;
      setClan(clanRes.data);
      setMembers(membersRes.data || []);
    } catch (err) {
      if (request === loadRequest.current && identity === entityIdentity.current) setActionError(getApiErrorMessage(err, t('socialFix.loadFailed')));
    } finally {
      if (request === loadRequest.current && identity === entityIdentity.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    setClan(null); setMembers([]); setActionSuccess(null); setIsSettingsModalOpen(false); setIsLoading(true); setActiveTab('chat');
    setUploadingFile(false); setSavingSettings(false); setSettingsError(null); setSettingsSuccess(null);
    if (!authLoading) loadClanData();
    return () => { loadRequest.current++; };
  }, [clanId, currentUser?.id, authLoading]);

  useEffect(() => {
    if (!clan?.my_role) setActiveTab('chat');
  }, [clan?.my_role]);

  const mergeMessages = (previous: ClanMessageItem[], incoming: ClanMessageItem[]) => {
    const unique = new Map(previous.map(message => [message.id > 0 ? String(message.id) : `${message.created_at}:${message.content}`, message]));
    for (const message of incoming) unique.set(message.id > 0 ? String(message.id) : `${message.created_at}:${message.content}`, message);
    return [...unique.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id - b.id);
  };

  const scrollToBottom = (force = false) => {
    if (!force && !atBottom.current) { setNewMessages(true); return; }
    requestAnimationFrame(() => {
      const pane = messagesPaneRef.current;
      if (pane) pane.scrollTop = pane.scrollHeight;
      setNewMessages(false);
    });
  };

  useEffect(() => {
    chatScope.current++;
    draftMessage.current = null; sendLock.current = false; setIsSending(false); setChatInput('');
    setMessages([]); setNewMessages(false); setChatError(null); setOlderLoading(false); setHasOlder(false); setChatLoading(false); atBottom.current = true;
    if (!clanId || !clan?.my_role) return;
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    // Advance only the REST cursor. A newer socket message must not skip a missing range.
    let restCursor: number | undefined;
    let initialized = false;
    let catchUpFlight: Promise<void> | null = null;
    const catchUp = () => {
      if (catchUpFlight) return catchUpFlight;
      catchUpFlight = (async () => {
        if (!initialized) setChatLoading(true);
        try {
          let more = false; let receivedNew = false;
          do {
            const result = await clansApi.getClanMessages(clanId, 50, undefined, initialized ? restCursor ?? 0 : undefined);
            if (disposed) return;
            const batch = result.data || [];
            if (batch.some(message => !messagesRef.current.some(known => known.id === message.id))) receivedNew = true;
            setMessages(previous => mergeMessages(previous, batch));
            if (!initialized) setHasOlder(result.has_more ?? result.pagination?.has_more ?? batch.length === 50);
            const next = batch.reduce((highest, message) => Math.max(highest, message.id), restCursor ?? 0);
            more = initialized && (result.has_more ?? result.pagination?.has_more ?? false) && next > (restCursor ?? 0);
            restCursor = next; initialized = true;
          } while (more && !disposed);
          setChatError(null); if (receivedNew) scrollToBottom();
        } catch (error) { if (!disposed) setChatError(getApiErrorMessage(error, t('socialFix.loadFailed'))); }
        finally { catchUpFlight = null; if (!disposed) setChatLoading(false); }
      })();
      return catchUpFlight;
    };
    const connect = () => {
      if (disposed) return;
      const token = localStorage.getItem('webtoonhub_access_token');
      if (!token) { setConnectionState('reconnecting'); return; }
      const apiBase = new URL(import.meta.env.VITE_API_URL || '/api/v1', window.location.origin);
      const protocol = apiBase.protocol === 'https:' ? 'wss:' : 'ws:';
      const path = `${apiBase.pathname.replace(/\/$/, '')}/clans/${clanId}/chat/ws`;
      const socket = new WebSocket(`${protocol}//${apiBase.host}${path}?token=${encodeURIComponent(token)}`);
      wsRef.current = socket;
      socket.onopen = () => { if (disposed) return; attempts = 0; setConnectionState('online'); catchUp(); };
      socket.onmessage = event => {
        if (disposed) return;
        try {
          const message: ClanMessageItem = JSON.parse(event.data);
          if (typeof message.content !== 'string' || !message.created_at) return;
          setMessages(previous => mergeMessages(previous, [message])); scrollToBottom();
        } catch { setChatError(t('socialFix.loadFailed')); }
      };
      socket.onclose = event => {
        if (disposed) return;
        setConnectionState('reconnecting');
        if (event.code === 1008 || event.code === 4003) { loadClanData(); }
        retry = setTimeout(async () => { await refreshProfile().catch(() => undefined); if (!disposed) connect(); }, Math.min(30000, 1000 * 2 ** attempts++));
      };
      socket.onerror = () => { if (!disposed) setConnectionState('reconnecting'); };
    };
    setConnectionState('connecting'); catchUp(); connect();
    const onOnline = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) { catchUp(); return; }
      if (wsRef.current?.readyState === WebSocket.CONNECTING) return;
      if (retry) clearTimeout(retry);
      connect();
    };
    const onVisible = () => { if (document.visibilityState === 'visible') catchUp(); };
    const poll = setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine) catchUp(); }, 15000);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => { disposed = true; chatScope.current++; if (retry) clearTimeout(retry); clearInterval(poll); wsRef.current?.close(); wsRef.current = null; window.removeEventListener('online', onOnline); document.removeEventListener('visibilitychange', onVisible); };
  }, [clanId, clan?.my_role, currentUser?.id]);

  const loadOlderMessages = async () => {
    if (olderLoading) return;
    const before = messages.filter(message => message.id > 0).reduce((min, message) => Math.min(min, message.id), Infinity);
    if (!Number.isFinite(before)) return;
    setOlderLoading(true);
    const scope = chatScope.current;
    const pane = messagesPaneRef.current;
    const oldHeight = pane?.scrollHeight || 0;
    const oldTop = pane?.scrollTop || 0;
    try {
      const result = await clansApi.getClanMessages(clanId, 50, before);
      if (scope !== chatScope.current) return;
      setMessages(previous => mergeMessages(previous, result.data || []));
      setHasOlder((result.data?.length || 0) === 50);
      requestAnimationFrame(() => { if (pane) pane.scrollTop = oldTop + pane.scrollHeight - oldHeight; });
    } catch (error) { if (scope === chatScope.current) setChatError(getApiErrorMessage(error, t('socialFix.loadFailed'))); }
    finally { if (scope === chatScope.current) setOlderLoading(false); }
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || sendLock.current) return;
    sendLock.current = true; setIsSending(true); setChatError(null);
    const scope = chatScope.current;
    if (draftMessage.current?.content !== text) draftMessage.current = { content: text, id: crypto.randomUUID() };
    try {
      const result = await clansApi.sendClanMessage(clanId, text, draftMessage.current.id);
      if (scope !== chatScope.current) return;
      if (result.data) setMessages(previous => mergeMessages(previous, [result.data]));
      setChatInput(previous => previous.trim() === text ? '' : previous);
      draftMessage.current = null;
      atBottom.current = true; scrollToBottom(true);
    } catch (error) { if (scope === chatScope.current) setChatError(getApiErrorMessage(error, t('socialFix.sendFailed'))); }
    finally { if (scope === chatScope.current) { sendLock.current = false; setIsSending(false); } }
  };

  // Join Clan
  const handleJoinClan = async () => {
    const identity = entityIdentity.current;
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (actionLock.current) return;
    actionLock.current = true; setActionLoading(true);
    setActionError(null);
    try {
      const res = await clansApi.joinClan(clanId);
      if (identity !== entityIdentity.current) return;
      setActionSuccess(t('socialFix.clanJoined'));
      if (identity !== entityIdentity.current) return;
      await loadClanData();
      if (identity !== entityIdentity.current) return;
      await refreshProfile().catch(() => undefined);
    } catch (err) {
      if (identity === entityIdentity.current) setActionError(getApiErrorMessage(err, t('common.error')));
    } finally {
      actionLock.current = false; setActionLoading(false);
    }
  };

  // Leave Clan
  const handleLeaveClan = async () => {
    const identity = entityIdentity.current;
    if (clan?.my_role === 'leader' && members.length > 1) { setActionError(t('socialFix.transferHint')); setActiveTab('members'); return; }
    if (!window.confirm(t(clan?.my_role === 'leader' ? 'socialFix.confirmDisband' : 'socialFix.confirmLeave'))) return;
    if (actionLock.current) return;
    actionLock.current = true; setActionLoading(true);
    setActionError(null);
    try {
      const res = await clansApi.leaveClan(clanId);
      if (identity !== entityIdentity.current) return;
      setActionSuccess(t('socialFix.saved'));
      if (identity !== entityIdentity.current) return;
      await refreshProfile().catch(() => undefined);
      if (identity === entityIdentity.current) navigate('/clans');
    } catch (err) {
      if (identity === entityIdentity.current) setActionError(getApiErrorMessage(err, t('common.error')));
    } finally {
      actionLock.current = false; setActionLoading(false);
    }
  };

  // Kick member
  const handleKickMember = async (userId: number, username: string) => {
    const identity = entityIdentity.current;
    if (!window.confirm(t('socialFix.kickConfirm', { name: username }))) return;
    if (actionLock.current) return;
    actionLock.current = true; setActionLoading(true);
    try {
      await clansApi.kickMember(clanId, userId);
      if (identity !== entityIdentity.current) return;
      await loadClanData();
      if (identity !== entityIdentity.current) return;
      setActionSuccess(t('socialFix.kicked', { name: username }));
    } catch (err) {
      if (identity === entityIdentity.current) setActionError(getApiErrorMessage(err, t('common.error')));
    } finally {
      actionLock.current = false; setActionLoading(false);
    }
  };

  const handleTransferLeadership = async (member: ClanMemberItem) => {
    const identity = entityIdentity.current;
    if (actionLock.current || !window.confirm(t('socialFix.confirmTransfer', { name: member.username }))) return;
    actionLock.current = true; setActionLoading(true); setActionError(null);
    try { await clansApi.transferLeadership(clanId, member.user_id); if (identity !== entityIdentity.current) return; await loadClanData(); if (identity !== entityIdentity.current) return; await refreshProfile().catch(() => undefined); }
    catch (error) { if (identity === entityIdentity.current) setActionError(getApiErrorMessage(error, t('common.error'))); }
    finally { actionLock.current = false; setActionLoading(false); }
  };

  // Upgrade clan level
  const handleUpgradeLevel = async () => {
    const identity = entityIdentity.current;
    if (!clan || actionLock.current) return;
    if (!clan.can_upgrade) {
      if (identity === entityIdentity.current) setActionError(t('clans.fullXpRequired'));
      return;
    }

    if (!window.confirm(t('socialFix.upgradeConfirm', { cost: clan.upgrade_cost_coins }))) {
      return;
    }

    actionLock.current = true; setActionLoading(true);
    setActionError(null);
    try {
      const res = await clansApi.upgradeClanLevel(clanId, clan.upgrade_cost_coins);
      if (identity !== entityIdentity.current) return;
      updateCoinsLocally(res.data.remaining_coins);
      setActionSuccess(t('clans.upgradeSuccess'));
      if (identity !== entityIdentity.current) return;
      await refreshProfile().catch(() => undefined);
      if (identity !== entityIdentity.current) return;
      await loadClanData();
    } catch (err) {
      if (identity === entityIdentity.current) setActionError(getApiErrorMessage(err, t('common.error')));
    } finally {
      actionLock.current = false; setActionLoading(false);
    }
  };

  const handleUploadClanAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const identity = entityIdentity.current;
    const file = e.target.files?.[0];
    if (!file || !clan || uploadingFile || savingSettings) return;
    setUploadingFile(true);
    setSettingsError(null);
    try {
      const res = await clansApi.uploadClanAvatar(clan.id, file);
      if (identity !== entityIdentity.current) return;
      if (res.data?.avatar_url) {
        setEditAvatar(res.data.avatar_url);
        setSettingsSuccess(t('clanShop.logoUpdated'));
        await loadClanData();
      }
    } catch (err) {
      if (identity === entityIdentity.current) setSettingsError(getApiErrorMessage(err, t('common.error')));
    } finally {
      if (identity === entityIdentity.current) setUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleOpenSettingsModal = () => {
    if (!clan || savingSettings || uploadingFile) return;
    setEditDesc(clan.description || '');
    setEditAvatar(clan.avatar_url || '');
    setEditRecruiting(clan.is_recruiting);
    setSettingsError(null);
    setSettingsSuccess(null);
    setIsSettingsModalOpen(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    const identity = entityIdentity.current;
    e.preventDefault();
    if (!clan || savingSettings || uploadingFile) return;
    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      const res = await clansApi.updateClan(clan.id, {
        description: editDesc.trim(),
        avatar_url: editAvatar || '',
        is_recruiting: editRecruiting,
      });
      if (identity !== entityIdentity.current) return;

      if (identity === entityIdentity.current) setSettingsSuccess(t('socialFix.saved'));
      if (identity !== entityIdentity.current) return;
      await loadClanData();
      setTimeout(() => {
        if (identity === entityIdentity.current) setIsSettingsModalOpen(false);
      }, 900);
    } catch (err) {
      if (identity === entityIdentity.current) setSettingsError(getApiErrorMessage(err, t('common.error')));
    } finally {
      if (identity === entityIdentity.current) setSavingSettings(false);
    }
  };

  if (isLoading || authLoading) {
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
        <h2 className="text-2xl font-bold text-white mb-2">{actionError || t('common.notFound')}</h2>
        <button onClick={loadClanData} className="my-4 px-4 py-3 rounded-xl bg-brand-500 text-studio-950">{t('socialFix.retry')}</button>
        <Link to="/clans" className="text-brand-400 font-bold text-sm">
          {t('socialFix.backToClans')}
        </Link>
      </div>
    );
  }

  const roleLabel = (role: string) => t(`socialFix.${role === 'co_leader' ? 'coLeader' : role}`);
  const isLeaderOrCoLeader = clan.my_role === 'leader' || clan.my_role === 'co_leader';
  const xpPercentage = Math.min(100, Math.floor((clan.xp / (clan.required_xp || 1)) * 100));

  return (
    <ProfileWallpaper background={clan.active_background}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 relative z-20">
        {/* Clan Card Header */}
        <div className="profile-panel bg-studio-900/95 backdrop-blur-xl border border-studio-800 rounded-3xl p-6 sm:p-8 shadow-2xl mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div data-clan-avatar className="shrink-0"><AvatarFrame
                username={clan.name}
                avatarUrl={clan.avatar_url || undefined}
                frameUrl={clan.frame_url}
                size="xl"
                className="shrink-0 drop-shadow-2xl"
              /></div>

              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-extrabold border border-purple-500/40 font-mono">
                    [{clan.tag}]
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-white [overflow-wrap:anywhere]">{clan.name}</h1>
                  <span className="px-3 py-1 rounded-full bg-brand-500/15 text-brand-400 font-bold text-xs border border-brand-500/30">
                    {t('socialFix.level', { level: clan.level })}
                  </span>
                </div>

                <p className="text-studio-300 text-sm max-w-xl mb-3 [overflow-wrap:anywhere]">
                  {clan.description || t('socialFix.noClanDesc')}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-studio-400">
                  <span className="flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('socialFix.leader')}: <Link to={`/users/${clan.leader_username}`} className="text-white hover:text-brand-400 font-bold">{clan.leader_username}</Link></span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t('socialFix.members')}: <strong className="text-white">{clan.member_count}</strong> / {clan.max_members}</span>
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
                    {t('socialFix.role', { role: roleLabel(clan.my_role) })}
                  </span>

                  {isLeaderOrCoLeader && (
                    <button
                      onClick={handleOpenSettingsModal}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>{t('socialFix.clanSettings')}</span>
                    </button>
                  )}

                  <button
                    onClick={handleLeaveClan}
                    disabled={actionLoading}
                    title={t(clan.my_role === 'leader' && members.length === 1 ? 'socialFix.disband' : 'socialFix.leaveClan')} aria-label={t(clan.my_role === 'leader' && members.length === 1 ? 'socialFix.disband' : 'socialFix.leaveClan')}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors border border-rose-500/20"
                  >
                    <LogOut className="w-4 h-4" /><span>{t(clan.my_role === 'leader' && members.length === 1 ? 'socialFix.disband' : 'socialFix.leaveClan')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          {!clan.my_role && (!clan.is_recruiting || clan.member_count >= clan.max_members) && <p className="mt-4 text-sm text-studio-300">{t(clan.member_count >= clan.max_members ? 'socialFix.full' : 'socialFix.closed')}</p>}

          {/* Feedback messages */}
          {actionError && (
            <div role="alert" className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          {actionSuccess && (
            <div role="status" className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
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
                        {clan.has_next_level === false ? t('socialFix.maxLevel') : (currentUser?.lightning_coins ?? 0) < clan.upgrade_cost_coins ? t('socialFix.needCoins', { amount: clan.upgrade_cost_coins - (currentUser?.lightning_coins ?? 0) }) : t('socialFix.waitingXp')}
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
              <span>{clan.next_level_perks || t('socialFix.xpHint')}</span>
              <span>{t('socialFix.nextCapacity', { count: clan.next_level_max_members ?? clan.max_members })}</span>
            </div>
          </div>
        </div>

        {/* 2 Main Tabs: Clan Chat & Clan Members */}
        <div className="profile-panel flex flex-wrap rounded-2xl border border-studio-800 bg-studio-900 px-4 pt-3 mb-6 gap-x-6 gap-y-2">
          <button
            aria-pressed={activeTab === 'chat'} onClick={() => setActiveTab('chat')}
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
            aria-pressed={activeTab === 'members'} onClick={() => setActiveTab('members')}
            className={`pb-3 font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'members'
                ? 'text-white border-brand-500'
                : 'text-studio-400 border-transparent hover:text-studio-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('clans.membersTab')} ({members.length})</span>
          </button>
          {clan.my_role && (
            <button
              type="button"
              aria-pressed={activeTab === 'shop'}
              onClick={() => setActiveTab('shop')}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold tracking-wide ${activeTab === 'shop' ? 'border-brand-500 text-white' : 'border-transparent text-studio-300 hover:text-white'}`}
            >
              <Store className="h-4 w-4" />{t('clanShop.tab')}
            </button>
          )}
        </div>

        {activeTab === 'shop' && clan.my_role && <ClanShopPanel clan={clan} onAppearanceChange={loadClanData} />}

        {/* Tab 1: Real-time Clan Chat */}
        {activeTab === 'chat' && (
          <div className="profile-panel bg-studio-900 border border-studio-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[min(600px,80dvh)] min-h-[300px]">
            {/* Chat Messages Log */}
            <div role="status" className="px-4 pt-3 text-xs text-studio-300">{clan.my_role && t(`socialFix.${connectionState}`)}</div>
            {chatError && <p role="alert" className="p-4 text-rose-400 text-sm">{chatError}</p>}
            <div ref={messagesPaneRef} onScroll={() => { const pane = messagesPaneRef.current; if (pane) { atBottom.current = pane.scrollHeight - pane.scrollTop - pane.clientHeight < 80; if (atBottom.current) setNewMessages(false); } }} className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto space-y-4">
              {clan.my_role && hasOlder && <button disabled={olderLoading} onClick={loadOlderMessages} className="w-full py-3 text-sm text-brand-400">{olderLoading ? t('common.loading') : t('socialFix.olderMessages')}</button>}
              {!clan.my_role ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <Shield className="w-12 h-12 text-studio-600 mb-3" />
                  <h4 className="text-white font-bold text-base mb-1">{t('socialFix.clanChat')}</h4>
                  <p className="text-studio-400 text-xs max-w-sm mb-4">
                    {t('socialFix.joinChat')}
                  </p>
                  <button
                    onClick={handleJoinClan}
                    disabled={actionLoading || !clan.is_recruiting || clan.member_count >= clan.max_members}
                    className="px-5 py-2 bg-brand-500 text-studio-950 font-bold text-xs rounded-xl"
                  >
                    {t('clans.joinClan')}
                  </button>
                </div>
              ) : chatLoading && messages.length === 0 ? <p role="status">{t('common.loading')}</p> : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-studio-500 text-sm">
                  {t('socialFix.emptyChat')}
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
                        username={msg.username || t('socialFix.reader')}
                        avatarUrl={msg.avatar_url}
                        frameUrl={msg.active_frame_svg}
                        size="sm"
                      />

                      <div className={`min-w-0 max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            to={`/users/${msg.username}`}
                            className="font-bold text-xs text-studio-200 hover:text-brand-400"
                          >
                            {msg.username}
                          </Link>

                          {msg.role === 'leader' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                              {t('socialFix.leader')}
                            </span>
                          )}
                          {msg.role === 'co_leader' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                              {t('socialFix.coLeader')}
                            </span>
                          )}

                          <span className="text-[10px] text-studio-500">
                            {new Date(msg.created_at).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap ${
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

            {newMessages && <button onClick={() => { atBottom.current = true; scrollToBottom(true); }} className="py-3 text-brand-400">{t('socialFix.newMessages')}</button>}
            {/* Chat Input Field */}
            {clan.my_role && (
              <form onSubmit={handleSendMessage} className="p-4 bg-studio-950 border-t border-studio-800 flex items-center gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={t('clans.sendMessage')}
                  maxLength={500}
                  aria-label={t('clans.sendMessage')} className="min-w-0 flex-1 px-4 py-3 bg-studio-900 border border-studio-800 rounded-2xl text-white placeholder-studio-500 focus:outline-none focus:border-brand-500 text-sm shadow-inner"
                />
                <button
                  type="submit"
                  aria-label={t('socialFix.send')} disabled={!chatInput.trim() || isSending}
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
          <div className="profile-panel bg-studio-900 border border-studio-800 rounded-3xl p-6 shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="bg-studio-950/80 border border-studio-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 hover:border-studio-700 transition-all"
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
                          {roleLabel(member.role)}
                        </span>
                        <span>•</span>
                        <span className="text-brand-400 font-mono text-[11px]">
                          {member.contribution_points} XP
                        </span>
                      </div>
                    </div>
                  </Link>

                  {clan.my_role === 'leader' && member.user_id !== currentUser?.id && <button disabled={actionLoading} onClick={() => handleTransferLeadership(member)} className="text-xs px-3 py-2 text-brand-400">{t('socialFix.transfer')}</button>}
                  {/* Kick Action for Leader/Co-Leader */}
                  {isLeaderOrCoLeader && member.user_id !== currentUser?.id && member.role !== 'leader' && (
                    <button
                      disabled={actionLoading} aria-label={t('clans.kickMember')} onClick={() => handleKickMember(member.user_id, member.username)}
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
        <Modal isOpen={isSettingsModalOpen} onClose={() => { if (!savingSettings && !uploadingFile) setIsSettingsModalOpen(false); }} title={t('socialFix.clanSettings')} maxWidth="2xl">
          <div className="w-full">
            {settingsError && (
              <div role="alert" className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{settingsError}</span>
              </div>
            )}

            {settingsSuccess && (
              <div role="status" className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            <p className="mb-4 text-sm text-studio-300">{t('clanShop.settingsDraft')}</p>
            {/* LIVE PREVIEW BOX */}
            <div className="mb-6 rounded-2xl border border-studio-800 p-4 bg-studio-950 relative overflow-hidden shadow-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-studio-400 block mb-2">
                {t('socialFix.preview')}
              </span>
              <div className="relative rounded-xl overflow-hidden p-4 sm:p-6 min-h-[120px] flex items-center gap-4">
                {clan.active_background && (
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${clan.active_background.asset_preview_url || (clan.active_background.asset_animated ? '' : clan.active_background.asset_url)})` }}>
                    <div className="absolute inset-0 bg-studio-950/70" />
                  </div>
                )}
                <div className="relative z-10 flex items-center gap-4">
                  <AvatarFrame
                    username={clan.name}
                    avatarUrl={editAvatar || undefined}
                    frameUrl={clan.frame_url}
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
                      {editDesc || clan.description || t('socialFix.noClanDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="rounded-2xl border border-brand-400/30 bg-studio-950 p-4">
                <p className="mb-3 text-sm text-studio-200">{t('clanShop.settingsHint')}</p>
                <button type="button" disabled={savingSettings || uploadingFile} onClick={() => { setIsSettingsModalOpen(false); setActiveTab('shop'); }} className="flex items-center gap-2 rounded-xl border border-brand-400/40 px-4 text-sm font-bold text-brand-300">
                  <Store className="h-4 w-4" />{t('clanShop.open')}
                </button>
              </div>

              {/* 3. CLAN AVATAR (LOGO) */}
              <div>
                <p className="block text-xs font-bold text-studio-300 uppercase tracking-wider mb-2">
                  {t('socialFix.uploadLogo')}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    ref={avatarFileInputRef}
                    onChange={handleUploadClanAvatar}
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="px-3.5 py-2 rounded-xl bg-studio-800 hover:bg-studio-700 text-xs font-bold text-studio-200 border border-studio-700 hover:border-purple-500/50 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-purple-400" />
                    <span>{t('socialFix.uploadLogo')}</span>
                  </button>
                  {editAvatar && <button type="button" onClick={() => setEditAvatar('')} className="text-xs text-studio-400 hover:text-white">{t('socialFix.remove')}</button>}
                  {uploadingFile && <span className="text-xs text-purple-400 animate-pulse">{t('common.loading')}</span>}
                </div>
              </div>

              {/* 4. CLAN TAVSIFI & A'ZO QABULI */}
              <div className="space-y-3 pt-2 border-t border-studio-800">
                <div>
                  <label htmlFor="clan-description" className="block text-xs font-bold text-studio-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>{t('clans.description')}</span>
                    <span className="text-[10px] text-studio-500 font-mono">{editDesc.length}/500</span>
                  </label>
                  <textarea id="clan-description"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder={t('socialFix.clanDescPlaceholder')}
                    className="w-full px-3.5 py-2.5 bg-studio-950 border border-studio-800 rounded-xl text-xs text-white placeholder-studio-500 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-studio-950 border border-studio-800">
                  <div>
                    <span className="text-xs font-bold text-white block">{t('socialFix.recruiting')}</span>
                    <span className="text-[11px] text-studio-400">
                      {editRecruiting ? t('socialFix.recruitingOpen') : t('socialFix.closed')}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={t('socialFix.recruiting')} aria-pressed={editRecruiting} onClick={() => setEditRecruiting(!editRecruiting)}
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
                  disabled={savingSettings || uploadingFile} onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-studio-400 hover:text-white"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingSettings || uploadingFile}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {savingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('common.save')}</span>
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </ProfileWallpaper>
  );
};
