import { useState } from "react";
import { evaluationApi } from "./api";
import type { ActivityDto, ShortEvalResultDto } from "./api/types";
import { Btn, FocusShell, Label, cx } from "./ui";
import { MathText } from "./components/MathText";
import { ArrowRight } from "lucide-react";

interface Props {
  activities: ActivityDto[];
  sessionId: string;
  onDone: (result: ShortEvalResultDto) => void;
  onExit: () => void;
}

export function EvalRunner({ activities, sessionId, onDone, onExit }: Props) {
  const [i, setI] = useState(0);
  const [chosenOptionId, setChosenOptionId] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [questionStart, setQuestionStart] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = activities[i];
  const last = i === activities.length - 1;

  const submit = async () => {
    if (!act) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload =
        act.tipo === "SELECCION_MULTIPLE"
          ? { optionId: chosenOptionId ?? undefined, seconds: Math.max(1, Math.round((Date.now() - questionStart) / 1000)) }
          : { respuesta: textAnswer.trim(), seconds: Math.max(1, Math.round((Date.now() - questionStart) / 1000)) };
      await evaluationApi.sendEvalAnswer(sessionId, act.id, payload);
      setAnswered(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar respuesta.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = async () => {
    if (last) {
      setSubmitting(true);
      try {
        const res = await evaluationApi.finishShortEval(sessionId);
        onDone(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al finalizar evaluación.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setI(i + 1);
    setChosenOptionId(null);
    setTextAnswer("");
    setAnswered(false);
    setQuestionStart(Date.now());
  };

  if (!act) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="font-mono text-sm text-muted">Cargando evaluación…</span>
      </div>
    );
  }

  const canSubmit = act.tipo === "SELECCION_MULTIPLE" ? !!chosenOptionId : !!textAnswer.trim();

  return (
    <FocusShell
      kicker="Evaluación corta"
      title="Evaluación de dominio"
      step={i}
      total={activities.length}
      onExit={onExit}
      exitLabel="Salir"
      tone="brass"
    >
      <div key={act.id} className="rise">
        <div className="mb-5 flex items-center justify-between">
          <Label className="text-brass">Pregunta {i + 1} / {activities.length}</Label>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted">
            Sin pistas
          </span>
        </div>
        <h2 className="mb-7 text-2xl leading-snug md:text-[28px]"><MathText text={act.enunciado} /></h2>

        {act.tipo === "SELECCION_MULTIPLE" ? (
          <div role="radiogroup" className="space-y-2.5">
            {act.options?.map((o) => (
              <button
                key={o.id}
                role="radio"
                aria-checked={chosenOptionId === o.id}
                disabled={answered}
                onClick={() => setChosenOptionId(o.id)}
                className={cx(
                  "flex w-full items-start gap-4 rounded-sm border px-4 py-3.5 text-left transition",
                  chosenOptionId === o.id ? "border-brass bg-brass/10" : "border-line bg-surface hover:border-faint hover:bg-raised",
                  answered && "opacity-60",
                )}
              >
                <span className="text-lg"><MathText text={o.text} /></span>
              </button>
            ))}
          </div>
        ) : (
          <input
            disabled={answered}
            className="w-full rounded border border-line bg-bg px-4 py-3 text-lg"
            placeholder="Tu respuesta"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
          />
        )}

        {error && <p className="mt-4 text-sm text-clay">{error}</p>}

        <div className="mt-8 flex items-center justify-between gap-4">
          {!answered ? (
            <Btn size="lg" disabled={submitting || !canSubmit} onClick={submit} icon={<ArrowRight size={18} />}>
              {submitting ? "Enviando…" : "Responder"}
            </Btn>
          ) : (
            <Btn size="lg" disabled={submitting} onClick={next} icon={<ArrowRight size={18} />}>
              {submitting ? "Finalizando…" : last ? "Ver resultado" : "Siguiente"}
            </Btn>
          )}
        </div>
      </div>
    </FocusShell>
  );
}
