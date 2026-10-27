/**
 * practiceApi.ts
 * Servicio para la Práctica Formativa (actividades sin calificación sumativa).
 *
 * Ciclo:
 *   1. getPracticeActivities(conceptId)           → carga los ítems de práctica
 *   2. sendPracticeAttempt(activityId, payload)   → envía una respuesta y obtiene feedback
 */

import { apiGet, apiPost } from '../client';
import { toActivityDto, toBackendAnswer, type BackendActivityDto } from '../mappers/activityMapper';
import type { ActivityDto, PracticeAttemptPayload, PracticeResultDto } from '../types';

/**
 * Obtiene las actividades de práctica formativa para un concepto dado.
 * Opcionalmente puede filtrar por dificultad (1 = fácil, 3 = difícil).
 *
 * @param conceptId  - UUID del concepto
 * @param difficulty - Nivel de dificultad opcional (1, 2 o 3)
 */
export function getPracticeActivities(
  conceptId: string,
  difficulty?: number,
): Promise<ActivityDto[]> {
  const query = difficulty !== undefined ? `?difficulty=${difficulty}` : '';
  return apiGet<BackendActivityDto[]>(`/concepts/${conceptId}/practice-activities${query}`).then((activities) => activities.map(toActivityDto));
}

/**
 * Envía el intento de respuesta de una actividad formativa y recibe feedback inmediato.
 * El backend indica si la respuesta fue correcta, muestra la opción correcta y
 * proporciona explicación pedagógica para reforzar el aprendizaje.
 *
 * @param activityId - UUID de la actividad respondida
 * @param payload    - { optionId?, respuesta?, seconds }
 */
export function sendPracticeAttempt(
  activityId: string,
  payload: PracticeAttemptPayload,
): Promise<PracticeResultDto> {
	return apiPost<{
		correct: boolean;
		feedback: string;
		specificFeedback: string;
		correctOptionId: string | null;
	}>(`/activities/${activityId}/practice-attempts`, toBackendAnswer(payload)).then((result) => ({
		correct: result.correct,
		feedback: result.specificFeedback || result.feedback,
		explanation: result.feedback,
		correctOptionId: result.correctOptionId ?? undefined,
	}));
}
