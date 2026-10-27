import type { ActivityDto, ActivityType } from "../types";

export interface BackendActivityDto {
  id: string;
  conceptId: string;
  statement: string;
  difficulty: number;
  type: ActivityType;
  options?: { id: string; text: string }[];
}

export function toActivityDto(activity: BackendActivityDto): ActivityDto {
  return {
    id: activity.id,
    conceptId: activity.conceptId,
    enunciado: activity.statement,
    dificultad: activity.difficulty,
    tipo: activity.type,
    options: activity.options ?? [],
  };
}

export function toBackendAnswer(payload: {
  optionId?: string;
  respuesta?: string;
  seconds: number;
}) {
  return {
    optionId: payload.optionId,
    answer: payload.respuesta,
    seconds: payload.seconds,
  };
}
