import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  FileText,
  AlertCircle,
  MessageSquare,
  CheckCheck,
  School,
  Clock,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { AppNotification } from '../../types';
import { messagingService } from '../../services/messagingService';

interface GuruNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStudent?: (studentId: string) => void;
  onOpenInbox?: (initialTab?: 'inbox' | 'compose' | 'notifications') => void;
}

export const GuruNotificationModal: React.FC<GuruNotificationModalProps> = ({
  isOpen,
  onClose,
  onSelectStudent,
  onOpenInbox,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MESSAGES' | 'REPORTS' | 'SYSTEM'>('ALL');

  useEffect(() => {
    if (!isOpen) return;
    loadNotifications();
  }, [isOpen]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await messagingService.getNotifications();
      setNotifications(res.notifications || []);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleMarkAsRead = async (id: string) => {
    await messagingService.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await messagingService.markNotificationRead(undefined, true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'MESSAGES') return item.type === 'MESSAGE';
    if (activeTab === 'REPORTS') return item.type === 'REPORT' || item.type === 'FEEDBACK';
    if (activeTab === 'SYSTEM') return item.type === 'OBSERVATION' || item.type === 'SYSTEM';
    return true;
  });

  const getBadgeIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'MESSAGE':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'REPORT':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'OBSERVATION':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'FEEDBACK':
        return <Clock className="w-4 h-4 text-teal-600" />;
      default:
        return <School className="w-4 h-4 text-indigo-600" />;
    }
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Pusat Notifikasi & Komunikasi PAUD</h3>
              <p className="text-[11px] text-slate-400">Sinkronisasi langsung dengan Firestore</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadNotifications}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Perbarui notifikasi"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Categories & Actions */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200 gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5">
            {[
              { key: 'ALL', label: 'Semua' },
              { key: 'MESSAGES', label: 'Pesan Masuk' },
              { key: 'REPORTS', label: 'Laporan & Feedback' },
              { key: 'SYSTEM', label: 'Observasi & Sistem' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Tandai Semua Dibaca</span>
            </button>
          )}
        </div>

        {/* Notification List Content */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
              <span>Memuat notifikasi terbaru...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-2">
              <Bell className="w-8 h-8 mx-auto text-slate-300" />
              <p>Tidak ada notifikasi dalam kategori ini.</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  notif.isRead
                    ? 'bg-white border-slate-200'
                    : 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/10 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                      {getBadgeIcon(notif.type)}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {notif.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {notif.body}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1.5 block">
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition"
                        title="Tandai dibaca"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                    {notif.type === 'MESSAGE' && onOpenInbox && (
                      <button
                        onClick={() => {
                          handleMarkAsRead(notif.id);
                          onOpenInbox('inbox');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Buka Pesan</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {onOpenInbox ? (
            <button
              onClick={() => onOpenInbox('inbox')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Kotak Masuk & Pesan Lengkap</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500 font-medium">
              Pesan dan notifikasi tersimpan aman di Firestore
            </span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
