/**
 * diagnosticApi.ts
 * Servicio para el flujo de Diagnóstico Inicial.
 *
 * Ciclo:
 *   1. startDiagnostic(subjectId)       → crea sesión y devuelve preguntas
 *   2. sendAnswer(sessionId, actId, payload) → envía respuesta actividad a actividad
 *   3. finishDiagnostic(sessionId)       → cierra la sesión
 *   4. getProfile(subjectId)             → devuelve la maestría estimada por concepto
 */

import { apiGet, apiPost } from '../client';
import type {
  DiagnosticSessionDto,
  ActivityDto,
  AnswerPayload,
  AnswerResultDto,
  DiagnosticProfileDto,
} from '../types';

/**
 * Inicia un diagnóstico para la asignatura indicada.
 * El backend crea la sesión y devuelve las actividades de diagnóstico.
 */
export function startDiagnostic(subjectId: string): Promise<DiagnosticSessionDto> {
	return apiPost<{
		session: { id: string; subjectId: string; state: string };
		activities: {
			id: string;
			conceptId: string;
			statement: string;
			difficulty: number;
			type: ActivityDto['tipo'];
			options: { id: string; text: string }[];
		}[];
	}>(`/subjects/${subjectId}/diagnostics`).then(({ session, activities }) => ({
		id: session.id,
		subjectId: session.subjectId,
		estado: session.state as DiagnosticSessionDto['estado'],
		activities: activities.map((activity) => ({
			id: activity.id,
			conceptId: activity.conceptId,
			enunciado: activity.statement,
			dificultad: activity.difficulty,
			tipo: activity.type,
			options: activity.options,
		})),
	}));
}

/**
 * Envía la respuesta de un ítem de diagnóstico.
 *
 * @param sessionId  - UUID de la sesión de diagnóstico activa
 * @param activityId - UUID de la actividad respondida
 * @param payload    - { optionId?, respuesta?, seconds }
 */
export function sendAnswer(
  sessionId: string,
  activityId: string,
  payload: AnswerPayload,
): Promise<AnswerResultDto> {
  return apiPost<AnswerResultDto>(
    `/diagnostics/${sessionId}/answers/${activityId}`,
    { optionId: payload.optionId, answer: payload.respuesta, seconds: payload.seconds },
  );
}

/**
 * Finaliza la sesión de diagnóstico para que el backend calcule los niveles iniciales.
 */
export function finishDiagnostic(sessionId: string): Promise<void> {
  return apiPost<void>(`/diagnostics/${sessionId}/finish`);
}

/**
 * Obtiene el perfil de maestría estimado tras el diagnóstico.
 * Devuelve un porcentaje por concepto para mostrarlo en DiagSummary.
 *
 * @param subjectId - UUID de la asignatura
 */
export function getProfile(studentId: string, subjectId: string): Promise<DiagnosticProfileDto> {
	return apiGet<DiagnosticProfileDto>(`/students/${studentId}/subjects/${subjectId}/knowledge-profile`);
}
