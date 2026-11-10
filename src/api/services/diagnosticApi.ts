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

import { apiFetch, apiGet, apiPost } from '../client';
import { toActivityDto, toBackendAnswer, type BackendActivityDto } from '../mappers/activityMapper';
import type {
  DiagnosticSessionDto,
  AnswerPayload,
  DiagnosticProfileDto,
  DiagnosticAbandonmentDto,
} from '../types';

/**
 * Inicia un diagnóstico para la asignatura indicada.
 * El backend crea la sesión y devuelve las actividades de diagnóstico.
 */
export function startDiagnostic(subjectId: string): Promise<DiagnosticSessionDto> {
	return apiPost<{
		session: { id: string; subjectId: string; state: string };
		activities: BackendActivityDto[];
	}>(`/subjects/${subjectId}/diagnostics`).then(({ session, activities }) => ({
		id: session.id,
		subjectId: session.subjectId,
		estado: session.state as DiagnosticSessionDto['estado'],
		activities: activities.map(toActivityDto),
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
): Promise<void> {
	return apiPost<{ id: string; activityId: string; recorded: string }>(
    `/diagnostics/${sessionId}/answers/${activityId}`,
    toBackendAnswer(payload),
  ).then(() => undefined);
}

/**
 * Finaliza la sesión de diagnóstico para que el backend calcule los niveles iniciales.
 */
export function finishDiagnostic(sessionId: string): Promise<void> {
  return apiPost<void>(`/diagnostics/${sessionId}/finish`);
}

/**
 * Abandona explícitamente una sesión de diagnóstico en progreso.
 * La identidad se envía de forma explícita para evitar abandonar una sesión
 * con un estudiante distinto al autenticado.
 */
export function abandonDiagnostic(sessionId: string, studentId: string): Promise<DiagnosticAbandonmentDto> {
  return apiFetch<DiagnosticAbandonmentDto>(`/diagnostics/${sessionId}/abandon`, {
    method: 'POST',
    body: {},
    headers: { 'X-Student-Id': studentId },
  });
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
