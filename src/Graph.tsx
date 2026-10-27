import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { CONCEPTS, byId, type Id } from "./data";
import { conceptDescription, conceptName, routeConcepts, status, type Profile } from "./state";
import { Bar, Btn, Label, Pill, StatusIcon, cx, pct, statusTone, type Tone } from "./ui";
import { curriculumApi, buildConceptMaps } from "./api";

const W = 204, H = 78, GX = 228, GY = 124, PAD = 10;
const pos = (id: Id) => {
  const c = byId(id);
  return { x: PAD + c.col * GX, y: PAD + c.row * GY };
};

const NODE: Record<Tone, string> = {
  sage: "border-sage/60 bg-sage/[0.07]",
  brass: "border-brass bg-brass/[0.09] halo",
  clay: "border-clay/70 border-dashed bg-clay/[0.07]",
  muted: "border-line bg-surface opacity-80",
};
const NODE_TEXT: Record<Tone, string> = { sage: "text-sage", brass: "text-brass", clay: "text-clay", muted: "text-faint" };

export function KnowledgeGraph({ p, selected, onSelect, recognized = [] }: { p: Profile; selected?: Id | null; onSelect: (id: Id) => void; recognized?: Id[] }) {
  const routeIds = routeConcepts(p);
  const concepts = CONCEPTS.filter((concept) => routeIds.includes(concept.id));
  const width = PAD * 2 + (Math.max(0, ...concepts.map((concept) => concept.col)) * GX) + W;
  const height = PAD * 2 + (Math.max(0, ...concepts.map((concept) => concept.row)) * GY) + H;
  const [prereqMap, setPrereqMap] = useState<Record<Id, Id[]>>(() => {
    const m: Record<Id, Id[]> = {} as Record<Id, Id[]>;
    CONCEPTS.forEach((c) => { m[c.id] = []; });
    return m;
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const subjectId = '10000000-0000-0000-0000-000000000001';
        const concepts = await curriculumApi.getConcepts(subjectId);
        const maps = buildConceptMaps(concepts);
        const next: Record<Id, Id[]> = {} as Record<Id, Id[]>;
        CONCEPTS.forEach((c) => { next[c.id] = []; });
        await Promise.all(
          concepts.map(async (concept) => {
            const slug = maps.uuidToSlug.get(concept.id);
            if (!slug) return;
            const prereqs = await curriculumApi.getPrerequisites(concept.id);
            const slugs = prereqs
              .map((pr) => maps.uuidToSlug.get(pr.prerequisiteId))
              .filter((s): s is Id => !!s);
            next[slug] = slugs;
          }),
        );
        if (!cancelled) setPrereqMap(next);
      } catch {
        // No inventar prerrequisitos si la consulta de relaciones falla.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative mx-auto" style={{ width, height }}>
        <svg className="absolute inset-0" width={width} height={height} aria-hidden>
          {concepts.flatMap((c) =>
            (prereqMap[c.id] ?? []).map((pr) => {
              if (!routeIds.includes(pr)) return null;
              const a = pos(pr), b = pos(c.id);
              const x1 = a.x + W / 2, y1 = a.y + H, x2 = b.x + W / 2, y2 = b.y;
              const done = status(p, pr) === "mastered";
              const toCur = p.current === c.id;
              const stroke = done && status(p, c.id) === "mastered" ? "var(--color-sage)" : done && toCur ? "var(--color-brass)" : "var(--color-line)";
              return (
                <g key={`${pr}-${c.id}`}>
                  <path d={`M${x1} ${y1} C${x1} ${y1 + 46}, ${x2} ${y2 - 46}, ${x2} ${y2}`} fill="none" stroke={stroke} strokeWidth={done ? 1.6 : 1.2} strokeDasharray={done ? undefined : "4 5"} />
                  <circle cx={x2} cy={y2} r="3" fill={stroke} />
                </g>
              );
            }),
          )}
        </svg>
        {concepts.map((c) => {
          const s = status(p, c.id);
          const isCur = p.current === c.id;
          const tone = statusTone(s, isCur);
          const { x, y } = pos(c.id);
          const label = isCur ? (s === "reinforce" ? "Estás aquí · refuerzo" : "Estás aquí") : s === "mastered" ? (recognized.includes(c.id) ? "Reconocido" : "Dominado") : s === "reinforce" ? "Refuerzo" : "Pendiente";
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{ left: x, top: y, width: W, height: H }}
              className={cx("absolute flex flex-col justify-between rounded-md border-[1.5px] p-3 text-left transition hover:-translate-y-0.5", NODE[tone], selected === c.id && "ring-2 ring-fg/60 ring-offset-2 ring-offset-bg")}
            >
              <div className={cx("flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em]", NODE_TEXT[tone])}>
                <span className="inline-flex items-center gap-1.5">
                  <StatusIcon s={s} current={isCur} size={12} />
                  {label}
                </span>
                {(p.mastery[c.id] > 0 || s === "mastered") && <span>{pct(p.mastery[c.id])}</span>}
              </div>
              <div className={cx("text-[15px] leading-tight", tone === "muted" ? "text-muted" : "text-fg")}>{conceptName(p, c.id)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ConceptDetail({ id, p, onGo }: { id: Id; p: Profile; onGo?: () => void }) {
  const c = byId(id);
  const [relations, setRelations] = useState<{ prerequisites: Id[]; unlocks: Id[] }>({ prerequisites: [], unlocks: [] });
  const [relationsLoaded, setRelationsLoaded] = useState(false);
  const s = status(p, id);
  const isCur = p.current === id;
  const tone = statusTone(s, isCur);
  const routeKey = routeConcepts(p).join("|");

  useEffect(() => {
    let cancelled = false;
    setRelationsLoaded(false);
    (async () => {
      try {
        const subjectId = "10000000-0000-0000-0000-000000000001";
        const concepts = await curriculumApi.getConcepts(subjectId);
        const maps = buildConceptMaps(concepts);
        const conceptId = maps.slugToUuid.get(id);
        if (!conceptId) throw new Error("Concept not in backend curriculum");
        const requiredIds = await curriculumApi.getPrerequisites(conceptId);
        const route = new Set(routeKey.split("|"));
        const prerequisites = requiredIds
          .map((item) => maps.uuidToSlug.get(item.prerequisiteId))
          .filter((slug): slug is Id => !!slug && route.has(slug));
        const outgoing = await Promise.all(
          concepts.filter((item) => route.has(maps.uuidToSlug.get(item.id) ?? ""))
            .map(async (item) => ({ id: item.id, prerequisites: await curriculumApi.getPrerequisites(item.id) })),
        );
        const unlockIds = outgoing
          .filter((item) => item.prerequisites.some((prerequisite) => prerequisite.prerequisiteId === conceptId))
          .map((item) => maps.uuidToSlug.get(item.id))
          .filter((slug): slug is Id => !!slug);
        if (!cancelled) setRelations({ prerequisites, unlocks: unlockIds });
      } catch {
        if (!cancelled) setRelations({ prerequisites: [], unlocks: [] });
      } finally {
        if (!cancelled) setRelationsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [id, routeKey]);

  const next = relations.unlocks.map(byId);
  return (
    <div className="rise space-y-4" key={id}>
      <div>
        <Pill tone={tone} icon={<StatusIcon s={s} current={isCur} size={12} />}>
          {isCur ? "Concepto actual" : s === "mastered" ? "Dominado" : s === "reinforce" ? "Necesita refuerzo" : "Pendiente"}
        </Pill>
        <h3 className="mt-3 text-2xl font-medium leading-tight">{conceptName(p, id)}</h3>
      </div>
      <div>
        <div className="mb-1.5 flex justify-between font-mono text-[11px] uppercase tracking-wider text-muted">
          <span>Dominio</span>
          <span>{pct(p.mastery[id])} · umbral 70%</span>
        </div>
        <Bar value={p.mastery[id]} tone={tone} threshold={0.7} />
      </div>
      <p className="text-[15px] italic text-muted">“{conceptDescription(p, id)}”</p>
      <div>
        <Label className="mb-1.5">Requiere</Label>
        {!relationsLoaded ? (
          <p className="text-[15px] text-muted">Cargando relaciones del plan de estudios…</p>
        ) : relations.prerequisites.length === 0 ? (
          <p className="text-[15px] text-muted">Sin prerrequisitos registrados.</p>
        ) : (
          <ul className="space-y-1 text-[15px]">
            {relations.prerequisites.map((r) => (
              <li key={r} className="flex items-center gap-2">
                <span className={status(p, r) === "mastered" ? "text-sage" : "text-faint"}><StatusIcon s={status(p, r)} size={13} /></span>
                {byId(r).name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <Label className="mb-1.5">Desbloquea</Label>
        {!relationsLoaded ? (
          <p className="text-[15px] text-muted">Cargando conceptos siguientes…</p>
        ) : next.length === 0 ? (
          <p className="text-[15px] text-muted">Cierre de esta rama de la ruta.</p>
        ) : (
          <ul className="space-y-1 text-[15px]">
          {next.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-muted"><ArrowRight size={13} />{conceptName(p, r.id)}</li>
            ))}
          </ul>
        )}
      </div>
      {isCur && onGo && <Btn onClick={onGo} icon={<ArrowRight size={16} />} className="w-full">Ir al concepto</Btn>}
    </div>
  );
}

export function Legend() {
  const items: [Tone, string][] = [["sage", "Dominado"], ["brass", "Estás aquí"], ["clay", "Necesita refuerzo"], ["muted", "Pendiente"]];
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-muted">
      {items.map(([t, l]) => (
        <span key={l} className="inline-flex items-center gap-2">
          <span className={cx("h-2.5 w-2.5 rounded-full border", t === "sage" && "border-sage bg-sage/40", t === "brass" && "border-brass bg-brass/40", t === "clay" && "border-clay bg-clay/40", t === "muted" && "border-faint")} />
          {l}
        </span>
      ))}
    </div>
  );
}
