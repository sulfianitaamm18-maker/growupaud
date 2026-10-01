import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StudentProfile,
  ObservationRecord,
} from '../../types';
import { canViewStudent, canViewObservation } from '../../utils/authorization';
import { schoolStore } from '../../services/schoolStore';
import { useAuth } from '../../context/AuthContext';
import { isObservationToday, isObservationThisWeek } from '../../utils/dateUtils';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FolderHeart,
  FileText,
  Settings,
  PlusCircle,
  Building2,
  BookOpen,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Mic,
} from 'lucide-react';

// Modular Guru Dashboard Components
import { GuruHeader } from './GuruHeader';
import { GuruSummaryCards } from './GuruSummaryCards';
import { GuruQuickActions } from './GuruQuickActions';
import { GuruAIWidget } from './GuruAIWidget';
import { ObservationHistoryView } from './ObservationHistoryView';
import { GuruReportView } from './GuruReportView';
import { AIPedagogicWidget } from './AIPedagogicWidget';
import { LightweightLessonPlanner } from './LightweightLessonPlanner';
import { GuruDashboardProgress } from './GuruDashboardProgress';
import { GuruStudentList } from './GuruStudentList';
import { GuruAnalyticsCharts } from './GuruAnalyticsCharts';
import { GuruCalendarWidget } from './GuruCalendarWidget';

// Functional Modals
import { GuruNotificationModal } from './GuruNotificationModal';
import { MessagingModal } from '../messaging/MessagingModal';
import { messagingService } from '../../services/messagingService';
import { GuruAccountSettingsModal } from './GuruAccountSettingsModal';
import { GuruStudentPortfolioModal } from './GuruStudentPortfolioModal';
import { GuruStudentGraphModal } from './GuruStudentGraphModal';
import { CurriculumManagerModal } from './CurriculumManagerModal';

type MainTab = 'BERANDA' | 'ANAK' | 'OBSERVASI' | 'PERENCANAAN' | 'PORTOFOLIO' | 'LAPORAN' | 'PENGATURAN';

interface GuruDashboardProps {
  onOpenNewObservation: (studentId?: string, observationToEdit?: ObservationRecord, initialActivityId?: string) => void;
  observations: ObservationRecord[];
  students?: StudentProfile[];
  onOpenReportPreview: (student: StudentProfile) => void;
}

export const GuruDashboard: React.FC<GuruDashboardProps> = ({
  onOpenNewObservation,
  observations,
  students,
  onOpenReportPreview,
}) => {
  // Main Tab Navigation State
  const [activeTab, setActiveTab] = useState<MainTab>('BERANDA');

  // Modal states
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isMessagingModalOpen, setIsMessagingModalOpen] = useState<boolean>(false);
  const [messagingInitialTab, setMessagingInitialTab] = useState<'inbox' | 'compose' | 'notifications'>('inbox');
  const [messagingStudentId, setMessagingStudentId] = useState<string | undefined>(undefined);
  const [messagingStudentName, setMessagingStudentName] = useState<string | undefined>(undefined);
  const [messagingRecipientId, setMessagingRecipientId] = useState<string | undefined>(undefined);
  const [unreadCounts, setUnreadCounts] = useState<{ unreadMessages: number; unreadNotifications: number }>({
    unreadMessages: 0,
    unreadNotifications: 0,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCurriculumOpen, setIsCurriculumOpen] = useState<boolean>(false);
  const [selectedStudentForPortfolio, setSelectedStudentForPortfolio] =
    useState<StudentProfile | null>(null);
  const [selectedStudentForGraph, setSelectedStudentForGraph] =
    useState<StudentProfile | null>(null);

  const { userProfile, logout } = useAuth();
  const currentUser = userProfile;

  // Poll real unread messages and notifications counts from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const fetchCounts = async () => {
      try {
        const counts = await messagingService.getUnreadCounts();
        setUnreadCounts(counts);
      } catch (err) {
        // quiet error
      }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Filter students & observations strictly for this Teacher's assigned class
  const allStudents = useMemo(() => students || schoolStore.getStudents(), [students]);
  const myStudents = useMemo(
    () => (currentUser ? allStudents.filter((s) => canViewStudent(currentUser, s)) : []),
    [allStudents, currentUser]
  );
  const myObservations = useMemo(
    () => (currentUser ? observations.filter((o) => canViewObservation(currentUser, o, allStudents)) : []),
    [observations, currentUser, allStudents]
  );

  const studentClassName = useMemo(() => {
    if (myStudents.length > 0 && myStudents[0].className) {
      return myStudents[0].className;
    }
    if (currentUser?.className) {
      return currentUser.className;
    }
    return 'Kelompok B';
  }, [myStudents, currentUser]);

  // Selected student for portfolio tab with auto-synchronization
  const [selectedPortfolioStudent, setSelectedPortfolioStudent] = useState<StudentProfile | null>(
    () => myStudents[0] || null
  );

  const activePortfolioStudent = useMemo(() => {
    if (selectedPortfolioStudent && myStudents.some((s) => s.id === selectedPortfolioStudent.id)) {
      return selectedPortfolioStudent;
    }
    return myStudents[0] || null;
  }, [selectedPortfolioStudent, myStudents]);

  // Mandatory Portfolio Diagnostics
  useEffect(() => {
    if (activeTab === 'PORTOFOLIO' && currentUser) {
      const studentId = activePortfolioStudent?.id || '-';
      const studentObs = myObservations.filter((o) => o.studentId === studentId);
      console.log(
        `[PORTFOLIO OBSERVATION QUERY]\ncurrentUserUid = ${currentUser.id}\ncurrentSchoolId = ${currentUser.schoolId || 'main-school'}\nselectedStudentId = ${studentId}\nqueryCollection = observations\nqueryResultCount = ${studentObs.length}\nobservationIds = ${JSON.stringify(studentObs.map((o) => o.id))}`
      );

      if (studentObs.length === 0) {
        console.log(
          `[PORTFOLIO OBSERVATION EMPTY]\nquery = where('schoolId', '==', '${currentUser.schoolId || 'main-school'}')\nfilter = studentId === '${studentId}'\nstudentId = ${studentId}\nschoolId = ${currentUser.schoolId || 'main-school'}\ntotalRawObservations = ${observations.length}\ntotalMyObservations = ${myObservations.length}`
        );
      }
    }
  }, [activeTab, currentUser, activePortfolioStudent?.id, myObservations, observations.length]);

  // Calculate summary metrics strictly from real observations and students data
  const totalStudents = myStudents.length;

  const todayObservations = useMemo(
    () => myObservations.filter(isObservationToday),
    [myObservations]
  );
  const todayObservationsCount = todayObservations.length;

  const weeklyObservations = useMemo(
    () => myObservations.filter(isObservationThisWeek),
    [myObservations]
  );
  const weeklyObservationsCount = weeklyObservations.length;

  const uploadedEvidenceCount = useMemo(
    () =>
      myObservations.reduce(
        (sum, obs) => sum + (obs.evidences?.length ?? 0),
        0
      ),
    [myObservations]
  );

  const studentsWithObsCount = useMemo(
    () => myStudents.filter((std) => myObservations.some((obs) => obs.studentId === std.id)).length,
    [myStudents, myObservations]
  );
  const semesterAssessmentPercentage =
    totalStudents > 0 ? Math.round((studentsWithObsCount / totalStudents) * 100) : 0;

  const studentsWithEvidenceCount = useMemo(
    () =>
      myStudents.filter((std) =>
        myObservations.some((obs) => obs.studentId === std.id && (obs.evidences?.length ?? 0) > 0)
      ).length,
    [myStudents, myObservations]
  );
  const portfolioProgress =
    totalStudents > 0 ? Math.round((studentsWithEvidenceCount / totalStudents) * 100) : 0;

  const pendingReportsCount = 0;
  const completedReportsCount = 0;
  const reportProgress =
    totalStudents > 0 ? Math.round((completedReportsCount / totalStudents) * 100) : 0;

  const handleNavigateSection = useCallback(
    (
      section:
        | 'STUDENTS'
        | 'PORTFOLIO'
        | 'REPORT'
        | 'CALENDAR'
        | 'ANALYTICS'
        | 'AI_WIDGET'
        | 'PLANNER'
    ) => {
      if (section === 'STUDENTS') {
        setActiveTab('ANAK');
      } else if (section === 'PORTFOLIO') {
        setActiveTab('PORTOFOLIO');
      } else if (section === 'REPORT') {
        setActiveTab('LAPORAN');
      } else if (section === 'PLANNER') {
        setActiveTab('PERENCANAAN');
      } else {
        setActiveTab('BERANDA');
      }
    },
    []
  );

  const handleSelectSummaryCard = useCallback(
    (
      cardType:
        | 'STUDENTS'
        | 'TODAY_OBS'
        | 'WEEKLY_OBS'
        | 'PENDING_REPORTS'
        | 'COMPLETED_REPORTS'
        | 'EVIDENCES'
        | 'ASSESSMENT_PROGRESS'
    ) => {
      switch (cardType) {
        case 'STUDENTS':
        case 'TODAY_OBS':
          setActiveTab('ANAK');
          break;
        case 'WEEKLY_OBS':
          setActiveTab('OBSERVASI');
          break;
        case 'PENDING_REPORTS':
        case 'COMPLETED_REPORTS':
        case 'ASSESSMENT_PROGRESS':
          setActiveTab('LAPORAN');
          break;
        case 'EVIDENCES':
          setActiveTab('PORTOFOLIO');
          break;
      }
    },
    []
  );

  if (!currentUser) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-md mx-auto text-center my-12">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <UserCheck className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Profil Pengguna Belum Tersedia</h3>
        <p className="text-sm text-slate-500">
          Data profil pengguna sedang dimuat atau belum terkonfigurasi. Silakan refresh atau hubungi Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-16">
      {/* 1. Header Hero Guru & Identitas Sekolah */}
      <GuruHeader
        currentUser={currentUser}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNotifications={() => {
          setMessagingInitialTab('notifications');
          setMessagingStudentId(undefined);
          setMessagingStudentName(undefined);
          setMessagingRecipientId(undefined);
          setIsMessagingModalOpen(true);
        }}
        onOpenInbox={() => {
          setMessagingInitialTab('inbox');
          setMessagingStudentId(undefined);
          setMessagingStudentName(undefined);
          setMessagingRecipientId(undefined);
          setIsMessagingModalOpen(true);
        }}
        unreadCount={unreadCounts.unreadNotifications}
        unreadMessagesCount={unreadCounts.unreadMessages}
        onOpenNewObservation={() => onOpenNewObservation()}
      />

      {/* 2. Navigasi Menu Guru PAUD (Sesuai gaya Operator & Ortu) */}
      <div className="bg-white p-2 rounded-2xl shadow-xs border border-slate-200/80 flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('BERANDA')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'BERANDA'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-emerald-400" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('ANAK')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'ANAK'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Data Anak ({totalStudents})</span>
        </button>

        <button
          onClick={() => setActiveTab('OBSERVASI')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'OBSERVASI'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 text-emerald-400" />
          <span>Observasi ({todayObservationsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('PERENCANAAN')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'PERENCANAAN'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Perencanaan AI</span>
        </button>

        <button
          onClick={() => setActiveTab('PORTOFOLIO')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'PORTOFOLIO'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FolderHeart className="w-4 h-4 text-rose-400" />
          <span>Portofolio</span>
        </button>

        <button
          onClick={() => setActiveTab('LAPORAN')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'LAPORAN'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>Rapor Semester</span>
        </button>

        <button
          onClick={() => setActiveTab('PENGATURAN')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'PENGATURAN'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Pengaturan</span>
        </button>
      </div>

      {/* -------------------- MAIN TAB CONTENTS -------------------- */}

      {/* TAB 1: BERANDA */}
      {activeTab === 'BERANDA' && (
        <div className="space-y-4 sm:space-y-5 animate-fadeIn">
          {/* Kegiatan & Aksi Cepat Mengajar (Catat Observasi, Rancang Kegiatan AI, dll.) */}
          <GuruQuickActions
            onOpenNewObservation={() => onOpenNewObservation()}
            onNavigateSection={handleNavigateSection}
          />

          {/* Ringkasan Asesmen yang Benar-Benar Diperlukan */}
          <GuruSummaryCards
            totalStudents={totalStudents}
            todayObservationsCount={todayObservationsCount}
            weeklyObservationsCount={weeklyObservationsCount}
            pendingReportsCount={pendingReportsCount}
            completedReportsCount={completedReportsCount}
            uploadedEvidenceCount={uploadedEvidenceCount}
            semesterAssessmentPercentage={semesterAssessmentPercentage}
            onSelectCard={handleSelectSummaryCard}
            studentClassName={studentClassName}
          />

          {/* 6. Saran AI yang Relevan (Rantai Pedagogis: Loose Parts, TaRL, UDL, CRT) */}
          <AIPedagogicWidget
            onApplyActivity={(actTitle) => onOpenNewObservation(undefined)}
            onOpenPlanner={() => setActiveTab('PERENCANAAN')}
          />

          {/* Asisten Observasi AI */}
          <GuruAIWidget
            students={myStudents}
            onSelectStudentForObservation={(studentId) => onOpenNewObservation(studentId)}
            onOpenCurriculumManager={() => setIsCurriculumOpen(true)}
          />

          {/* Ringkasan Progres Capaian & Laporan */}
          <GuruDashboardProgress
            assessmentProgress={semesterAssessmentPercentage}
            reportProgress={reportProgress}
            portfolioProgress={portfolioProgress}
            onNavigateSection={handleNavigateSection}
          />

          {/* Analitik Perkembangan & Kalender */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GuruAnalyticsCharts
              observations={myObservations}
              students={myStudents}
            />
            <GuruCalendarWidget />
          </div>
        </div>
      )}

      {/* TAB 2: ANAK */}
      {activeTab === 'ANAK' && (
        <div className="animate-fadeIn space-y-6">
          <GuruStudentList
            students={myStudents}
            observations={myObservations}
            onOpenNewObservation={onOpenNewObservation}
            onOpenPortfolio={(student) => setSelectedStudentForPortfolio(student)}
            onOpenGraph={(student) => setSelectedStudentForGraph(student)}
            onOpenReportPreview={onOpenReportPreview}
            onMessageParent={(student) => {
              setMessagingInitialTab('compose');
              setMessagingStudentId(student.id);
              setMessagingStudentName(student.name);
              setMessagingRecipientId(undefined);
              setIsMessagingModalOpen(true);
            }}
          />
        </div>
      )}

      {/* TAB 3: OBSERVASI */}
      {activeTab === 'OBSERVASI' && (
        <ObservationHistoryView
          onOpenNewObservation={() => onOpenNewObservation()}
          onEditObservation={(obs) => onOpenNewObservation(obs.studentId, obs)}
        />
      )}

      {/* TAB 4: PERENCANAAN KEGIATAN BERBANTUAN AI */}
      {activeTab === 'PERENCANAAN' && (
        <LightweightLessonPlanner
          onStartObservationWithActivity={(activityId, activityTitle) => {
            onOpenNewObservation(undefined, undefined, activityId);
          }}
        />
      )}

      {/* TAB 5: PORTOFOLIO */}
      {activeTab === 'PORTOFOLIO' && (
        <div className="animate-fadeIn space-y-6 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderHeart className="w-5 h-5 text-emerald-600" />
                <span>Portofolio Autentik & Gallery Karya Anak</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kumpulan bukti foto kegiatan, karya, suara, dan rekaman perkembangan anak didik berbasis Kurikulum Merdeka.
              </p>
            </div>

            {/* Select Child */}
            {myStudents.length > 0 && (
              <select
                value={activePortfolioStudent?.id || myStudents[0]?.id}
                onChange={(e) => {
                  const s = myStudents.find((st) => st.id === e.target.value);
                  if (s) setSelectedPortfolioStudent(s);
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
              >
                {myStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    Ananda {s.name} ({s.className})
                  </option>
                ))}
              </select>
            )}
          </div>

          {activePortfolioStudent && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={activePortfolioStudent.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(activePortfolioStudent.name || 'anak')}`}
                  alt={activePortfolioStudent.name || 'Anak'}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/30 border border-white"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(activePortfolioStudent.name || 'anak')}`;
                  }}
                />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Ananda {activePortfolioStudent.name}</h3>
                  <p className="text-xs text-slate-600">
                    {activePortfolioStudent.className} • Usia: {activePortfolioStudent.age}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-emerald-800">
                  Total Observasi: {myObservations.filter((o) => o.studentId === activePortfolioStudent.id).length}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-emerald-800">
                  Capaian: {activePortfolioStudent.overallScore ? `${activePortfolioStudent.overallScore}%` : 'Belum Ada Penilaian'}
                </span>
                <button
                  type="button"
                  id="tab-portfolio-preview-report-btn"
                  onClick={() => onOpenReportPreview(activePortfolioStudent)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
                >
                  <FileText className="w-4 h-4" />
                  <span>Pertinjau / Cetak Laporan</span>
                </button>
              </div>
            </div>
          )}

          {/* Portfolio Evidences */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Galeri Bukti Observasi & Analisis Perkembangan
              </h4>
              <span className="text-xs text-slate-400">
                {myObservations.filter((o) => o.studentId === activePortfolioStudent?.id).length} Dokumen Ditemukan
              </span>
            </div>

            {myObservations.filter((o) => o.studentId === activePortfolioStudent?.id).length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <p className="text-xs font-bold text-slate-500">
                  Belum ada bukti observasi tersimpan untuk Ananda {activePortfolioStudent?.name}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Lakukan observasi baru dan tambahkan foto/karya anak.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myObservations
                  .filter((o) => o.studentId === activePortfolioStudent?.id)
                  .map((obs) => (
                    <div key={obs.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                          {obs.activityTitle}
                        </span>
                        <span className="text-xs text-slate-400">{obs.date}</span>
                      </div>

                      {/* Teacher Note & Voice Note */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                        <p className="text-slate-700">
                          <strong>Catatan Guru:</strong> "{obs.teacherNote || 'Tidak ada catatan tertulis.'}"
                        </p>
                        {obs.voiceNoteText && (
                          <p className="text-[11px] text-indigo-700 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100 flex items-start gap-1.5">
                            <Mic className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                            <span><strong>Transkrip Suara:</strong> {obs.voiceNoteText}</span>
                          </p>
                        )}
                      </div>

                      {/* Photo / Work Evidences */}
                      {obs.evidences && obs.evidences.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {obs.evidences.map((ev) => (
                            <div key={ev.id} className="p-2 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                              {ev.type === 'PHOTO' && ev.url && ev.url.trim().length > 0 && (
                                <img
                                  src={ev.url}
                                  alt={ev.title || 'Bukti Foto'}
                                  className="w-full h-24 object-cover rounded-lg"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <p className="font-bold text-slate-800 text-[11px] truncate">{ev.title}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Rubric Indicators Summary */}
                      {obs.indicators && obs.indicators.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Indikator Capaian Teramati</p>
                          <div className="flex flex-wrap gap-1.5">
                            {obs.indicators.map((ind, idx) => (
                              <span
                                key={ind.id || idx}
                                className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                                  ind.score === 'BSB'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : ind.score === 'BSH'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : ind.score === 'MB'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-red-50 text-red-700 border-red-200'
                                }`}
                              >
                                {ind.name}: {ind.score}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stage 3 AI Narrative Preview */}
                      {obs.aiAnalysis?.generatedNarrative && (
                        <div className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-xs text-indigo-900 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-800">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Analisis Triangulasi & Narasi Perkembangan (Tahap 3)</span>
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                            {obs.aiAnalysis.generatedNarrative}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: LAPORAN SEMESTER & HARIAN */}
      {activeTab === 'LAPORAN' && (
        <GuruReportView
          students={myStudents}
          observations={myObservations}
          onOpenReportPreview={onOpenReportPreview}
        />
      )}

      {/* TAB 6: PENGATURAN */}
      {activeTab === 'PENGATURAN' && (
        <div className="animate-fadeIn space-y-6 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <span>Pengaturan Sekolah &amp; Kurikulum</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola profil sekolah tunggal, data guru, dan bank kegiatan &amp; indikator Kurikulum.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profil Sekolah Card */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{schoolStore.getSchoolProfile().schoolName || currentUser.schoolName || 'Profil sekolah belum diisi.'}</h3>
                  <p className="text-xs text-slate-500">Single School System Engine</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-700">
                <p><strong>Kepala Sekolah:</strong> {schoolStore.getSchoolProfile().principalName || 'Belum diisi'}</p>
                <p><strong>Alamat:</strong> {schoolStore.getSchoolProfile().address || 'Belum diisi'}</p>
                <p><strong>Tahun Ajaran:</strong> {schoolStore.getSchoolProfile().academicYear || '2026/2027'} ({schoolStore.getSchoolProfile().semester || 'Semester I - Ganjil'})</p>
                <p><strong>Status Aplikasi:</strong> Single School Production Engine</p>
              </div>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-all"
              >
                Edit Profil Akun Guru
              </button>
            </div>

            {/* PENGATURAN -> KURIKULUM (Kurikulum Manager) */}
            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-600 text-white font-bold shadow-xs">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Kurikulum &amp; Bank Kegiatan</h3>
                  <p className="text-xs text-emerald-800 font-medium">Pengaturan Kurikulum PAUD (Admin)</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-white p-3.5 rounded-xl border border-emerald-200">
                Kelola Elemen, CP, TP, Tema, Subtema, Kegiatan, dan Indikator yang akan digunakan otomatis oleh guru saat observasi.
              </p>

              <button
                onClick={() => setIsCurriculumOpen(true)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Buka Curriculum Manager (Admin)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- Functional Modals -------------------- */}

      {/* Real Firestore Messaging & Notifications System */}
      {isMessagingModalOpen && currentUser && (
        <MessagingModal
          isOpen={isMessagingModalOpen}
          onClose={() => {
            setIsMessagingModalOpen(false);
            messagingService.getUnreadCounts().then(setUnreadCounts).catch(() => {});
          }}
          currentUser={currentUser}
          initialTab={messagingInitialTab}
          initialRecipientId={messagingRecipientId}
          initialStudentId={messagingStudentId}
          initialStudentName={messagingStudentName}
        />
      )}

      {/* Notification Center (Fallback/Direct compatibility) */}
      {isNotifOpen && (
        <GuruNotificationModal
          isOpen={isNotifOpen}
          onClose={() => setIsNotifOpen(false)}
          onSelectStudent={(studentId) => {
            setIsNotifOpen(false);
            onOpenNewObservation(studentId);
          }}
          onOpenInbox={(initialTab) => {
            setIsNotifOpen(false);
            setMessagingInitialTab(initialTab || 'inbox');
            setIsMessagingModalOpen(true);
          }}
        />
      )}

      {/* Guru Account & School Settings Modal */}
      <GuruAccountSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
      />

      {/* Student Portfolio & Evidences Modal */}
      <GuruStudentPortfolioModal
        isOpen={Boolean(selectedStudentForPortfolio)}
        onClose={() => setSelectedStudentForPortfolio(null)}
        student={selectedStudentForPortfolio}
        observations={observations}
        onOpenReportPreview={onOpenReportPreview}
      />

      {/* Student Radar Chart & Aspect Graph Modal */}
      <GuruStudentGraphModal
        isOpen={Boolean(selectedStudentForGraph)}
        onClose={() => setSelectedStudentForGraph(null)}
        student={selectedStudentForGraph}
        onOpenReportPreview={onOpenReportPreview}
      />

      {/* Curriculum Manager Modal */}
      {isCurriculumOpen && (
        <CurriculumManagerModal
          isOpen={isCurriculumOpen}
          onClose={() => setIsCurriculumOpen(false)}
        />
      )}
    </div>
  );
};

