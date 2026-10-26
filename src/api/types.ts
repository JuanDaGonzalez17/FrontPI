/**
 * Tipos TypeScript que representan los DTOs devueltos por la API REST de Cognia.
 * Se mantienen sincronizados con los Records/DTOs de Spring Boot del backend.
 */

// ---------------------------------------------------------------------------
// Errores RFC 7807 (Problem Details for HTTP APIs)
// ---------------------------------------------------------------------------

export interface ApiError {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalidParams?: { name: string; reason: string }[];
}

// ---------------------------------------------------------------------------
// Curriculum
// ---------------------------------------------------------------------------

export interface SubjectDto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
}

export interface ConceptDto {
  id: string;
  codigo: string;
  nombre: string;
  nivel: number;
  ordenSugerido: number;
}

export interface PrerequisiteDto {
  /** ID del concepto que es prerrequisito */
  prerequisiteId: string;
  /** ID del concepto que depende del prerrequisito */
  dependentId: string;
}

// ---------------------------------------------------------------------------
// Actividades (compartidas entre Diagnóstico, Práctica y Evaluación)
// ---------------------------------------------------------------------------

export type ActivityType = 'SELECCION_MULTIPLE' | 'RESPUESTA_CORTA';

export interface ActivityOptionDto {
  id: string;
  text: string;
}

export interface ActivityDto {
  id: string;
  conceptId: string;
  tipo: ActivityType;
  dificultad: number;
  enunciado: string;
  options?: ActivityOptionDto[];
}

// Payload para enviar una respuesta de actividad
export interface AnswerPayload {
  optionId?: string;      // para SELECCION_MULTIPLE
  respuesta?: string;     // para RESPUESTA_CORTA
  seconds: number;        // tiempo empleado en responder
}

// Resultado devuelto tras enviar una respuesta
export interface AnswerResultDto {
  correct: boolean;
  correctOptionId?: string;
  feedback?: string;
  explanation?: string;
}

// ---------------------------------------------------------------------------
// Diagnóstico Inicial
// ---------------------------------------------------------------------------

export type DiagnosticEstado = 'PENDIENTE' | 'EN_PROGRESO' | 'FINALIZADO';

export interface DiagnosticSessionDto {
  id: string;
  subjectId: string;
  estado: DiagnosticEstado;
  activities: ActivityDto[];
}

export interface ConceptMasteryDto {
  conceptId: string;
  conceptCodigo: string;
  conceptNombre: string;
  masteryEstimado: number; // 0.0 – 1.0
}

export interface DiagnosticProfileDto {
  subjectId: string;
  masteryByConcepto: ConceptMasteryDto[];
  overallMastery: number;
}

// ---------------------------------------------------------------------------
// Ruta de Aprendizaje
// ---------------------------------------------------------------------------

export type PathStepEstado =
  | 'BLOQUEADO'
  | 'DISPONIBLE'
  | 'EN_PROGRESO'
  | 'REFUERZO'
  | 'DOMINADO';

export type LearningPathEstado = 'ACTIVA' | 'COMPLETADA' | 'ARCHIVADA';

export interface PathStepDto {
  id: string;
  conceptId: string;
  ordenSugerido: number;
  estado: PathStepEstado;
}

export interface LearningPathDto {
  id: string;
  subjectId: string;
  version: number;
  estado: LearningPathEstado;
  steps: PathStepDto[];
}

// ---------------------------------------------------------------------------
// Práctica Formativa
// ---------------------------------------------------------------------------

export interface PracticeAttemptPayload extends AnswerPayload {}

export interface PracticeResultDto extends AnswerResultDto {}

// ---------------------------------------------------------------------------
// Evaluación Corta Sumativa
// ---------------------------------------------------------------------------

export type EvalEstado = 'PENDIENTE' | 'EN_PROGRESO' | 'FINALIZADO';

export interface ShortEvalSessionDto {
  id: string;
  subjectId: string;
  stepId: string;
  estado: EvalEstado;
  activities: ActivityDto[];
}

export interface ShortEvalResultDto {
  sessionId: string;
  score: number;         // 0.0 – 1.0
  passed: boolean;
  threshold: number;     // p.ej. 0.7 (70%)
  newStepEstado: PathStepEstado;
}

// ---------------------------------------------------------------------------
// Repasos Espaciados SM-2
// ---------------------------------------------------------------------------

export interface FlashcardDto {
  id: string;
  front: string;
  back: string;
}

export interface ReviewQueueItemDto {
  progressId: string;
  conceptId: string;
  card: FlashcardDto;
}

export type ReviewEstado = 'PENDIENTE' | 'EN_PROGRESO' | 'FINALIZADO';

export interface ReviewSessionDto {
  id: string;
  subjectId: string;
  estado: ReviewEstado;
  items: ReviewQueueItemDto[];
}

/** Payload SM-2: grado de 0 (no recordaba) a 5 (recordó fácilmente) */
export interface ReviewGradePayload {
  progressId: string;
  grade: number; // 0–5
  seconds: number;
}

export interface ReviewFinishDto {
  sessionId: string;
  /** El backend indica si detectó amnesia conceptual (≥2 fallos consecutivos) */
  amnesiaDetectada: boolean;
  /** IDs de conceptos reabiertos a REFUERZO por amnesia */
  conceptosReiniciados?: string[];
}

// ---------------------------------------------------------------------------
// Examen Global
// ---------------------------------------------------------------------------

export type GlobalExamEstado = 'PENDIENTE' | 'EN_PROGRESO' | 'FINALIZADO';

export interface GlobalExamDto {
  id: string;
  subjectId: string;
  estado: GlobalExamEstado;
  activities: ActivityDto[];
}

export interface GlobalExamResultDto {
  examId: string;
  overallScore: number; // 0.0 – 1.0
  masteryByConcepto: ConceptMasteryDto[];
}
