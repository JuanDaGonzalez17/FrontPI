import { useState } from "react";
import { diagnosticApi } from "./api";
import { CogniaApiError } from "./api/client";
import type { ActivityDto, DiagnosticProfileDto } from "./api/types";
import { Btn, FocusShell, Label, cx } from "./ui";
import { MathText } from "./components/MathText";
import { ArrowRight } from "lucide-react";

interface Props {
  activities: ActivityDto[];
  sessionId: string;
  subjectId: string;
  studentId: string;
  onDone: (profile: DiagnosticProfileDto) => void;
  onExit: () => void;
  onRestart: () => void;
  onAbandoned: () => void;
}

export function DiagnosticRunner({ activities, sessionId, subjectId, studentId, onDone, onExit, onRestart, onAbandoned }: Props) {
  const [i, setI] = useState(0);
  const [chosenOptionId, setChosenOptionId] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [questionStart, setQuestionStart] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abandoning, setAbandoning] = useState(false);
  const [abandonError, setAbandonError] = useState<string | null>(null);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [abandonAction, setAbandonAction] = useState<"exit" | "restart">("exit");

  const act = activities[i];
  const last = i === activities.length - 1;

  const elapsed = () => Math.max(1, Math.round((Date.now() - questionStart) / 1000));

  const advance = async (payload: { optionId?: string; respuesta?: string; seconds: number }) => {
    if (submitting || !act) return;
    setSubmitting(true);
    setError(null);
    try {
      await diagnosticApi.sendAnswer(sessionId, act.id, payload);
      if (last) {
        await diagnosticApi.finishDiagnostic(sessionId);
        const profile = await diagnosticApi.getProfile(studentId, subjectId);
        onDone(profile);
      } else {
        setI(i + 1);
        setChosenOptionId(null);
        setTextAnswer("");
        setQuestionStart(Date.now());
      }
    } catch (e) {
      if (e instanceof CogniaApiError && e.apiError.status === 409) {
        setError("Esta actividad ya fue respondida. Puedes reiniciar el diagnóstico para continuar.");
      } else {
        setError(e instanceof Error ? e.message : "Error al enviar respuesta");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submit = () => {
    if (act.tipo === "SELECCION_MULTIPLE") {
      if (!chosenOptionId) return;
      advance({ optionId: chosenOptionId, seconds: elapsed() });
    } else {
      if (!textAnswer.trim()) return;
      advance({ respuesta: textAnswer.trim(), seconds: elapsed() });
    }
  };

  const skip = () => advance({ seconds: elapsed() });

  const requestAbandon = (action: "exit" | "restart") => {
    if (submitting || abandoning) return;
    setAbandonAction(action);
    setAbandonError(null);
    setConfirmingExit(true);
  };

  const abandon = async () => {
    if (abandoning) return;
    setAbandoning(true);
    setAbandonError(null);
    try {
      await diagnosticApi.abandonDiagnostic(sessionId, studentId);
      onAbandoned();
      setConfirmingExit(false);
      if (abandonAction === "restart") onRestart();
      else onExit();
    } catch (e) {
      if (e instanceof CogniaApiError && e.apiError.status === 404) {
        onAbandoned();
        setConfirmingExit(false);
        if (abandonAction === "restart") onRestart();
        else onExit();
        return;
      }
      if (e instanceof CogniaApiError && (e.apiError.status === 401 || e.apiError.status === 403)) {
        setAbandonError("Tu sesión de autenticación ya no es válida. Actualízala e inténtalo de nuevo.");
      } else if (e instanceof CogniaApiError && e.apiError.status === 409) {
        setAbandonError("Este diagnóstico ya terminó o fue abandonado. Actualiza el estado e inténtalo de nuevo.");
      } else {
        setAbandonError("No pudimos cerrar este diagnóstico. Inténtalo de nuevo.");
      }
    } finally {
      setAbandoning(false);
    }
  };

  if (!act) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-fg">
        <div className="font-mono text-sm text-muted">Cargando diagnóstico…</div>
      </div>
    );
  }

  return (
    <FocusShell
      kicker="Diagnóstico"
      title="Diagnóstico inicial"
      step={i}
      total={activities.length}
      onExit={() => requestAbandon("exit")}
      exitLabel="Salir"
      tone="sage"
    >
      <div key={act.id} className="rise">
        <div className="mb-5 flex items-center justify-between">
          <Label className="text-muted">
            Diagnóstico · pregunta {i + 1} / {activities.length}
          </Label>
          <button
            type="button"
            onClick={() => requestAbandon("restart")}
            disabled={submitting || abandoning}
            className="text-sm text-muted underline decoration-line underline-offset-4 hover:text-fg disabled:opacity-50"
          >
            Reiniciar diagnóstico
          </button>
        </div>
        <h2 className="mb-7 text-2xl leading-snug md:text-[28px]"><MathText text={act.enunciado} /></h2>
        {act.tipo === "SELECCION_MULTIPLE" ? (
          <div role="radiogroup" className="space-y-2.5">
            {act.options?.map((o) => (
              <button
                key={o.id}
                role="radio"
                aria-checked={chosenOptionId === o.id}
                onClick={() => setChosenOptionId(o.id)}
                className={cx(
                  "flex w-full items-start gap-4 rounded-sm border px-4 py-3.5 text-left transition",
                  chosenOptionId === o.id ? "border-brass bg-brass/10" : "border-line bg-surface hover:border-faint hover:bg-raised",
                )}
              >
                <span className="text-lg"><MathText text={o.text} /></span>
              </button>
            ))}
          </div>
        ) : (
          <input
            className="w-full rounded border border-line bg-bg px-4 py-3 text-lg"
            placeholder="Tu respuesta"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
          />
        )}
        {error && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-clay">
            <p>{error}</p>
            {error.includes("ya fue respondida") && (
              <button
                type="button"
                className="underline underline-offset-4 hover:text-fg"
                onClick={() => requestAbandon("restart")}
              >
                Reiniciar diagnóstico
              </button>
            )}
          </div>
        )}
        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            onClick={skip}
            disabled={submitting}
            className="text-[15px] text-muted underline decoration-line underline-offset-4 hover:text-fg disabled:opacity-50"
          >
            No lo sé todavía
          </button>
          <Btn
            size="lg"
            disabled={submitting || (act.tipo === "SELECCION_MULTIPLE" ? !chosenOptionId : !textAnswer.trim())}
            onClick={submit}
            icon={<ArrowRight size={18} />}
          >
            {submitting ? "Enviando…" : last ? "Ver mi resumen" : "Siguiente"}
          </Btn>
        </div>
      </div>
      {confirmingExit && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-bg/80 px-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="abandon-title">
          <div className="w-full max-w-md rounded-md border border-line bg-surface p-6 shadow-xl">
            <h2 id="abandon-title" className="text-2xl font-medium">¿Salir del diagnóstico?</h2>
            <p className="mt-3 text-muted">Tu progreso actual se descartará. Puedes comenzar un diagnóstico nuevo después.</p>
            {abandonError && <p className="mt-4 text-sm text-clay">{abandonError}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Btn variant="ghost" onClick={() => setConfirmingExit(false)} disabled={abandoning}>Cancelar</Btn>
              <Btn variant="danger" onClick={() => void abandon()} disabled={abandoning}>
                {abandoning ? "Cerrando…" : abandonAction === "restart" ? "Reiniciar diagnóstico" : "Salir del diagnóstico"}
              </Btn>
            </div>
            {!abandoning && abandonError && (
              <button className="mt-4 text-sm text-muted underline underline-offset-4 hover:text-fg" onClick={() => void abandon()}>
                Reintentar
              </button>
            )}
          </div>
        </div>
      )}
    </FocusShell>
  );
}
