import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Send,
  MessageSquare,
  Bell,
  User,
  Clock,
  CheckCheck,
  ChevronLeft,
  PlusCircle,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Building2,
  Check,
} from 'lucide-react';
import { UserProfile, Conversation, Message, AppNotification } from '../../types';
import { messagingService, MessagingRecipient } from '../../services/messagingService';

interface MessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialTab?: 'inbox' | 'compose' | 'notifications';
  initialRecipientId?: string;
  initialStudentId?: string;
  initialStudentName?: string;
}

export const MessagingModal: React.FC<MessagingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialTab = 'inbox',
  initialRecipientId,
  initialStudentId,
  initialStudentName,
}) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose' | 'notifications'>(initialTab);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [recipients, setRecipients] = useState<MessagingRecipient[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Compose form state
  const [composeRecipientId, setComposeRecipientId] = useState<string>(initialRecipientId || '');
  const [composeSubject, setComposeSubject] = useState<string>('');
  const [composeBody, setComposeBody] = useState<string>('');
  const [composeStudentId, setComposeStudentId] = useState<string>(initialStudentId || '');
  const [composeStudentName, setComposeStudentName] = useState<string>(initialStudentName || '');

  // Reply form state
  const [replyBody, setReplyBody] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load initial data & Realtime subscriptions
  useEffect(() => {
    if (!isOpen || !currentUser?.id) return;
    loadRecipients();

    const unsubConvs = messagingService.subscribeConversations(currentUser.id, (list) => {
      setConversations(list);
      setIsLoading(false);
    });

    const unsubNotifs = messagingService.subscribeNotifications(currentUser.id, (notifs) => {
      setNotifications(notifs);
    });

    return () => {
      unsubConvs();
      unsubNotifs();
    };
  }, [isOpen, currentUser?.id]);

  // Realtime subscription for active conversation messages
  useEffect(() => {
    if (!selectedConversation?.id) {
      setMessages([]);
      return;
    }

    const unsubMsgs = messagingService.subscribeMessages(selectedConversation.id, (msgs) => {
      setMessages(msgs);
      setIsLoading(false);
    });

    // Mark as read in backend
    messagingService.getConversationMessages(selectedConversation.id).catch(() => {});

    return () => {
      unsubMsgs();
    };
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialRecipientId) {
      setComposeRecipientId(initialRecipientId);
    }
  }, [initialRecipientId]);

  useEffect(() => {
    if (initialStudentId) {
      setComposeStudentId(initialStudentId);
    }
  }, [initialStudentId]);

  useEffect(() => {
    if (initialStudentName) {
      setComposeStudentName(initialStudentName);
      setComposeSubject((prev) => prev || `Konsultasi Perkembangan Ananda ${initialStudentName}`);
    }
  }, [initialStudentName]);

  // Scroll messages to bottom
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedConversation]);

  const loadInbox = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const list = await messagingService.getConversations();
      setConversations(list);
    } catch (err: any) {
      setErrorMessage('Gagal memuat pesan masuk.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await messagingService.getNotifications();
      setNotifications(res.notifications);
    } catch (err) {
      console.warn('Error loading notifications:', err);
    }
  };

  const loadRecipients = async () => {
    try {
      const list = await messagingService.getRecipients();
      setRecipients(list);
    } catch (err) {
      console.warn('Error loading recipients:', err);
    }
  };

  const handleOpenConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setErrorMessage(null);
  };

  const handleSendReply = async () => {
    if (!selectedConversation || !replyBody.trim()) return;
    setIsSending(true);
    setErrorMessage(null);
    try {
      const res = await messagingService.sendReply(selectedConversation.id, replyBody.trim());
      if (res.success) {
        setReplyBody('');
      } else {
        setErrorMessage(res.error || 'Gagal mengirim balasan.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengirim balasan.');
    } finally {
      setIsSending(false);
    }
  };

  const handleStartNewConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeRecipientId || !composeSubject.trim() || !composeBody.trim()) {
      setErrorMessage('Harap isi semua bidang yang wajib.');
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    try {
      const res = await messagingService.startConversation({
        recipientId: composeRecipientId,
        subject: composeSubject.trim(),
        body: composeBody.trim(),
        studentId: composeStudentId || undefined,
        studentName: composeStudentName || undefined,
      });

      if (res.success && res.conversationId) {
        setSuccessMessage('Pesan berhasil dikirim!');
        setComposeSubject('');
        setComposeBody('');
        // Refresh conversations & open thread
        await loadInbox();
        setActiveTab('inbox');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(res.error || 'Gagal memulai percakapan.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memulai percakapan.');
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    await messagingService.markNotificationRead(undefined, true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  if (!isOpen) return null;

  const totalUnreadMessages = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const totalUnreadNotifs = notifications.filter((n) => !n.isRead).length;

  const formatRoleLabel = (roleStr: string) => {
    const r = roleStr.toUpperCase();
    if (r === 'ADMIN' || r === 'SUPER_ADMIN') return 'Admin Sekolah';
    if (r === 'PRINCIPAL' || r === 'KEPALA_SEKOLAH') return 'Kepala Sekolah';
    if (r === 'TEACHER' || r === 'GURU') return 'Guru Kelas';
    if (r === 'PARENT' || r === 'ORANG_TUA') return 'Orang Tua Siswa';
    return roleStr;
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full h-[640px] max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Pusat Komunikasi &amp; Pesan Resmi</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Resmi Sekolah
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Komunikasi aman antar Guru, Orang Tua, dan Manajemen Sekolah
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex gap-2 py-2">
            <button
              onClick={() => {
                setActiveTab('inbox');
                setSelectedConversation(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'inbox'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Kotak Masuk</span>
              {totalUnreadMessages > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {totalUnreadMessages}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('compose');
                setSelectedConversation(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tulis Pesan Baru</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('notifications');
                setSelectedConversation(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifikasi Sistem</span>
              {totalUnreadNotifs > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                  {totalUnreadNotifs}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => {
              loadInbox();
              loadNotifications();
            }}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition"
            title="Muat ulang pesan"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Feedback Notices */}
        {errorMessage && (
          <div className="px-6 py-2.5 bg-red-50 text-red-700 text-xs font-medium flex items-center gap-2 border-b border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="px-6 py-2.5 bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center gap-2 border-b border-emerald-200">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
          {/* TAB 1: KOTAK MASUK (INBOX & THREAD) */}
          {activeTab === 'inbox' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Thread List Sidebar / Full View on small */}
              <div
                className={`w-full md:w-80 lg:w-96 border-r border-slate-200 bg-white flex flex-col overflow-hidden ${
                  selectedConversation ? 'hidden md:flex' : 'flex'
                }`}
              >
                <div className="p-3 bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-600 flex justify-between items-center">
                  <span>Daftar Percakapan ({conversations.length})</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {conversations.length === 0 && !isLoading && (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <Mail className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold">Belum ada percakapan aktif.</p>
                      <p className="text-[11px] text-slate-400">
                        Mulai percakapan dengan menekan tombol "Tulis Pesan Baru".
                      </p>
                    </div>
                  )}

                  {conversations.map((conv) => {
                    const isSelected = selectedConversation?.id === conv.id;
                    const otherParticipant =
                      conv.participants?.find((p) => p.userId !== currentUser.id) ||
                      conv.participants?.[0];
                    const hasUnread = (conv.unreadCount || 0) > 0;

                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleOpenConversation(conv)}
                        className={`w-full p-4 text-left transition flex flex-col gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/90 border-l-4 border-emerald-600'
                            : hasUnread
                            ? 'bg-emerald-50/40 hover:bg-emerald-50/60 font-semibold'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {otherParticipant?.name || 'Percakapan Sekolah'}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatTime(conv.lastMessageAt || conv.updatedAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {formatRoleLabel(otherParticipant?.role || '')}
                          </span>
                          {conv.studentName && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 truncate max-w-[130px]">
                              {conv.studentName}
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                          {conv.subject}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed">
                          {conv.lastMessage || 'Tidak ada pesan teks.'}
                        </p>

                        {hasUnread && (
                          <div className="self-end">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                              {conv.unreadCount} baru
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thread Chat Area */}
              <div
                className={`flex-1 flex flex-col bg-slate-50 overflow-hidden ${
                  !selectedConversation ? 'hidden md:flex' : 'flex'
                }`}
              >
                {selectedConversation ? (
                  <>
                    {/* Thread Header */}
                    <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedConversation(null)}
                          className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 leading-snug">
                            {selectedConversation.subject}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <span>
                              {selectedConversation.participants
                                ?.map((p) => `${p.name} (${formatRoleLabel(p.role)})`)
                                .join(' • ')}
                            </span>
                            {selectedConversation.studentName && (
                              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                Siswa: {selectedConversation.studentName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                      {messages.map((msg) => {
                        const isMe = msg.senderId === currentUser.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400">
                              <span className="font-bold text-slate-700">{msg.senderName}</span>
                              <span>•</span>
                              <span>{formatRoleLabel(msg.senderRole || '')}</span>
                              <span>•</span>
                              <span>{formatTime(msg.createdAt)}</span>
                            </div>

                            <div
                              className={`max-w-[82%] sm:max-w-md p-4 rounded-2xl text-xs leading-relaxed shadow-xs ${
                                isMe
                                  ? 'bg-emerald-700 text-white rounded-br-xs'
                                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.body}</p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Reply Input Box */}
                    <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
                      <textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Tulis balasan pesan di sini..."
                        rows={2}
                        className="flex-1 p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none text-slate-800"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                      />
                      <button
                        onClick={handleSendReply}
                        disabled={isSending || !replyBody.trim()}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 cursor-pointer self-end"
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Kirim Balasan</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <Mail className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-700">Pilih Percakapan</h4>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">
                        Pilih salah satu pesan masuk di sebelah kiri untuk membaca riwayat dan membalas pesan.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TULIS PESAN BARU */}
          {activeTab === 'compose' && (
            <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
              <form onSubmit={handleStartNewConversation} className="space-y-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Kirim Pesan Resmi Baru</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Komunikasi tersimpan aman dalam riwayat thread percakapan sekolah.
                  </p>
                </div>

                {/* Recipient selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    Penerima Pesan yang Sah: <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={composeRecipientId}
                    onChange={(e) => setComposeRecipientId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  >
                    <option value="">-- Pilih Kontak Penerima --</option>
                    {recipients.map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.name} ({formatRoleLabel(rec.role)}) {rec.className ? `• Kelas ${rec.className}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                    Perihal / Subjek: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Contoh: Konsultasi Perkembangan Ananda Fatih..."
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
                  />
                </div>

                {/* Optional Student Context */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Terkait Siswa (Opsional):
                  </label>
                  <input
                    type="text"
                    value={composeStudentName}
                    onChange={(e) => setComposeStudentName(e.target.value)}
                    placeholder="Nama siswa yang dikonsultasikan (jika ada)..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    Isi Pesan: <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Tuliskan isi pesan, pertanyaan, atau tanggapan secara santun dan jelas..."
                    rows={5}
                    required
                    className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSending ? 'Mengirim...' : 'Kirim Pesan Sekarang'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: NOTIFIKASI SISTEM */}
          {activeTab === 'notifications' && (
            <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Riwayat Notifikasi Sekolah</h3>
                  <p className="text-xs text-slate-500">
                    Pemberitahuan resmi mengenai laporan perkembangan, observasi, dan pesan masuk.
                  </p>
                </div>
                {totalUnreadNotifs > 0 && (
                  <button
                    onClick={handleMarkAllNotificationsRead}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Tandai Semua Dibaca</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {notifications.length === 0 && (
                  <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold">Tidak ada notifikasi saat ini.</p>
                  </div>
                )}

                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-2xl border transition flex items-start justify-between gap-3 ${
                      notif.isRead
                        ? 'bg-white border-slate-200'
                        : 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-500/20 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl mt-0.5 ${notif.isRead ? 'bg-slate-100 text-slate-500' : 'bg-emerald-600 text-white'}`}>
                        {notif.type === 'MESSAGE' ? <Mail className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {notif.title}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.body}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {formatTime(notif.createdAt)}
                        </span>
                      </div>
                    </div>

                    {notif.type === 'MESSAGE' && notif.relatedId && (
                      <button
                        onClick={async () => {
                          if (!notif.isRead) {
                            await messagingService.markNotificationRead(notif.id);
                            setNotifications((prev) =>
                              prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
                            );
                          }
                          setActiveTab('inbox');
                          let foundConv = conversations.find((c) => c.id === notif.relatedId);
                          if (!foundConv) {
                            const list = await messagingService.getConversations();
                            setConversations(list);
                            foundConv = list.find((c) => c.id === notif.relatedId);
                          }
                          if (foundConv) {
                            handleOpenConversation(foundConv);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 text-[11px] font-bold transition shrink-0"
                      >
                        Buka Percakapan
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
