/**
 * evaluationApi.ts
 * Servicio para la Evaluación Corta Sumativa (3 ítems, umbral 70%).
 *
 * Ciclo:
 *   1. startShortEval(subjectId, stepId)               → crea sesión sumativa
 *   2. sendEvalAnswer(sessionId, activityId, payload)   → envía cada respuesta
 *   3. finishShortEval(sessionId)                       → cierra y obtiene resultado
 */

import { apiPost } from '../client';
import { toActivityDto, toBackendAnswer, type BackendActivityDto } from '../mappers/activityMapper';
import type { ShortEvalSessionDto, AnswerPayload, ShortEvalResultDto } from '../types';

/**
 * Inicia una evaluación corta sumativa para un paso de la ruta.
 * El backend devuelve los 3 ítems de evaluación para el concepto del paso.
 *
 * @param subjectId - UUID de la asignatura
 * @param stepId    - UUID del paso de la ruta (PathStep) que se está evaluando
 */
export function startShortEval(subjectId: string, stepId: string): Promise<ShortEvalSessionDto> {
  return apiPost<{
    session: { id: string; conceptId: string; pathStepId: string; attempt: number; state: string };
    activities: BackendActivityDto[];
  }>(`/subjects/${subjectId}/path-steps/${stepId}/short-evaluations`).then(({ session, activities }) => ({
    id: session.id,
    subjectId,
    stepId: session.pathStepId,
    estado: session.state as ShortEvalSessionDto['estado'],
    activities: activities.map(toActivityDto),
  }));
}

/**
 * Envía la respuesta de un ítem durante la evaluación sumativa.
 * En modo evaluación el backend NO revela si la respuesta es correcta de inmediato
 * (sin pistas) — el veredicto llega al finalizar con finishShortEval.
 *
 * @param sessionId  - UUID de la sesión de evaluación activa
 * @param activityId - UUID de la actividad respondida
 * @param payload    - { optionId?, respuesta?, seconds }
 */
export function sendEvalAnswer(
  sessionId: string,
  activityId: string,
  payload: AnswerPayload,
): Promise<void> {
	return apiPost<{ id: string; activityId: string; recorded: string }>(
    `/short-evaluations/${sessionId}/answers/${activityId}`,
    toBackendAnswer(payload),
  ).then(() => undefined);
}

/**
 * Finaliza la sesión de evaluación sumativa y obtiene el resultado.
 * El resultado incluye el puntaje, si aprobó (≥70%) y el nuevo estado del paso.
 *
 * @param sessionId - UUID de la sesión de evaluación
 */
export function finishShortEval(sessionId: string): Promise<ShortEvalResultDto> {
  return apiPost<{
    sessionId: string;
    score: number;
    approved: boolean;
    stepState: ShortEvalResultDto['newStepEstado'];
    recalculated: boolean;
  }>(`/short-evaluations/${sessionId}/finish`).then((result) => ({
    sessionId: result.sessionId,
    score: result.score,
    passed: result.approved,
    newStepEstado: result.stepState,
    recalculated: result.recalculated,
  }));
}
