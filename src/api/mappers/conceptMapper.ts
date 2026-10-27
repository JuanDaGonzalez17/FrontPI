/**
 * conceptMapper.ts
 * Mapeo bidireccional entre los slugs del frontend (Id) y los UUIDs del backend (Cognia).
 *
 * El backend entrega UUIDs persistidos en la base de datos.
 * El frontend trabaja internamente con códigos cortos/slugs para el layout del grafo.
 *
 * Al cargar los conceptos desde el backend, se construye el mapa dinámicamente
 * buscando coincidencias por el campo `codigo` del ConceptDto.
 */

import type { ConceptDto, PathStepDto, PathStepEstado } from '../types';
import { CONCEPTS, type Id } from '../../data';
import type { Status } from '../../state';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Mapa de UUID de backend → slug de frontend */
export type UuidToSlug = Map<string, Id>;
/** Mapa de slug de frontend → UUID de backend */
export type SlugToUuid = Map<Id, string>;

export interface ConceptMaps {
  uuidToSlug: UuidToSlug;
  slugToUuid: SlugToUuid;
  conceptBySlug: Map<Id, ConceptDto>;
}

const BACKEND_CODE_TO_FRONTEND_ID: Record<string, Id> = {
  'C0.1': 'prim',
  'C1.1': 'reglas',
  'C2.1': 'definida',
  'C3.1': 'impropia',
};

// ---------------------------------------------------------------------------
// Construcción del mapeador desde la respuesta del backend
// ---------------------------------------------------------------------------

/**
 * Construye los mapas bidireccionales a partir de los conceptos devueltos por la API.
 *
 * El backend debe devolver `codigo` que coincida con los slugs del frontend
 * (e.g., "prim", "reglas", "metodos", etc.).
 *
 * Si un concepto del backend no coincide con ningún slug conocido,
 * se ignora (no afecta al grafo visual existente).
 */
export function buildConceptMaps(concepts: ConceptDto[]): ConceptMaps {
  const uuidToSlug: UuidToSlug = new Map();
  const slugToUuid: SlugToUuid = new Map();
  const conceptBySlug: Map<Id, ConceptDto> = new Map();

  for (const c of concepts) {
    const slug = BACKEND_CODE_TO_FRONTEND_ID[c.code]
      ?? CONCEPTS.find((concept) => concept.id === c.code)?.id;
    if (!slug) continue;
    uuidToSlug.set(c.id, slug);
    slugToUuid.set(slug, c.id);
    conceptBySlug.set(slug, c);
  }

  return { uuidToSlug, slugToUuid, conceptBySlug };
}

// ---------------------------------------------------------------------------
// Conversión de estados del backend → estados del frontend
// ---------------------------------------------------------------------------

/**
 * Convierte el estado de un paso de ruta del backend al estado visual del frontend.
 *
 * Backend (PathStepEstado) → Frontend (Status):
 *   DOMINADO   → "mastered"
 *   REFUERZO   → "reinforce"
 *   BLOQUEADO  → "pending"
 *   DISPONIBLE → "pending"
 *   EN_PROGRESO→ "pending"  (es el `current` de la UI)
 */
export function backendStepToStatus(estado: PathStepEstado): Status {
  switch (estado) {
    case 'DOMINADO':
      return 'mastered';
    case 'REFUERZO':
      return 'reinforce';
    default:
      return 'pending';
  }
}

/**
 * Determina si un PathStep es el "actual" (el que está en progreso).
 */
export function isCurrentStep(step: PathStepDto): boolean {
  return step.state === 'EN_PROGRESO' || step.state === 'DISPONIBLE';
}

// ---------------------------------------------------------------------------
// Conversión de LearningPathDto → estructura de mastery del frontend
// ---------------------------------------------------------------------------

import type { LearningPathDto } from '../types';
import type { Profile } from '../../state';

/**
 * Aplica los datos de una LearningPathDto sobre un Profile del frontend.
 * Actualiza: mastery, reinforce, current.
 *
 * @param profile  - Perfil actual del frontend
 * @param path     - Ruta de aprendizaje devuelta por el backend
 * @param maps     - Mapas de conversión UUID ↔ slug
 */
export function applyLearningPath(
  profile: Profile,
  path: LearningPathDto,
  maps: ConceptMaps,
): Profile {
  const np: Profile = {
    ...profile,
    routeComplete: path.state === 'COMPLETADA',
    routeConcepts: [],
    routeDetails: {},
    mastery: { ...profile.mastery },
    reinforce: [],
    reviews: { ...profile.reviews },
  };

  let current: Id | null = null;

  for (const step of path.steps) {
    const slug = maps.uuidToSlug.get(step.conceptId);
    if (!slug) continue;
    if (!np.routeConcepts.includes(slug)) np.routeConcepts.push(slug);
    const concept = maps.conceptBySlug.get(slug);
    if (concept) np.routeDetails[slug] = { name: concept.name, description: concept.description };

    switch (step.state) {
      case 'DOMINADO':
        np.mastery[slug] = Math.max(np.mastery[slug] ?? 0, 0.75);
        break;
      case 'REFUERZO':
        np.reinforce.push(slug);
        if (!current) current = slug;
        break;
      case 'EN_PROGRESO':
        if (!current) current = slug;
        break;
      case 'DISPONIBLE':
        if (!current) current = slug;
        break;
      case 'BLOQUEADO':
        np.mastery[slug] = np.mastery[slug] ?? 0;
        break;
    }
  }

  np.current = current;
  return np;
}

// ---------------------------------------------------------------------------
// Conversión de DiagnosticProfileDto → mastery del frontend
// ---------------------------------------------------------------------------

import type { DiagnosticProfileDto } from '../types';

/**
 * Convierte el perfil diagnóstico del backend a los valores de mastery del frontend.
 *
 * @param diagProfile - perfil devuelto por GET /knowledge-profile
 * @param maps        - Mapas de conversión UUID ↔ slug
 * @returns           - Record<Id, number> con los valores de mastery 0.0–1.0
 */
export function diagProfileToMastery(
  diagProfile: DiagnosticProfileDto,
  maps: ConceptMaps,
): Partial<Record<Id, number>> {
  const mastery: Partial<Record<Id, number>> = {};
  for (const cm of diagProfile.concepts) {
    const slug = maps.uuidToSlug.get(cm.conceptId);
    if (slug) {
      mastery[slug] = cm.mastery;
    }
  }
  return mastery;
}
