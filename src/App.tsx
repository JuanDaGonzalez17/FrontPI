import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BarChart3, BookMarked, CalendarClock, FlaskConical, Home as HomeIcon, Library, Route, X } from "lucide-react";
import { CONCEPTS, DIAG, EVAL, GLOBAL_Q, REVIEWS, THRESH, byId, type Id } from "./data";
import { QuestionRunner, type Answer } from "./Runner";
import { Spec, STATES } from "./Spec";
import {
  ActivitiesDone, ActivityScreen, ConceptScreen, EvalIntro, EvalResultScreen, FinalReady, GlobalIntro,
  GlobalResultScreen, ProgressScreen, ReviewList, ReviewResultScreen, ReviewScreen,
} from "./screens2";
import { DiagIntro, DiagSummary, Home, PathNew, PathScreen, Subject, Subjects, type Ctx } from "./screens";
import {
  afterPass, completed, diagnosed, failedEval, firstOpen, fresh, hasBank, masteredCount, nextAction, zero,
  type EvalResult, type GlobalResult, type Profile, type ReviewResult, type Screen,
} from "./state";
import { Ring, cx, pct } from "./ui";
import { DiagnosticRunner } from "./DiagnosticRunner";
import { PracticeRunner } from "./PracticeRunner";
import { EvalRunner } from "./EvalRunner";
import { GlobalExamRunner } from "./GlobalExamRunner";
import { ReviewRunner } from "./ReviewRunner";
import { reviewApi, globalExamApi } from "./api";
import { evaluationApi } from "./api";
import { diagnosticApi, curriculumApi, learningPathApi } from "./api";
import { buildConceptMaps, diagProfileToMastery, applyLearningPath, type ConceptMaps } from "./api/mappers/conceptMapper";
import { useAuth } from "./context/AuthContext";
import { CogniaApiError } from "./api/client";
import type { ActivityDto, DiagnosticProfileDto, LearningPathDto, ShortEvalResultDto, ReviewQueueItemDto, ReviewFinishDto, GlobalExamResultDto } from "./api/types";

const GOOD: Partial<Record<Id, number>> = { prim: 0.92, reglas: 0.85, metodos: 0.88, definida: 0.86, tfc: 0.84 };
const SUBJECT_ID = "10000000-0000-0000-0000-000000000001";

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
  const [panel, setPanel] = useState(false);
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
  const [reviewAmnesia, setReviewAmnesia] = useState(false);
  const [globalExamSessionId, setGlobalExamSessionId] = useState<string | null>(null);
  const [globalExamActivities, setGlobalExamActivities] = useState<ActivityDto[]>([]);
  const [globalExamLoading, setGlobalExamLoading] = useState(false);

  const nav = useCallback((s: Screen) => setScreen(s), []);

  const startDiagnostic = useCallback(async () => {
    setDiagLoading(true);
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

  const finishDiagnostic = useCallback(
    async (profile: DiagnosticProfileDto) => {
      if (diagMaps) {
        const mastery = diagProfileToMastery(profile, diagMaps);
        const nextProfile: Profile = {
          ...fresh(),
          diagnosed: profile.diagnosticCompleted,
          mastery: { ...zero(), ...mastery },
        };
        nextProfile.current = firstOpen(nextProfile);
        setP(nextProfile);
        setRecognized(CONCEPTS.filter((k) => (mastery[k.id] ?? 0) >= THRESH).map((k) => k.id));
      }
      nav("diag-summary");
    },
    [diagMaps, nav],
  );
  const ensurePath = useCallback(async () => {
    setPathLoading(true);
    try {
      let path;
      try {
        path = await learningPathApi.getActivePath(SUBJECT_ID);
      } catch {
        path = await learningPathApi.generatePath(SUBJECT_ID);
      }
      const concepts = await curriculumApi.getConcepts(SUBJECT_ID);
      const maps = buildConceptMaps(concepts);
      setLearningPath(path);
      setP((prev) => applyLearningPath(prev, path, maps));
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "No se pudo cargar la ruta de aprendizaje.");
    } finally {
      setPathLoading(false);
    }
  }, [nav]);

  const startShortEval = useCallback(async () => {
    setEvalLoading(true);
    try {
      let path = learningPath;
      if (!path) {
        try {
          path = await learningPathApi.getActivePath(SUBJECT_ID);
        } catch {
          path = await learningPathApi.generatePath(SUBJECT_ID);
        }
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
      const score = Math.round(result.score * 100);
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
      setP((prev) => {
        const np: Profile = { ...prev, mastery: { ...prev.mastery }, reviews: { ...prev.reviews }, history: [{ kind: "Evaluación", label: byId(id).name, score, passed, date: "Hoy" }, ...prev.history], evalAttempts: prev.evalAttempts + 1 };
        if (passed) {
          np.mastery[id] = result.score;
          np.reinforce = prev.reinforce.filter((r) => r !== id);
          if (hasBank(id)) np.reviews[id] = { dueIn: 1, fails: 0 };
          np.weakSkills = [];
          np.practiceDone = false;
          np.reinforceDone = false;
          np.current = firstOpen(np);
        } else {
          np.mastery[id] = (result.score || prev.mastery[id]) * 0.85;
          np.reinforce = [...new Set([...prev.reinforce, id])];
          np.reinforceDone = false;
        }
        return np;
      });
      nav("eval-result");
    },
    [p.current, p.evalAttempts, nav],
  );

  const startReviewSessionFlow = useCallback(async () => {
    setReviewLoading(true);
    try {
      const session = await reviewApi.startReviewSession(SUBJECT_ID);
      setReviewSessionId(session.id);
      setReviewItems(session.items);
      nav("review");
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "No se pudo iniciar el repaso.");
    } finally {
      setReviewLoading(false);
    }
  }, [nav]);

  const finishReviewBackend = useCallback(
    async (result: ReviewFinishDto) => {
      setReviewAmnesia(result.amnesiaDetectada);
      if (result.amnesiaDetectada) {
        await ensurePath();
      }
      let slug: Id = "metodos";
      try {
        const concepts = await curriculumApi.getConcepts(SUBJECT_ID);
        const maps = buildConceptMaps(concepts);
        const mapped = reviewItems[0]?.conceptId ? maps.uuidToSlug.get(reviewItems[0].conceptId) : undefined;
        if (mapped) slug = mapped;
      } catch {
        // fallback
      }
      setReviewResult({
        id: slug,
        ok: !result.amnesiaDetectada,
        fails: 0,
        nextDays: 1,
        mastery: 0,
        nextCurrent: null,
        explain: result.amnesiaDetectada
          ? "Se detectó amnesia conceptual. Tu ruta se ha adaptado."
          : "Repaso completado correctamente.",
      });
      nav("review-result");
    },
    [reviewItems, ensurePath, nav],
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
    const score = Math.round(result.overallScore * 100);
    const strong: Id[] = [];
    const weak: Id[] = [];
    for (const cm of result.masteryByConcepto) {
      // map uuid to slug not available here; skip mapping, use conceptCodigo? ConceptMasteryDto has conceptCodigo
      // We'll not push slugs to avoid byId errors; keep empty arrays for now
    }
    setGlobalResult({ score, strong, weak });
    nav("global-result");
  }, [nav]);

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
        const concepts = await curriculumApi.getConcepts(SUBJECT_ID);
        const maps = buildConceptMaps(concepts);
        const backendProfile = await diagnosticApi.getProfile(auth.user!.id, SUBJECT_ID);
        const mastery = diagProfileToMastery(backendProfile, maps);
        let loadedProfile: Profile = {
          ...fresh(),
          diagnosed: backendProfile.diagnosticCompleted,
          mastery: { ...zero(), ...mastery },
        };
        loadedProfile.current = firstOpen(loadedProfile);

        if (backendProfile.diagnosticCompleted) {
          try {
            const path = await learningPathApi.getActivePath(SUBJECT_ID);
            loadedProfile = applyLearningPath(loadedProfile, path, maps);
          } catch (error) {
            if (!(error instanceof CogniaApiError) || error.apiError.status !== 404) throw error;
          }
        }

        if (!cancelled) {
          setDiagMaps(maps);
          setP(loadedProfile);
          setRecognized(CONCEPTS.filter((concept) => loadedProfile.mastery[concept.id] >= THRESH).map((concept) => concept.id));
          setFlash(null);
        }
      } catch (error) {
        if (!cancelled && error instanceof CogniaApiError && error.apiError.status === 404) {
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
  }, [auth.isLoading, auth.isAuthenticated, auth.user?.id]);

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
            <button type="button" className="text-muted hover:text-fg" onClick={auth.useDevAccount}>
              Usar cuenta de prueba
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


  const finishDiag = (answers: Answer[]) => {
    const by: Partial<Record<Id, { n: number; ok: number }>> = {};
    answers.forEach((a) => {
      if (!a.q.concept) return;
      const e = (by[a.q.concept] ??= { n: 0, ok: 0 });
      e.n++;
      if (a.ok) e.ok++;
    });
    const m = zero();
    let failed = false;
    CONCEPTS.forEach((k) => {
      const e = by[k.id];
      if (!e) return;
      const f = e.ok / e.n;
      let v = f === 1 ? GOOD[k.id] ?? 0.85 : f === 0 ? 0.2 : 0.5;
      if (failed) v = Math.min(v, f === 1 ? 0.35 : 0.15);
      if (f < 1) failed = true;
      m[k.id] = v;
    });
    const np: Profile = { ...fresh(), diagnosed: true, mastery: m, history: [{ kind: "Diagnóstico", label: "Diagnóstico inicial", score: null, passed: null, date: "Hoy" }] };
    np.current = firstOpen(np);
    CONCEPTS.forEach((k) => { if (m[k.id] >= THRESH && hasBank(k.id)) np.reviews[k.id] = { dueIn: k.row + 1 > 2 ? 3 : 1, fails: 0 }; });
    setRecognized(CONCEPTS.filter((k) => m[k.id] >= THRESH).map((k) => k.id));
    setP(np);
    nav("diag-summary");
  };

  const finishEval = (answers: Answer[]) => {
    const id = p.current!;
    const score = Math.round((answers.filter((a) => a.ok).length / answers.length) * 100);
    const map = new Map<string, { ok: number; n: number }>();
    answers.forEach((a) => {
      const e = map.get(a.q.skill!) ?? { ok: 0, n: 0 };
      e.n++; if (a.ok) e.ok++;
      map.set(a.q.skill!, e);
    });
    const skills = [...map].map(([skill, v]) => ({ skill, ...v }));
    const weak = skills.filter((s) => s.ok < s.n).map((s) => s.skill);
    const passed = score >= THRESH * 100;
    const np: Profile = { ...p, mastery: { ...p.mastery }, reviews: { ...p.reviews }, history: [{ kind: "Evaluación", label: byId(id).name, score, passed, date: "Hoy" }, ...p.history] };
    if (passed) {
      np.mastery[id] = score / 100;
      np.reinforce = p.reinforce.filter((r) => r !== id);
      if (hasBank(id)) np.reviews[id] = { dueIn: 1, fails: 0 };
      np.weakSkills = []; np.evalAttempts = 0; np.practiceDone = false; np.reinforceDone = false;
      np.current = firstOpen(np);
    } else {
      np.mastery[id] = (score / 100) * 0.85;
      np.reinforce = [...new Set([...p.reinforce, id])];
      np.weakSkills = weak; np.evalAttempts = p.evalAttempts + 1; np.reinforceDone = false;
    }
    setEvalResult({ id, score, passed, skills, weak, attempt: p.evalAttempts + 1, nextId: np.current });
    setP(np);
    nav("eval-result");
  };

  const finishActivities = () => {
    setP((q) => (q.current && q.reinforce.includes(q.current) ? { ...q, reinforceDone: true } : { ...q, practiceDone: true }));
    nav("activities-done");
  };

  const continueAfterPass = () => {
    if (!evalResult) return;
    const name = byId(evalResult.id).name;
    if (!p.current) { nav("final-ready"); return; }
    setFlash(`“${name}” pasó a dominado. Tu siguiente concepto es “${byId(p.current).name}”.`);
    nav("path");
  };

  const startReview = (id: Id) => { setReviewTarget(id); nav("review"); };

  const answerReview = (id: Id, ok: boolean) => {
    const r = p.reviews[id] ?? { dueIn: 0, fails: 0 };
    const np: Profile = { ...p, mastery: { ...p.mastery }, reviews: { ...p.reviews }, reinforce: [...p.reinforce] };
    const bank = REVIEWS[id]!;
    let fails = r.fails, nextDays = 7;
    if (ok) {
      np.mastery[id] = Math.min(0.98, p.mastery[id] + 0.04);
      nextDays = r.fails > 0 ? 3 : 7;
      np.reviews[id] = { dueIn: nextDays, fails: 0 };
      fails = 0;
    } else {
      fails = r.fails + 1;
      np.mastery[id] = Math.max(0.3, p.mastery[id] - 0.1);
      nextDays = 1;
      if (fails >= 2) {
        np.mastery[id] = Math.min(np.mastery[id], 0.6);
        np.reinforce = [...new Set([...np.reinforce, id])];
        delete np.reviews[id];
      } else np.reviews[id] = { dueIn: 1, fails };
    }
    np.history = [{ kind: "Repaso", label: byId(id).name, score: null, passed: ok, date: "Hoy" }, ...p.history];
    const q = bank[r.fails > 0 ? 1 : 0];
    if (!ok && fails >= 2 && !np.current) np.current = firstOpen(np);
    setReviewResult({ id, ok, fails, nextDays, mastery: np.mastery[id], nextCurrent: np.current, explain: q.explain ?? "" });
    setP(np);
    nav("review-result");
  };

  const finishGlobal = (answers: Answer[]) => {
    const score = Math.round((answers.filter((a) => a.ok).length / answers.length) * 100);
    const strong = answers.filter((a) => a.ok).map((a) => a.q.concept!);
    const weak = answers.filter((a) => !a.ok).map((a) => a.q.concept!);
    setGlobalResult({ score, strong, weak });
    setP((q) => ({ ...q, history: [{ kind: "Global", label: "Evaluación global", score, passed: score >= 70, date: "Hoy" }, ...q.history] }));
    nav("global-result");
  };

  const jump = (key: string) => {
    setPanel(false);
    setFlash(null);
    if (key.startsWith("screen:")) {
      const s = key.slice(7) as Screen;
      if (s === "activity" || s === "eval-intro") setP(diagnosed());
      nav(s);
      return;
    }
    const sk = [
      { skill: "Integración por partes", ok: 2, n: 2 }, { skill: "Fracciones parciales", ok: 1, n: 1 },
      { skill: "Sustitución trigonométrica", ok: 1, n: 1 }, { skill: "Sustitución u", ok: 1, n: 1 }, { skill: "Elegir el método", ok: 0, n: 1 },
    ];
    switch (key) {
      case "diag-pending": setP(fresh()); nav("home"); break;
      case "diag-done": setP(diagnosed()); setRecognized(["prim", "reglas"]); nav("path-new"); break;
      case "in-progress": setP(diagnosed()); nav("concept"); break;
      case "passed": {
        setP(afterPass());
        setEvalResult({ id: "metodos", score: 83, passed: true, skills: sk, weak: [], attempt: 1, nextId: "definida" });
        nav("eval-result"); break;
      }
      case "path-updated": setP(afterPass()); setFlash("“Métodos de integración” pasó a dominado. Tu siguiente concepto es “Integral definida”."); nav("path"); break;
      case "failed": {
        setP(failedEval());
        setEvalResult({ id: "metodos", score: 55, passed: false, attempt: 1, nextId: "metodos", weak: ["Fracciones parciales", "Sustitución trigonométrica"], skills: [
          { skill: "Integración por partes", ok: 2, n: 2 }, { skill: "Sustitución u", ok: 1, n: 1 }, { skill: "Fracciones parciales", ok: 0, n: 1 }, { skill: "Sustitución trigonométrica", ok: 0, n: 1 }, { skill: "Elegir el método", ok: 0, n: 1 }] });
        nav("eval-result"); break;
      }
      case "reinforce": setP(failedEval()); nav("concept"); break;
      case "review-ok": {
        const b = afterPass();
        b.reviews = { ...b.reviews, metodos: { dueIn: 7, fails: 0 } };
        setP(b);
        setReviewResult({ id: "metodos", ok: true, fails: 0, nextDays: 7, mastery: 0.86, nextCurrent: "definida", explain: REVIEWS.metodos![0].explain! });
        nav("review-result"); break;
      }
      case "review-fail": {
        const b = afterPass();
        b.mastery = { ...b.mastery, metodos: 0.72 };
        b.reviews = { ...b.reviews, metodos: { dueIn: 1, fails: 1 } };
        setP(b);
        setReviewResult({ id: "metodos", ok: false, fails: 1, nextDays: 1, mastery: 0.72, nextCurrent: "definida", explain: REVIEWS.metodos![0].explain! });
        nav("review-result"); break;
      }
      case "review-out": {
        const b = afterPass();
        b.mastery = { ...b.mastery, metodos: 0.6 };
        b.reinforce = ["metodos"];
        const { metodos: _m, ...rest } = b.reviews; void _m;
        b.reviews = rest;
        setP(b);
        setReviewResult({ id: "metodos", ok: false, fails: 2, nextDays: 1, mastery: 0.6, nextCurrent: "metodos", explain: REVIEWS.metodos![1].explain! });
        nav("review-result"); break;
      }
      case "path-complete": setP(completed()); nav("final-ready"); break;
      case "global":
        setP(completed());
        setGlobalResult({ score: 83, strong: ["prim", "reglas", "metodos", "tfc", "area"], weak: ["solidos"] });
        nav("global-result"); break;
    }
  };

  const ctx: Ctx = { p, studentName: auth.user?.fullName ?? "Estudiante", nav, recognized, flash, clearFlash: () => setFlash(null), evalResult, reviewResult, globalResult, reviewTarget, startReview, finishActivities, continueAfterPass, startDiagnostic, diagLoading, ensurePath, pathLoading, startShortEval, evalLoading, startReviewSessionFlow, reviewLoading, startGlobalExamFlow, globalExamLoading };

  const focus = FOCUS.includes(screen);
  let view;
  switch (screen) {
    case "home": view = <Home c={ctx} />; break;
    case "subjects": view = <Subjects c={ctx} />; break;
    case "subject": view = <Subject c={ctx} />; break;
    case "diag-intro": view = <DiagIntro c={ctx} />; break;
    case "diag":
      view = diagLoading || !diagSessionId
        ? <div className="flex min-h-[40vh] items-center justify-center"><span className="font-mono text-sm text-muted">Cargando diagnóstico…</span></div>
        : <DiagnosticRunner activities={diagActivities} sessionId={diagSessionId} subjectId={SUBJECT_ID} studentId={auth.user!.id} onDone={finishDiagnostic} onExit={() => nav("diag-intro")} />;
      break;
    case "diag-summary": view = <DiagSummary c={ctx} />; break;
    case "path-new": view = <PathNew c={ctx} />; break;
    case "path": view = <PathScreen c={ctx} />; break;
    case "concept": view = p.current ? <ConceptScreen c={ctx} /> : <FinalReady c={ctx} />; break;
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
    case "spec": view = <Spec onJump={jump} />; break;
    default: view = <Home c={ctx} />; break;
  }

  const activeGroup = NAV.find((n) => n.group.includes(screen))?.screen;
  const prog = p.diagnosed ? masteredCount(p) / 12 : 0;

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
              <button onClick={() => nav("spec")} className={cx("flex w-full items-center gap-2 px-3 text-sm transition", screen === "spec" ? "text-brass" : "text-muted hover:text-fg")}><BookMarked size={15} />Guía del prototipo</button>
            </div>
          </aside>
          <div className="min-w-0">
            <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur lg:hidden">
              <div className="flex items-center justify-between px-5 pt-3"><span className="text-2xl font-medium">Itinera</span><button onClick={() => nav("spec")} className="text-muted"><BookMarked size={18} /></button></div>
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

      <div className="fixed bottom-4 right-4 z-50">
        {panel && (
          <div className="rise mb-3 max-h-[70vh] w-72 overflow-y-auto rounded-md border border-line bg-surface p-3 shadow-2xl">
            <div className="mb-2 px-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Saltar a un estado</div>
            {STATES.map((s) => (<button key={s.key} onClick={() => jump(s.key)} className="block w-full rounded-sm px-2 py-2 text-left text-[15px] text-fg transition hover:bg-raised">{s.label}</button>))}
            <button onClick={() => jump("screen:home")} className="mt-2 block w-full border-t border-line px-2 pt-3 text-left text-sm text-muted hover:text-fg">Reiniciar prototipo</button>
          </div>
        )}
        <button onClick={() => setPanel(!panel)} className="ml-auto flex items-center gap-2 rounded-full border border-line bg-raised px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-fg shadow-xl transition hover:border-brass" aria-expanded={panel}>
          {panel ? <X size={14} /> : <FlaskConical size={14} className="text-brass" />}Estados
        </button>
      </div>
    </div>
  );
}
