import {
  StudentProfile,
  ObservationRecord,
  SchoolProfile,
  DevelopmentalAspect,
  EvidenceItem,
} from '../types';
import {
  buildCanonicalReportDocument,
  CanonicalReportDocument,
} from '../services/reportDocumentModel';

export interface ReportCalculatedData {
  aspectScores: Record<DevelopmentalAspect, number>;
  overallPercentage: number | null;
  totalRatedIndicators: number;
  narrative: string;
  hasAIAnalysis: boolean;
  strengths: string[];
  needsStimulation: string[];
  homeStimulationAdvice: string[];
  evidences: EvidenceItem[];
  teacherName: string;
  principalName: string;
  schoolName: string;
  schoolAddress: string;
  academicYear: string;
  semester: string;
  reportStatus: 'BELUM' | 'PROSES' | 'REPORT_READY';
  canonicalDoc: CanonicalReportDocument;
}

export function isObservationInActivePeriod(
  observation: ObservationRecord,
  schoolProfile: SchoolProfile
): boolean {
  if (!observation) return false;

  const activeYear = schoolProfile.academicYear;
  const activeSem = schoolProfile.semester;

  if (observation.academicYear && activeYear && observation.academicYear !== activeYear) {
    return false;
  }

  if (observation.semester && activeSem && observation.semester !== activeSem) {
    return false;
  }

  return true;
}

export function calculateStudentReportData(
  student: StudentProfile | null,
  observations: ObservationRecord[] = [],
  schoolProfile: SchoolProfile,
  customOverrides?: {
    schoolName?: string;
    schoolAddress?: string;
    logoUrl?: string | null;
  }
): ReportCalculatedData {
  const canonicalDoc = buildCanonicalReportDocument(
    student,
    observations,
    schoolProfile,
    customOverrides
  );

  const aspectScores: Record<DevelopmentalAspect, number> = {
    NAM: 0,
    JATI_DIRI: 0,
    LITERASI_STEAM: 0,
    MOTORIK_KASAR: 0,
    MOTORIK_HALUS: 0,
    KOGNITIF: 0,
  };

  canonicalDoc.aspects.forEach((a) => {
    aspectScores[a.aspectKey] = a.score ?? 0;
  });

  const narrativeText = canonicalDoc.overallSummary.description;

  const evidenceItems: EvidenceItem[] = canonicalDoc.evidences.map((e) => ({
    id: e.id,
    type: 'PHOTO',
    url: e.url || '',
    title: e.title,
    caption: e.caption,
    date: e.date || new Date().toISOString(),
  }));

  const strengths = canonicalDoc.developedPoints.map((p) => p.behavior);
  const needsStimulation = canonicalDoc.growthPoints.map((p) => p.recommendation);
  const homeStimulationAdvice = canonicalDoc.homeStimulations.map(
    (h) => `${h.title}: ${h.activity} (${h.skillTrained})`
  );

  return {
    aspectScores,
    overallPercentage: canonicalDoc.overallPercentage,
    totalRatedIndicators: canonicalDoc.observationSummary.totalRatedIndicators,
    narrative: narrativeText,
    hasAIAnalysis: canonicalDoc.observationSummary.hasAIAnalysis,
    strengths,
    needsStimulation,
    homeStimulationAdvice,
    evidences: evidenceItems,
    teacherName: canonicalDoc.signatures.teacher.name,
    principalName: canonicalDoc.signatures.principal.name,
    schoolName: canonicalDoc.school.name,
    schoolAddress: canonicalDoc.school.address,
    academicYear: canonicalDoc.metadata.academicYear,
    semester: canonicalDoc.metadata.semester,
    reportStatus: canonicalDoc.metadata.reportStatus,
    canonicalDoc,
  };
}
