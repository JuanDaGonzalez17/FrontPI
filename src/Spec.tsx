import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Btn, Card, Label, PageHeader, Pill, cx } from "./ui";

export const STATES: { key: string; label: string; desc: string; tone: "brass" | "sage" | "clay" | "muted" }[] = [
  { key: "diag-pending", label: "Diagnóstico pendiente", desc: "Sin perfil de conocimiento: Inicio invita a hacer el diagnóstico y Mi ruta / Progreso muestran estado vacío.", tone: "muted" },
  { key: "diag-done", label: "Diagnóstico completado", desc: "Resumen de dominio inicial y ruta generada, con los conceptos dominados marcados como “Reconocidos”.", tone: "sage" },
  { key: "in-progress", label: "Concepto en progreso", desc: "Pantalla del concepto actual: objetivo, prerrequisitos, dominio, actividades y botón Comenzar.", tone: "brass" },
  { key: "passed", label: "Concepto aprobado", desc: "Resultado 82/100 con estado aprobado y botón Continuar con la ruta.", tone: "sage" },
  { key: "path-updated", label: "Ruta actualizada", desc: "Mapa tras aprobar: lo dominado, dónde estás y qué viene.", tone: "sage" },
  { key: "failed", label: "Concepto no aprobado", desc: "Resultado 55/100: habilidades a reforzar, actividades recomendadas y Comenzar refuerzo.", tone: "clay" },
  { key: "reinforce", label: "Concepto en refuerzo", desc: "El concepto actual cambia a modo refuerzo, con práctica dirigida y nuevo intento al terminar.", tone: "clay" },
  { key: "review-ok", label: "Repaso correcto", desc: "Confirma buen dominio y espacia el siguiente repaso.", tone: "sage" },
  { key: "review-fail", label: "Repaso fallido", desc: "Pide más práctica, programa un nuevo intento y permite reintentar.", tone: "clay" },
  { key: "review-out", label: "Repaso fallido (2.º fallo)", desc: "El concepto vuelve a considerarse en la ruta.", tone: "clay" },
  { key: "path-complete", label: "Ruta completada", desc: "Todos los conceptos dominados; ofrece la evaluación global.", tone: "sage" },
  { key: "global", label: "Evaluación global", desc: "Nota final, nivel de dominio, conceptos fuertes, atención y recomendaciones de repaso.", tone: "sage" },
];

const FLOW: [string, string, string][] = [
  ["Inicio / Dashboard", "Ve su siguiente paso, ruta resumida y repasos de hoy.", "screen:home"],
  ["Selección de asignatura", "Elige Cálculo Integral y ve su progreso y concepto actual.", "screen:subject"],
  ["Diagnóstico inicial", "Bienvenida, 6 preguntas de una en una y resumen de dominio.", "diag-pending"],
  ["Ruta personalizada", "Mapa de conceptos con lo dominado reconocido y punto de partida.", "diag-done"],
  ["Concepto actual", "Objetivo, prerrequisitos, nivel y actividades recomendadas.", "in-progress"],
  ["Actividades de práctica", "Una por una, con pista, retroalimentación y reintento.", "screen:activity"],
  ["Evaluación del concepto", "Experiencia distinta: sin pistas, resultado al final.", "screen:eval-intro"],
  ["Evaluación no aprobada", "Refuerzo dirigido y nuevo intento, sin bloqueo.", "failed"],
  ["Actualización de la ruta", "El mapa refleja dominio, posición y siguiente paso.", "path-updated"],
  ["Repaso / active recall", "Una pregunta por concepto; acierto espacia, fallo reprograma.", "review-fail"],
  ["Dashboard / progreso", "Estado global con visualizaciones simples e historial.", "screen:progress"],
  ["Evaluación global", "Al completar la ruta: nota, nivel y recomendaciones.", "global"],
];

const NAV: { t: string; kids: (string | [string, string[]])[] }[] = [
  { t: "Inicio", kids: ["Siguiente paso", "Ruta de un vistazo", "Repasos de hoy"] },
  { t: "Mis asignaturas", kids: [["Detalle de asignatura", ["Diagnóstico: bienvenida", "Diagnóstico: preguntas", "Diagnóstico: resumen", "Ruta generada"]]] },
  { t: "Mi ruta", kids: [["Mapa de conceptos", ["Panel de concepto"]], ["Concepto actual", ["Actividades (foco)", "Actividades completadas", "Evaluación: intro", "Evaluación (foco)", "Resultado"]]] },
  { t: "Repasos", kids: ["Lista de repasos", ["Sesión de repaso (foco)", ["Resultado: correcto", "Resultado: fallido"]]] },
  { t: "Progreso", kids: ["Panel de progreso", ["Ruta completada", ["Evaluación global", "Resultado global"]]] },
];

const SCREENS: [string, string, string, string][] = [
  ["Inicio", "Responder “¿qué hago ahora?”", "Tarjeta de siguiente paso, ruta de un vistazo, tarjeta de repasos, lista de asignaturas", "Concepto actual, dominio, repasos vencidos"],
  ["Mis asignaturas", "Elegir asignatura", "Lista con anillo de progreso y estado", "Asignaturas, progreso"],
  ["Detalle de asignatura", "Resumen y entrada a la acción", "Cinco métricas, CTA según estado", "Dominio, conceptos dominados, próximo repaso"],
  ["Diagnóstico · bienvenida", "Explicar el porqué", "Mensaje, tres pasos, CTA", "—"],
  ["Diagnóstico · preguntas", "Medir conocimiento previo", "Pregunta única, opciones, “No lo sé”, progreso", "Banco de preguntas por concepto"],
  ["Diagnóstico · resumen", "Mostrar dominio inicial", "Barras por concepto con umbral, explicación", "Dominio estimado por concepto"],
  ["Ruta generada", "Presentar TU ruta", "Grafo, resumen en tres cifras, CTA", "Grafo, dominio, reconocidos"],
  ["Mi ruta", "Orientar en el grafo", "Grafo, leyenda, panel de concepto, avisos", "Grafo, estados, refuerzos"],
  ["Concepto actual", "Preparar el estudio", "Objetivo, por qué ahora, prerrequisitos, actividades, anillo de dominio, ciclo", "Concepto, actividades, dominio"],
  ["Actividad (foco)", "Practicar con feedback", "Enunciado, respuesta, pista, feedback, reintento, solución", "Actividad, respuestas aceptadas"],
  ["Actividades completadas", "Cerrar práctica y ofrecer evaluación", "Mensaje, CTA, ciclo", "—"],
  ["Evaluación · intro", "Marcar un momento distinto", "Hoja con sello, reglas, intento", "Umbral, intento"],
  ["Evaluación (foco)", "Medir dominio autónomo", "Pregunta, opciones, sin pistas", "Preguntas con habilidad asociada"],
  ["Resultado de evaluación", "Aprobar o reforzar", "Puntaje, sello, umbral, habilidades, actividades o siguiente concepto", "Puntaje, desempeño por habilidad"],
  ["Repasos", "Planificar active recall", "Repasos de hoy, próximos, reglas", "Calendario de repasos"],
  ["Sesión de repaso (foco)", "Recordar sin mirar", "Pregunta, opciones", "Banco de repaso"],
  ["Resultado de repaso", "Retroalimentar y reprogramar", "Mensaje, dominio, próximo repaso, aviso de ruta", "Dominio, intervalos"],
  ["Progreso", "Visión global", "Anillos, barra segmentada, dominio por concepto, historial", "Dominio, historial"],
  ["Ruta completada", "Reconocer el logro", "Sello, cifras, CTA", "Dominio general"],
  ["Evaluación global", "Confirmar dominio general", "Intro, preguntas, nota, nivel, fuertes, atención, recomendaciones", "Preguntas mixtas"],
];

const TOKENS: [string, string, string][] = [
  ["Lienzo", "bg-bg", "#13110E · tinta cálida"],
  ["Superficie", "bg-surface", "#1A1713"],
  ["Línea", "bg-line", "#36312A"],
  ["Texto", "bg-fg", "#ECE5D3 · marfil"],
  ["Actual / acción", "bg-brass", "#DBA944 · latón"],
  ["Dominado", "bg-sage", "#93B99D · salvia"],
  ["Refuerzo", "bg-clay", "#E27D5D · arcilla"],
];

const TABS = ["Mapa de navegación", "Flujo", "Pantallas", "Estados", "Propuesta visual"] as const;

export function Spec({ onJump }: { onJump: (k: string) => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Mapa de navegación");
  return (
    <div>
      <PageHeader kicker="Documentación del prototipo" title="Guía para el equipo" sub="Navegación, flujo, pantallas y estados alternativos. Cada elemento se puede abrir en el prototipo." />
      <div role="tablist" className="mb-8 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx("-mb-px border-b-2 px-4 py-2.5 text-[16px] transition", tab === t ? "border-brass text-fg" : "border-transparent text-muted hover:text-fg")}>{t}</button>
        ))}
      </div>

      {tab === "Mapa de navegación" && (
        <div>
          <p className="mb-6 max-w-2xl text-muted">Cinco destinos permanentes. Las pantallas de foco (actividad, evaluación, repaso, diagnóstico) ocultan la navegación para priorizar la acción actual.</p>
          <div className="grid gap-4 md:grid-cols-5">
            {NAV.map((n) => (
              <Card key={n.t} className="p-4">
                <div className="mb-3 border-b border-brass pb-2 text-xl text-brass">{n.t}</div>
                <Tree items={n.kids} />
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "Flujo" && (
        <ol className="max-w-3xl space-y-px overflow-hidden rounded-md border border-line bg-line">
          {FLOW.map(([t, d, j], i) => (
            <li key={t} className="flex items-center gap-5 bg-surface px-5 py-4">
              <span className="w-8 font-mono text-sm text-brass">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex-1"><div className="text-lg">{t}</div><div className="text-[15px] text-muted">{d}</div></div>
              <Btn variant="ghost" onClick={() => onJump(j)} icon={<ArrowRight size={14} />}>Abrir</Btn>
            </li>
          ))}
        </ol>
      )}

      {tab === "Pantallas" && (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[820px] text-left text-[15px]">
            <thead className="bg-raised font-mono text-[11px] uppercase tracking-wider text-muted"><tr>{["Pantalla", "Propósito", "Componentes principales", "Datos que necesita"].map((h) => <th key={h} className="px-4 py-3 font-normal">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line bg-surface">
              {SCREENS.map((r) => (<tr key={r[0]} className="align-top"><td className="px-4 py-3 text-[16px] text-brass">{r[0]}</td><td className="px-4 py-3">{r[1]}</td><td className="px-4 py-3 text-muted">{r[2]}</td><td className="px-4 py-3 text-muted">{r[3]}</td></tr>))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Estados" && (
        <div className="grid gap-3 md:grid-cols-2">
          {STATES.map((s) => (
            <Card key={s.key} className="flex items-start justify-between gap-4 p-5">
              <div><Pill tone={s.tone}>{s.label}</Pill><p className="mt-3 text-[15px] text-muted">{s.desc}</p></div>
              <Btn variant="ghost" onClick={() => onJump(s.key)}>Ver</Btn>
            </Card>
          ))}
        </div>
      )}

      {tab === "Propuesta visual" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <Label className="mb-3">Color con significado</Label>
            <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line">
              {TOKENS.map(([n, cl, h]) => (<div key={n} className="flex items-center gap-4 bg-surface px-4 py-3"><span className={cx("h-8 w-8 rounded-sm border border-line", cl)} /><span className="flex-1 text-lg">{n}</span><span className="font-mono text-xs text-muted">{h}</span></div>))}
            </div>
            <p className="mt-3 text-[15px] text-muted">Latón = dónde estás y qué hacer. Salvia = dominado. Arcilla = refuerzo. Nunca se usa rojo de error para el estudiante.</p>
          </section>
          <section className="space-y-6">
            <div><Label className="mb-3">Tipografía</Label><div className="text-5xl font-medium leading-tight">Newsreader</div><p className="mt-2 text-lg text-muted">Serif humanista para títulos, texto y matemáticas: tono académico, de lectura larga.</p><div className="mt-3 font-mono text-sm uppercase tracking-[0.14em] text-muted">IBM Plex Mono · etiquetas, cifras y estados</div></div>
            <div>
              <Label className="mb-3">Las cinco preguntas que siempre se contestan</Label>
              <ul className="space-y-1.5 text-[16px]">
                {[["¿Dónde estoy?", "Marca “Estás aquí” en el mapa"], ["¿Qué aprendo?", "Concepto actual y objetivo"], ["¿Por qué?", "“Por qué ahora” y panel Desbloquea"], ["¿Qué hago ahora?", "Un solo botón primario"], ["¿Qué tan cerca estoy?", "Anillos y barras con umbral"]].map(([a, b]) => (<li key={a} className="flex gap-3"><span className="w-44 text-brass">{a}</span><span className="text-muted">{b}</span></li>))}
              </ul>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Tree({ items }: { items: (string | [string, string[]])[] }) {
  return (
    <ul className="space-y-1.5 text-[15px]">
      {items.map((it, i) =>
        typeof it === "string" ? (
          <li key={i} className="text-muted">· {it}</li>
        ) : (
          <li key={i}>
            <div>· {it[0]}</div>
            <div className="ml-3 mt-1 border-l border-line pl-3"><Tree items={it[1]} /></div>
          </li>
        ),
      )}
    </ul>
  );
}
