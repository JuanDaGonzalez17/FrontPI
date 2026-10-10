import { CONCEPTS, REVIEWS, THRESH, type Id } from "./data";

export type Screen =
  | "home" | "subjects" | "subject"
  | "diag-intro" | "diag" | "diag-summary" | "path-new"
  | "path" | "concept" | "activity" | "activities-done"
  | "eval-intro" | "eval" | "eval-result"
  | "review-list" | "review" | "review-result"
  | "progress" | "final-ready" | "global-intro" | "global" | "global-result"
  | "spec";

export type Status = "mastered" | "reinforce" | "pending";

export interface HistoryItem {
  kind: "Diagnóstico" | "Evaluación" | "Repaso" | "Global";
  label: string;
  score: number | null;
  passed: boolean | null;
  date: string;
}

export interface Profile {
  diagnosed: boolean;
  mastery: Record<Id, number>;
  current: Id | null;
  reinforce: Id[];
  weakSkills: string[];
  evalAttempts: number;
  practiceDone: boolean;
  reinforceDone: boolean;
  history: HistoryItem[];
  reviews: Partial<Record<Id, { dueIn: number; fails: number }>>;
}

export interface EvalResult {
  id: Id;
  score: number;
  passed: boolean;
  skills: { skill: string; ok: number; n: number }[];
  weak: string[];
  attempt: number;
  nextId: Id | null;
}

export interface ReviewResult {
  id: Id;
  ok: boolean;
  fails: number;
  nextDays: number;
  mastery: number;
  nextCurrent: Id | null;
  explain: string;
}

export interface GlobalResult {
  score: number;
  strong: Id[];
  weak: Id[];
}

export const zero = () => Object.fromEntries(CONCEPTS.map((c) => [c.id, 0])) as Record<Id, number>;

export const status = (p: Profile, id: Id): Status =>
  p.reinforce.includes(id) ? "reinforce" : p.mastery[id] >= THRESH ? "mastered" : "pending";

export const firstOpen = (p: Profile): Id | null =>
  CONCEPTS.find((c) => status(p, c.id) !== "mastered")?.id ?? null;

export const masteredCount = (p: Profile) => CONCEPTS.filter((c) => status(p, c.id) === "mastered").length;
export const overallMastery = (p: Profile) => CONCEPTS.reduce((a, c) => a + p.mastery[c.id], 0) / CONCEPTS.length;
export const dueList = (p: Profile) =>
  (Object.entries(p.reviews) as [Id, { dueIn: number; fails: number }][])
    .filter(([, r]) => r)
    .sort((a, b) => a[1].dueIn - b[1].dueIn);
export const dueToday = (p: Profile) => dueList(p).filter(([, r]) => r.dueIn <= 0);
export const dueLabel = (d: number) => (d <= 0 ? "Hoy" : d === 1 ? "Mañana" : `En ${d} días`);
export const hasBank = (id: Id) => !!REVIEWS[id];

export interface NextAction {
  state: string;
  tone: "brass" | "sage" | "clay";
  label: string;
  screen: Screen;
}

export function nextAction(p: Profile): NextAction {
  if (!p.diagnosed) return { state: "Diagnóstico pendiente", tone: "brass", label: "Comenzar diagnóstico", screen: "diag-intro" };
  if (!p.current) return { state: "Ruta completada", tone: "sage", label: "Hacer la evaluación global", screen: "final-ready" };
  if (p.reinforce.includes(p.current))
    return p.reinforceDone
      ? { state: "Refuerzo completado", tone: "clay", label: "Realizar nuevo intento", screen: "eval-intro" }
      : { state: "En refuerzo", tone: "clay", label: "Continuar refuerzo", screen: "concept" };
  if (p.practiceDone) return { state: "Listo para evaluar", tone: "brass", label: "Realizar evaluación", screen: "eval-intro" };
  return { state: "En progreso", tone: "brass", label: "Continuar estudiando", screen: "concept" };
}

export const fresh = (): Profile => ({
  diagnosed: false, mastery: zero(), current: null, reinforce: [], weakSkills: [],
  evalAttempts: 0, practiceDone: false, reinforceDone: false, history: [], reviews: {},
});

export const diagnosed = (): Profile => ({
  ...fresh(),
  diagnosed: true,
  mastery: { ...zero(), prim: 0.92, reglas: 0.85, metodos: 0.45, definida: 0.3, tfc: 0.1 },
  current: "metodos",
  reviews: { reglas: { dueIn: 0, fails: 0 }, prim: { dueIn: 3, fails: 0 } },
  history: [{ kind: "Diagnóstico", label: "Diagnóstico inicial", score: null, passed: null, date: "29 sep" }],
});

export const afterPass = (): Profile => ({
  ...diagnosed(),
  mastery: { ...diagnosed().mastery, metodos: 0.82 },
  current: "definida",
  reviews: { metodos: { dueIn: 0, fails: 0 }, reglas: { dueIn: 2, fails: 0 }, prim: { dueIn: 5, fails: 0 } },
  history: [
    { kind: "Evaluación", label: "Métodos de integración", score: 82, passed: true, date: "03 oct" },
    { kind: "Evaluación", label: "Reglas de integración", score: 55, passed: false, date: "01 oct" },
    { kind: "Diagnóstico", label: "Diagnóstico inicial", score: null, passed: null, date: "29 sep" },
  ],
});

export const failedEval = (): Profile => ({
  ...diagnosed(),
  mastery: { ...diagnosed().mastery, metodos: 0.5 },
  reinforce: ["metodos"],
  weakSkills: ["Fracciones parciales", "Sustitución trigonométrica"],
  evalAttempts: 1,
  practiceDone: true,
  history: [
    { kind: "Evaluación", label: "Métodos de integración", score: 55, passed: false, date: "Hoy" },
    { kind: "Diagnóstico", label: "Diagnóstico inicial", score: null, passed: null, date: "29 sep" },
  ],
});

export const completed = (): Profile => ({
  ...fresh(),
  diagnosed: true,
  mastery: { prim: 0.96, reglas: 0.92, metodos: 0.88, definida: 0.9, tfc: 0.87, area: 0.85, impropia: 0.78, longitud: 0.84, solidos: 0.8, series: 0.76, centroides: 0.82, pappus: 0.79 },
  current: null,
  reviews: { metodos: { dueIn: 1, fails: 0 }, reglas: { dueIn: 4, fails: 0 }, prim: { dueIn: 9, fails: 0 } },
  history: [
    { kind: "Evaluación", label: "Teorema de Pappus", score: 79, passed: true, date: "Hoy" },
    { kind: "Evaluación", label: "Centros de masa y centroides", score: 82, passed: true, date: "04 oct" },
    { kind: "Evaluación", label: "Series y sucesiones", score: 76, passed: true, date: "02 oct" },
    { kind: "Diagnóstico", label: "Diagnóstico inicial", score: null, passed: null, date: "29 sep" },
  ],
});

export const levelOf = (score: number) =>
  score >= 90 ? "Dominio completo" : score >= 80 ? "Avanzado" : score >= 70 ? "Sólido" : score >= 50 ? "En desarrollo" : "Inicial";
