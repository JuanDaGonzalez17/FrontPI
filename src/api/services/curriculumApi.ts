/**
 * curriculumApi.ts
 * Servicio para acceder a los datos del currículo: asignaturas, conceptos y prerrequisitos.
 */

import { apiGet } from '../client';
import type { SubjectDto, ConceptDto, PrerequisiteDto } from '../types';

/**
 * Obtiene la lista de todas las asignaturas disponibles en el sistema.
 */
export function getSubjects(): Promise<SubjectDto[]> {
  return apiGet<SubjectDto[]>('/subjects');
}

/**
 * Obtiene la información de una asignatura por su ID.
 */
export function getSubject(subjectId: string): Promise<SubjectDto> {
  return apiGet<SubjectDto>(`/subjects/${subjectId}`);
}

/**
 * Obtiene todos los conceptos que pertenecen a una asignatura.
 *
 * @param subjectId - UUID de la asignatura
 */
export function getConcepts(subjectId: string): Promise<ConceptDto[]> {
  return apiGet<ConceptDto[]>(`/subjects/${subjectId}/concepts`);
}

/**
 * Obtiene la lista de prerrequisitos de un concepto dado.
 * Cada entrada representa una arista (prerequisiteId → conceptId) en el DAG.
 *
 * @param conceptId - UUID del concepto cuyos prerrequisitos se desean conocer
 */
export function getPrerequisites(conceptId: string): Promise<PrerequisiteDto[]> {
  return apiGet<PrerequisiteDto[]>(`/concepts/${conceptId}/prerequisites`);
}
