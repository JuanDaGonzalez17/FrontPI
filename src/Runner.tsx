import { useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { byId, type Question } from "./data";
import { Btn, FocusShell, Label, cx, type Tone } from "./ui";
import { MathText } from "./components/MathText";

export interface Answer {
  q: Question;
  chosen: number;
  ok: boolean;
}

interface Props {
  questions: Question[];
  variant: "diag" | "eval";
  kicker: string;
  title: string;
  onDone: (a: Answer[]) => void;
  onExit: () => void;
  exitLabel?: string;
}

export function QuestionRunner({ questions, variant, kicker, title, onDone, onExit, exitLabel }: Props) {
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const q = questions[i];
  const last = i === questions.length - 1;
  const tone: Tone = variant === "eval" ? "brass" : "sage";

  const next = (c: number) => {
    const all = [...answers, { q, chosen: c, ok: c === q.correct }];
    if (last) return onDone(all);
    setAnswers(all);
    setI(i + 1);
    setChosen(null);
  };

  const body = (
    <>
      <div className="mb-5 flex items-center justify-between">
        <Label className={variant === "eval" ? "text-brass" : "text-muted"}>
          {variant === "eval" ? "Evaluación de dominio" : "Diagnóstico"} · pregunta {i + 1} / {questions.length}
        </Label>
        {variant === "diag" && q.concept && <Label>Evalúa · {byId(q.concept).name}</Label>}
        {variant === "eval" && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted">
            <Lock size={11} /> Sin pistas
          </span>
        )}
      </div>
      <h2 className="mb-7 text-2xl leading-snug md:text-[28px]"><MathText text={q.text} /></h2>
      <div role="radiogroup" className="space-y-2.5">
        {q.options.map((o, k) => (
          <button
            key={k}
            role="radio"
            aria-checked={chosen === k}
            onClick={() => setChosen(k)}
            className={cx(
              "flex w-full items-start gap-4 rounded-sm border px-4 py-3.5 text-left transition",
              chosen === k ? "border-brass bg-brass/10" : "border-line bg-surface hover:border-faint hover:bg-raised",
            )}
          >
            <span className={cx("mt-0.5 font-mono text-xs", chosen === k ? "text-brass" : "text-faint")}>{"ABCD"[k]}</span>
            <span className="text-lg"><MathText text={o} /></span>
          </button>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-between gap-4">
        {variant === "diag" ? (
          <button onClick={() => next(-1)} className="text-[15px] text-muted underline decoration-line underline-offset-4 hover:text-fg">
            No lo sé todavía
          </button>
        ) : (
          <span className="text-sm text-faint">No podrás volver atrás. El resultado se muestra al terminar.</span>
        )}
        <Btn size="lg" disabled={chosen === null} onClick={() => chosen !== null && next(chosen)} icon={<ArrowRight size={18} />}>
          {last ? (variant === "eval" ? "Finalizar evaluación" : "Ver mi resumen") : "Siguiente"}
        </Btn>
      </div>
      {variant === "diag" && <p className="mt-6 text-sm text-faint">Responder “No lo sé” no penaliza: nos ayuda a ubicarte mejor.</p>}
    </>
  );

  return (
    <FocusShell kicker={kicker} title={title} step={i} total={questions.length} onExit={onExit} exitLabel={exitLabel} tone={tone}>
      <div key={q.id} className="rise">
        {variant === "eval" ? (
          <div className="rounded-md border border-line bg-surface p-6 md:p-9" style={{ borderTop: "4px solid var(--color-brass)" }}>
            {body}
          </div>
        ) : (
          body
        )}
      </div>
    </FocusShell>
  );
}
