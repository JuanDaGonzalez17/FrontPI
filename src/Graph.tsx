import { ArrowRight } from "lucide-react";
import { CONCEPTS, byId, unlocks, type Id } from "./data";
import { status, type Profile } from "./state";
import { Bar, Btn, Label, Pill, StatusIcon, cx, pct, statusTone, type Tone } from "./ui";

const W = 204, H = 78, GX = 228, GY = 124, PAD = 10;
const pos = (id: Id) => {
  const c = byId(id);
  return { x: PAD + c.col * GX, y: PAD + c.row * GY };
};
const WIDTH = PAD * 2 + 2 * GX + W;
const HEIGHT = PAD * 2 + 7 * GY + H;

const NODE: Record<Tone, string> = {
  sage: "border-sage/60 bg-sage/[0.07]",
  brass: "border-brass bg-brass/[0.09] halo",
  clay: "border-clay/70 border-dashed bg-clay/[0.07]",
  muted: "border-line bg-surface opacity-80",
};
const NODE_TEXT: Record<Tone, string> = { sage: "text-sage", brass: "text-brass", clay: "text-clay", muted: "text-faint" };

export function KnowledgeGraph({ p, selected, onSelect, recognized = [] }: { p: Profile; selected?: Id | null; onSelect: (id: Id) => void; recognized?: Id[] }) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative mx-auto" style={{ width: WIDTH, height: HEIGHT }}>
        <svg className="absolute inset-0" width={WIDTH} height={HEIGHT} aria-hidden>
          {CONCEPTS.flatMap((c) =>
            c.prereqs.map((pr) => {
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
        {CONCEPTS.map((c) => {
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
              <div className={cx("text-[15px] leading-tight", tone === "muted" ? "text-muted" : "text-fg")}>{c.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ConceptDetail({ id, p, onGo }: { id: Id; p: Profile; onGo?: () => void }) {
  const c = byId(id);
  const s = status(p, id);
  const isCur = p.current === id;
  const tone = statusTone(s, isCur);
  const next = unlocks(id);
  return (
    <div className="rise space-y-4" key={id}>
      <div>
        <Pill tone={tone} icon={<StatusIcon s={s} current={isCur} size={12} />}>
          {isCur ? "Concepto actual" : s === "mastered" ? "Dominado" : s === "reinforce" ? "Necesita refuerzo" : "Pendiente"}
        </Pill>
        <h3 className="mt-3 text-2xl font-medium leading-tight">{c.name}</h3>
      </div>
      <div>
        <div className="mb-1.5 flex justify-between font-mono text-[11px] uppercase tracking-wider text-muted">
          <span>Dominio</span>
          <span>{pct(p.mastery[id])} · umbral 70%</span>
        </div>
        <Bar value={p.mastery[id]} tone={tone} threshold={0.7} />
      </div>
      <p className="text-[15px] italic text-muted">“{c.objective}”</p>
      <div>
        <Label className="mb-1.5">Requiere</Label>
        {c.prereqs.length === 0 ? (
          <p className="text-[15px] text-muted">Punto de partida de la asignatura.</p>
        ) : (
          <ul className="space-y-1 text-[15px]">
            {c.prereqs.map((r) => (
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
        {next.length === 0 ? (
          <p className="text-[15px] text-muted">Cierre de esta rama de la ruta.</p>
        ) : (
          <ul className="space-y-1 text-[15px]">
            {next.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-muted"><ArrowRight size={13} />{r.name}</li>
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
