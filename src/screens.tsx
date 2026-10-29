import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, Check, Compass, Lock, MapPin, Sparkles } from "lucide-react";
import { byId, unlocks, type Id } from "./data";
import { ConceptDetail, KnowledgeGraph, Legend } from "./Graph";
import {
  conceptName, dueLabel, dueList, dueToday, isRouteComplete, routeConceptCount, routeMasteredCount, routeConcepts, nextAction, overallMastery, status,
  type EvalResult, type GlobalResult, type Profile, type ReviewResult, type Screen,
} from "./state";
import { Bar, Btn, Card, Label, PageHeader, Pill, Ring, StatusIcon, cx, pct, statusTone } from "./ui";
import { curriculumApi } from "./api";
import type { SubjectDto } from "./api/types";

export interface Ctx {
  p: Profile;
  studentName: string;
  nav: (s: Screen) => void;
  recognized: Id[];
  flash: string | null;
  clearFlash: () => void;
  evalResult: EvalResult | null;
  reviewResult: ReviewResult | null;
  globalResult: GlobalResult | null;
  reviewTarget: Id | null;
  startReview: (id: Id) => void;
  finishActivities: () => void;
  continueAfterPass: () => void;
  startDiagnostic: () => Promise<void>;
  diagLoading: boolean;
  ensurePath: () => Promise<void>;
  pathLoading: boolean;
  startShortEval: () => Promise<void>;
  evalLoading: boolean;
  startReviewSessionFlow: () => Promise<void>;
  reviewLoading: boolean;
  startGlobalExamFlow: () => Promise<void>;
  globalExamLoading: boolean;
  diagnosticPathError?: string | null;
  diagnosticFinalized?: boolean;
  retryDiagnosticPath?: () => Promise<void>;
  syncWarning?: string | null;
  retrySync?: () => Promise<void>;
}

const SUBJECT = {
  name: "Cálculo Integral",
  desc: "Desde la antiderivada hasta las aplicaciones de la integración.",
};

function NextStepCard({ c }: { c: Ctx }) {
  const { p } = c;
  const a = nextAction(p);
  const cur = p.current ? byId(p.current) : null;
  return (
    <Card tone={a.tone} className="rise relative overflow-hidden p-6 md:p-8">
      <div className={cx("absolute inset-y-0 left-0 w-1", a.tone === "sage" ? "bg-sage" : a.tone === "clay" ? "bg-clay" : "bg-brass")} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Label>Tu siguiente paso · {SUBJECT.name}</Label>
        <Pill tone={a.tone}>{a.state}</Pill>
      </div>
      {!p.diagnosed ? (
        <>
          <h2 className="mt-4 text-3xl font-medium md:text-4xl">Primero queremos saber qué ya sabes</h2>
          <p className="mt-3 max-w-xl text-lg text-muted">Un diagnóstico de unos 10 minutos nos permite construir una ruta que empiece donde tú estás, no en el capítulo 1.</p>
        </>
      ) : cur ? (
        <>
          <h2 className="mt-4 text-3xl font-medium md:text-4xl">{conceptName(p, cur.id)}</h2>
          <p className="mt-3 max-w-xl text-lg text-muted">
            {p.reinforce.includes(cur.id) ? "Todavía hay habilidades por afianzar antes de continuar. Te propusimos práctica específica." : `Es el siguiente eslabón de tu ruta y abre: ${unlocks(cur.id).filter((u) => routeConcepts(p).includes(u.id)).map((u) => conceptName(p, u.id)).join(", ") || "el cierre de la asignatura"}.`}
          </p>
          <div className="mt-5 max-w-md">
            <div className="mb-1.5 flex justify-between font-mono text-[11px] uppercase tracking-wider text-muted"><span>Dominio actual</span><span>{pct(p.mastery[cur.id])} / meta 70%</span></div>
            <Bar value={p.mastery[cur.id]} tone={a.tone} threshold={0.7} />
          </div>
        </>
      ) : (
        <>
          <h2 className="mt-4 text-3xl font-medium md:text-4xl">Has completado tu ruta de aprendizaje</h2>
          <p className="mt-3 max-w-xl text-lg text-muted">Has dominado los {routeConceptCount(p)} conceptos de tu ruta. Falta confirmar tu dominio general con la evaluación global.</p>
        </>
      )}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Btn size="lg" onClick={() => c.nav(a.screen)} icon={<ArrowRight size={18} />}>{a.label}</Btn>
        {p.diagnosed && <Btn variant="ghost" size="lg" onClick={() => c.nav("path")}>Ver mi ruta</Btn>}
      </div>
    </Card>
  );
}

function RouteGlance({ c }: { c: Ctx }) {
  const { p } = c;
  const ids = routeConcepts(p);
  const known = ids.map(byId).filter((x) => status(p, x.id) === "mastered");
  const later = ids.map(byId).filter((x) => status(p, x.id) !== "mastered" && x.id !== p.current);
  const cols = [
    { t: "Lo que sabes", tone: "sage" as const, items: known.slice(-3).map((x) => conceptName(p, x.id)), more: Math.max(0, known.length - 3), icon: <Check size={14} /> },
    { t: "Lo que estudias", tone: "brass" as const, items: p.current ? [conceptName(p, p.current)] : [], more: 0, icon: <MapPin size={14} /> },
    { t: "Lo que sigue", tone: "muted" as const, items: later.slice(0, 3).map((x) => conceptName(p, x.id)), more: Math.max(0, later.length - 3), icon: <ArrowRight size={14} /> },
  ];
  return (
    <Card className="rise p-6">
      <div className="mb-5 flex items-center justify-between">
        <Label>Tu ruta de un vistazo</Label>
        <button onClick={() => c.nav("path")} className="text-sm text-brass hover:underline">Abrir mapa</button>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {cols.map((col) => (
          <div key={col.t}>
            <div className={cx("mb-2 font-mono text-[11px] uppercase tracking-wider", col.tone === "sage" ? "text-sage" : col.tone === "brass" ? "text-brass" : "text-muted")}>{col.t}</div>
            <ul className="space-y-1.5">
              {col.items.length === 0 && <li className="text-muted">—</li>}
              {col.items.map((n) => (
                <li key={n} className="flex items-start gap-2 text-[16px] leading-snug"><span className={cx("mt-1", col.tone === "sage" ? "text-sage" : col.tone === "brass" ? "text-brass" : "text-faint")}>{col.icon}</span>{n}</li>
              ))}
              {col.more > 0 && <li className="pl-6 text-sm text-faint">+ {col.more} más</li>}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ReviewsCard({ c }: { c: Ctx }) {
  const due = dueToday(c.p);
  const rest = dueList(c.p).filter(([, r]) => r.dueIn > 0).slice(0, 2);
  return (
    <Card className="rise p-6">
      <div className="mb-4 flex items-center gap-2 text-brass"><CalendarClock size={16} /><Label className="text-brass">Repasos</Label></div>
      {!c.p.diagnosed ? (
        <p className="text-muted">Se programarán cuando tengas conceptos dominados.</p>
      ) : (
        <>
          <div className="mb-1 text-4xl font-medium">{due.length} <span className="text-lg font-normal text-muted">para hoy</span></div>
          <ul className="mb-5 mt-3 space-y-1.5 text-[16px]">
            {due.map(([id]) => <li key={id} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brass" />{byId(id).name}</li>)}
            {rest.map(([id, r]) => <li key={id} className="flex items-center justify-between text-muted"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-faint" />{byId(id).name}</span><span className="font-mono text-xs">{dueLabel(r.dueIn)}</span></li>)}
          </ul>
          <Btn variant={due.length ? "primary" : "ghost"} className="w-full" onClick={() => c.nav("review-list")}>{due.length ? "Repasar ahora" : "Ver calendario"}</Btn>
        </>
      )}
    </Card>
  );
}

export function Home({ c }: { c: Ctx }) {
  return (
    <div>
      <PageHeader kicker={new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })} title={`Hola, ${c.studentName.split(" ")[0]}`} sub="Esto es lo que sigue en tu ruta. Nada más." />
      <div className="space-y-5">
        <NextStepCard c={c} />
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {c.p.diagnosed ? <RouteGlance c={c} /> : <Card className="p-6"><Label className="mb-3">Tu ruta</Label><p className="flex items-center gap-2 text-muted"><Lock size={15} />Se genera al terminar el diagnóstico.</p></Card>}
          <ReviewsCard c={c} />
        </div>
        <Card className="p-6">
          <Label className="mb-4">Mis asignaturas</Label>
          <SubjectRow c={c} />
        </Card>
      </div>
    </div>
  );
}

function SubjectRow({ c }: { c: Ctx }) {
  const total = routeConceptCount(c.p);
  const mastered = routeMasteredCount(c.p);
  const prog = c.p.diagnosed && total ? mastered / total : 0;
  return (
    <div className="divide-y divide-line">
      <button onClick={() => c.nav("subject")} className="group flex w-full items-center gap-5 py-3 text-left first:pt-0">
        <Ring value={prog} size={52} tone="brass"><span className="font-mono text-[11px]">{pct(prog)}</span></Ring>
        <div className="flex-1">
          <div className="text-xl">{SUBJECT.name}</div>
          <div className="text-[15px] text-muted">{c.p.diagnosed ? `${mastered} de ${total} conceptos dominados` : "Diagnóstico pendiente"}</div>
        </div>
        <ArrowRight size={18} className="text-faint transition group-hover:translate-x-1 group-hover:text-fg" />
      </button>
    </div>
  );
}

export function Subjects({ c }: { c: Ctx }) {
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    curriculumApi
      .getSubjects()
      .then((data) => {
        if (!cancelled) setSubjects(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudieron cargar las asignaturas.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageHeader kicker="Mis asignaturas" title="Elige qué estudiar" sub="Cada asignatura tiene su propio mapa de conceptos y su propio perfil de dominio." />
      {loading && (
        <Card className="p-6">
          <div className="font-mono text-sm text-muted">Cargando asignaturas…</div>
        </Card>
      )}
      {error && (
        <Card className="p-6">
          <div className="text-sm text-clay">{error}</div>
        </Card>
      )}
      {!loading && !error && subjects.length > 0 && (
        <div className="space-y-3">
          {subjects.map((s) => (
            <Card key={s.id} className="p-6">
              <button onClick={() => c.nav("subject")} className="group flex w-full items-center gap-5 text-left">
                <div className="flex-1">
                  <div className="text-xl">{s.name}</div>
                  <div className="text-[15px] text-muted">{s.description}</div>
                </div>
                <Pill tone="brass">Disponible</Pill>
                <ArrowRight size={18} className="text-faint transition group-hover:translate-x-1 group-hover:text-fg" />
              </button>
            </Card>
          ))}
        </div>
      )}
      {!loading && !error && subjects.length === 0 && (
        <Card className="p-6">
          <SubjectRow c={c} />
        </Card>
      )}
    </div>
  );
}

export function Subject({ c }: { c: Ctx }) {
  const { p } = c;
  const a = nextAction(p);
  const stats: [string, string][] = [
    ["Progreso", p.diagnosed && routeConceptCount(p) ? pct(routeMasteredCount(p) / routeConceptCount(p)) : "—"],
    ["Dominio general", p.diagnosed ? pct(overallMastery(p)) : "—"],
    ["Conceptos dominados", p.diagnosed ? `${routeMasteredCount(p)} / ${routeConceptCount(p)}` : "—"],
    ["Concepto actual", p.current ? byId(p.current).name : p.diagnosed ? "Ruta completa" : "Sin definir"],
    ["Próximo repaso", p.diagnosed && dueList(p)[0] ? `${byId(dueList(p)[0][0]).name} · ${dueLabel(dueList(p)[0][1].dueIn)}` : "—"],
  ];
  return (
    <div>
      <PageHeader kicker="Asignatura" title={SUBJECT.name} sub={SUBJECT.desc} right={<Pill tone={a.tone}>{a.state}</Pill>} />
      <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-5">
        {stats.map(([k, v], i) => (
          <div key={k} className={cx("bg-surface p-5", i === 3 && "md:col-span-1")}>
            <Label className="mb-2">{k}</Label>
            <div className={cx("leading-tight", v.length > 12 ? "text-lg" : "text-3xl font-medium")}>{v}</div>
          </div>
        ))}
      </div>
      {!p.diagnosed && (
        <Card tone="brass" className="mt-6 flex flex-wrap items-center justify-between gap-4 p-6">
          <div><div className="text-xl">Aún no tienes un perfil de conocimiento</div><p className="text-muted">Hacemos un diagnóstico antes de proponerte una ruta.</p></div>
        </Card>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Btn size="lg" onClick={() => c.nav(a.screen)} icon={<ArrowRight size={18} />}>{a.label}</Btn>
        {p.diagnosed && <Btn variant="ghost" size="lg" onClick={() => c.nav("path")}>Ver mi ruta</Btn>}
        {p.diagnosed && <Btn variant="ghost" size="lg" onClick={() => c.nav("progress")}>Ver progreso</Btn>}
      </div>
    </div>
  );
}

export function DiagIntro({ c }: { c: Ctx }) {
  const steps = [
    ["Adaptativo", "Una pregunta a la vez, según los conceptos disponibles."],
    ["Sin nota", "No es un examen. “No lo sé” es una respuesta válida."],
    ["Tu ruta", "Con el resultado armamos un mapa que empieza donde tú estás."],
  ];
  return (
    <div className="mx-auto max-w-2xl py-6 text-center md:py-14">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-brass/50 bg-brass/10 text-brass"><Compass size={24} /></div>
      <Label className="mb-3">Diagnóstico inicial · {SUBJECT.name}</Label>
      <h1 className="text-4xl font-medium leading-tight md:text-5xl">Primero queremos saber qué conocimientos ya tienes para construir una ruta personalizada.</h1>
      <div className="mt-10 grid gap-px overflow-hidden rounded-md border border-line bg-line text-left md:grid-cols-3">
        {steps.map(([t, d], i) => (
          <div key={t} className="bg-surface p-5"><Label className="mb-2 text-brass">0{i + 1}</Label><div className="text-xl">{t}</div><p className="mt-1 text-[15px] text-muted">{d}</p></div>
        ))}
      </div>
      <Btn size="lg" className="mt-10" onClick={() => c.startDiagnostic()} disabled={c.diagLoading} icon={<ArrowRight size={18} />}>{c.diagLoading ? "Preparando…" : "Comenzar diagnóstico"}</Btn>
    </div>
  );
}

export function DiagSummary({ c }: { c: Ctx }) {
  const { p } = c;
  const tested = routeConcepts(p);
  const strong = tested.filter((i) => status(p, i) === "mastered");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader kicker="Diagnóstico completado" title="Dominio inicial estimado" sub="Identificamos algunos conceptos que ya dominas y otros que deberías reforzar antes de avanzar." />
      <Card className="divide-y divide-line">
        {tested.map((i) => {
          const s = status(p, i);
          const t = statusTone(s);
          return (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <span className={cx(t === "sage" ? "text-sage" : "text-muted")}><StatusIcon s={s} size={16} /></span>
              <div className="w-56 text-lg">{byId(i).name}</div>
              <div className="flex-1"><Bar value={p.mastery[i]} tone={s === "mastered" ? "sage" : "brass"} threshold={0.7} /></div>
              <div className="w-12 text-right font-mono text-sm">{pct(p.mastery[i])}</div>
            </div>
          );
        })}
      </Card>
      <p className="mt-5 text-muted">El diagnóstico cubrió {tested.length} conceptos de la ruta. {strong.length > 0 && `Reconocimos ${strong.length} como dominados y no tendrás que repetirlos.`}</p>
      <Btn size="lg" className="mt-8" onClick={() => c.nav("path-new")} icon={<Sparkles size={18} />}>Ver mi ruta personalizada</Btn>
    </div>
  );
}

function PathBoard({ c, hero }: { c: Ctx; hero?: boolean }) {
  const { p } = c;
  const [sel, setSel] = useState<Id | null>(p.current);
  const shown = sel ?? p.current ?? "prim";
  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-4"><Legend /></div>
        <div className="rounded-md border border-line bg-surface/50 p-4 md:p-6">
          <KnowledgeGraph p={p} selected={shown} onSelect={setSel} recognized={hero ? c.recognized : []} />
        </div>
      </div>
      <aside className="xl:sticky xl:top-8 xl:self-start">
        <Card className="p-6"><ConceptDetail id={shown} p={p} onGo={() => c.nav("concept")} /></Card>
      </aside>
    </div>
  );
}

export function PathNew({ c }: { c: Ctx }) {
  const { p } = c;
  const known = c.recognized.length;
  const canStart = Boolean(p.current);
  return (
    <div>
      <PageHeader
        kicker="Ruta generada a partir de tu diagnóstico"
        title="Esta es tu ruta de aprendizaje"
        sub={p.current ? <>Reconocimos <b className="text-sage">{known} conceptos como dominados</b>. Empezarás en <b className="text-brass">{conceptName(p, p.current)}</b>, y de ahí seguirás las ramas que se abren.</> : "Ya dominas todo lo evaluado."}
        right={canStart ? <Btn size="lg" onClick={() => c.nav("concept")} icon={<ArrowRight size={18} />}>Comenzar mi ruta</Btn> : <span className="text-sm text-muted">{c.pathLoading ? "Cargando el paso asignado…" : "Aún no hay un paso activo en la ruta."}</span>}
      />
      {!canStart && !c.pathLoading && <Card className="mb-6 border-clay/40 p-5"><p className="text-clay">{c.diagnosticPathError ?? "No se pudo confirmar un paso activo de tu ruta."}</p><Btn className="mt-3" onClick={() => c.retryDiagnosticPath?.()} disabled={c.pathLoading}>Reintentar carga de ruta</Btn></Card>}
      <div className="mb-6 grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3">
        {[
          ["Ya dominas", `${known}`, "text-sage", "Los omitimos: se repasarán más adelante."],
          ["Empiezas aquí", p.current ? conceptName(p, p.current) : "—", "text-brass", "Es tu punto de partida personal."],
          ["Por delante", `${Math.max(0, routeConceptCount(p) - known - (p.current ? 1 : 0))}`, "text-muted", "Conceptos que se desbloquean en orden."],
        ].map(([k, v, cl, d]) => (
          <div key={k} className="bg-surface p-5"><Label className="mb-1">{k}</Label><div className={cx("text-2xl font-medium", cl)}>{v}</div><p className="text-[15px] text-muted">{d}</p></div>
        ))}
      </div>
      {canStart && <PathBoard c={c} hero />}
    </div>
  );
}

export function PathScreen({ c }: { c: Ctx }) {
  const { p } = c;
  useEffect(() => {
    c.ensurePath();
  }, [c.ensurePath]);
  if (c.pathLoading) {
    return (
      <div>
        <PageHeader kicker="Mi ruta" title="Cargando ruta…" sub="Consultando el backend." />
      </div>
    );
  }
  if (!p.diagnosed)
    return (
      <div>
        <PageHeader kicker="Mi ruta" title="Aún no tienes una ruta" sub="Necesitamos conocer tu punto de partida." />
        <Btn size="lg" onClick={() => c.nav("diag-intro")}>Comenzar diagnóstico</Btn>
      </div>
    );
  const reinforceOthers = p.reinforce.filter((r) => r !== p.current);
  return (
    <div>
      <PageHeader kicker="Mi ruta" title={isRouteComplete(p) ? "Ruta completada" : "Tu ruta, actualizada"} sub={p.current ? <>Estás en <b className="text-brass">{conceptName(p, p.current)}</b>. {routeMasteredCount(p)} de {routeConceptCount(p)} conceptos dominados.</> : isRouteComplete(p) ? "Has dominado todos los conceptos de tu ruta." : `${routeMasteredCount(p)} de ${routeConceptCount(p)} conceptos dominados. Aún hay conceptos pendientes.`} />
      {c.flash && (
        <div className="rise mb-6 flex items-start justify-between gap-4 rounded-md border border-sage/40 bg-sage/10 p-4">
          <div className="flex gap-3"><Check className="mt-1 text-sage" size={18} /><div><div className="text-lg">Ruta actualizada</div><p className="text-muted">{c.flash}</p></div></div>
          <button onClick={c.clearFlash} className="text-sm text-muted hover:text-fg">Cerrar</button>
        </div>
      )}
      {reinforceOthers.length > 0 && (
        <div className="mb-6 rounded-md border border-dashed border-clay/60 bg-clay/10 p-4 text-clay">
          <b>{reinforceOthers.map((r) => byId(r).name).join(", ")}</b> volvió a considerarse en tu ruta: lo retomarás en cuanto termines el concepto actual.
        </div>
      )}
      <PathBoard c={c} />
    </div>
  );
}
