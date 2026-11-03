export type Id =
  | "prim"
  | "reglas"
  | "metodos"
  | "definida"
  | "tfc"
  | "area"
  | "impropia"
  | "longitud"
  | "solidos"
  | "series"
  | "centroides"
  | "pappus"
  | "C0.1" | "C0.2" | "C0.3" | "C0.4" | "C0.5"
  | "C1.1" | "C1.2"
  | "C2.1" | "C2.2" | "C2.3" | "C2.4"
  | "C3.1" | "C3.2" | "C3.3" | "C3.4" | "C3.5" | "C3.6"
  | "C4.1" | "C4.2" | "C4.3"
  | "C5.1" | "C5.2"
  | "C6.1" | "C6.2" | "C6.3" | "C6.4";

export interface Concept {
  id: Id;
  name: string;
  col: number;
  row: number;
  prereqs: Id[];
  objective: string;
}

export const THRESH = 0.7;

export const CONCEPTS: Concept[] = [
  { id: "prim", name: "Funciones primitivas", col: 1, row: 0, prereqs: [], objective: "Reconocer una primitiva y entender por qué la antiderivada no es única." },
  { id: "reglas", name: "Reglas de integración", col: 1, row: 1, prereqs: ["prim"], objective: "Aplicar las reglas básicas (potencia, linealidad, exponencial y trigonométricas) a funciones elementales." },
  { id: "metodos", name: "Métodos de integración", col: 1, row: 2, prereqs: ["reglas"], objective: "Al finalizar este concepto podrás seleccionar y aplicar correctamente diferentes métodos de integración." },
  { id: "definida", name: "Integral definida", col: 1, row: 3, prereqs: ["metodos"], objective: "Interpretar y calcular la integral definida como acumulación y área con signo." },
  { id: "tfc", name: "Teorema Fundamental del Cálculo", col: 0, row: 4, prereqs: ["definida"], objective: "Conectar derivación e integración para evaluar integrales mediante primitivas." },
  { id: "area", name: "Área entre curvas", col: 1, row: 4, prereqs: ["definida"], objective: "Plantear y calcular el área comprendida entre dos curvas." },
  { id: "impropia", name: "Integral impropia", col: 2, row: 4, prereqs: ["definida"], objective: "Decidir si una integral con límites infinitos o integrando no acotado converge." },
  { id: "longitud", name: "Longitud de arco", col: 0, row: 5, prereqs: ["tfc"], objective: "Calcular la longitud de una curva plana mediante una integral." },
  { id: "solidos", name: "Sólidos de revolución", col: 1, row: 5, prereqs: ["area"], objective: "Calcular volúmenes por discos, arandelas y capas cilíndricas." },
  { id: "series", name: "Series y sucesiones", col: 2, row: 5, prereqs: ["impropia"], objective: "Analizar la convergencia de sucesiones y series, apoyándote en integrales impropias." },
  { id: "centroides", name: "Centros de masa y centroides", col: 1, row: 6, prereqs: ["solidos"], objective: "Localizar el centroide de regiones planas y el centro de masa de láminas." },
  { id: "pappus", name: "Teorema de Pappus", col: 1, row: 7, prereqs: ["centroides"], objective: "Usar el centroide para obtener áreas y volúmenes de revolución sin integrar." },
];

const officialConceptRows: [Id, string, number, Id[], string][] = [
  ["C0.1", "Álgebra y trigonometría", 0, [], "Aplicar factorización e identidades trigonométricas como fundamentos del cálculo integral."],
  ["C0.2", "Funciones", 0, ["C0.1"], "Reconocer y operar con funciones necesarias para interpretar integrales."],
  ["C0.3", "Límites", 0, ["C0.2"], "Comprender límites como fundamento de derivadas e integrales."],
  ["C0.4", "Derivadas", 0, ["C0.3"], "Usar derivadas para verificar antiderivadas y aplicar el teorema fundamental."],
  ["C0.5", "Regla de la cadena", 0, ["C0.4"], "Reconocer la regla de la cadena para preparar sustituciones."],
  ["C1.1", "Antiderivada", 1, ["C0.4"], "Reconocer una función cuya derivada es el integrando."],
  ["C1.2", "Constante de integración C", 1, ["C1.1"], "Expresar la familia de antiderivadas mediante la constante de integración."],
  ["C2.1", "Regla de la potencia", 2, ["C1.2", "C0.1"], "Integrar potencias de x aplicando la regla de la potencia."],
  ["C2.2", "Suma y resta de funciones", 2, ["C2.1"], "Integrar sumas y diferencias término a término."],
  ["C2.3", "Múltiplo constante", 2, ["C2.1"], "Extraer constantes y aplicar linealidad al integrar."],
  ["C2.4", "Integrales trigonométricas básicas", 2, ["C1.2", "C0.4"], "Integrar funciones trigonométricas elementales."],
  ["C3.1", "Sustitución simple", 3, ["C2.2", "C2.3", "C2.4", "C0.5"], "Elegir una sustitución que simplifique la integral."],
  ["C3.2", "Integración por partes", 3, ["C2.2", "C2.3", "C0.4"], "Aplicar integración por partes a productos de funciones."],
  ["C3.3", "Integrales trigonométricas (potencias)", 3, ["C2.4", "C3.1", "C0.1"], "Resolver integrales que contienen potencias de funciones trigonométricas."],
  ["C3.4", "Sustitución trigonométrica", 3, ["C3.1", "C3.3"], "Usar sustituciones trigonométricas para expresiones radicales."],
  ["C3.5", "Fracciones parciales", 3, ["C3.1", "C0.1"], "Descomponer funciones racionales para facilitar su integración."],
  ["C3.6", "Sustituciones diversas", 3, ["C3.1", "C3.5"], "Seleccionar sustituciones adicionales para integrales no inmediatas."],
  ["C4.1", "Sumas de Riemann", 4, ["C0.2", "C0.3"], "Aproximar acumulaciones mediante sumas de Riemann."],
  ["C4.2", "Integral definida", 4, ["C4.1", "C2.1"], "Calcular e interpretar integrales definidas."],
  ["C4.3", "Teorema fundamental del cálculo", 4, ["C4.2", "C1.1", "C0.4"], "Relacionar derivación e integración para evaluar integrales definidas."],
  ["C5.1", "Integrales impropias: límites infinitos", 5, ["C4.3", "C0.3"], "Analizar convergencia cuando el intervalo de integración es infinito."],
  ["C5.2", "Integrales impropias: integrandos discontinuos", 5, ["C4.3", "C0.3"], "Analizar integrales con discontinuidades en el integrando."],
  ["C6.1", "Área entre curvas", 6, ["C4.3"], "Calcular áreas de regiones delimitadas por curvas."],
  ["C6.2", "Sólidos de revolución: método de discos", 6, ["C6.1"], "Calcular volúmenes de revolución mediante discos."],
  ["C6.3", "Sólidos de revolución: método de arandelas", 6, ["C6.2"], "Calcular volúmenes de revolución mediante arandelas."],
  ["C6.4", "Sólidos de revolución: método de capas", 6, ["C6.2"], "Calcular volúmenes de revolución mediante capas cilíndricas."],
];

const levelCounts = new Map<number, number>();
export const OFFICIAL_CONCEPTS: Concept[] = officialConceptRows.map(([id, name, level, prereqs, objective]) => {
  const col = levelCounts.get(level) ?? 0;
  levelCounts.set(level, col + 1);
  return { id, name, col, row: level + col * 0.22, prereqs, objective };
});

export const ALL_CONCEPTS = [...CONCEPTS, ...OFFICIAL_CONCEPTS];
export const byId = (id: Id) => ALL_CONCEPTS.find((c) => c.id === id)!;
export const unlocks = (id: Id) => ALL_CONCEPTS.filter((c) => c.prereqs.includes(id));

export interface Question {
  id: string;
  concept?: Id;
  skill?: string;
  text: string;
  expr?: string;
  options: string[];
  correct: number;
  explain?: string;
}

export const DIAG: Question[] = [
  { id: "d1", concept: "prim", text: "Una primitiva de f(x) = 3x² es…", options: ["6x", "x³", "3x³", "x² / 3"], correct: 1 },
  { id: "d2", concept: "reglas", text: "¿Cuánto vale ∫ (2x³ − 5) dx?", options: ["6x² − 5 + C", "2x⁴ − 5x + C", "x⁴/2 − 5x + C", "x⁴/2 − 5 + C"], correct: 2 },
  { id: "d3", concept: "metodos", text: "Para calcular ∫ x·eˣ dx, el método más adecuado es…", options: ["Fracciones parciales", "Integración por partes", "Sustitución trigonométrica", "La regla de la potencia, directamente"], correct: 1 },
  { id: "d4", concept: "metodos", text: "¿Cuánto vale ∫ 2x·cos(x²) dx?", options: ["−sin(x²) + C", "x² cos(x²) + C", "sin(x²) + C", "2 sin(x) + C"], correct: 2 },
  { id: "d5", concept: "definida", text: "¿Cuánto vale ∫₀² x dx?", options: ["1", "2", "4", "0"], correct: 1 },
  { id: "d6", concept: "tfc", text: "Si F′(x) = f(x), entonces ∫ₐᵇ f(x) dx es igual a…", options: ["F(a) − F(b)", "F(b) − F(a)", "F(b) + F(a)", "f(b) − f(a)"], correct: 1 },
];

export const EVAL: Question[] = [
  { id: "e1", skill: "Integración por partes", text: "Para ∫ x·ln x dx, ¿qué elección de u y dv es la adecuada?", options: ["u = x,  dv = ln x dx", "u = ln x,  dv = x dx", "u = x·ln x,  dv = dx", "No se puede resolver por partes"], correct: 1 },
  { id: "e2", skill: "Fracciones parciales", text: "¿Cómo se descompone 1 / (x² − x − 2) para integrarla?", options: ["A/(x − 2) + B/(x + 1)", "A/(x² − x) + B/2", "(Ax + B)/(x² − x − 2)", "A/(x − 1) + B/(x + 2)"], correct: 0 },
  { id: "e3", skill: "Sustitución trigonométrica", text: "Para ∫ √(4 − x²) dx, ¿qué sustitución simplifica el radical?", options: ["x = 2 tan θ", "x = 2 sec θ", "x = 2 sin θ", "x = 4 sin θ"], correct: 2 },
  { id: "e4", skill: "Sustitución u", text: "¿Cuánto vale ∫ 2x / (x² + 1) dx?", options: ["ln(x² + 1) + C", "arctan(x) + C", "2x·ln(x² + 1) + C", "(x² + 1)² + C"], correct: 0 },
  { id: "e5", skill: "Integración por partes", text: "¿Cuántas veces hay que aplicar integración por partes para resolver ∫ x²·eˣ dx?", options: ["Una", "Dos", "Tres", "Ninguna: se resuelve por sustitución"], correct: 1 },
  { id: "e6", skill: "Elegir el método", text: "¿Cuál de estas integrales se resuelve más directamente con una sustitución, sin partes?", options: ["∫ x·sin x dx", "∫ ln x dx", "∫ x·e^(x²) dx", "∫ x²·cos x dx"], correct: 2 },
];

export const GLOBAL_Q: Question[] = [
  { id: "g1", concept: "prim", text: "Dos primitivas de la misma función f difieren en…", options: ["Su dominio", "Una constante", "Un factor multiplicativo", "Nada: son iguales"], correct: 1 },
  { id: "g2", concept: "reglas", text: "¿Cuánto vale ∫ (1/x) dx?", options: ["1/x² + C", "x ln x + C", "ln|x| + C", "−1/x² + C"], correct: 2 },
  { id: "g3", concept: "metodos", text: "¿Cuánto vale ∫ x·cos x dx?", options: ["x sin x − cos x + C", "x sin x + cos x + C", "−x sin x + cos x + C", "sin x + C"], correct: 1 },
  { id: "g4", concept: "tfc", text: "¿Cuánto vale d/dx ∫₀ˣ t² dt?", options: ["x³/3", "x²", "2x", "0"], correct: 1 },
  { id: "g5", concept: "area", text: "El área entre y = x e y = x² en [0, 1] es…", options: ["1/6", "1/2", "1/3", "1/12"], correct: 0 },
  { id: "g6", concept: "solidos", text: "Volumen del sólido que se obtiene al girar y = x, 0 ≤ x ≤ 1, alrededor del eje x:", options: ["π", "π/3", "π/2", "2π/3"], correct: 1 },
];

export const REVIEWS: Partial<Record<Id, Question[]>> = {
  prim: [
    { id: "rp1", text: "Si F y G son dos primitivas de la misma función f, ¿qué se puede afirmar?", options: ["Son siempre iguales", "Una es la derivada de la otra", "Difieren en una constante", "Tienen distinto dominio"], correct: 2, explain: "Toda primitiva queda determinada salvo una constante, y por eso escribimos + C." },
    { id: "rp2", text: "¿Cuál de estas funciones NO es una primitiva de f(x) = 2x?", options: ["x²", "x² + 7", "x² − 3", "2x²"], correct: 3, explain: "La derivada de 2x² es 4x, no 2x." },
  ],
  reglas: [
    { id: "rr1", text: "Para n ≠ −1, ∫ xⁿ dx es…", options: ["n·xⁿ⁻¹ + C", "xⁿ⁺¹/(n + 1) + C", "xⁿ/n + C", "ln|x|ⁿ + C"], correct: 1, explain: "Se sube el exponente en uno y se divide por el nuevo exponente. El caso n = −1 da ln|x|." },
    { id: "rr2", text: "¿Cuánto vale ∫ 3eˣ dx?", options: ["eˣ + 3 + C", "3x·eˣ + C", "3eˣ + C", "eˣ/3 + C"], correct: 2, explain: "Por linealidad la constante sale de la integral, y la integral de eˣ es eˣ." },
  ],
  metodos: [
    { id: "rm1", text: "¿Cuándo es conveniente utilizar integración por partes?", options: ["Cuando el integrando es un cociente de polinomios", "Cuando el integrando es un producto de funciones de distinta naturaleza, como x·eˣ o x·ln x", "Cuando aparece una función compuesta y su derivada como factor", "Solo cuando la integral es definida"], correct: 1, explain: "Funciona bien con productos de polinomio por exponencial o trigonométrica, y con logaritmos. Si ves f(g(x))·g′(x), piensa en sustitución." },
    { id: "rm2", text: "En ∫ x·cos x dx, ¿qué conviene tomar como u?", options: ["u = cos x", "u = x", "u = x·cos x", "u = 1"], correct: 1, explain: "Se elige como u la parte que se simplifica al derivar: x pasa a ser 1." },
  ],
};

export interface Activity {
  id: string;
  title: string;
  skill: string;
  difficulty: 1 | 2 | 3;
  prompt: string;
  expr: string;
  hint: string;
  accepted?: string[];
  options?: { t: string; ok: boolean }[];
  solution: string[];
  okMsg: string;
  noMsg: string;
}

export const ACTIVITIES: Activity[] = [
  {
    id: "a1", title: "Polinomio por exponencial", skill: "Integración por partes", difficulty: 1,
    prompt: "Calcula la siguiente integral utilizando integración por partes.",
    expr: "∫ x · eˣ dx",
    hint: "Elige u = x: al derivar se simplifica. Entonces dv = eˣ dx.",
    accepted: ["xe^x-e^x", "e^xx-e^x", "e^xx-1", "x-1e^x"],
    solution: ["u = x → du = dx;  dv = eˣ dx → v = eˣ", "∫ x eˣ dx = x eˣ − ∫ eˣ dx", "= x eˣ − eˣ + C = eˣ (x − 1) + C"],
    okMsg: "Correcto. Elegiste bien u: derivar x lo simplifica y la integral restante es inmediata.",
    noMsg: "Casi. Tras aplicar ∫u dv = uv − ∫v du, la integral que queda debería ser más simple que la original. ¿Qué pasa si tomas u = x?",
  },
  {
    id: "a2", title: "Polinomio por trigonométrica", skill: "Integración por partes", difficulty: 2,
    prompt: "Otra vez un producto, pero ahora con una función trigonométrica.",
    expr: "∫ x · cos x dx",
    hint: "De nuevo u = x. ¿Cuál es la integral de cos x?",
    accepted: ["xsinx+cosx", "sinxx+cosx"],
    solution: ["u = x → du = dx;  dv = cos x dx → v = sin x", "∫ x cos x dx = x sin x − ∫ sin x dx", "= x sin x + cos x + C"],
    okMsg: "Muy bien. Observa el signo: −∫ sin x dx = + cos x.",
    noMsg: "Revisa el signo al integrar sin x: ∫ sin x dx = −cos x, y esa integral aparece restando.",
  },
  {
    id: "a3", title: "¿Partes o sustitución?", skill: "Sustitución u", difficulty: 2,
    prompt: "No todo producto se resuelve por partes. Observa la estructura antes de elegir el método.",
    expr: "∫ 2x · cos(x²) dx",
    hint: "Fíjate: 2x es exactamente la derivada de x². Prueba u = x².",
    accepted: ["sinx^2"],
    solution: ["u = x² → du = 2x dx", "∫ cos u du = sin u + C", "= sin(x²) + C"],
    okMsg: "Exacto. Cuando el integrando contiene f(g(x))·g′(x), la sustitución es el camino más corto.",
    noMsg: "Observa que 2x es la derivada de x². ¿Qué ocurre si haces u = x²?",
  },
];

export const REINFORCE: Activity[] = [
  {
    id: "r1", title: "El factor escondido", skill: "Integración por partes", difficulty: 1,
    prompt: "Parece tener un solo factor, pero puedes escribir ln x = ln x · 1.",
    expr: "∫ ln x dx",
    hint: "Toma u = ln x y dv = dx.",
    accepted: ["xlnx-x", "xlnx-1"],
    solution: ["u = ln x → du = dx/x;  dv = dx → v = x", "∫ ln x dx = x ln x − ∫ dx", "= x ln x − x + C"],
    okMsg: "Correcto. Es el ejemplo clásico de por qué conviene tener presente dv = dx.",
    noMsg: "Usa u = ln x y dv = dx. Al aplicar la fórmula, ∫ v du se reduce a ∫ dx.",
  },
  {
    id: "r2", title: "Descomponer antes de integrar", skill: "Fracciones parciales", difficulty: 2,
    prompt: "Elige la descomposición que permite integrar término a término.",
    expr: "1 / (x² − 1)",
    hint: "Factoriza primero el denominador.",
    options: [
      { t: "A/(x − 1) + B/(x + 1)", ok: true },
      { t: "(Ax + B)/(x² − 1)", ok: false },
      { t: "A/x² + B/1", ok: false },
    ],
    solution: ["x² − 1 = (x − 1)(x + 1): dos factores lineales distintos", "1/(x² − 1) = A/(x − 1) + B/(x + 1), con A = ½ y B = −½", "∫ = ½ ln|x − 1| − ½ ln|x + 1| + C"],
    okMsg: "Correcto. Dos factores lineales distintos dan una fracción simple por cada uno.",
    noMsg: "Recuerda: cada factor lineal distinto del denominador aporta un término A/(x − r).",
  },
  {
    id: "r3", title: "Eliminar un radical", skill: "Sustitución trigonométrica", difficulty: 2,
    prompt: "Elige la sustitución que elimina el radical.",
    expr: "∫ √(9 − x²) dx",
    hint: "Busca que 9 − x² se convierta en 9 cos²θ.",
    options: [
      { t: "x = 3 sin θ", ok: true },
      { t: "x = 3 tan θ", ok: false },
      { t: "x = 9 sin θ", ok: false },
    ],
    solution: ["x = 3 sin θ → dx = 3 cos θ dθ", "√(9 − 9 sin²θ) = 3 cos θ", "La integral queda 9 ∫ cos²θ dθ, que ya sabes resolver"],
    okMsg: "Correcto. a² − x² pide x = a sin θ.",
    noMsg: "Para √(a² − x²) la identidad útil es 1 − sin²θ = cos²θ, así que x = a sin θ.",
  },
];

export const SKILL_CHECKS = ["Integración por partes", "Fracciones parciales", "Sustitución trigonométrica", "Sustitución u", "Elegir el método"];

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[−–]/g, "-")
    .replace(/[\s*·()|]/g, "")
    .replace(/²/g, "^2")
    .replace(/ˣ/g, "^x")
    .replace(/\+c$/, "");
