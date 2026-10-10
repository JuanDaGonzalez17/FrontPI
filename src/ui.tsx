import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowLeft, Check, Circle, MapPin, RotateCcw, X } from "lucide-react";
import type { Status } from "./state";

export const cx = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(" ");

export type Tone = "brass" | "sage" | "clay" | "muted";
export const TEXT: Record<Tone, string> = { brass: "text-brass", sage: "text-sage", clay: "text-clay", muted: "text-muted" };
export const BG: Record<Tone, string> = { brass: "bg-brass", sage: "bg-sage", clay: "bg-clay", muted: "bg-faint" };
const PILL: Record<Tone, string> = {
  brass: "border-brass/40 bg-brass/10 text-brass",
  sage: "border-sage/40 bg-sage/10 text-sage",
  clay: "border-clay/40 bg-clay/10 text-clay",
  muted: "border-line bg-raised text-muted",
};
const EDGE: Record<Tone, string> = { brass: "border-brass/50", sage: "border-sage/40", clay: "border-clay/50", muted: "border-line" };

export const pct = (v: number) => `${Math.round(v * 100)}%`;

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("font-mono text-[11px] uppercase tracking-[0.14em] text-muted", className)}>{children}</div>;
}

export function Card({ children, className, tone }: { children: ReactNode; className?: string; tone?: Tone }) {
  return <div className={cx("rounded-md border bg-surface", tone ? EDGE[tone] : "border-line", className)}>{children}</div>;
}

export function Pill({ tone = "muted", children, icon }: { tone?: Tone; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider", PILL[tone])}>
      {icon}
      {children}
    </span>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "quiet" | "danger";
  size?: "md" | "lg";
  icon?: ReactNode;
};
export function Btn({ variant = "primary", size = "md", icon, className, children, ...rest }: BtnProps) {
  const v = {
    primary: "bg-brass text-bg hover:brightness-110 border border-brass",
    danger: "bg-clay text-bg hover:brightness-110 border border-clay",
    ghost: "border border-line text-fg hover:bg-raised hover:border-faint",
    quiet: "text-muted hover:text-fg underline underline-offset-4 decoration-line",
  }[variant];
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition disabled:opacity-40",
        size === "lg" ? "px-6 py-3 text-[17px]" : "px-4 py-2 text-[15px]",
        v,
        className,
      )}
    >
      {children}
      {icon}
    </button>
  );
}

export function Bar({ value, tone = "brass", threshold, className }: { value: number; tone?: Tone; threshold?: number; className?: string }) {
  return (
    <div className={cx("relative h-1.5 w-full rounded-full bg-raised", className)}>
      <div className={cx("h-full rounded-full transition-all duration-700", BG[tone])} style={{ width: `${Math.min(100, value * 100)}%` }} />
      {threshold !== undefined && <div className="absolute -top-1 h-3.5 w-px bg-fg/70" style={{ left: `${threshold * 100}%` }} />}
    </div>
  );
}

export function Ring({ value, size = 96, tone = "brass", children }: { value: number; size?: number; tone?: Tone; children?: ReactNode }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const color = { brass: "var(--color-brass)", sage: "var(--color-sage)", clay: "var(--color-clay)", muted: "var(--color-faint)" }[tone];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-raised)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function StatusIcon({ s, current, size = 14 }: { s: Status; current?: boolean; size?: number }) {
  if (s === "mastered") return <Check size={size} strokeWidth={2.5} />;
  if (s === "reinforce") return <RotateCcw size={size} />;
  if (current) return <MapPin size={size} />;
  return <Circle size={size} />;
}

export const statusTone = (s: Status, current?: boolean): Tone =>
  s === "mastered" ? "sage" : s === "reinforce" ? "clay" : current ? "brass" : "muted";

export function PageHeader({ kicker, title, sub, right }: { kicker?: string; title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="rise mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {kicker && <Label className="mb-2">{kicker}</Label>}
        <h1 className="font-serif text-4xl font-medium leading-[1.1] tracking-tight md:text-5xl">{title}</h1>
        {sub && <p className="mt-3 text-lg text-muted">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

const STAGES = ["Practicar", "Evaluar", "Reforzar", "Avanzar", "Repasar"];
export function CycleStrip({ active, skipReinforce }: { active: number; skipReinforce?: boolean }) {
  return (
    <ol className="flex items-center gap-1.5 overflow-x-auto font-mono text-[11px] uppercase tracking-wider">
      {STAGES.map((s, i) => {
        const muted = skipReinforce && i === 2;
        return (
          <li key={s} className="flex items-center gap-1.5">
            <span
              className={cx(
                "rounded-full border px-2.5 py-1 whitespace-nowrap",
                i === active ? (i === 2 ? "border-clay bg-clay/15 text-clay" : "border-brass bg-brass/15 text-brass") : i < active ? "border-line text-sage" : "border-line text-faint",
                muted && "opacity-40 line-through",
              )}
            >
              {s}
            </span>
            {i < STAGES.length - 1 && <span className="h-px w-3 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}

export function FocusShell({
  kicker, title, step, total, onExit, exitLabel = "Salir", children, tone = "brass",
}: { kicker: string; title: string; step?: number; total?: number; onExit: () => void; exitLabel?: string; children: ReactNode; tone?: Tone }) {
  return (
    <div className="paper-grain min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 pb-16 pt-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <button onClick={onExit} className="inline-flex items-center gap-2 text-[15px] text-muted transition hover:text-fg">
            <ArrowLeft size={16} /> {exitLabel}
          </button>
          <div className="text-right">
            <Label className={TEXT[tone]}>{kicker}</Label>
            <div className="text-sm text-muted">{title}</div>
          </div>
        </div>
        {step !== undefined && total !== undefined && (
          <div className="mb-8 flex gap-1.5" aria-label={`Paso ${step + 1} de ${total}`}>
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className={cx("h-1 flex-1 rounded-full", i < step ? BG.sage : i === step ? BG[tone] : "bg-raised")} />
            ))}
          </div>
        )}
        <div className="rise flex-1">{children}</div>
      </div>
    </div>
  );
}

export function Mark({ ok }: { ok: boolean }) {
  return ok ? <Check size={14} className="text-sage" strokeWidth={2.5} /> : <X size={14} className="text-clay" strokeWidth={2.5} />;
}

export function Difficulty({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`Dificultad ${n} de 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={cx("h-1.5 w-3 rounded-full", i <= n ? "bg-brass" : "bg-raised")} />
      ))}
    </span>
  );
}

export const Expr = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cx("rounded-sm border border-line bg-bg/60 px-5 py-4 font-serif text-3xl italic tracking-wide md:text-4xl", className)}>{children}</div>
);
