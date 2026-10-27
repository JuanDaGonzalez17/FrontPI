import { useState } from "react";
import { ArrowRight, Award, Check, Eye, Lightbulb, RotateCcw, ShieldCheck } from "lucide-react";
import { REINFORCE, REVIEWS, byId, norm, unlocks, type Activity, type Id } from "./data";
import type { Ctx } from "./screens";
import { conceptDescription, conceptName, dueLabel, dueList, dueToday, isRouteComplete, levelOf, routeConceptCount, routeConcepts, routeMasteredCount, nextAction, overallMastery, status } from "./state";
import { Bar, Btn, Card, CycleStrip, Difficulty, Expr, FocusShell, Label, Mark, PageHeader, Pill, Ring, StatusIcon, cx, pct } from "./ui";

const reinforceList = (weak: string[]) => {
  const f = REINFORCE.filter((a) => weak.includes(a.skill));
  return f.length ? f : REINFORCE;
};

export function ConceptScreen({ c }: { c: Ctx }) {
  const { p } = c;
  if (!p.current) return null;
  const k = byId(p.current);
  const reinf = p.reinforce.includes(k.id);
  const done = reinf ? p.reinforceDone : p.practiceDone;
  const tone = reinf ? "clay" : "brass";
  const cta = reinf
    ? p.reinforceDone ? { l: "Realizar nuevo intento", go: () => c.nav("eval-intro") } : { l: "Comenzar refuerzo", go: () => c.nav("activity") }
    : p.practiceDone ? { l: "Realizar evaluación del concepto", go: () => c.nav("eval-intro") } : { l: "Comenzar", go: () => c.nav("activity") };
  return (
    <div>
      <div className="rise mb-8">
        <div className="mb-3 flex items-center gap-3"><Label className={reinf ? "text-clay" : "text-brass"}>{reinf ? "Concepto en refuerzo" : "Concepto actual"}</Label><Pill tone={tone}>{nextAction(p).state}</Pill></div>
        <h1 className="text-4xl font-medium leading-tight md:text-5xl">{conceptName(p, k.id)}</h1>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section>
            <Label className="mb-2">Objetivo de aprendizaje</Label>
            <p className="border-l-2 border-brass pl-5 text-2xl italic leading-snug">“{conceptDescription(p, k.id)}”</p>
          </section>
          {reinf ? (
            <section>
              <Label className="mb-3 text-clay">Qué necesita refuerzo</Label>
              <div className="space-y-2">
                {(p.weakSkills.length ? p.weakSkills : ["Habilidades del concepto"]).map((s) => (
                  <div key={s} className="flex items-center gap-3 rounded-sm border border-clay/40 bg-clay/10 px-4 py-3"><RotateCcw size={15} className="text-clay" /><span className="text-lg">{s}</span></div>
                ))}
              </div>
              <p className="mt-3 text-muted">No hay que repetir todo: solo lo que la evaluación mostró débil.</p>
            </section>
          ) : (
            <section>
              <Label className="mb-2">Por qué ahora</Label>
              <p className="text-lg text-muted">
                Ya dominas {k.prereqs.map((r) => byId(r).name).join(" y ") || "los fundamentos"}. Este concepto es el paso que abre{" "}
                <span className="text-fg">{unlocks(k.id).map((u) => u.name).join(", ") || "el cierre de la asignatura"}</span>.
              </p>
            </section>
          )}
          <section>
            <Label className="mb-3">Prerrequisitos</Label>
            <ul className="space-y-1.5">
              {k.prereqs.length === 0 && <li className="text-muted">Ninguno: es el punto de partida.</li>}
              {k.prereqs.map((r) => (
                <li key={r} className="flex items-center gap-2.5 text-lg"><span className={status(p, r) === "mastered" ? "text-sage" : "text-faint"}><StatusIcon s={status(p, r)} size={16} /></span>{byId(r).name}<span className="font-mono text-xs text-muted">{pct(p.mastery[r])}</span></li>
              ))}
            </ul>
          </section>
          <section>
            <Label className="mb-3">{reinf ? "Actividades de refuerzo" : "Actividades recomendadas"}</Label>
            <ol className="divide-y divide-line rounded-md border border-line bg-surface">
              <li className="px-5 py-4 text-muted">Las actividades y el refuerzo se cargarán desde tu ruta cuando comiences.</li>
            </ol>
          </section>
          <div className="flex flex-wrap items-center gap-4">
            <Btn size="lg" variant={reinf ? "danger" : "primary"} onClick={cta.go} icon={<ArrowRight size={18} />}>{cta.l}</Btn>
            {done && <Btn variant="quiet" onClick={() => c.nav("activity")}>Practicar de nuevo</Btn>}
          </div>
        </div>
        <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          <Card className="p-6">
            <Label className="mb-4">Tu dominio</Label>
            <div className="flex items-center gap-5">
              <Ring value={p.mastery[k.id]} size={92} tone={tone}><span className="text-2xl font-medium">{Math.round(p.mastery[k.id] * 100)}</span><span className="-mt-1 font-mono text-[10px] text-muted">/ 100</span></Ring>
              <p className="text-[15px] text-muted">Necesitas <b className="text-fg">70</b> en la evaluación para avanzar.</p>
            </div>
            <div className="mt-5"><Bar value={p.mastery[k.id]} tone={tone} threshold={0.7} /></div>
          </Card>
          <Card className="p-6">
            <Label className="mb-3">Dónde estás en el ciclo</Label>
            <CycleStrip active={reinf ? 2 : p.practiceDone ? 1 : 0} skipReinforce={!reinf} />
            <p className="mt-4 text-[15px] text-muted">{reinf ? "Refuerzas lo débil y vuelves a evaluar." : p.practiceDone ? "Ya practicaste: puedes evaluar cuando te sientas listo." : "Primero practicas con retroalimentación; la evaluación llega después."}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

type Phase = "idle" | "wrong" | "right" | "shown";

export function ActivityScreen({ c }: { c: Ctx }) {
  const { p } = c;
  const k = byId(p.current!);
  const reinf = p.reinforce.includes(k.id);
  const list: Activity[] = reinf ? reinforceList(p.weakSkills) : ACTIVITIES;
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [pick, setPick] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [hint, setHint] = useState(false);
  const a = list[i];
  const last = i === list.length - 1;
  const canCheck = a.options ? pick !== null : text.trim().length > 0;
  const check = () => {
    const ok = a.options ? a.options[pick!].ok : a.accepted!.includes(norm(text));
    setPhase(ok ? "right" : "wrong");
  };
  const next = () => {
    if (last) return c.finishActivities();
    setI(i + 1); setText(""); setPick(null); setPhase("idle"); setHint(false);
  };
  const retry = () => { setPhase("idle"); setPick(null); };
  const closed = phase === "right" || phase === "shown";
  return (
    <FocusShell kicker={reinf ? "Refuerzo guiado" : "Práctica guiada"} title={k.name} step={i} total={list.length} onExit={() => c.nav("concept")} exitLabel="Volver al concepto" tone={reinf ? "clay" : "brass"}>
      <div key={a.id}>
        <div className="mb-3 flex flex-wrap items-center gap-4">
          <Label>Actividad {i + 1} de {list.length}</Label>
          <Pill>{a.skill}</Pill>
          <Difficulty n={a.difficulty} />
        </div>
        <h2 className="mb-5 text-2xl leading-snug md:text-[28px]">{a.prompt}</h2>
        <Expr className="mb-6">{a.expr}</Expr>

        {a.options ? (
          <div className="space-y-2.5">
            {a.options.map((o, n) => (
              <button key={n} disabled={closed} onClick={() => { setPick(n); if (phase === "wrong") setPhase("idle"); }}
                className={cx("flex w-full items-center gap-4 rounded-sm border px-4 py-3.5 text-left text-lg transition", pick === n ? "border-brass bg-brass/10" : "border-line bg-surface hover:bg-raised", closed && o.ok && "border-sage bg-sage/10")}>
                <span className="font-mono text-xs text-faint">{"ABC"[n]}</span>{o.t}
              </button>
            ))}
          </div>
        ) : (
          <div>
            <label htmlFor="ans" className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-muted">Tu respuesta</label>
            <input id="ans" value={text} disabled={closed} onChange={(e) => { setText(e.target.value); if (phase === "wrong") setPhase("idle"); }}
              onKeyDown={(e) => e.key === "Enter" && canCheck && phase === "idle" && check()}
              placeholder="Escribe tu resultado, p. ej.  x*sin(x) + C" autoComplete="off" spellCheck={false}
              className="w-full rounded-sm border border-line bg-surface px-4 py-3 font-mono text-lg outline-none placeholder:text-faint focus:border-brass" />
          </div>
        )}

        {!closed && (
          <div className="mt-4">
            <button onClick={() => setHint(!hint)} className="inline-flex items-center gap-2 text-[15px] text-muted hover:text-fg"><Lightbulb size={15} />{hint ? "Ocultar pista" : "Necesito una pista"}</button>
            {hint && <p className="rise mt-2 rounded-sm border border-line bg-raised px-4 py-3 text-muted">{a.hint}</p>}
          </div>
        )}

        {phase === "wrong" && (
          <div className="rise mt-6 rounded-sm border-l-2 border-clay bg-clay/10 p-5">
            <div className="mb-1 flex items-center gap-2 text-lg text-clay"><Mark ok={false} />Todavía no</div>
            <p className="text-muted">{a.noMsg}</p>
          </div>
        )}
        {closed && (
          <div className={cx("rise mt-6 rounded-sm border-l-2 p-5", phase === "right" ? "border-sage bg-sage/10" : "border-brass bg-brass/10")}>
            <div className={cx("mb-1 flex items-center gap-2 text-lg", phase === "right" ? "text-sage" : "text-brass")}>{phase === "right" ? <><Mark ok />Correcto</> : <><Eye size={15} />Solución paso a paso</>}</div>
            {phase === "right" && <p className="text-muted">{a.okMsg}</p>}
            {phase === "shown" && <ol className="space-y-1.5 font-serif italic">{a.solution.map((s, n) => <li key={n}>{s}</li>)}</ol>}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {phase === "idle" && <Btn size="lg" disabled={!canCheck} onClick={check}>Comprobar</Btn>}
          {phase === "wrong" && (<><Btn size="lg" onClick={retry} icon={<RotateCcw size={16} />}>Intentar nuevamente</Btn><Btn size="lg" variant="ghost" onClick={() => setPhase("shown")}>Ver solución</Btn></>)}
          {closed && <Btn size="lg" onClick={next} icon={<ArrowRight size={18} />}>{last ? "Terminar actividades" : "Siguiente actividad"}</Btn>}
          {!closed && <Btn variant="quiet" onClick={next}>Pasar a la siguiente</Btn>}
        </div>
        <p className="mt-6 text-sm text-faint">Esto es práctica: no hay nota y no afecta tu dominio. Equivocarte aquí es parte del proceso.</p>
      </div>
    </FocusShell>
  );
}

export function ActivitiesDone({ c }: { c: Ctx }) {
  const reinf = !!c.p.current && c.p.reinforce.includes(c.p.current);
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <div className={cx("mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border", reinf ? "border-clay/50 bg-clay/10 text-clay" : "border-sage/50 bg-sage/10 text-sage")}><Check size={26} /></div>
      <h1 className="text-4xl font-medium">{reinf ? "Has completado el refuerzo." : "Has completado las actividades recomendadas."}</h1>
      <p className="mt-4 text-lg text-muted">{reinf ? "Cuando te sientas listo, vuelve a intentar la evaluación. No hay límite de intentos." : "Ahora puedes comprobar tu dominio con la evaluación del concepto. Si prefieres practicar más, también puedes hacerlo."}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Btn size="lg" onClick={() => c.nav("eval-intro")} icon={<ArrowRight size={18} />}>{reinf ? "Realizar nuevo intento" : "Realizar evaluación del concepto"}</Btn>
        <Btn size="lg" variant="ghost" onClick={() => c.nav("concept")}>Volver al concepto</Btn>
      </div>
      <div className="mt-10 flex justify-center"><CycleStrip active={1} skipReinforce={!reinf} /></div>
    </div>
  );
}

export function EvalIntro({ c }: { c: Ctx }) {
  const { p } = c;
  const k = byId(p.current!);
  const rules: [string, string][] = [["6", "preguntas"], ["70", "puntaje para avanzar"], [`#${p.evalAttempts + 1}`, "intento"], ["0", "pistas"]];
  return (
    <div className="mx-auto max-w-2xl py-4">
      <div className="rounded-md border border-line bg-surface p-8 md:p-10" style={{ borderTop: "4px solid var(--color-brass)" }}>
        <div className="mb-6 flex items-center justify-between"><Label className="text-brass">Evaluación de dominio</Label><ShieldCheck size={18} className="text-brass" /></div>
        <Label className="mb-1">Concepto</Label>
        <h1 className="text-4xl font-medium leading-tight">{conceptName(p, k.id)}</h1>
        <Label className="mb-1 mt-8">Objetivo</Label>
        <p className="text-xl text-muted">Demostrar que puedes resolver problemas relacionados con este concepto de forma autónoma.</p>
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line md:grid-cols-4">
          {rules.map(([n, l]) => (<div key={l} className="bg-bg/60 p-4"><div className="text-3xl font-medium">{n}</div><div className="font-mono text-[11px] uppercase tracking-wider text-muted">{l}</div></div>))}
        </div>
        <p className="mt-6 text-[15px] text-muted">A diferencia de la práctica, aquí no verás retroalimentación hasta el final. Si no alcanzas el umbral, recibirás refuerzo dirigido y podrás intentarlo otra vez.</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Btn size="lg" onClick={() => c.startShortEval()} disabled={c.evalLoading} icon={<ArrowRight size={18} />}>{c.evalLoading ? "Preparando…" : "Comenzar evaluación"}</Btn>
          <Btn variant="quiet" onClick={() => c.nav("concept")}>Practicar un poco más</Btn>
        </div>
      </div>
    </div>
  );
}

export function EvalResultScreen({ c }: { c: Ctx }) {
  const r = c.evalResult!;
  const k = byId(r.id);
  const pass = r.passed;
  const tone = pass ? "sage" : "clay";
  const next = r.nextId ? byId(r.nextId) : null;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rise">
        <Label className="mb-6">Evaluación de dominio · {conceptName(c.p, k.id)} · intento {r.attempt}</Label>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div className="flex items-baseline gap-2"><span className={cx("text-[96px] font-medium leading-none tracking-tight md:text-[120px]", pass ? "text-sage" : "text-clay")}>{r.score}</span><span className="text-3xl text-muted">/ 100</span></div>
          <div className={cx("mb-3 -rotate-2 rounded-sm border-2 px-4 py-2 font-mono text-sm uppercase tracking-[0.14em]", pass ? "border-sage text-sage" : "border-clay text-clay")}>{pass ? "Concepto aprobado ✓" : "Necesita refuerzo"}</div>
        </div>
        <div className="mt-6 max-w-lg"><Bar value={r.score / 100} tone={tone} threshold={0.7} /><div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-wider text-faint"><span>0</span><span>umbral 70</span><span>100</span></div></div>
        <p className="mt-6 text-2xl leading-snug">{pass ? "Has demostrado el dominio necesario para avanzar." : "El resultado indica que todavía necesitas reforzar este concepto antes de avanzar."}</p>
        {!pass && <p className="mt-2 text-lg text-muted">Esto no te bloquea: refuerzas lo que falló y vuelves a intentarlo cuando quieras.</p>}
      </div>

      <section className="mt-10">
        <Label className="mb-3">{pass ? "Desempeño por habilidad" : "Qué habilidades necesitan refuerzo"}</Label>
        <div className="divide-y divide-line rounded-md border border-line bg-surface">
          {r.skills.length === 0 && <div className="px-5 py-4 text-muted">El backend no envió un desglose por habilidad para este intento.</div>}
          {r.skills.map((s) => {
            const good = s.ok === s.n;
            return (<div key={s.skill} className="flex items-center gap-4 px-5 py-3.5"><Mark ok={good} /><span className="flex-1 text-lg">{s.skill}</span><span className="font-mono text-sm text-muted">{s.ok} / {s.n}</span>{!good && <Pill tone="clay">Reforzar</Pill>}</div>);
          })}
        </div>
      </section>

      {pass ? (
        <section className="mt-10">
          <Card className="flex flex-wrap items-center justify-between gap-5 p-6">
            <div><Label className="mb-1">Siguiente en tu ruta</Label><div className="text-2xl">{next ? conceptName(c.p, next.id) : "Evaluación global"}</div><p className="text-muted">{next ? "Se desbloqueó con este resultado." : "Has dominado todos los conceptos de tu ruta."}</p></div>
            <Btn size="lg" onClick={c.continueAfterPass} icon={<ArrowRight size={18} />}>Continuar con la ruta</Btn>
          </Card>
        </section>
      ) : (
        <section className="mt-10">
          <Label className="mb-3">Siguiente paso</Label>
          <p className="text-muted">Las actividades de refuerzo se cargarán desde el backend al comenzar.</p>
          <div className="mt-6 flex flex-wrap items-center gap-4"><Btn size="lg" variant="danger" onClick={() => c.nav("concept")} icon={<ArrowRight size={18} />}>Comenzar refuerzo</Btn><span className="text-muted">Después podrás realizar un nuevo intento.</span></div>
        </section>
      )}
      <div className="mt-10"><CycleStrip active={pass ? 3 : 2} skipReinforce={pass} /></div>
    </div>
  );
}

export function ReviewList({ c }: { c: Ctx }) {
  const { p } = c;
  const due = dueToday(p);
  const later = dueList(p).filter(([, r]) => r.dueIn > 0);
  return (
    <div>
      <PageHeader kicker="Repasos · active recall" title={due.length ? "Repaso de hoy" : "Nada pendiente hoy"} sub="Recordar sin mirar es lo que fija el conocimiento. Cada repaso es una sola pregunta." />
      {!p.diagnosed ? <Card className="p-6 text-muted">Los repasos se programan cuando dominas tus primeros conceptos.</Card> : (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            <section>
              <Label className="mb-3 text-brass">Para hoy · {due.length}</Label>
              <div className="space-y-3">
                {due.length === 0 && <Card className="p-6 text-muted">Estás al día. El próximo repaso aparece abajo.</Card>}
                {due.map(([id]) => (
                  <Card key={id} tone="brass" className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div><div className="text-xl">{byId(id).name}</div><div className="text-sm text-muted">Dominio {pct(p.mastery[id])}</div></div>
                    <Btn disabled={c.reviewLoading} onClick={() => c.startReviewSessionFlow()} icon={<ArrowRight size={16} />}>{c.reviewLoading ? "Preparando…" : "Repasar"}</Btn>
                  </Card>
                ))}
              </div>
            </section>
            <section>
              <Label className="mb-3">Próximos</Label>
              <div className="divide-y divide-line rounded-md border border-line bg-surface">
                {later.length === 0 && <div className="p-5 text-muted">Sin repasos programados.</div>}
                {later.map(([id, r]) => (<div key={id} className="flex items-center gap-4 px-5 py-3.5"><span className="flex-1 text-lg">{byId(id).name}</span><span className="font-mono text-sm text-muted">{dueLabel(r.dueIn)}</span></div>))}
              </div>
            </section>
          </div>
          <Card className="h-fit p-6">
            <Label className="mb-3">Cómo funciona</Label>
            <ul className="space-y-3 text-[15px] text-muted">
              <li><b className="text-fg">Acierto:</b> el siguiente repaso se espacia más.</li>
              <li><b className="text-fg">Fallo:</b> nuevo intento en un día.</li>
              <li><b className="text-fg">Dos fallos:</b> el concepto vuelve a tu ruta.</li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

export function ReviewScreen({ c, onAnswer }: { c: Ctx; onAnswer: (id: Id, ok: boolean) => void }) {
  const id = c.reviewTarget!;
  const bank = REVIEWS[id]!;
  const fails = c.p.reviews[id]?.fails ?? 0;
  const q = bank[fails > 0 ? 1 : 0];
  const [pick, setPick] = useState<number | null>(null);
  return (
    <FocusShell kicker="Repaso · active recall" title={byId(id).name} onExit={() => c.nav("review-list")} exitLabel="Salir del repaso">
      <div className="mx-auto max-w-2xl">
        <Label className="mb-3">{fails > 0 ? "Segundo intento" : "Repaso de hoy"} · {byId(id).name}</Label>
        <h2 className="mb-2 text-3xl leading-snug">{q.text}</h2>
        <p className="mb-7 text-muted">Antes de elegir, intenta responder con tus palabras.</p>
        <div className="space-y-2.5">
          {q.options.map((o, k) => (
            <button key={k} onClick={() => setPick(k)} className={cx("flex w-full items-start gap-4 rounded-sm border px-4 py-3.5 text-left transition", pick === k ? "border-brass bg-brass/10" : "border-line bg-surface hover:bg-raised")}>
              <span className="mt-0.5 font-mono text-xs text-faint">{"ABCD"[k]}</span><span className="text-lg">{o}</span>
            </button>
          ))}
        </div>
        <Btn size="lg" className="mt-8" disabled={pick === null} onClick={() => onAnswer(id, pick === q.correct)} icon={<ArrowRight size={18} />}>Responder</Btn>
      </div>
    </FocusShell>
  );
}

export function ReviewResultScreen({ c }: { c: Ctx }) {
  const r = c.reviewResult!;
  const k = byId(r.id);
  const out = r.fails >= 2;
  const nextDue = dueToday(c.p).find(([id]) => id !== r.id);
  const tone = r.ok ? "sage" : out ? "clay" : "brass";
  return (
    <div className="mx-auto max-w-2xl py-6">
      <Label className="mb-4">Resumen de repasos · {conceptName(c.p, k.id)}</Label>
      <div className={cx("rise rounded-md border-l-4 bg-surface p-7", r.ok ? "border-sage" : out ? "border-clay" : "border-brass")}>
        <div className={cx("mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest", r.ok ? "text-sage" : out ? "text-clay" : "text-brass")}>{r.ok ? <><Check size={14} />Todas recordadas</> : <><RotateCcw size={14} />{out ? "Se requiere refuerzo" : "Algunas requieren práctica"}</>}</div>
        <h1 className="text-3xl font-medium leading-snug">Repaso completado: {r.remembered} de {r.reviewed} tarjetas recordadas.</h1>
        <p className="mt-4 text-lg text-muted">{r.explain}</p>
      </div>

      <div className="mt-6 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
        <div className="bg-surface p-5"><Label className="mb-2">Dominio</Label><div className="mb-2 text-3xl font-medium">{r.mastery === null ? "—" : pct(r.mastery)}</div>{r.mastery !== null && <Bar value={r.mastery} tone={tone === "brass" ? "brass" : tone} threshold={0.7} />}</div>
        <div className="bg-surface p-5"><Label className="mb-2">{out ? "Estado" : "Próximo repaso"}</Label><div className="text-2xl">{out ? "Vuelve a tu ruta" : r.nextDays === null ? "—" : dueLabel(r.nextDays)}</div></div>
      </div>

      {out && (
        <div className="rise mt-6 rounded-md border border-dashed border-clay/60 bg-clay/10 p-5">
          <p className="text-lg">No pasa nada: <b>{k.name}</b> requiere volver a estudiarse. Tu ruta se actualizará con ese resultado.</p>
        </div>
      )}
      {!r.ok && !out && <p className="mt-6 text-muted">Programamos un nuevo intento para mañana. Si quieres, puedes intentarlo ahora con otra pregunta.</p>}

      <div className="mt-8 flex flex-wrap gap-3">
        {!r.ok && !out && <Btn size="lg" onClick={() => c.startReview(r.id)} icon={<RotateCcw size={16} />}>Intentar de nuevo ahora</Btn>}
        {out && <Btn size="lg" onClick={() => c.nav("path")} icon={<ArrowRight size={18} />}>Ver mi ruta</Btn>}
        {r.ok && nextDue && <Btn size="lg" onClick={() => c.startReview(nextDue[0])} icon={<ArrowRight size={18} />}>Siguiente repaso</Btn>}
        <Btn size="lg" variant="ghost" onClick={() => c.nav("review-list")}>Volver a repasos</Btn>
      </div>
    </div>
  );
}

export function ProgressScreen({ c }: { c: Ctx }) {
  const { p } = c;
  if (!p.diagnosed)
    return (<div><PageHeader kicker="Progreso" title="Todavía no hay progreso que mostrar" sub="Tu perfil de dominio se crea con el diagnóstico." /><Btn size="lg" onClick={() => c.nav("diag-intro")}>Comenzar diagnóstico</Btn></div>);
  const total = routeConceptCount(p);
  const routeIds = routeConcepts(p);
  const m = routeMasteredCount(p);
  const reinf = p.reinforce.length;
  const inCur = p.current && !p.reinforce.includes(p.current) ? 1 : 0;
  const pending = Math.max(0, total - m - reinf - inCur);
  const seg: [string, number, string][] = [["Dominados", m, "bg-sage"], ["En curso", inCur, "bg-brass"], ["Refuerzo", reinf, "bg-clay"], ["Pendientes", pending, "bg-line"]];
  const due = dueList(p).slice(0, 4);
  const complete = isRouteComplete(p);
  return (
    <div>
      <PageHeader kicker="Progreso · Cálculo Integral" title="Tu estado de dominio" />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-4"><Ring value={total ? m / total : 0} size={104}><span className="text-2xl font-medium">{pct(total ? m / total : 0)}</span></Ring><div><Label>Progreso</Label><div className="text-lg">{m} de {total} conceptos</div></div></div>
              <div className="flex items-center gap-4"><Ring value={overallMastery(p)} size={104} tone="sage"><span className="text-2xl font-medium">{pct(overallMastery(p))}</span></Ring><div><Label>Dominio general</Label><div className="text-lg">{levelOf(Math.round(overallMastery(p) * 100))}</div></div></div>
            </div>
            <div className="mt-6 flex h-2 overflow-hidden rounded-full bg-raised">{seg.map(([k, n, cl]) => n > 0 && <div key={k} className={cl} style={{ width: `${total ? (n / total) * 100 : 0}%` }} />)}</div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-muted">{seg.map(([k, n, cl]) => <span key={k} className="inline-flex items-center gap-2"><span className={cx("h-2 w-2 rounded-full", cl)} />{k} {n}</span>)}</div>
          </Card>
          <Card className="p-6">
            <Label className="mb-4">Dominio por concepto</Label>
            <div className="space-y-3">
              {routeIds.map((id) => byId(id)).map((k) => {
                const s = status(p, k.id);
                const cur = p.current === k.id;
                return (
              <div key={k.id} className="flex items-center gap-3">
                    <span className={cx("w-4", s === "mastered" ? "text-sage" : s === "reinforce" ? "text-clay" : cur ? "text-brass" : "text-faint")}><StatusIcon s={s} current={cur} size={14} /></span>
                    <span className={cx("w-52 shrink-0 truncate text-[16px]", s === "pending" && !cur && "text-muted")}>{conceptName(p, k.id)}</span>
                    <Bar value={p.mastery[k.id]} tone={s === "mastered" ? "sage" : s === "reinforce" ? "clay" : "brass"} threshold={0.7} />
                    <span className="w-10 text-right font-mono text-xs text-muted">{pct(p.mastery[k.id])}</span>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div className="p-6 pb-3"><Label>Historial de evaluaciones</Label></div>
            <table className="w-full text-left">
              <tbody className="divide-y divide-line">
                {p.history.length === 0 && <tr><td colSpan={4} className="px-6 py-5 text-muted">Todavía no hay evaluaciones registradas en esta sesión.</td></tr>}
                {p.history.map((h, i) => (
                  <tr key={i}>
                    <td className="py-3 pl-6 font-mono text-xs text-muted">{h.date}</td>
                    <td className="py-3 pr-3"><div className="text-[16px]">{h.label}</div><div className="font-mono text-[10px] uppercase tracking-wider text-faint">{h.kind}</div></td>
                    <td className="py-3 text-right font-mono">{h.score ?? "—"}</td>
                    <td className="py-3 pl-4 pr-6 text-right">{h.passed === null ? <Pill>Perfil</Pill> : h.passed ? <Pill tone="sage">Aprobada</Pill> : <Pill tone="clay">Refuerzo</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="p-6">
            <Label className="mb-3">Concepto actual</Label>
            {p.current ? (<><div className="text-xl">{byId(p.current).name}</div><div className="mb-4 mt-2"><Bar value={p.mastery[p.current]} tone={reinf ? "clay" : "brass"} threshold={0.7} /></div><Btn className="w-full" onClick={() => c.nav(nextAction(p).screen)}>{nextAction(p).label}</Btn></>) : <p className="text-muted">{complete ? "Ruta completada." : "No hay un paso actual cargado; abre tu ruta para actualizarla."}</p>}
          </Card>
          <Card className="p-6">
            <Label className="mb-3 text-clay">Necesitan refuerzo</Label>
            {reinf === 0 ? <p className="text-muted">Ninguno por ahora.</p> : <ul className="space-y-2">{p.reinforce.map((id) => <li key={id} className="flex items-center gap-2 text-lg"><RotateCcw size={14} className="text-clay" />{byId(id).name}</li>)}</ul>}
          </Card>
          <Card className="p-6">
            <Label className="mb-3">Próximos repasos</Label>
            <ul className="space-y-2">{due.map(([id, r]) => <li key={id} className="flex justify-between"><span>{byId(id).name}</span><span className="font-mono text-xs text-muted">{dueLabel(r.dueIn)}</span></li>)}</ul>
          </Card>
          <Card tone={complete ? "sage" : undefined} className="p-6">
            <div className="mb-2 flex items-center gap-2"><Award size={16} className={complete ? "text-sage" : "text-faint"} /><Label>Evaluación global</Label></div>
            {complete ? (<><p className="mb-4 text-muted">Tu ruta está completa. Confirma tu dominio general.</p><Btn className="w-full" onClick={() => c.nav("final-ready")}>Ir a la evaluación global</Btn></>) : <p className="text-muted">Se habilita al completar tu ruta ({Math.max(0, total - m)} conceptos restantes).</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

export function FinalReady({ c }: { c: Ctx }) {
  const { p } = c;
  if (!isRouteComplete(p)) {
    return (
      <div className="mx-auto max-w-2xl py-8 text-center">
        <Label className="mb-3 text-brass">Tu ruta sigue en progreso</Label>
        <h1 className="text-4xl font-medium leading-tight md:text-5xl">Aún tienes conceptos por estudiar y evaluar.</h1>
        <p className="mt-4 text-lg text-muted">La evaluación global se habilitará cuando el backend marque todos los pasos de tu ruta como dominados.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {p.current && <Btn size="lg" onClick={() => c.nav("concept")} icon={<ArrowRight size={18} />}>Continuar con {conceptName(p, p.current)}</Btn>}
          <Btn size="lg" variant="ghost" onClick={() => c.nav("path")}>Ver mi ruta</Btn>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl py-8 text-center">
      <div className="rise mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border-2 border-sage text-sage"><Check size={36} strokeWidth={2} /></div>
      <Label className="mb-3 text-sage">Ruta completada</Label>
      <h1 className="text-4xl font-medium leading-tight md:text-5xl">Has completado tu ruta de aprendizaje.</h1>
      <p className="mt-4 text-lg text-muted">Dominas los {routeConceptCount(p)} conceptos de tu ruta, con un dominio general de {pct(overallMastery(p))}. El último paso es confirmar que puedes integrarlos.</p>
      <Card className="mt-8 grid grid-cols-3 divide-x divide-line text-left">
        {[[`${routeMasteredCount(p)} / ${routeConceptCount(p)}`, "conceptos dominados"], [pct(overallMastery(p)), "dominio general"], [`${dueList(p).length}`, "repasos programados"]].map(([a, b]) => (<div key={b} className="p-5"><div className="text-3xl font-medium">{a}</div><div className="font-mono text-[11px] uppercase tracking-wider text-muted">{b}</div></div>))}
      </Card>
      <div className="mt-8 flex flex-wrap justify-center gap-3"><Btn size="lg" onClick={() => c.nav("global-intro")} icon={<ArrowRight size={18} />}>Evaluación global</Btn><Btn size="lg" variant="ghost" onClick={() => c.nav("path")}>Ver mi ruta</Btn></div>
    </div>
  );
}

export function GlobalIntro({ c }: { c: Ctx }) {
  return (
    <div className="mx-auto max-w-2xl py-4">
      <div className="rounded-md border border-line bg-surface p-8 md:p-10" style={{ borderTop: "4px solid var(--color-brass)" }}>
        <Label className="mb-6 text-brass">Evaluación global · Cálculo Integral</Label>
        <h1 className="text-4xl font-medium leading-tight">¿Dominas la asignatura completa?</h1>
        <p className="mt-4 text-xl text-muted">Preguntas que mezclan conceptos de toda tu ruta. Determina si tu dominio general es suficiente y qué conviene seguir repasando.</p>
        <ul className="mt-6 space-y-2 text-lg"><li>· Preguntas de distintos conceptos de tu ruta</li><li>· El puntaje se mostrar� al final</li><li>· Sin pistas; el resultado llega al final</li></ul>
        <div className="mt-8 flex gap-4"><Btn size="lg" onClick={() => c.startGlobalExamFlow()} disabled={c.globalExamLoading} icon={<ArrowRight size={18} />}>{c.globalExamLoading ? "Preparando…" : "Comenzar"}</Btn><Btn variant="quiet" onClick={() => c.nav("final-ready")}>Volver</Btn></div>
      </div>
    </div>
  );
}

export function GlobalResultScreen({ c }: { c: Ctx }) {
  const r = c.globalResult!;
  const pass = r.passed ?? r.score >= 70;
  return (
    <div className="mx-auto max-w-3xl">
      <Label className="mb-6">Evaluación global · Cálculo Integral</Label>
      <div className="rise flex flex-wrap items-end gap-x-8 gap-y-4">
        <div><Label className="mb-1">Nota final</Label><div className="flex items-baseline gap-2"><span className={cx("text-[96px] font-medium leading-none md:text-[120px]", pass ? "text-sage" : "text-clay")}>{r.score}</span><span className="text-3xl text-muted">/ 100</span></div></div>
        <div className="mb-3"><Label className="mb-1">Nivel de dominio</Label><Pill tone={pass ? "sage" : "clay"}>{levelOf(r.score)}</Pill></div>
      </div>
      <p className="mt-6 text-2xl leading-snug">{pass ? "Tienes un dominio general suficiente de Cálculo Integral." : "Aún no alcanzas el dominio general: repasa los conceptos señalados y vuelve a intentarlo."}</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <Card className="p-6"><Label className="mb-3 text-sage">Conceptos fuertes</Label><ul className="space-y-2">{r.strong.map((id) => <li key={id} className="flex items-center gap-2 text-lg"><Check size={15} className="text-sage" />{byId(id).name}</li>)}</ul></Card>
        <Card className="p-6"><Label className="mb-3 text-clay">Requieren atención</Label>{r.weak.length === 0 ? <p className="text-muted">Ninguno.</p> : <ul className="space-y-2">{r.weak.map((id) => <li key={id} className="flex items-center gap-2 text-lg"><RotateCcw size={14} className="text-clay" />{byId(id).name}</li>)}</ul>}</Card>
      </div>
      <Card className="mt-5 p-6">
        <Label className="mb-3">Recomendaciones de repaso</Label>
        <ul className="space-y-2 text-lg">{(r.weak.length ? r.weak : r.strong.slice(0, 2)).map((id) => <li key={id} className="flex items-start gap-2"><ArrowRight size={15} className="mt-1.5 text-brass" /><span>Programar repaso de <b>{byId(id).name}</b> esta semana.</span></li>)}</ul>
        <div className="mt-5 flex flex-wrap gap-3"><Btn onClick={() => c.nav("review-list")}>Ir a repasos</Btn><Btn variant="ghost" onClick={() => c.nav("progress")}>Ver progreso</Btn></div>
      </Card>
    </div>
  );
}
