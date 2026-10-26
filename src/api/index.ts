/**
 * Barrel de la capa API — exporta cliente, tipos y todos los servicios.
 * Importar desde aquí en lugar de rutas profundas:
 *
 *   import { apiFetch, CogniaApiError } from '@/api';
 *   import { getSubjects, startDiagnostic } from '@/api';
 */

// Cliente y error tipado
export { apiFetch, apiGet, apiPost, apiPut, apiDelete, CogniaApiError } from './client';
export type { RequestOptions } from './client';

// Tipos / DTOs
export type {
  ApiError,
  SubjectDto,
  ConceptDto,
  PrerequisiteDto,
  ActivityType,
  ActivityOptionDto,
  ActivityDto,
  AnswerPayload,
  AnswerResultDto,
  DiagnosticEstado,
  DiagnosticSessionDto,
  ConceptMasteryDto,
  DiagnosticProfileDto,
  PathStepEstado,
  LearningPathEstado,
  PathStepDto,
  LearningPathDto,
  PracticeAttemptPayload,
  PracticeResultDto,
  EvalEstado,
  ShortEvalSessionDto,
  ShortEvalResultDto,
  FlashcardDto,
  ReviewQueueItemDto,
  ReviewEstado,
  ReviewSessionDto,
  ReviewGradePayload,
  ReviewFinishDto,
  GlobalExamEstado,
  GlobalExamDto,
  GlobalExamResultDto,
} from './types';

// Servicios por dominio
export * as curriculumApi from './services/curriculumApi';
export * as diagnosticApi from './services/diagnosticApi';
export * as learningPathApi from './services/learningPathApi';
export * as practiceApi from './services/practiceApi';
export * as evaluationApi from './services/evaluationApi';
export * as reviewApi from './services/reviewApi';
export * as globalExamApi from './services/globalExamApi';
