import { useEffect, useState } from "react";
import { practiceApi, curriculumApi } from "./api";
import { buildConceptMaps } from "./api/mappers/conceptMapper";
import type { ActivityDto, PracticeResultDto } from "./api/types";
import { Btn, FocusShell, Label, cx } from "./ui";
import { byId, type Id } from "./data";
import { MathText } from "./components/MathText";
import { ArrowRight } from "lucide-react";

const SUBJECT_ID = "10000000-0000-0000-0000-000000000001";

interface Props {
  concept: Id;
  onDone: () => void;
  onExit: () => void;
}

export function PracticeRunner({ concept, onDone, onExit }: Props) {
  const [activities, setActivities] = useState<ActivityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [chosenOptionId, setChosenOptionId] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [questionStart, setQuestionStart] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PracticeResultDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const concepts = await curriculumApi.getConcepts(SUBJECT_ID);
        const maps = buildConceptMaps(concepts);
        const conceptId = maps.slugToUuid.get(concept);
        if (!conceptId) throw new Error("Concepto no encontrado en el backend.");
        const acts = await practiceApi.getPracticeActivities(conceptId);
        if (!cancelled) {
          setActivities(acts.length ? acts : []);
          setI(0);
          setQuestionStart(Date.now());
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudieron cargar las actividades.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [concept]);

  const act = activities[i];
  const last = i === activities.length - 1;
  const elapsed = () => Math.max(1, Math.round((Date.now() - questionStart) / 1000));

  const submit = async () => {
    if (!act) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload =
        act.tipo === "SELECCION_MULTIPLE"
          ? { optionId: chosenOptionId ?? undefined, seconds: elapsed() }
          : { respuesta: textAnswer.trim(), seconds: elapsed() };
      const res = await practiceApi.sendPracticeAttempt(act.id, payload);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar respuesta.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (last) {
      onDone();
      return;
    }
    setI(i + 1);
    setChosenOptionId(null);
    setTextAnswer("");
    setResult(null);
    setQuestionStart(Date.now());
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="font-mono text-sm text-muted">Cargando práctica…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="text-sm text-clay">{error}</span>
      </div>
    );
  }

  if (activities.length === 0 || !act) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="font-mono text-sm text-muted">No hay actividades disponibles.</span>
      </div>
    );
  }

  const canSubmit = act.tipo === "SELECCION_MULTIPLE" ? !!chosenOptionId : !!textAnswer.trim();

  return (
    <FocusShell
      kicker="Práctica guiada"
      title={byId(concept).name}
      step={i}
      total={activities.length}
      onExit={onExit}
      exitLabel="Volver al concepto"
      tone="brass"
    >
      <div key={act.id} className="rise">
        <div className="mb-3 flex flex-wrap items-center gap-4">
          <Label>Actividad {i + 1} de {activities.length}</Label>
        </div>
        <h2 className="mb-5 text-2xl leading-snug md:text-[28px]"><MathText text={act.enunciado} /></h2>

        {act.tipo === "SELECCION_MULTIPLE" ? (
          <div className="space-y-2.5">
            {act.options?.map((o) => (
              <button
                key={o.id}
                disabled={!!result}
                onClick={() => setChosenOptionId(o.id)}
                className={cx(
                  "flex w-full items-center gap-4 rounded-sm border px-4 py-3.5 text-left text-lg transition",
                  chosenOptionId === o.id ? "border-brass bg-brass/10" : "border-line bg-surface hover:bg-raised",
                  result && o.id === result.correctOptionId && "border-sage bg-sage/10",
                )}
              >
                <MathText text={o.text} />
              </button>
            ))}
          </div>
        ) : (
          <input
            disabled={!!result}
            className="w-full rounded border border-line bg-bg px-4 py-3 text-lg"
            placeholder="Tu respuesta"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
          />
        )}

        {result && (
          <div className={cx("rise mt-6 rounded-sm border-l-2 p-5", result.correct ? "border-sage bg-sage/10" : "border-clay bg-clay/10")}>
            <div className={cx("mb-1 text-lg", result.correct ? "text-sage" : "text-clay")}>
              {result.correct ? "Correcto" : "Incorrecto"}
            </div>
            {result.feedback && <p className="text-muted">{result.feedback}</p>}
            {result.explanation && <p className="mt-2 text-sm text-muted">{result.explanation}</p>}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-clay">{error}</p>}

        <div className="mt-8 flex items-center justify-between gap-4">
          {!result ? (
            <Btn size="lg" disabled={submitting || !canSubmit} onClick={submit} icon={<ArrowRight size={18} />}>
              {submitting ? "Enviando…" : "Comprobar"}
            </Btn>
          ) : (
            <Btn size="lg" onClick={next} icon={<ArrowRight size={18} />}>
              {last ? "Finalizar" : "Siguiente"}
            </Btn>
          )}
        </div>
      </div>
    </FocusShell>
  );
}

