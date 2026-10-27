import { useState } from "react";
import { reviewApi } from "./api";
import type { ReviewQueueItemDto, ReviewFinishDto } from "./api/types";
import { Btn, FocusShell, Label, cx } from "./ui";
import { ArrowRight } from "lucide-react";

interface Props {
  items: ReviewQueueItemDto[];
  sessionId: string;
  onDone: (result: ReviewFinishDto) => void;
  onExit: () => void;
}

export function ReviewRunner({ items, sessionId, onDone, onExit }: Props) {
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [grade, setGrade] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionStart, setQuestionStart] = useState(Date.now());

  const item = items[i];
  const last = i === items.length - 1;

  const submit = async (g: number) => {
    if (!item) return;
    setSubmitting(true);
    setError(null);
    try {
      await reviewApi.submitGrade(sessionId, {
        progressId: item.progressId,
        grade: g,
        seconds: Math.max(1, Math.round((Date.now() - questionStart) / 1000)),
      });
      if (last) {
        const res = await reviewApi.finishReviewSession(sessionId);
        onDone(res);
      } else {
        setI(i + 1);
        setRevealed(false);
        setGrade(null);
        setQuestionStart(Date.now());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar calificación.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!item) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="font-mono text-sm text-muted">Cargando repaso…</span>
      </div>
    );
  }

  return (
    <FocusShell
      kicker="Repaso · SM-2"
      title="Repaso espaciado"
      step={i}
      total={items.length}
      onExit={onExit}
      exitLabel="Salir"
      tone="brass"
    >
      <div key={item.progressId} className="rise mx-auto max-w-2xl">
        <Label className="mb-3">Tarjeta {i + 1} de {items.length}</Label>
        <div className="rounded-md border border-line bg-surface p-6">
          <div className="text-2xl leading-snug">{item.card.front}</div>
          {revealed && (
            <div className="mt-6 border-t border-line pt-6">
              <Label className="mb-2 text-sage">Respuesta</Label>
              <div className="text-xl text-muted">{item.card.back}</div>
            </div>
          )}
        </div>

        {!revealed ? (
          <div className="mt-6">
            <Btn size="lg" onClick={() => setRevealed(true)} icon={<ArrowRight size={18} />}>
              Revelar respuesta
            </Btn>
          </div>
        ) : (
          <div className="mt-6">
            <Label className="mb-3">¿Qué tan bien lo recordabas? (0–5)</Label>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5].map((g) => (
                <button
                  key={g}
                  disabled={submitting}
                  onClick={() => submit(g)}
                  className={cx(
                    "h-12 w-12 rounded-sm border font-mono text-lg transition",
                    grade === g ? "border-brass bg-brass/10 text-brass" : "border-line bg-surface hover:bg-raised",
                    submitting && "opacity-50",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
            {error && <p className="mt-4 text-sm text-clay">{error}</p>}
          </div>
        )}
      </div>
    </FocusShell>
  );
}
