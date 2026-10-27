/**
 * reviewApi.ts
 * Servicio para los Repasos Espaciados SM-2 (flashcards).
 *
 * Ciclo:
 *   1. getDueReviews(subjectId)                → lista tarjetas vencidas hoy
 *   2. startReviewSession(subjectId)            → crea sesión de repaso
 *   3. submitGrade(sessionId, payload)          → envía calificación SM-2 (0-5) por tarjeta
 *   4. finishReviewSession(sessionId)           → cierra la sesión; la amnesia se reporta al calificar
 */

import { apiGet, apiPost } from '../client';
import type {
  ReviewQueueItemDto,
  ReviewSessionDto,
  ReviewGradePayload,
  ReviewGradeDto,
  ReviewFinishDto,
} from '../types';

/**
 * Obtiene la lista de tarjetas de repaso vencidas para hoy.
 * Si el array está vacío, el estudiante está al día.
 *
 * @param subjectId - UUID de la asignatura
 */
export function getDueReviews(subjectId: string): Promise<ReviewQueueItemDto[]> {
	return apiGet<{
		progress: { id: string; consecutiveLapses: number };
		card: { id: string; conceptId: string; front: string; back: string; hint: string };
	}[]>(`/subjects/${subjectId}/reviews/due`).then((due) => due.map(({ progress, card }) => ({
		progressId: progress.id,
		conceptId: card.conceptId,
		consecutiveLapses: progress.consecutiveLapses,
		card: { id: card.id, front: card.front, back: card.back },
	})));
}

/**
 * Crea (o reanuda) una sesión de repaso espaciado para la asignatura.
 *
 * @param subjectId - UUID de la asignatura
 */
export function startReviewSession(subjectId: string): Promise<ReviewSessionDto> {
	return apiPost<{
		id: string;
		startedAt: string;
		finishedAt: string | null;
		reviewed: number;
		remembered: number;
		forgotten: number;
	}>(`/subjects/${subjectId}/review-sessions`);
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
): Promise<ReviewGradeDto> {
	return apiPost<ReviewGradeDto>(`/review-sessions/${sessionId}/grades`, payload);
}

/**
 * Finaliza la sesión de repaso.
 * La respuesta contiene los contadores de la sesión. La detección de amnesia
 * llega en las respuestas individuales de submitGrade.
 *
 * @param sessionId - UUID de la sesión de repaso
 */
export function finishReviewSession(sessionId: string): Promise<ReviewFinishDto> {
	return apiPost<{
		id: string;
		startedAt: string;
		finishedAt: string | null;
		reviewed: number;
		remembered: number;
		forgotten: number;
	}>(`/review-sessions/${sessionId}/finish`).then((result) => ({
		sessionId: result.id,
		finishedAt: result.finishedAt,
		reviewed: result.reviewed,
		remembered: result.remembered,
		forgotten: result.forgotten,
	}));
}
