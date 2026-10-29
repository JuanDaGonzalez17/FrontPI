/**
 * historyApi.ts
 * Servicio para consultar el historial de actividad del estudiante.
 */

import { apiGet } from '../client';
import type { ActivityHistoryItemDto } from '../types';

/**
 * Obtiene las actividades recientes de una asignatura (hasta 50, más recientes primero).
 *
 * @param subjectId - UUID de la asignatura
 */
export async function getActivityHistory(subjectId: string): Promise<ActivityHistoryItemDto[]> {
  const history = await apiGet<unknown>(`/subjects/${subjectId}/history`);
  return Array.isArray(history) ? (history as ActivityHistoryItemDto[]) : [];
}
