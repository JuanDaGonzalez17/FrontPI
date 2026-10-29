import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { BarChart3, CalendarClock, Home as HomeIcon, Library, Route } from "lucide-react";
import { CONCEPTS, THRESH, byId, type Id } from "./data";
import {
  ActivitiesDone, ConceptScreen, EvalIntro, EvalResultScreen, FinalReady, GlobalIntro,
  GlobalResultScreen, ProgressScreen, ReviewList, ReviewResultScreen,
} from "./screens2";
import { DiagIntro, DiagSummary, Home, PathNew, PathScreen, Subject, Subjects, type Ctx } from "./screens";
import {
  firstOpen, fresh, isRouteComplete, routeConceptCount, routeMasteredCount, nextAction, zero,
  type EvalResult, type GlobalResult, type Profile, type ReviewResult, type Screen,
} from "./state";
import { Ring, cx, pct } from "./ui";
import { DiagnosticRunner } from "./DiagnosticRunner";
import { PracticeRunner } from "./PracticeRunner";
import { EvalRunner } from "./EvalRunner";
import { GlobalExamRunner } from "./GlobalExamRunner";
import { ReviewRunner } from "./ReviewRunner";
import { reviewApi, globalExamApi, getActivityHistory } from "./api";
import { evaluationApi } from "./api";
import { diagnosticApi, curriculumApi, learningPathApi } from "./api";
import { buildConceptMaps, diagProfileToMastery, applyLearningPath, type ConceptMaps } from "./api/mappers/conceptMapper";
import { mapHistory, mapReviews } from "./api/mappers/historyMapper";
import { useAuth } from "./context/AuthContext";
import { CogniaApiError } from "./api/client";
import type { ActivityDto, DiagnosticProfileDto, LearningPathDto, ShortEvalResultDto, ReviewQueueItemDto, ReviewSessionResultDto, GlobalExamResultDto } from "./api/types";

const SUBJECT_ID = "10000000-0000-0000-0000-000000000001";

async function getOrCreateLearningPath() {
  try {
    return await learningPathApi.getActivePath(SUBJECT_ID);
  } catch (error) {
    if (!(error instanceof CogniaApiError) || error.apiError.status !== 404) throw error;
    return learningPathApi.generatePath(SUBJECT_ID);
  }
}

async function optionalBackendData<T>(label: string, request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request();
  } catch (error) {
    console.warn(`No se pudo cargar ${label}.`, error);
    if (error instanceof CogniaApiError && error.apiError.status === 401) throw error;
    return fallback;
  }
}

const NAV: { label: string; screen: Screen; icon: typeof HomeIcon; group: Screen[] }[] = [
  { label: "Inicio", screen: "home", icon: HomeIcon, group: ["home"] },
  { label: "Mis asignaturas", screen: "subjects", icon: Library, group: ["subjects", "subject", "diag-intro", "diag-summary"] },
  { label: "Mi ruta", screen: "path", icon: Route, group: ["path", "path-new", "concept", "activities-done", "eval-intro", "eval-result"] },
  { label: "Repasos", screen: "review-list", icon: CalendarClock, group: ["review-list", "review-result"] },
  { label: "Progreso", screen: "progress", icon: BarChart3, group: ["progress", "final-ready", "global-intro", "global-result"] },
];
const FOCUS: Screen[] = ["diag", "activity", "eval", "review", "global"];

export default function App() {
  const auth = useAuth();
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [p, setP] = useState<Profile>(fresh());
  const [recognized, setRecognized] = useState<Id[]>([]);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [globalResult, setGlobalResult] = useState<GlobalResult | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Id | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [diagSessionId, setDiagSessionId] = useState<string | null>(null);
  const [diagActivities, setDiagActivities] = useState<ActivityDto[]>([]);
  const [diagMaps, setDiagMaps] = useState<ConceptMaps | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [pathLoading, setPathLoading] = useState(false);
  const [learningPath, setLearningPath] = useState<LearningPathDto | null>(null);
  const [evalSessionId, setEvalSessionId] = useState<string | null>(null);
  const [evalActivities, setEvalActivities] = useState<ActivityDto[]>([]);
  const [evalLoading, setEvalLoading] = useState(false);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewQueueItemDto[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [globalExamSessionId, setGlobalExamSessionId] = useState<string | null>(null);
  const [globalExamActivities, setGlobalExamActivities] = useState<ActivityDto[]>([]);
  const [globalExamLoading, setGlobalExamLoading] = useState(false);
  const [diagnosticPathError, setDiagnosticPathError] = useState<string | null>(null);
  const [diagnosticFinalized, setDiagnosticFinalized] = useState(false);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const refreshGeneration = useRef(0);
  const diagnosticRetrying = useRef(false);
  const diagnosticPathLock = useRef(false);

  const nav = useCallback((s: Screen) => setScreen(s), []);

  const startDiagnostic = useCallback(async () => {
    setDiagLoading(true);
    setDiagnosticFinalized(false);
    setDiagnosticPathError(null);
    try {
      const [session, concepts] = await Promise.all([
        diagnosticApi.startDiagnostic(SUBJECT_ID),
        curriculumApi.getConcepts(SUBJECT_ID),
      ]);
      setDiagSessionId(session.id);
      setDiagActivities(session.activities);
      setDiagMaps(buildConceptMaps(concepts));
      nav("diag");
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "No se pudo iniciar el diagnóstico.");
    } finally {
      setDiagLoading(false);
    }
  }, [nav]);

  const ensurePath = useCallback(async () => {
    setPathLoading(true);
    try {
      const path = await getOrCreateLearningPath();
      const concepts = await curriculumApi.getConcepts(SUBJECT_ID);
      const maps = buildConceptMaps(concepts);
      setLearningPath(path);
      setP((prev) => applyLearningPath(prev, path, maps));
      setFlash(null);
    } catch (e) {
      throw e;
    } finally {
      setPathLoading(false);
    }
  }, []);

  const refreshHistory = useCallback(async (apply = true) => {
    const results = await Promise.allSettled([
      curriculumApi.getConcepts(SUBJECT_ID),
      reviewApi.getDueReviews(SUBJECT_ID),
      reviewApi.getUpcomingReviews(SUBJECT_ID),
      getActivityHistory(SUBJECT_ID),
    ]);
    const [concepts, due, upcoming, history] = results;
    const warnings: string[] = [];
    if (concepts.status === "rejected") { console.warn("No se pudieron cargar los conceptos para mapear repasos.", concepts.reason); warnings.push("mapeo de repasos"); }
    if (due.status === "rejected") { console.warn("No se pudieron cargar los repasos vencidos.", due.reason); warnings.push("repasos vencidos"); }
    if (upcoming.status === "rejected") { console.warn("No se pudieron cargar los repasos futuros.", upcoming.reason); warnings.push("repasos futuros"); }
    if (history.status === "rejected") { console.warn("No se pudo cargar el historial de actividad.", history.reason); warnings.push("historial"); }
    const maps = buildConceptMaps(concepts.status === "fulfilled" ? concepts.value : []);
    const now = new Date();
    const snapshot = {
      history: history.status === "fulfilled" ? mapHistory(history.value, now) : null,
      reviews: concepts.status === "fulfilled" && due.status === "fulfilled" && upcoming.status === "fulfilled"
        ? mapReviews(due.value, upcoming.value, now, maps.uuidToSlug)
        : null,
      conceptMaps: maps,
      warnings,
    };
    if (apply) {
      setP((previous) => ({ ...previous, ...(snapshot.history ? { history: snapshot.history } : {}), ...(snapshot.reviews ? { reviews: snapshot.reviews } : {}) }));
    }
    return snapshot;
  }, []);

  const refreshKnowledgeProfile = useCallback(async () => {
    if (!auth.user) throw new Error("No hay una sesión activa para actualizar el dominio.");
    const [concepts, profile] = await Promise.all([
      curriculumApi.getConcepts(SUBJECT_ID),
      diagnosticApi.getProfile(auth.user.id, SUBJECT_ID),
    ]);
    const maps = buildConceptMaps(concepts);
    return { mastery: diagProfileToMastery(profile, maps), maps };
  }, [auth.user?.id]);

  const synchronizeProgress = useCallback(async () => {
    const generation = ++refreshGeneration.current;
    const results = await Promise.allSettled([
      refreshHistory(false),
      refreshKnowledgeProfile(),
      (async () => {
        const path = await getOrCreateLearningPath();
        const concepts = await curriculumApi.getConcepts(SUBJECT_ID);
        return { path, maps: buildConceptMaps(concepts) };
      })(),
    ]);
    if (generation !== refreshGeneration.current) return;
    const [activity, knowledge, route] = results;
    const warnings: string[] = [];
    if (activity.status === "rejected") { console.warn("No se pudo actualizar historial y repasos.", activity.reason); warnings.push("historial y repasos"); }
    else warnings.push(...activity.value.warnings);
    if (knowledge.status === "rejected") { console.warn("No se pudo actualizar el dominio.", knowledge.reason); warnings.push("dominio"); }
    if (route.status === "rejected") { console.warn("No se pudo actualizar la ruta.", route.reason); warnings.push("ruta"); }
    setP((previous) => {
      let next = { ...previous };
      if (activity.status === "fulfilled") next = { ...next, ...(activity.value.history ? { history: activity.value.history } : {}), ...(activity.value.reviews ? { reviews: activity.value.reviews } : {}) };
      if (knowledge.status === "fulfilled") next = { ...next, mastery: { ...next.mastery, ...knowledge.value.mastery } };
      if (route.status === "fulfilled") next = applyLearningPath(next, route.value.path, route.value.maps);
      return next;
    });
    if (knowledge.status === "fulfilled") setRecognized(CONCEPTS.filter((concept) => (knowledge.value.mastery[concept.id] ?? 0) >= THRESH).map((concept) => concept.id));
    if (route.status === "fulfilled") setLearningPath(route.value.path);
    setSyncWarning(warnings.length ? `No se pudo actualizar ${warnings.join(", ")}. Reintenta para sincronizar.` : null);
  }, [refreshHistory, refreshKnowledgeProfile]);

  const finishDiagnostic = useCallback(
    async (profile: DiagnosticProfileDto) => {
      if (diagnosticPathLock.current) return;
      diagnosticPathLock.current = true;
      if (diagMaps) {
        const mastery = diagProfileToMastery(profile, diagMaps);
        const nextProfile: Profile = {
          ...fresh(),
          diagnosed: profile.diagnosticCompleted,
          mastery: { ...zero(), ...mastery },
        };
        setP(nextProfile);
        setRecognized(CONCEPTS.filter((k) => (mastery[k.id] ?? 0) >= THRESH).map((k) => k.id));
        if (profile.diagnosticCompleted) {
          setDiagnosticFinalized(true);
          try { await ensurePath(); setDiagnosticPathError(null); nav("diag-summary"); }
          catch (error) { setDiagnosticPathError(error instanceof Error ? error.message : "No se pudo cargar la ruta de aprendizaje."); }
          finally { diagnosticPathLock.current = false; }
          return;
        }
      }
      diagnosticPathLock.current = false;
      nav("diag-summary");
    },
    [diagMaps, ensurePath, nav],
  );

  const retryDiagnosticPath = useCallback(async () => {
    if (diagnosticRetrying.current || diagnosticPathLock.current || !diagnosticFinalized) return;
    diagnosticPathLock.current = true;
    diagnosticRetrying.current = true;
    setDiagnosticPathError(null);
    try {
      await ensurePath();
      nav("diag-summary");
    } catch (error) {
      setDiagnosticPathError(error instanceof Error ? error.message : "No se pudo cargar la ruta de aprendizaje.");
    } finally {
      diagnosticPathLock.current = false;
      diagnosticRetrying.current = false;
    }
  }, [diagnosticFinalized, ensurePath, nav]);

  const startShortEval = useCallback(async () => {
    setEvalLoading(true);
    try {
      let path = learningPath;
      if (!path) {
        path = await getOrCreateLearningPath();
        setLearningPath(path);
      }
      const concepts = await curriculumApi.getConcepts(SUBJECT_ID);
      const maps = buildConceptMaps(concepts);
      const conceptId = p.current ? maps.slugToUuid.get(p.current) : null;
      const step = path.steps.find((s) => s.conceptId === conceptId);
      if (!step) throw new Error("No se encontró el paso actual en la ruta.");
      const session = await evaluationApi.startShortEval(SUBJECT_ID, step.id);
      setEvalSessionId(session.id);
      setEvalActivities(session.activities);
      nav("eval");
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "No se pudo iniciar la evaluación.");
    } finally {
      setEvalLoading(false);
    }
  }, [learningPath, p.current, nav]);

  const finishEvalBackend = useCallback(
    async (result: ShortEvalResultDto) => {
      const id = p.current!;
      const score = Math.round(result.score);
      const passed = result.passed;
      setEvalResult({
        id,
        score,
        passed,
        skills: [],
        weak: [],
        attempt: p.evalAttempts + 1,
        nextId: p.current,
      });
      setP((previous) => ({ ...previous, evalAttempts: previous.evalAttempts + 1 }));
      await synchronizeProgress();
      nav("eval-result");
    },
    [p.current, p.evalAttempts, synchronizeProgress, nav],
  );

  const startReviewSessionFlow = useCallback(async () => {
    setReviewLoading(true);
    try {
      const items = await reviewApi.getDueReviews(SUBJECT_ID);
      if (items.length === 0) {
        setFlash("No tienes tarjetas de repaso pendientes por ahora.");
        return;
      }
      const session = await reviewApi.startReviewSession(SUBJECT_ID);
      setReviewSessionId(session.id);
      setReviewItems(items);
      nav("review");
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "No se pudo iniciar el repaso.");
    } finally {
      setReviewLoading(false);
    }
  }, [nav]);

  const finishReviewBackend = useCallback(
    async (result: ReviewSessionResultDto) => {
      const amnesiaDetected = Boolean(result.amnesiaDetectada);
      const graded = result.grades[0];
      const queueItem = reviewItems.find((item) => item.progressId === graded?.progressId);
      let slug: Id | null = null;
      let mastery: number | null = null;
      try {
        const concepts = await curriculumApi.getConcepts(SUBJECT_ID);
        const maps = buildConceptMaps(concepts);
        slug = queueItem?.conceptId ? maps.uuidToSlug.get(queueItem.conceptId) ?? null : null;
        if (auth.user) {
          const profile = await diagnosticApi.getProfile(auth.user.id, SUBJECT_ID);
          const currentMastery = diagProfileToMastery(profile, maps);
          if (slug && currentMastery[slug] !== undefined) mastery = currentMastery[slug]!;
        }
      } catch {
        // Keep the result usable when refreshing the summary profile fails.
      }
      await synchronizeProgress();
      if (!slug) {
        setFlash("Repaso finalizado, pero no se pudo asociar la tarjeta con un concepto de la ruta.");
        nav("review-list");
        return;
      }
      setReviewResult({
        id: slug,
        reviewed: result.reviewed,
        remembered: result.remembered,
        ok: result.forgotten === 0,
        fails: amnesiaDetected ? 2 : Math.max(0, ...result.grades.map((grade) => {
          const item = reviewItems.find((entry) => entry.progressId === grade.progressId);
          return grade.grade < 3 ? (item?.consecutiveLapses ?? 0) + 1 : 0;
        })),
        nextDays: graded?.intervalDays ?? null,
        mastery,
        nextCurrent: null,
        explain: amnesiaDetected
          ? "Se detectó amnesia conceptual. Tu ruta se ha adaptado."
          : `${result.remembered} de ${result.reviewed} tarjetas se recordaron; la programación se actualizó según tus respuestas.`,
      });
      nav("review-result");
    },
    [auth.user, reviewItems, synchronizeProgress, nav],
  );

  const startGlobalExamFlow = useCallback(async () => {
    setGlobalExamLoading(true);
    try {
      const session = await globalExamApi.startGlobalExam(SUBJECT_ID);
      setGlobalExamSessionId(session.id);
      setGlobalExamActivities(session.activities);
      nav("global");
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "No se pudo iniciar el examen global.");
    } finally {
      setGlobalExamLoading(false);
    }
  }, [nav]);

  const finishGlobalExamBackend = useCallback(async (result: GlobalExamResultDto) => {
    const score = Math.round(result.score);
    const strong: Id[] = [];
    const weak: Id[] = [];
    try {
      const concepts = await curriculumApi.getConcepts(SUBJECT_ID);
      const maps = buildConceptMaps(concepts);
      for (const summary of result.concepts) {
        const slug = maps.uuidToSlug.get(summary.conceptId);
        if (!slug || summary.total <= 0) continue;
        (summary.correct / summary.total >= 0.7 ? strong : weak).push(slug);
      }
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "No se pudo actualizar el dominio tras el examen global.");
    }
    await synchronizeProgress();
    setGlobalResult({ score, passed: result.passed, strong, weak });
    nav("global-result");
  }, [nav, synchronizeProgress]);

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.isAuthenticated || !auth.user) {
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);

    const loadBackendProfile = async () => {
      try {
        const [backendProfile, path, activitySnapshot] = await Promise.all([
          diagnosticApi.getProfile(auth.user!.id, SUBJECT_ID),
          optionalBackendData("la ruta de aprendizaje", () => learningPathApi.getActivePath(SUBJECT_ID), null as LearningPathDto | null),
          refreshHistory(false),
        ]);
        const { history, reviews, conceptMaps: maps } = activitySnapshot;
        const mastery = diagProfileToMastery(backendProfile, maps);
        let loadedProfile: Profile = {
          ...fresh(),
          diagnosed: backendProfile.diagnosticCompleted,
          mastery: { ...zero(), ...mastery },
          history: history ?? [],
          reviews: reviews ?? {},
        };
        loadedProfile.current = firstOpen(loadedProfile);

        if (backendProfile.diagnosticCompleted && path) loadedProfile = applyLearningPath(loadedProfile, path, maps);

        if (!cancelled) {
          setDiagMaps(maps);
          setP(loadedProfile);
          setRecognized(CONCEPTS.filter((concept) => loadedProfile.mastery[concept.id] >= THRESH).map((concept) => concept.id));
          setFlash(null);
        }
      } catch (error) {
        if (error instanceof CogniaApiError && error.apiError.status === 401) {
          auth.logout();
        } else if (!cancelled && error instanceof CogniaApiError && error.apiError.status === 404) {
          setP(fresh());
          setRecognized([]);
        } else if (!cancelled) {
          setFlash(error instanceof Error ? error.message : "No se pudo cargar tu perfil desde el backend.");
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    void loadBackendProfile();
    return () => {
      cancelled = true;
    };
  }, [auth.isLoading, auth.isAuthenticated, auth.user?.id, auth.logout, refreshHistory]);

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-fg">
        <div className="font-mono text-sm text-muted">Cargando sesión…</div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    const submit = async (e: FormEvent) => {
      e.preventDefault();
      setAuthError(null);
      setAuthSubmitting(true);
      try {
        if (authMode === "login") {
          await auth.login(authEmail, authPassword);
        } else {
          await auth.register(authEmail, authPassword, authName);
        }
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : "Error de autenticación");
      } finally {
        setAuthSubmitting(false);
      }
    };
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-6 text-fg">
        <div className="w-full max-w-md rounded-md border border-line bg-surface p-8">
          <h1 className="text-2xl font-medium">Itinera</h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">Acceso al tutor adaptativo</p>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            {authMode === "register" && (
              <input
                className="w-full rounded border border-line bg-bg px-3 py-2"
                placeholder="Nombre completo"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
              />
            )}
            <input
              className="w-full rounded border border-line bg-bg px-3 py-2"
              placeholder="Email"
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />
            <input
              className="w-full rounded border border-line bg-bg px-3 py-2"
              placeholder="Contraseña"
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />
            {authError && <p className="text-sm text-clay">{authError}</p>}
            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full rounded bg-brass px-4 py-2 font-medium text-bg disabled:opacity-50"
            >
              {authSubmitting ? "Procesando…" : authMode === "login" ? "Iniciar sesión" : "Registrarse"}
            </button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-muted hover:text-fg"
              onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
            >
              {authMode === "login" ? "Crear cuenta" : "Ya tengo cuenta"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-fg">
        <div className="font-mono text-sm text-muted">Cargando tu progreso…</div>
      </div>
    );
  }


  const finishActivities = () => {
    setP((q) => (q.current && q.reinforce.includes(q.current) ? { ...q, reinforceDone: true } : { ...q, practiceDone: true }));
    nav("activities-done");
  };

  const continueAfterPass = () => {
    if (!evalResult) return;
    const name = byId(evalResult.id).name;
    if (!p.current) { nav(isRouteComplete(p) ? "final-ready" : "path"); return; }
    setFlash(`“${name}” pasó a dominado. Tu siguiente concepto es “${byId(p.current).name}”.`);
    nav("path");
  };

  const startReview = (id: Id) => { setReviewTarget(id); void startReviewSessionFlow(); };

  const ctx: Ctx = { p, studentName: auth.user?.fullName ?? "Estudiante", nav, recognized, flash, clearFlash: () => setFlash(null), evalResult, reviewResult, globalResult, reviewTarget, startReview, finishActivities, continueAfterPass, startDiagnostic, diagLoading, ensurePath, pathLoading, startShortEval, evalLoading, startReviewSessionFlow, reviewLoading, startGlobalExamFlow, globalExamLoading, diagnosticPathError, diagnosticFinalized, retryDiagnosticPath, syncWarning, retrySync: synchronizeProgress };

  const focus = FOCUS.includes(screen);
  let view;
  switch (screen) {
    case "home": view = <Home c={ctx} />; break;
    case "subjects": view = <Subjects c={ctx} />; break;
    case "subject": view = <Subject c={ctx} />; break;
    case "diag-intro": view = <DiagIntro c={ctx} />; break;
    case "diag":
      view = diagnosticFinalized
        ? <div className="mx-auto max-w-2xl py-16"><div className="rounded-md border border-line bg-surface p-6"><h1 className="text-2xl font-medium">{pathLoading ? "Preparando tu ruta…" : "No pudimos cargar tu ruta"}</h1><p className="mt-3 text-muted">{pathLoading ? "El diagnóstico ya quedó guardado. Estamos aplicando el paso activo que asignó el backend." : diagnosticPathError}</p>{!pathLoading && <button className="mt-5 rounded-sm border border-line px-5 py-3 disabled:opacity-40" onClick={() => void retryDiagnosticPath()} disabled={pathLoading}>Reintentar ruta</button>}</div></div>
        : diagLoading || !diagSessionId
        ? <div className="flex min-h-[40vh] items-center justify-center"><span className="font-mono text-sm text-muted">Cargando diagnóstico…</span></div>
        : <DiagnosticRunner activities={diagActivities} sessionId={diagSessionId} subjectId={SUBJECT_ID} studentId={auth.user!.id} onDone={finishDiagnostic} onExit={() => nav("diag-intro")} />;
      break;
    case "diag-summary": view = <DiagSummary c={ctx} />; break;
    case "path-new": view = <PathNew c={ctx} />; break;
    case "path": view = <PathScreen c={ctx} />; break;
    case "concept": view = p.current ? <ConceptScreen c={ctx} /> : isRouteComplete(p) ? <FinalReady c={ctx} /> : <PathScreen c={ctx} />; break;
    case "activity":
      view = p.current
        ? <PracticeRunner concept={p.current} onDone={finishActivities} onExit={() => nav("concept")} />
        : null;
      break;
    case "activities-done": view = <ActivitiesDone c={ctx} />; break;
    case "eval-intro": view = <EvalIntro c={ctx} />; break;
    case "eval":
      view = evalLoading || !evalSessionId
        ? <div className="flex min-h-[40vh] items-center justify-center"><span className="font-mono text-sm text-muted">Cargando evaluación…</span></div>
        : <EvalRunner activities={evalActivities} sessionId={evalSessionId} onDone={finishEvalBackend} onExit={() => nav("eval-intro")} />;
      break;
    case "eval-result": view = evalResult ? <EvalResultScreen c={ctx} /> : null; break;
    case "review-list": view = <ReviewList c={ctx} />; break;
    case "review":
      view = reviewLoading || !reviewSessionId
        ? <div className="flex min-h-[40vh] items-center justify-center"><span className="font-mono text-sm text-muted">Cargando repaso…</span></div>
        : <ReviewRunner items={reviewItems} sessionId={reviewSessionId} onDone={finishReviewBackend} onExit={() => nav("review-list")} />;
      break;
    case "review-result": view = reviewResult ? <ReviewResultScreen c={ctx} /> : null; break;
    case "progress": view = <ProgressScreen c={ctx} />; break;
    case "final-ready": view = <FinalReady c={ctx} />; break;
    case "global-intro": view = <GlobalIntro c={ctx} />; break;
    case "global":
      view = globalExamLoading || !globalExamSessionId
        ? <div className="flex min-h-[40vh] items-center justify-center"><span className="font-mono text-sm text-muted">Cargando examen…</span></div>
        : <GlobalExamRunner activities={globalExamActivities} examId={globalExamSessionId} onDone={finishGlobalExamBackend} onExit={() => nav("final-ready")} />;
      break;
    case "global-result": view = globalResult ? <GlobalResultScreen c={ctx} /> : null; break;
    default: view = <Home c={ctx} />; break;
  }

  if (syncWarning) {
    view = <div><div className="m-4 rounded-md border border-clay/40 bg-clay/10 p-4"><p className="text-clay">{syncWarning}</p><button className="mt-2 text-sm underline" onClick={() => void synchronizeProgress()}>Reintentar sincronización</button></div>{view}</div>;
  }
  const activeGroup = NAV.find((n) => n.group.includes(screen))?.screen;
  const prog = p.diagnosed && routeConceptCount(p) ? routeMasteredCount(p) / routeConceptCount(p) : 0;

  return (
    <div className="min-h-screen bg-bg text-fg">
      {focus ? (
        <main key={screen}>{view}</main>
      ) : (
        <div className="lg:grid lg:grid-cols-[264px_1fr]">
          <aside className="hidden border-r border-line bg-surface/60 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:p-6">
            <div className="mb-10">
              <div className="text-3xl font-medium tracking-tight">Itinera</div>
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Tutor adaptativo</div>
            </div>
            <nav className="space-y-1">
              {NAV.map((n) => (
                <button key={n.screen} onClick={() => nav(n.screen)} aria-current={activeGroup === n.screen ? "page" : undefined}
                  className={cx("flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-[17px] transition", activeGroup === n.screen ? "bg-raised text-fg" : "text-muted hover:bg-raised/60 hover:text-fg")}>
                  <n.icon size={17} className={activeGroup === n.screen ? "text-brass" : ""} />{n.label}
                </button>
              ))}
            </nav>
            <div className="mt-auto space-y-4">
              <button onClick={() => nav("subject")} className="flex w-full items-center gap-4 rounded-md border border-line p-3 text-left transition hover:bg-raised">
                <Ring value={prog} size={48}><span className="font-mono text-[10px]">{pct(prog)}</span></Ring>
                <div className="min-w-0"><div className="truncate text-[16px]">Cálculo Integral</div><div className="truncate text-sm text-muted">{p.diagnosed ? nextAction(p).state : "Sin diagnóstico"}</div></div>
              </button>
            </div>
          </aside>
          <div className="min-w-0">
            <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur lg:hidden">
              <div className="flex items-center justify-between px-5 pt-3"><span className="text-2xl font-medium">Itinera</span></div>
              <nav className="flex gap-1 overflow-x-auto px-3 py-2">
                {NAV.map((n) => (
                  <button key={n.screen} onClick={() => nav(n.screen)} className={cx("shrink-0 rounded-full px-3.5 py-1.5 text-[15px]", activeGroup === n.screen ? "bg-raised text-fg" : "text-muted")}>{n.label}</button>
                ))}
              </nav>
            </header>
            <main key={screen} className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">{view}</main>
          </div>
        </div>
      )}

    </div>
  );
}
