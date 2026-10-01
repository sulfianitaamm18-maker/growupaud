import React, { useState, useMemo, useEffect } from 'react';
import {
  Heart,
  Sparkles,
  FileText,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Mic,
  Home,
  ChevronRight,
  UserCheck,
  Award,
  Camera,
  Info,
  User,
  Download,
  ZoomIn,
  X,
  Send,
  Clock,
  ShieldCheck,
  Loader2,
  History,
  RefreshCw,
  Lock,
  Printer,
  AlertCircle,
  School,
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import {
  UserProfile,
  StudentProfile,
  ObservationRecord,
  ParentFeedback,
  DevelopmentalAspect,
} from '../../types';
import {
  calculateStudentAspectScores,
  calculateOverallScore,
  getAchievementPredicate,
} from '../../utils/studentMetrics';
import {
  canViewStudent,
  canViewObservation,
  canViewReport,
} from '../../utils/authorization';
import { RadarChartCard } from '../common/RadarChartCard';
import { AspectScoreBars } from '../common/AspectScoreBars';
import { schoolStore } from '../../services/schoolStore';
import { calculateStudentReportData } from '../../utils/reportCalculator';
import { generateStudentReportPdf } from '../../services/pdfReportGenerator';
import { feedbackService } from '../../services/feedbackService';
import { StudentLifecycleHistoryModal } from '../student/StudentLifecycleHistoryModal';
import { ChildDevelopmentTrendChart } from './ChildDevelopmentTrendChart';
import { ParentDailyReportCard } from './ParentDailyReportCard';
import { digitalSignatureService } from '../../services/digitalSignatureService';
import { StudentReportCard } from '../reports/StudentReportCard';
import { MessagingModal } from '../messaging/MessagingModal';
import { messagingService } from '../../services/messagingService';

interface OrangTuaDashboardProps {
  currentUser: UserProfile;
  students: StudentProfile[];
  observations: ObservationRecord[];
  onOpenReportPreview: (student: StudentProfile) => void;
  feedbacks: ParentFeedback[];
  onAddFeedback: (feedback: ParentFeedback) => void;
}

export const OrangTuaDashboard: React.FC<OrangTuaDashboardProps> = ({
  currentUser,
  students = [],
  observations = [],
  onOpenReportPreview,
  feedbacks = [],
  onAddFeedback,
}) => {
  const [childrenProfiles, setChildrenProfiles] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [isMessagingModalOpen, setIsMessagingModalOpen] = useState<boolean>(false);
  const [messagingInitialTab, setMessagingInitialTab] = useState<'inbox' | 'compose' | 'notifications'>('inbox');
  const [messagingRecipientId, setMessagingRecipientId] = useState<string | undefined>(undefined);
  const [messagingStudentId, setMessagingStudentId] = useState<string | undefined>(undefined);
  const [messagingStudentName, setMessagingStudentName] = useState<string | undefined>(undefined);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'RAPOR' | 'JURNAL' | 'KONSULTASI'>('RAPOR');
  const [isRetryingLink, setIsRetryingLink] = useState<boolean>(false);
  const [retrySyncFeedback, setRetrySyncFeedback] = useState<string | null>(null);

  // School profile for reports, branding, and academic year (Declared early to prevent TDZ)
  const schoolProfile = useMemo(() => {
    return schoolStore.getSchoolProfile();
  }, []);

  // 1. Filter students accessible to current parent user (Strict RBAC) with deduplication & API fallback
  const parentStudents = useMemo(() => {
    const accessible = students.filter((s) => canViewStudent(currentUser, s));
    const seen = new Set<string>();
    const filtered = accessible.filter((s) => {
      if (!s.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    // Seamless fallback: If students prop from direct firestore query is empty/loading, but childrenProfiles arrived from backend
    if (filtered.length === 0 && childrenProfiles.length > 0) {
      return childrenProfiles as StudentProfile[];
    }
    return filtered;
  }, [students, currentUser, childrenProfiles]);

  // Load real child profiles with dynamic class & teacher resolution
  useEffect(() => {
    if (!currentUser?.id) return;
    messagingService
      .getChildrenProfiles()
      .then((profiles) => {
        if (Array.isArray(profiles) && profiles.length > 0) {
          setChildrenProfiles(profiles);
        }
      })
      .catch((err) => console.warn('Children profiles load notice:', err));
  }, [currentUser?.id]);

  const handleRetrySync = async () => {
    setIsRetryingLink(true);
    setRetrySyncFeedback(null);
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch('/api/parent/sync-student-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        await schoolStore.refreshFromFirestore(currentUser.schoolId || 'main-school', currentUser.role);
        if (data.count && data.count > 0) {
          setRetrySyncFeedback(`Berhasil menghubungkan ${data.count} data siswa ananda.`);
        } else {
          setRetrySyncFeedback(
            'Pemeriksaan selesai. Data ananda dengan akun/email ini belum terdaftar di database sekolah. Silakan hubungi wali kelas.'
          );
        }
      }
    } catch (e: any) {
      setRetrySyncFeedback('Gagal menyinkronkan: ' + (e.message || 'Koneksi terganggu.'));
    } finally {
      setIsRetryingLink(false);
    }
  };

  // Selected child logic with fallback to first authorized child
  const student = useMemo(() => {
    if (parentStudents.length === 0) return null;
    if (selectedChildId) {
      const found = parentStudents.find((s) => s.id === selectedChildId);
      if (found) return found;
    }
    return parentStudents[0];
  }, [parentStudents, selectedChildId]);

  // Real child profile enriched with Firestore Class & Teacher resolution
  const activeChildProfile = useMemo(() => {
    if (!student) return null;
    return childrenProfiles.find((p) => p.id === student.id || p.studentId === student.id) || null;
  }, [childrenProfiles, student]);

  const teacherDisplayName = activeChildProfile?.teacherName || student?.teacherName || 'Wali Kelas';
  const classDisplayName = activeChildProfile?.className || (student ? (student.className || student.classGroup || 'PAUD') : 'PAUD');
  const academicYearDisplay = activeChildProfile?.academicYear || schoolProfile?.academicYear || '2026/2027';

  // 2. Child Observations (Filtered by authorization and student ID)
  const childObservations = useMemo(() => {
    if (!student) return [];
    return observations.filter(
      (o) =>
        o.studentId === student.id &&
        canViewObservation(currentUser, o, students)
    );
  }, [observations, student, currentUser, students]);

  // Canonical report data calculation
  const reportData = useMemo(() => {
    if (!student) return null;
    try {
      return calculateStudentReportData(student, childObservations, schoolProfile);
    } catch (e) {
      console.warn('Failed to calculate report data for parent view:', e);
      return null;
    }
  }, [student, childObservations, schoolProfile]);

  // UI Local States
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState<string | null>(null);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  // Lightbox / Zoom Photo State
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<{
    url: string;
    title: string;
    caption?: string;
    date?: string;
  } | null>(null);

  // Portfolio filter tab
  const [portfolioFilter, setPortfolioFilter] = useState<'ALL' | 'PHOTO' | 'NOTE'>('ALL');

  // Communication / Consultation State
  const [recipientRole, setRecipientRole] = useState<'GURU' | 'KEPALA_SEKOLAH'>('GURU');
  const [consultCategory, setConsultCategory] = useState<
    'KONSULTASI_PERKEMBANGAN' | 'KEGIATAN_RUMAH' | 'PERTANYAAN_UMUM'
  >('KONSULTASI_PERKEMBANGAN');
  const [commentText, setCommentText] = useState<string>('');
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [messageFilter, setMessageFilter] = useState<'ALL' | 'WAITING' | 'REPLIED'>('ALL');

  // Reset child-specific states whenever active child changes
  useEffect(() => {
    setCommentText('');
    setCustomAvatar(null);
    setActiveLightboxPhoto(null);
    setIsSubmitted(false);
    setDownloadSuccessMsg(null);
    setPhotoSuccessMsg(null);
  }, [selectedChildId]);

  // Handle local avatar update
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setCustomAvatar(reader.result as string);
          setPhotoSuccessMsg('Foto profil Ananda berhasil diperbarui!');
          setTimeout(() => setPhotoSuccessMsg(null), 4000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 5. Report Publication & Digital Authorization Status
  const isReportPublished = useMemo(() => {
    if (!student) return false;
    return digitalSignatureService.isReportPublished(
      student.id,
      schoolProfile.academicYear,
      schoolProfile.semester
    );
  }, [student, schoolProfile.academicYear, schoolProfile.semester]);

  const reportAuthorization = useMemo(() => {
    if (!student) return null;
    return digitalSignatureService.getStoredAuthorization(
      student.id,
      schoolProfile.academicYear,
      schoolProfile.semester
    );
  }, [student, schoolProfile.academicYear, schoolProfile.semester]);

  // Handle direct PDF report download
  const handleDirectDownloadPdf = async () => {
    if (!isReportPublished) {
      alert(
        'Rapor resmi Ananda belum dipublikasikan oleh pihak sekolah. Pengunduhan dokumen PDF akan tersedia setelah laporan disahkan dan diterbitkan secara resmi.'
      );
      return;
    }
    if (!student || !reportData) {
      alert('Data laporan belum siap untuk diunduh.');
      return;
    }

    setIsDownloadingPdf(true);
    try {
      await generateStudentReportPdf({
        student,
        reportData,
        schoolProfile,
        canonicalDoc: reportData.canonicalDoc,
      });
      setDownloadSuccessMsg(`Rapor PDF Ananda ${student.name} berhasil diunduh ke perangkat Anda.`);
      setTimeout(() => setDownloadSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Download PDF error:', err);
      alert('Gagal mengunduh rapor PDF. Silakan gunakan tombol Pratinjau Rapor untuk melihat dokumen.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Handle direct photo / karya download
  const handleDownloadPhoto = async (photoUrl: string, title: string) => {
    if (!photoUrl) return;
    try {
      const res = await fetch(photoUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanStudent = (student?.name || 'Ananda').replace(/\s+/g, '_');
      const cleanTitle = (title || 'karya').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Karya_${cleanStudent}_${cleanTitle}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setDownloadSuccessMsg('Foto/karya berhasil diunduh ke galeri perangkat Anda.');
      setTimeout(() => setDownloadSuccessMsg(null), 4000);
    } catch {
      const a = document.createElement('a');
      a.href = photoUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = `Karya_${(student?.name || 'Ananda').replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // 3. Dynamic Calculation of Aspect Scores & Overall Score
  const { aspectScores, overallPercentage, totalRatedIndicators } = useMemo(() => {
    let totalCount = 0;
    childObservations.forEach((obs) => {
      (obs.indicators || []).forEach((ind) => {
        if (ind.rating && ind.rating !== 'BELUM_DINILAI') {
          totalCount += 1;
        }
      });
    });

    const calculatedAspects = calculateStudentAspectScores(childObservations);
    const calculatedOverall = calculateOverallScore(calculatedAspects);

    return {
      aspectScores: calculatedAspects,
      overallPercentage: calculatedOverall,
      totalRatedIndicators: totalCount,
    };
  }, [childObservations]);

  // 4. Latest AI Analysis if available
  const latestAIAnalysis = useMemo(() => {
    return childObservations.find((o) => o.aiAnalysis)?.aiAnalysis || null;
  }, [childObservations]);

  // Meaningful, parent-friendly strengths grounded in real assessment
  const childStrengths = useMemo(() => {
    if (latestAIAnalysis?.strengths && latestAIAnalysis.strengths.length > 0) {
      return latestAIAnalysis.strengths;
    }
    const realDevelopedInds: string[] = [];
    childObservations.forEach((obs) => {
      (obs.indicators || []).forEach((ind) => {
        if ((ind.rating === 'BSB' || ind.rating === 'BSH') && ind.text) {
          realDevelopedInds.push(`Menunjukkan capaian baik pada kemampuan ${ind.text.toLowerCase()} (Kegiatan: ${obs.activityTitle}).`);
        }
      });
    });
    if (realDevelopedInds.length > 0) {
      return realDevelopedInds.slice(0, 3);
    }
    return [
      'Belum tersedia cukup data asesmen terukur untuk memetakan kekuatan capaian ananda. Data akan diperbarui seiring berlangsungnya kegiatan pengamatan autentik di kelas.',
    ];
  }, [latestAIAnalysis, childObservations]);

  // Parent-friendly play-based home stimulation guidance
  const homeStimulationSuggestions = useMemo(() => {
    if (latestAIAnalysis?.homeStimulationAdvice && latestAIAnalysis.homeStimulationAdvice.length > 0) {
      return latestAIAnalysis.homeStimulationAdvice;
    }
    if (totalRatedIndicators > 0) {
      return [
        'Ajak ananda berbincang santai tentang kegiatan bermain yang paling disukainya hari ini untuk melatih komunikasi dua arah.',
        'Berikan kesempatan ananda merapikan alat bermain sendiri ke tempat semula untuk melatih pembiasaan kemandirian bertahap.',
        'Bacakan buku cerita bergambar 10-15 menit sebelum tidur untuk memperkaya perbendaharaan kata dan imajinasi ananda.',
      ];
    }
    return [
      'Belum tersedia rekomendasi stimulasi spesifik berbasis data asesmen. Guru akan membagikan stimulasi yang terarah setelah rangkaian asesmen autentik terverifikasi.',
    ];
  }, [latestAIAnalysis, totalRatedIndicators]);

  // 5. Filtered Parent Feedbacks (Child specific and parent isolated)
  const childFeedbacks = useMemo(() => {
    if (!student) return [];
    return feedbacks.filter(
      (fb) => fb.studentId === student.id && (!fb.parentId || fb.parentId === currentUser.id)
    );
  }, [feedbacks, student, currentUser.id]);

  const filteredFeedbacks = useMemo(() => {
    if (messageFilter === 'WAITING') {
      return childFeedbacks.filter((fb) => !fb.replyFromTeacher);
    }
    if (messageFilter === 'REPLIED') {
      return childFeedbacks.filter((fb) => Boolean(fb.replyFromTeacher));
    }
    return childFeedbacks;
  }, [childFeedbacks, messageFilter]);

  // 6. Report Status
  const isReportReady = useMemo(() => {
    if (!student) return false;
    if (student.reportStatus === 'SELESAI') return true;
    return childObservations.some(
      (o) => o.status === 'REPORT_READY' || o.status === 'VERIFIED'
    );
  }, [student, childObservations]);

  // Handle Report Preview
  const handleOpenReport = () => {
    if (!isReportPublished) {
      alert(
        'Laporan perkembangan Ananda saat ini masih dalam proses kurasi catatan dan pengesahan resmi oleh pihak sekolah. Laporan akan dapat diakses secara penuh segera setelah diterbitkan.'
      );
      return;
    }
    if (student && canViewReport(currentUser, student.id, students)) {
      onOpenReportPreview(student);
    } else {
      alert('Akses laporan tidak diizinkan untuk akun ini.');
    }
  };

  // Handle Sending Consultation Message
  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !student || isSendingMessage) return;

    setIsSendingMessage(true);
    const parentDisplayName =
      currentUser.name || currentUser.displayName || student.parentName || 'Orang Tua Ananda';

    const newFb: ParentFeedback = {
      id: `fb-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      parentId: currentUser.id,
      parentName: parentDisplayName,
      recipientRole,
      recipientName: recipientRole === 'GURU' ? teacherDisplayName : (schoolProfile.principalName || 'Kepala Sekolah'),
      category: consultCategory,
      comment: commentText.trim(),
      date: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      status: 'TERKIRIM',
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Optimistic update in parent App state
      onAddFeedback(newFb);
      // 2. Direct Firestore persistence with school isolation
      const targetSchoolId = student.schoolId || currentUser.schoolId || 'main-school';
      await feedbackService.addFeedback(newFb, targetSchoolId, currentUser.id);

      setCommentText('');
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 4000);
    } catch (err) {
      console.error('Error sending parent feedback:', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Filtered observations for portfolio view
  const filteredObservations = useMemo(() => {
    if (portfolioFilter === 'PHOTO') {
      return childObservations.filter(
        (o) => o.evidences && o.evidences.some((e) => e.type === 'PHOTO' && e.url)
      );
    }
    if (portfolioFilter === 'NOTE') {
      return childObservations.filter(
        (o) =>
          Boolean(o.teacherNote) ||
          (o.evidences && o.evidences.some((e) => e.type === 'VOICE_NOTE'))
      );
    }
    return childObservations;
  }, [childObservations, portfolioFilter]);

  // EMPTY STATE: If no accessible child found for parent user
  if (!student) {
    return (
      <div className="p-8 sm:p-12 text-center bg-white rounded-3xl shadow-xs border border-slate-200/80 my-8 space-y-5 max-w-2xl mx-auto animate-fadeIn">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
          <Info className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-800">Data anak belum terhubung</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
            Akun Anda (<strong className="text-slate-700">{currentUser.email || currentUser.name}</strong>) saat ini belum terhubung dengan data ananda yang terdaftar di sekolah.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-600">
            <span>ID Akun (UID):</span>
            <code className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
              {currentUser.id}
            </code>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Email Terdaftar:</span>
            <span className="font-semibold text-slate-800">{currentUser.email || '-'}</span>
          </div>
        </div>

        {retrySyncFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold ${
              retrySyncFeedback.includes('Berhasil')
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {retrySyncFeedback}
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleRetrySync}
            disabled={isRetryingLink}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isRetryingLink ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>{isRetryingLink ? 'Menyinkronkan...' : 'Periksa & Hubungkan Ulang Data Siswa'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Download / Status Notice */}
      {downloadSuccessMsg && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{downloadSuccessMsg}</span>
          </div>
          <button
            onClick={() => setDownloadSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Multi-child Family Profiles & Child Selector (Strictly Dynamic from Firestore) */}
      {parentStudents.length > 1 && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <User className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ananda Tercinta dalam Keluarga</h3>
                <p className="text-[11px] text-slate-500">Pilih kartu profil ananda untuk melihat perkembangan, portofolio, dan rapor spesifik</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              {parentStudents.length} Anak Terdaftar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {parentStudents.map((child) => {
              const isSelected = child.id === student.id;
              const childProf = childrenProfiles.find((p) => p.id === child.id || p.studentId === child.id);
              const childClassName = childProf?.className || child.className || child.classGroup || 'PAUD';
              const childTeacherName = childProf?.teacherName || child.teacherName || 'Wali Kelas';

              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  type="button"
                  className={`text-left p-3.5 rounded-2xl border transition-all relative flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-br from-emerald-50/90 to-teal-50/50 border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <img
                    src={child.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(child.name || 'anak')}`}
                    alt={child.name || 'Anak'}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-2xs shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(child.name || 'anak')}`;
                    }}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{child.name}</h4>
                      {isSelected && (
                        <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-emerald-800 truncate">
                      {childClassName}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                      <span>Wali Kelas:</span>
                      <strong className="text-slate-700 font-medium">{childTeacherName}</strong>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hero Header for Parent */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-slate-800">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-32 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-5">
            <div className="relative group shrink-0">
              <img
                src={customAvatar || student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name || 'anak')}`}
                alt={student.name || 'Anak'}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-white/10 shadow-xl transition-transform group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name || 'anak')}`;
                }}
              />
              <input
                type="file"
                accept="image/*"
                id="ortu-avatar-upload"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <label
                htmlFor="ortu-avatar-upload"
                className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-lg border-2 border-slate-900 transition-all flex items-center gap-1"
                title="Perbarui Foto Ananda dari Perangkat"
              >
                <Camera className="w-3.5 h-3.5" />
              </label>
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                <Heart className="w-3.5 h-3.5" />
                <span>Portal Orang Tua — GrowUPAUD</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Halo, {currentUser.name || currentUser.displayName || student.parentName || 'Ayah & Bunda'} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Memantau perkembangan Ananda <strong className="text-emerald-400">{student.name}</strong> ({student.age || 'PAUD'}) di <strong className="text-white">{classDisplayName}</strong> • Wali Kelas: <strong className="text-white">{teacherDisplayName}</strong> • T.A. {academicYearDisplay}
              </p>
              {photoSuccessMsg && (
                <p className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-lg border border-emerald-500/40 mt-1 inline-block">
                  ✓ {photoSuccessMsg}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons: Preview & Direct Download */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isReportPublished ? (
              <>
                <button
                  onClick={handleOpenReport}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Buka Lembar Rapor Resmi</span>
                </button>

                <button
                  onClick={handleDirectDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <Download className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{isDownloadingPdf ? 'Menyiapkan PDF...' : 'Unduh Rapor PDF'}</span>
                </button>
              </>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-xs">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Rapor Dalam Finalisasi Sekolah</span>
              </div>
            )}

            <button
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span>Riwayat Tahun Ajaran</span>
            </button>
          </div>
        </div>
      </div>

      {/* SINGLE UNIFIED PRIMARY NAVIGATION TABS (NO DOUBLE TABS) */}
      <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('RAPOR')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'RAPOR'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Rapor &amp; Capaian Semester</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('JURNAL')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'JURNAL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Jurnal &amp; Portofolio Harian</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('KONSULTASI')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'KONSULTASI'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Konsultasi Guru &amp; Sekolah</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: RAPOR & CAPAIAN SEMESTER                      */}
      {/* ==================================================== */}
      {activeTab === 'RAPOR' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Status Belum Terpublikasi */}
          {!isReportPublished && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-amber-200/80 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200 mb-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Status: Dalam Proses Finalisasi &amp; Otorisasi Sekolah</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Laporan Perkembangan Semester Ananda Sedang Disiapkan
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                    Wali Kelas ({teacherDisplayName}) dan Kepala Satuan PAUD ({schoolProfile.principalName || 'Kepala Sekolah'}) sedang melakukan kurasi catatan observasi autentik, evaluasi capaian aspek, dan pembubuhan tanda tangan digital resmi.
                  </p>
                </div>
              </div>

              {/* Progress Tracker */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>1. Pengumpulan Observasi</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Selesai — {childObservations.length} kegiatan bermain &amp; karya terdata lengkap.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-800 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>2. Kurasi &amp; Penilaian Aspek</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Sedang berlangsung oleh tim guru pendamping kelas.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    <span>3. Pengesahan &amp; Terbit</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Menunggu otorisasi digital resmi dari Kepala Satuan PAUD.
                  </p>
                </div>
              </div>

              {/* Action hints */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('JURNAL')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Lihat Jurnal Harian &amp; Foto Karya</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('KONSULTASI')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Kirim Pesan ke Wali Kelas</span>
                </button>
              </div>
            </div>
          )}

          {/* Header Card Dokumen Resmi Terpublikasi */}
          {isReportPublished && (
            <>
              <div className="bg-white p-6 rounded-3xl shadow-xs border border-emerald-200/90">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Rapor Resmi Terpublikasi
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-500">
                        {schoolProfile.schoolName || schoolProfile.name || 'Satuan PAUD'}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        Tahun Ajaran {schoolProfile.academicYear || '2025/2026'} ({schoolProfile.semester || 'Semester 1'})
                      </span>
                    </div>

                    <div className="flex items-baseline gap-3">
                      <h3 className="text-2xl font-bold text-slate-900">
                        {overallPercentage !== null ? `${overallPercentage}%` : 'Selesai'}
                      </h3>
                      <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-lg border border-emerald-200">
                        {getAchievementPredicate(overallPercentage).conditionLabel}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Rapor perkembangan resmi Ananda <strong>{student.name}</strong> ({classDisplayName}) disahkan oleh Wali Kelas (<strong>{reportAuthorization?.teacherSignature?.signedByName || teacherDisplayName}</strong>) dan Kepala Satuan PAUD (<strong>{reportAuthorization?.principalSignature?.signedByName || schoolProfile.principalName || 'Kepala Sekolah'}</strong>).
                    </p>
                  </div>

                  {/* Action Buttons: Rapor Resmi */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
                    <button
                      onClick={handleOpenReport}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Buka Lembar A4 Lengkap</span>
                    </button>

                    <button
                      onClick={handleDirectDownloadPdf}
                      disabled={isDownloadingPdf}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {isDownloadingPdf ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>{isDownloadingPdf ? 'Mengunduh...' : 'Unduh Rapor PDF'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* RENDER INTERAKTIF VERSI DIGITAL RAPOR 8-BAGIAN (MIRRORING PDF ENGINE) */}
              {reportData?.canonicalDoc && (
                <div className="bg-slate-100/70 p-3 sm:p-5 rounded-3xl border border-slate-200/80">
                  <div className="mb-3 px-2 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-bold flex items-center gap-1.5 text-slate-800">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Lembar Rapor Digital (Format Standar 8 Bagian Kemendikbudristek)
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenReport}
                      className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Buka Mode Pratinjau Layar Penuh</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <StudentReportCard
                    canonical={reportData.canonicalDoc}
                    canEdit={false}
                  />
                </div>
              )}
            </>
          )}

          {/* KARTU 2: DUA VISUALISASI BERDAMPINGAN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Keseimbangan 6 Aspek Belajar */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900">
                  Keseimbangan 6 Aspek Perkembangan PAUD
                </h4>
                <p className="text-xs text-slate-500">
                  Dihitung dari seluruh capaian indikator selama semester ini ({childObservations.length} kegiatan)
                </p>
              </div>

              <AspectScoreBars
                aspectScores={aspectScores}
                title=""
                subtitle=""
              />
            </div>

            {/* Grafik Tren Perkembangan Semester */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 space-y-4">
              <ChildDevelopmentTrendChart
                observations={childObservations}
                student={student}
                title={`Tren Perkembangan Belajar — ${student.name}`}
                subtitle="Laju pertumbuhan capaian ananda dari minggu ke minggu selama satu semester"
              />
            </div>
          </div>

          {/* KARTU 3: CATATAN GURU & IDE BERMAIN DI RUMAH */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Catatan Capaian &amp; Rekomendasi Bermain di Rumah
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Kolom 1: Kekuatan & Potensi Ananda */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Kekuatan Menonjol Ananda di Sekolah</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700">
                  {childStrengths.map((str, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Kolom 2: Ide Bermain di Rumah */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Home className="w-4 h-4 text-amber-600" />
                  <span>Ide Kegiatan Bermain di Rumah</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700">
                  {homeStimulationSuggestions.map((adv, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: JURNAL & PORTOFOLIO HARIAN                    */}
      {/* ==================================================== */}
      {activeTab === 'JURNAL' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Laporan Jurnal Harian */}
          <ParentDailyReportCard
            observations={childObservations}
            student={student}
            onOpenReportPreview={handleOpenReport}
          />

          {/* Digital Portfolio Timeline & Unduh Foto/Karya Anak */}
          <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Portofolio Digital &amp; Dokumentasi Karya — Ananda {student.name}
            </h3>
            <p className="text-xs text-slate-500">
              Dokumentasi foto karya, video, dan rekaman kegiatan anak yang dibagikan secara resmi oleh sekolah
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100">
            <button
              onClick={() => setPortfolioFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                portfolioFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Momen ({childObservations.length})
            </button>
            <button
              onClick={() => setPortfolioFilter('PHOTO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                portfolioFilter === 'PHOTO'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Foto Karya &amp; Projek
            </button>
            <button
              onClick={() => setPortfolioFilter('NOTE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                portfolioFilter === 'NOTE'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Catatan &amp; Suara Guru
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {filteredObservations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl">
              Belum ada dokumentasi untuk kategori ini.
            </div>
          ) : (
            filteredObservations.map((obs) => {
              const teacherDisplayName = obs.teacherName || student.teacherName || 'Guru Kelas';
              const hasAI = Boolean(obs.aiAnalysis);

              return (
                <div
                  key={obs.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                        {obs.activityTitle}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        • {obs.date}
                      </span>
                    </div>
                    {hasAI ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Analisis Terpadu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                        Observasi Guru
                      </span>
                    )}
                  </div>

                  {/* Catatan Guru */}
                  {obs.teacherNote && (
                    <p className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200/70">
                      <strong className="text-slate-900">Catatan Guru ({teacherDisplayName}):</strong> "{obs.teacherNote}"
                    </p>
                  )}

                  {/* Evidences (Foto & Voice Note) with Direct Download */}
                  {obs.evidences && obs.evidences.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {obs.evidences.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 shadow-2xs"
                        >
                          {ev.type === 'PHOTO' && (
                            <>
                              <div className="flex items-center gap-3 min-w-0">
                                {ev.url && ev.url.trim().length > 0 ? (
                                  <div
                                    className="relative group cursor-pointer shrink-0"
                                    onClick={() =>
                                      setActiveLightboxPhoto({
                                        url: ev.url,
                                        title: ev.title || obs.activityTitle,
                                        caption: ev.caption,
                                        date: obs.date,
                                      })
                                    }
                                  >
                                    <img
                                      src={ev.url}
                                      alt={ev.title || 'Karya Anak'}
                                      className="w-14 h-14 rounded-xl object-cover ring-1 ring-slate-200 group-hover:opacity-90 transition-opacity"
                                    />
                                    <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                      <ZoomIn className="w-4 h-4" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                    <Camera className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-800 truncate">{ev.title || obs.activityTitle}</p>
                                  <p className="text-[11px] text-slate-500 line-clamp-2">{ev.caption || 'Foto kegiatan terverifikasi'}</p>
                                </div>
                              </div>

                              {ev.url && (
                                <button
                                  onClick={() => handleDownloadPhoto(ev.url, ev.title || obs.activityTitle)}
                                  className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-all shrink-0"
                                  title="Unduh Foto / Karya ke Galeri"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}

                          {ev.type === 'VOICE_NOTE' && (
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-3">
                                <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                                  <Mic className="w-5 h-5" />
                                </span>
                                <div>
                                  <p className="font-bold text-slate-800">{ev.title || 'Catatan Suara Guru'}</p>
                                  <p className="text-[11px] text-indigo-600">Durasi: {ev.duration || '0:45 detik'}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                                Audio
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Dokumentasi foto sedang diproses oleh guru kelas.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: KONSULTASI GURU & SEKOLAH                     */}
      {/* ==================================================== */}
      {activeTab === 'KONSULTASI' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Pusat Komunikasi & Konsultasi Dua Arah (Orang Tua - Guru & Kepala Sekolah) */}
          <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <span>Komunikasi &amp; Konsultasi Dua Arah</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ruang dialog resmi untuk bertanya atau menyampaikan catatan perkembangan Ananda kepada Wali Kelas atau Kepala Sekolah
            </p>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100">
            <button
              onClick={() => setMessageFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                messageFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({childFeedbacks.length})
            </button>
            <button
              onClick={() => setMessageFilter('WAITING')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                messageFilter === 'WAITING'
                  ? 'bg-white text-amber-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Menunggu Tanggapan
            </button>
            <button
              onClick={() => setMessageFilter('REPLIED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                messageFilter === 'REPLIED'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sudah Dibalas
            </button>
          </div>
        </div>

        {/* Form Kirim Pesan Konsultasi */}
        <form onSubmit={handleSendFeedback} className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pilih Penerima */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tujukan Pesan Kepada:
              </label>
              <select
                value={recipientRole}
                onChange={(e) => setRecipientRole(e.target.value as 'GURU' | 'KEPALA_SEKOLAH')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="GURU">Wali Kelas ({teacherDisplayName})</option>
                <option value="KEPALA_SEKOLAH">Kepala Sekolah ({schoolProfile.principalName || 'Pimpinan Satuan PAUD'})</option>
              </select>
            </div>

            {/* Kategori Konsultasi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kategori Konsultasi:
              </label>
              <select
                value={consultCategory}
                onChange={(e) =>
                  setConsultCategory(
                    e.target.value as 'KONSULTASI_PERKEMBANGAN' | 'KEGIATAN_RUMAH' | 'PERTANYAAN_UMUM'
                  )
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="KONSULTASI_PERKEMBANGAN">Konsultasi Perkembangan &amp; Perilaku Anak</option>
                <option value="KEGIATAN_RUMAH">Cerita &amp; Kegiatan Ananda di Rumah</option>
                <option value="PERTANYAAN_UMUM">Pertanyaan &amp; Koordinasi Sekolah</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Isi Pesan / Pertanyaan:
            </label>
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={`Tuliskan pesan, tanggapan, atau cerita kegiatan Ananda ${student.name} dengan bahasa yang santun...`}
              className="w-full px-4 py-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {isSubmitted ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pesan berhasil terkirim ke pihak sekolah!</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500">
                Pesan akan langsung masuk ke notifikasi {recipientRole === 'GURU' ? 'Wali Kelas' : 'Kepala Sekolah'}
              </span>
            )}

            <button
              type="submit"
              disabled={!commentText.trim() || isSendingMessage}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              {isSendingMessage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{isSendingMessage ? 'Mengirim...' : 'Kirim Pesan'}</span>
            </button>
          </div>
        </form>

        {/* Daftar Riwayat Pesan & Balasan Resmi */}
        <div className="space-y-4 pt-2">
          {filteredFeedbacks.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl">
              Belum ada pesan tercatat dalam filter ini.
            </div>
          ) : (
            filteredFeedbacks.map((fb) => {
              const isWaiting = !fb.replyFromTeacher;
              const roleTarget = fb.recipientRole === 'KEPALA_SEKOLAH' ? 'Kepala Sekolah' : 'Wali Kelas';

              return (
                <div
                  key={fb.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {fb.parentName}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        • {fb.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        Tujuan: {roleTarget}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isWaiting
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isWaiting ? 'Menunggu Tanggapan' : 'Sudah Dibalas'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200">
                    "{fb.comment}"
                  </p>

                  {/* Official School Reply */}
                  {fb.replyFromTeacher && (
                    <div className="mt-3 pl-4 border-l-3 border-emerald-500 bg-emerald-50/50 p-4 rounded-xl text-xs space-y-1.5 border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tanggapan Resmi {fb.repliedBy || roleTarget}</span>
                        </span>
                        {fb.repliedAt && (
                          <span className="text-[11px] text-emerald-700 font-medium">
                            {fb.repliedAt}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 leading-relaxed font-normal">
                        "{fb.replyFromTeacher}"
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
        </div>
      )}

      {/* Modal Lightbox / Zoom Foto Resolusi Penuh */}
      {activeLightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative max-w-2xl w-full bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            {/* Close Button */}
            <button
              onClick={() => setActiveLightboxPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Photo Container */}
            <div className="bg-black flex items-center justify-center max-h-[60vh] overflow-hidden">
              <img
                src={activeLightboxPhoto.url}
                alt={activeLightboxPhoto.title}
                className="w-full h-auto max-h-[60vh] object-contain"
              />
            </div>

            {/* Photo Details & Download Action */}
            <div className="p-6 space-y-3 bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-white">
                    {activeLightboxPhoto.title}
                  </h4>
                  {activeLightboxPhoto.date && (
                    <p className="text-xs text-slate-400">
                      Dokumentasi tanggal: {activeLightboxPhoto.date}
                    </p>
                  )}
                </div>

                <button
                  onClick={() =>
                    handleDownloadPhoto(activeLightboxPhoto.url, activeLightboxPhoto.title)
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Foto Asli</span>
                </button>
              </div>

              {activeLightboxPhoto.caption && (
                <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10">
                  {activeLightboxPhoto.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Lifecycle History Modal */}
      {showHistoryModal && student && (
        <StudentLifecycleHistoryModal
          student={student}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
};
