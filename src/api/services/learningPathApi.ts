/**
 * learningPathApi.ts
 * Servicio para gestionar la Ruta de Aprendizaje personalizada del estudiante.
 *
 * Ciclo:
 *   1. generatePath(subjectId)   → genera (o regenera) la ruta tras el diagnóstico
 *   2. getActivePath(subjectId)  → consulta la ruta activa con sus pasos y estados
 *   3. getNextStep(subjectId)    → obtiene el siguiente paso disponible
 */

import { apiGet, apiPost } from '../client';
import type { LearningPathDto, PathStepDto } from '../types';

/**
 * Genera la ruta de aprendizaje para la asignatura dada.
 * Se invoca una vez tras finalizar el diagnóstico inicial o al reiniciar el progreso.
 *
 * @param subjectId - UUID de la asignatura
 */
export function generatePath(subjectId: string): Promise<LearningPathDto> {
  return apiPost<LearningPathDto>(`/subjects/${subjectId}/learning-path`);
}

/**
 * Obtiene la ruta de aprendizaje activa del estudiante para la asignatura.
 * Puede lanzar un 404 si el estudiante aún no tiene ruta (recién registrado).
 *
 * @param subjectId - UUID de la asignatura
 */
export function getActivePath(subjectId: string): Promise<LearningPathDto> {
  return apiGet<LearningPathDto>(`/subjects/${subjectId}/learning-path`);
}

/**
 * Obtiene el siguiente paso de la ruta con estado DISPONIBLE o EN_PROGRESO.
 * Útil para guiar al estudiante al siguiente concepto a trabajar.
 *
 * @param subjectId - UUID de la asignatura
 */
export function getNextStep(subjectId: string): Promise<PathStepDto> {
  return apiGet<PathStepDto>(`/subjects/${subjectId}/learning-path/next-step`);
}
