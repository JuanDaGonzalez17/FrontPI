/**
 * globalExamApi.ts
 * Servicio para el Examen Global (solo disponible cuando la ruta está COMPLETADA).
 *
 * Ciclo:
 *   1. startGlobalExam(subjectId)                      → crea el examen global
 *   2. sendExamAnswer(examId, activityId, payload)     → envía cada respuesta
 *   3. finishGlobalExam(examId)                        → cierra y obtiene resultados finales
 */

import { apiPost } from '../client';
import { toActivityDto, type BackendActivityDto } from '../mappers/activityMapper';
import type { GlobalExamDto, AnswerPayload, GlobalExamResultDto } from '../types';

/**
 * Inicia el examen global para la asignatura.
 * Lanzará 409 Conflict si la ruta de la asignatura no está en estado COMPLETADA.
 * El frontend debe verificar el estado de la ruta antes de llamar a esta función.
 *
 * @param subjectId - UUID de la asignatura
 */
export function startGlobalExam(subjectId: string): Promise<GlobalExamDto> {
	return apiPost<{
		id: string;
		attempt: number;
		state: string;
		activities: BackendActivityDto[];
	}>(`/subjects/${subjectId}/global-exams`).then((exam) => ({
		id: exam.id,
		attempt: exam.attempt,
		estado: exam.state as GlobalExamDto['estado'],
		activities: exam.activities.map(toActivityDto),
	}));
}

/**
 * Envía la respuesta de un ítem del examen global.
 *
 * @param examId     - UUID del examen global activo
 * @param activityId - UUID de la actividad respondida
 * @param payload    - { optionId?, respuesta?, seconds }
 */
export function sendExamAnswer(
  examId: string,
  activityId: string,
  payload: AnswerPayload,
): Promise<void> {
	return apiPost<{ id: string; activityId: string; message: string }>(
    `/global-exams/${examId}/answers/${activityId}`,
    { optionId: payload.optionId, text: payload.respuesta, seconds: payload.seconds },
  ).then(() => undefined);
}

/**
 * Finaliza el examen global y obtiene el resultado completo.
 * Incluye la maestría acumulada por cada uno de los conceptos de la asignatura.
 *
 * @param examId - UUID del examen global
 */
export function finishGlobalExam(examId: string): Promise<GlobalExamResultDto> {
	return apiPost<{
		id: string;
		attempt: number;
		score: number;
		passed: boolean;
		concepts: GlobalExamResultDto['concepts'];
	}>(`/global-exams/${examId}/finish`).then((result) => ({
		examId: result.id,
		attempt: result.attempt,
		score: result.score,
		passed: result.passed,
		concepts: result.concepts,
	}));
}
