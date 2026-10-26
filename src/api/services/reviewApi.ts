/**
 * reviewApi.ts
 * Servicio para los Repasos Espaciados SM-2 (flashcards).
 *
 * Ciclo:
 *   1. getDueReviews(subjectId)                → lista tarjetas vencidas hoy
 *   2. startReviewSession(subjectId)            → crea sesión de repaso
 *   3. submitGrade(sessionId, payload)          → envía calificación SM-2 (0-5) por tarjeta
 *   4. finishReviewSession(sessionId)           → cierra sesión y detecta amnesia conceptual
 */

import { apiGet, apiPost } from '../client';
import type {
  ReviewQueueItemDto,
  ReviewSessionDto,
  ReviewGradePayload,
  ReviewFinishDto,
} from '../types';

/**
 * Obtiene la lista de tarjetas de repaso vencidas para hoy.
 * Si el array está vacío, el estudiante está al día.
 *
 * @param subjectId - UUID de la asignatura
 */
export function getDueReviews(subjectId: string): Promise<ReviewQueueItemDto[]> {
  return apiGet<ReviewQueueItemDto[]>(`/subjects/${subjectId}/reviews/due`);
}

/**
 * Crea (o reanuda) una sesión de repaso espaciado para la asignatura.
 *
 * @param subjectId - UUID de la asignatura
 */
export function startReviewSession(subjectId: string): Promise<ReviewSessionDto> {
  return apiPost<ReviewSessionDto>(`/subjects/${subjectId}/review-sessions`);
}

/**
 * Envía la calificación SM-2 para una tarjeta de repaso.
 *   - 0-1: No recordaba (Rojo)
 *   - 2-3: Recordó con dificultad (Ámbar)
 *   - 4-5: Recordó fácilmente (Verde)
 *
 * @param sessionId - UUID de la sesión de repaso activa
 * @param payload   - { progressId, grade: 0-5, seconds }
 */
export function submitGrade(
  sessionId: string,
  payload: ReviewGradePayload,
): Promise<void> {
  return apiPost<void>(`/review-sessions/${sessionId}/grades`, payload);
}

/**
 * Finaliza la sesión de repaso.
 * El resultado indica si el backend detectó amnesia conceptual (≥2 fallos consecutivos),
 * en cuyo caso reabriría conceptos a estado REFUERZO y el frontend debe actualizar
 * el grafo y notificar al usuario con un modal de alerta.
 *
 * @param sessionId - UUID de la sesión de repaso
 */
export function finishReviewSession(sessionId: string): Promise<ReviewFinishDto> {
  return apiPost<ReviewFinishDto>(`/review-sessions/${sessionId}/finish`);
}
