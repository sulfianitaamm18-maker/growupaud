import React, { useState } from 'react';
import {
  Bell,
  X,
  FileText,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  Send,
  UserCheck,
  School,
  Clock,
  Eye,
} from 'lucide-react';
import { StudentProfile } from '../../types';

interface NotificationItem {
  id: string;
  type: 'REPORT_PENDING' | 'OBS_PENDING' | 'INDICATOR_INCOMPLETE' | 'MSG_PRINCIPAL' | 'MSG_PARENT';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  studentId?: string;
  studentName?: string;
  senderName?: string;
  parentReportOpened?: boolean; // Status apakah Orang Tua sudah membuka laporan anak
  replies?: {
    id: string;
    sender: 'TEACHER' | 'PARENT' | 'PRINCIPAL';
    text: string;
    timestamp: string;
  }[];
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-01',
    type: 'MSG_PARENT',
    title: 'Pesan dari Orang Tua Ananda Fatih Al-Fatih',
    message: 'Assalamu\'alaikum Ibu Rina, terima kasih banyak atas saran aktivitas melipat origami. Fatih sangat antusias mencobanya di rumah!',
    timestamp: '10 menit lalu',
    isRead: false,
    studentId: 'std-002',
    studentName: 'Ananda Fatih Al-Fatih',
    senderName: 'Ibu Aisyah Rahmawati (Bunda Fatih)',
    parentReportOpened: true, // Orang tua sudah mengecek laporan anak
    replies: [
      {
        id: 'rep-1',
        sender: 'PARENT',
        text: 'Assalamu\'alaikum Ibu Rina, terima kasih banyak atas saran aktivitas melipat origami. Fatih sangat antusias mencobanya di rumah!',
        timestamp: '10 menit lalu',
      },
    ],
  },
  {
    id: 'notif-02',
    type: 'REPORT_PENDING',
    title: 'Verifikasi Akhir Rapor Semester I',
    message: 'Rapor untuk Ananda Fatih Al-Fatih dan Ananda Keenan Mahendra masih dalam proses tinjauan akhir sebelum ditandatangani Kepala Sekolah.',
    timestamp: '30 menit lalu',
    isRead: false,
    studentName: 'Ananda Fatih & Ananda Keenan',
  },
  {
    id: 'notif-03',
    type: 'OBS_PENDING',
    title: 'Observasi Harian Belum Tercatat',
    message: 'Hari ini terdapat 3 anak di Kelompok B yang belum memiliki catatan observasi terbaru. Segera lakukan pengamatan.',
    timestamp: '1 jam lalu',
    isRead: true,
  },
  {
    id: 'notif-04',
    type: 'INDICATOR_INCOMPLETE',
    title: 'Indikator Motorik Kasar Belum Lengkap',
    message: 'Aspek Motorik Kasar untuk Ananda Citra Kirana masih kekurangan 1 bukti observasi untuk melengkapi Capaian Pembelajaran.',
    timestamp: '2 jam lalu',
    isRead: true,
    studentName: 'Ananda Citra Kirana',
  },
  {
    id: 'notif-05',
    type: 'MSG_PRINCIPAL',
    title: 'Pesan dari Kepala Sekolah',
    message: 'Ibu Rina, mohon dipastikan seluruh bukti portofolio Kelompok Bintang sudah lengkap sebelum rapat dewan guru hari Jumat.',
    timestamp: 'Kemarin',
    isRead: true,
    senderName: 'Bu Hj. Nurhasanah, M.Pd (Kepala Sekolah)',
  },
];

interface GuruNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStudent?: (studentId: string) => void;
}

export const GuruNotificationModal: React.FC<GuruNotificationModalProps> = ({
  isOpen,
  onClose,
  onSelectStudent,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [replyInput, setReplyInput] = useState<{ [key: string]: string }>({});

  if (!isOpen) return null;

  const handleSendReply = (notifId: string) => {
    const text = replyInput[notifId]?.trim();
    if (!text) return;

    setNotifications((prev) =>
      prev.map((item) => {
        if (item.id === notifId) {
          const updatedReplies = [
            ...(item.replies || []),
            {
              id: `rep-${Date.now()}`,
              sender: 'TEACHER' as const,
              text,
              timestamp: 'Baru saja',
            },
          ];
          return {
            ...item,
            replies: updatedReplies,
            isRead: true,
          };
        }
        return item;
      })
    );

    setReplyInput((prev) => ({ ...prev, [notifId]: '' }));
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'REPORTS') return item.type === 'REPORT_PENDING';
    if (activeTab === 'OBSERVATIONS') return item.type === 'OBS_PENDING' || item.type === 'INDICATOR_INCOMPLETE';
    if (activeTab === 'PRINCIPAL') return item.type === 'MSG_PRINCIPAL';
    if (activeTab === 'PARENTS') return item.type === 'MSG_PARENT';
    return true;
  });

  const getBadgeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'REPORT_PENDING':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'OBS_PENDING':
        return <Clock className="w-4 h-4 text-teal-600" />;
      case 'INDICATOR_INCOMPLETE':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'MSG_PRINCIPAL':
        return <School className="w-4 h-4 text-indigo-600" />;
      case 'MSG_PARENT':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Pusat Notifikasi & Komunikasi Dua Arah PAUD</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Categories */}
        <div className="flex items-center gap-1.5 px-6 py-3 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0">
          {[
            { key: 'ALL', label: 'Semua Notifikasi' },
            { key: 'PARENTS', label: 'Pesan Orang Tua' },
            { key: 'PRINCIPAL', label: 'Kepala Sekolah' },
            { key: 'REPORTS', label: 'Laporan Belum Selesai' },
            { key: 'OBSERVATIONS', label: 'Observasi & Indikator' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                activeTab === tab.key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification List Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Tidak ada notifikasi dalam kategori ini.
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  notif.isRead
                    ? 'bg-white border-slate-200'
                    : 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/10'
                }`}
              >
                {/* Notif Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-100 shrink-0">
                      {getBadgeIcon(notif.type)}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {notif.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{notif.timestamp}</span>
                        {notif.senderName && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">
                              {notif.senderName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Orang Tua Mengecek Laporan */}
                  {notif.parentReportOpened !== undefined && (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        notif.parentReportOpened
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      {notif.parentReportOpened ? 'Laporan Telah Dibuka' : 'Belum Dibuka'}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-700 leading-relaxed pl-10">
                  {notif.message}
                </p>

                {/* Messaging Reply Area for Parent / Principal Messages */}
                {(notif.type === 'MSG_PARENT' || notif.type === 'MSG_PRINCIPAL') && (
                  <div className="pl-10 space-y-3 pt-2 border-t border-slate-100">
                    {/* Render existing replies */}
                    {notif.replies && notif.replies.length > 0 && (
                      <div className="space-y-2">
                        {notif.replies.map((rep) => (
                          <div
                            key={rep.id}
                            className={`p-3 rounded-xl text-xs space-y-1 ${
                              rep.sender === 'TEACHER'
                                ? 'bg-emerald-600 text-white ml-6'
                                : 'bg-slate-100 text-slate-800 mr-6'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] opacity-90 font-bold">
                              <span>
                                {rep.sender === 'TEACHER'
                                  ? 'Balasan Anda (Bu Rina, S.Pd)'
                                  : notif.senderName}
                              </span>
                              <span>{rep.timestamp}</span>
                            </div>
                            <p>{rep.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Chatbox / Input Text for Real-time Reply */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={replyInput[notif.id] || ''}
                        onChange={(e) =>
                          setReplyInput({ ...replyInput, [notif.id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendReply(notif.id);
                        }}
                        placeholder="Ketik balasan untuk Orang Tua / Kepala Sekolah..."
                        className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-all"
                      />
                      <button
                        onClick={() => handleSendReply(notif.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shrink-0 active:scale-95 shadow-2xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            💡 Tips: Komunikasi dua arah terhubung ke notifikasi Orang Tua secara langsung
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
