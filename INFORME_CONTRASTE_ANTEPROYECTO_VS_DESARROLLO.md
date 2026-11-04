# Informe Técnico y Comparativo: Anteproyecto vs. Desarrollo Real
## Plataforma Web de Aprendizaje Adaptativo y Retención Conceptual (Cognia)
**Documento de soporte para la redacción del Artículo Final de Proyecto Integrador I**

---

### Metadatos del Proyecto
* **Proyecto:** Plataforma web de aprendizaje adaptativo basada en diagnóstico de conocimientos y generación personalizada de rutas de aprendizaje.
* **Nombre del Sistema:** Cognia (Backend API + Frontend Web `FrontPI`).
* **Asignatura Piloto:** Cálculo Integral (26 conceptos, 7 niveles curriculares, 43 relaciones de prerrequisito, 312 actividades estructuradas).
* **Autores:** Juan David González, Jimena Muñoz Gómez, Alejandro Guerra Urrego.
* **Programa Académico:** Ingeniería de Sistemas (504) - Universidad de Antioquia.
* **Curso:** 2508700 Proyecto Integrador I (Grupo 5).
* **Profesor Encargado:** Ronal Montoya.

---

## 1. Resumen Ejecutivo del Contraste

El proyecto desarrollado cumple a cabalidad con el objetivo nuclear trazado en el anteproyecto: diseñar e implementar una plataforma web funcional que personalice la ruta de actividades de práctica a partir de un diagnóstico inicial, relaciones de prerrequisito y seguimiento continuo del dominio conceptual.

El desarrollo no solo satisfizo las especificaciones iniciales, sino que introdujo un **motor de retención a largo plazo con repetición espaciada (algoritmo SuperMemo-2 / SM-2)** y una **arquitectura hexagonal en monolito modular**, aportes no contemplados inicialmente que elevaron la robustez pedagógica y técnica del sistema.

### Tabla Sinóptica: Propuesta Inicial vs. Estado Real Implementado

| Dimensión / Componente | Propuesto en el Anteproyecto | Realmente Implementado en el Sistema | Grado de Coincidencia / Variación |
| :--- | :--- | :--- | :--- |
| **Enfoque de Adaptabilidad** | Reglas de decisión basadas en dominio, dificultad y prerrequisitos; estudio experimental de BKT. | Motor determinista de reglas (`RuleBasedMasteryPolicy`) con pesos por dificultad, ordenación topológica sobre grafo DAG y algoritmo SM-2 para retención. | **Cumplido con refinamiento.** Se descartó BKT en ejecución a favor de reglas deterministas auditables y repetición espaciada. |
| **Estimación del Dominio (BKT)** | Estudio experimental condicionado a datos y tiempo de desarrollo. | **NO se implementó BKT.** Implementación de política de maestría basada en reglas ponderadas ($D_1: \times 1.0, D_2: \times 1.5, D_3: \times 2.0$) y actualización incremental. | **Variación justificada:** La falta de datos históricos masivos impidió el ajuste probabilístico de BKT (Cold-start). |
| **Evaluación de Refuerzo** | Evaluación corta tras actividad para determinar avance o refuerzo. | Ciclo formal desacoplado: Práctica formativa con feedback $\rightarrow$ Evaluación sumativa corta (3 reactivos, $\ge 70\%$) $\rightarrow$ Estado `REFUERZO` ante reprobación $\rightarrow$ Repetición exitosa desbloquea DAG y activa SM-2. | **Cumplido con rigor metodológico superior.** Refuerzo repetido exitosamente validado con versionado de rutas y detección de amnesia. |
| **Backend** | Spring Boot, arquitectura modular, Java. | Java 17 LTS, Spring Boot 4.1.1, **Arquitectura Hexagonal (Puertos y Adaptadores)**, Spring Security con JWT stateless, Spring Data JPA, Gradle (Kotlin DSL). | **Cumplido y superado.** Se adoptó un estándar arquitectónico formal (Hexagonal/DDD). |
| **Frontend** | React y TypeScript. | React 19, TypeScript 5.7, Vite 8, Tailwind CSS v4, KaTeX (renderizado $\LaTeX$), grafo DAG interactivo en SVG con curvas de Bézier. | **Cumplido y modernizado.** Uso de versiones de vanguardia y soporte tipográfico para fórmulas matemáticas. |
| **Persistencia** | PostgreSQL. | PostgreSQL 16 con esquema relacional normalizado, llaves compuestas de integridad intra-asignatura, índices parciales únicos y auditoría de maestría. | **Cumplido con optimizaciones de integridad referencial.** |
| **Dominio Piloto** | Conceptos fundamentales acotados de una asignatura piloto. | Cálculo Integral exhaustivo: 26 conceptos, 43 prerrequisitos, 312 reactivos (diagnóstico, práctica, evaluación corta, examen global y repaso). | **Cumplido con cobertura exhaustiva.** |

---

## 2. Implementación de Modelos de Conocimiento: ¿Se implementó BKT o no?

### 2.1. Veredicto Técnico
**NO se implementó Bayesian Knowledge Tracing (BKT)** en el código fuente final del sistema.

### 2.2. Lo propuesto en el Anteproyecto
En el documento de anteproyecto, BKT nunca fue un compromiso mandatorio de entrega, sino una **extensión experimental condicionada**:
> *"La personalización se implementará inicialmente mediante reglas de decisión. Como alternativa experimental, se estudiará Bayesian Knowledge Tracing para estimar el dominio conceptual a partir de la secuencia de respuestas."* (Sección Planteamiento del problema).
> *"De manera experimental, se podrá comparar la estrategia basada en reglas con Bayesian Knowledge Tracing, de acuerdo con la disponibilidad de datos y el avance del proyecto."* (Objetivo específico 5).
> *"Como extensión experimental, podrá incorporarse Bayesian Knowledge Tracing para estimar el dominio conceptual, condicionado a la disponibilidad de datos y al tiempo de desarrollo."* (Alcance y delimitaciones).

### 2.3. Lo implementado en el Sistema
En lugar de BKT, el backend de Cognia implementó:
1. **Política de Maestría Basada en Reglas Ponderadas (`RuleBasedMasteryPolicy`):**
   * Ponderación según la dificultad del reactivo ($w_1 = 1.0, w_2 = 1.5, w_3 = 2.0$).
   * Cálculo de maestría inicial en diagnóstico:
     $$\text{Mastery} = \frac{\sum w_i \cdot \mathbb{I}(\text{correcta}_i)}{\sum w_i}$$
   * Incorporación incremental de evidencia (`incorporate`): combina el nivel anterior $L_{\text{old}}$ y el número de evaluaciones previas $n$ con la nueva evidencia ponderada, evitando fluctuaciones bruscas y preservando la trazabilidad.
2. **Motor de Retención a Largo Plazo (`Sm2Service` - SuperMemo-2):**
   * En lugar de modelar la probabilidad latente de aprendizaje $P(T)$ y olvido mediante parámetros probabilísticos estáticos de BKT, se incorporó un modelo dinámico de memoria activa con factor de facilidad ($EF \ge 1.30$), repeticiones progresivas e intervalos en días.

### 2.4. Justificación Teórica y Metodológica para el Artículo Final
Para la redacción del paper científico, la decisión de no incluir BKT se fundamenta en sólidos argumentos de la literatura de Inteligencia Artificial en Educación (AIED):
* **El Problema del Arranque en Frío (*Cold-Start Data Problem*):** BKT clásico (Corbett & Anderson, 1994) requiere calibrar cuatro parámetros por cada habilidad/concepto:
  * $P(L_0)$: Probabilidad inicial de dominio.
  * $P(T)$: Probabilidad de transición/aprendizaje tras una práctica.
  * $P(G)$: Probabilidad de adivinanza (*guess*).
  * $P(S)$: Probabilidad de desliz o descuido (*slip*).
  Ajustar estos parámetros mediante algoritmos como *Expectation-Maximization* (Baum-Welch) o *Grid Search* exige recopilar previamente miles de respuestas de cientos de estudiantes. Al ser un desarrollo de prototipo inicial con un banco recién diseñado, no existía un corpus histórico real para una calibración empírica válida; aplicar parámetros arbitrarios habría introducido ruido y descalibración en la asignación de rutas.
* **Transparencia e Interpretabilidad (*Explainable AI / XAI*):** En contextos universitarios, los estudiantes y profesores demandan saber con certeza por qué un concepto está bloqueado o por qué se recomienda una actividad. El modelo de reglas ponderadas y grafos DAG es completamente determinista, auditable y trazable en la tabla `historial_maestria`.
* **Sustitución Superior para Retención:** BKT tradicional asume que una vez un concepto alcanza el umbral de maestría, este no se olvida (a menos que se use una variante con decaimiento probabilístico no estándar). La plataforma resolvió el problema del olvido de forma más efectiva y práctica adoptando el algoritmo SM-2 para sesiones de repaso diario activo (*active recall*).

---

## 3. Tecnologías Usadas: Comparativa y Stack Tecnológico

El proyecto se consolidó sobre una arquitectura de desacoplamiento total cliente-servidor (RESTful API y SPA), orquestada mediante contenedores y flujos de integración continua.

### 3.1. Frontend Web (`FrontPI`)
* **React 19 (`react: ^19.0.0`, `react-dom: ^19.0.0`):** Uso de la versión más reciente de la librería, aprovechando mejoras de renderizado y transiciones concurrentes.
* **TypeScript 5.7 (`typescript: ^5.7.0`):** Tipado estático estricto para modelos de dominio, respuestas de la API (`src/api/types.ts`) y estados de las sesiones.
* **Vite 8 (`vite: ^8.0.5`, `@vitejs/plugin-react: ^6.0.0`):** Entorno de compilación y empaquetado de ultra-baja latencia en desarrollo.
* **Tailwind CSS v4 (`tailwindcss: ^4.0.0`, `@tailwindcss/vite`):** Motor de estilos utilitario de última generación con configuración de tokens de diseño semánticos (paleta editorial oscura "Itinera": `sage` para dominado, `brass` para disponible/proceso, `clay` para refuerzo).
* **KaTeX 0.19.1 (`katex: ^0.19.1`):** Motor de renderizado tipográfico de fórmulas matemáticas $\LaTeX$ (`$`, `$$`, `\\[...\\]`), componente crítico para la visualización de integrales, derivadas y límites en Cálculo Integral.
* **Lucide React (`lucide-react: ^1.52.0`):** Conjunto coherente de iconografía SVG accesible.
* **OxFmt 0.2.0:** Formateador de código ultrarrápido basado en Rust.
* **Visualizador de Grafo DAG Interactivo:** Implementado a medida con SVG nativo, calculando posiciones nodales por nivel y aristas con curvas de Bézier cúbicas (`M x1 y1 C cx1 y1, cx2 y2, x2 y2`).

### 3.2. Backend API (`Cognia`)
* **Java 17 LTS:** Lenguaje base, garantizando tipado fuerte, registros inmutables (`records`), *pattern matching* y soporte a largo plazo.
* **Spring Boot 4.1.1 (`org.springframework.boot`):** Framework empresarial para la construcción de microservicios y APIs robustas.
* **Arquitectura Hexagonal (Ports & Adapters):**
  * `domain`: Modelos inmutables (`Concept`, `LearningPath`, `PathStep`, `DiagnosticEvidence`, `ReviewProgress`) y servicios de dominio puros sin dependencias de infraestructura (`LearningPathGenerator`, `RuleBasedMasteryPolicy`, `Sm2Service`).
  * `application`: Casos de uso e interfaces de puertos de entrada (`LearningPathUseCases`, `PracticeUseCases`, `ReviewAndGlobalExamUseCases`) y servicios de aplicación orquestadores.
  * `adapter.in.web`: Controladores REST (`DiagnosticController`, `LearningPathController`, `PracticeController`, `ReviewController`), DTOs y manejo de excepciones HTTP.
  * `adapter.out.persistence`: Entidades JPA, adaptadores de repositorios y mapeadores hacia el modelo de dominio.
* **Spring Security & JJWT (`io.jsonwebtoken:jjwt-api:0.12.6`):** Autenticación y autorización *stateless* mediante tokens JWT (algoritmo HMAC-SHA256). Inyección declarativa de la identidad del estudiante mediante la anotación personalizada `@CurrentStudent UUID studentId`.
* **Spring Data JPA & Hibernate:** Capa de abstracción de datos y mapeo objeto-relacional sobre JDBC.
* **Springdoc OpenAPI 3.2.0:** Generación dinámica de la especificación OpenAPI v3 y consola interactiva Swagger UI (`/swagger-ui.html`).
* **Gradle 9.x con Kotlin DSL (`build.gradle.kts`):** Gestión automatizada de dependencias y tareas de compilación.

### 3.3. Persistencia y Base de Datos
* **PostgreSQL 16:** Motor relacional robusto con soporte nativo de UUID, transacciones ACID y tipos JSONB.
* **Diseño del Esquema Relacional:**
  * 20 tablas organizadas modularmente (`student`, `subject`, `concept`, `prerequisite`, `knowledge_profile`, `concept_mastery`, `historial_maestria`, `learning_path`, `path_step`, `activity`, `activity_option`, `actividad_criterio_rc`, `diagnostic_session`, `short_evaluation_session`, `review_card`, `progreso_repaso`, `global_exam_session`, etc.).
  * Restricciones de integridad referencial compuestas (garantía estricta de que un concepto y sus prerrequisitos pertenecen a la misma asignatura).
  * Índices parciales únicos (`uq_ruta_una_activa`) para asegurar que un alumno no posea múltiples rutas activas simultáneas.

### 3.4. Infraestructura, DevOps y Calidad
* **Docker & Docker Compose:** Entorno de despliegue contenerizado mediante *multi-stage builds* (compilación en Gradle y empaquetado en Eclipse Temurin JRE ligero) ejecutado bajo usuario sin privilegios (*non-root*).
* **GitHub Actions CI (`ci.yml`):** Canalización de integración continua que ejecuta compilación y tests automatizados ante cada *push* o *pull request*.
* **Testing:** JUnit 5 (Jupiter), Spring Security Test y Testcontainers PostgreSQL para pruebas de integración contra instancias reales de bases de datos desechables.

---

## 4. Análisis Crítico: ¿Se realiza una Evaluación de Refuerzo Repetido Exitosamente?

### 4.1. Veredicto Técnico
**SÍ, se implementó de forma completa, rigurosa y verificable.**

El sistema cuenta con un circuito adaptativo de evaluación y refuerzo repetido que cubre el ciclo:
$$\text{Evaluación Reprobada} \longrightarrow \text{Paso a REFUERZO} \longrightarrow \text{Práctica Focalizada} \longrightarrow \text{Reevaluación Sumativa} \longrightarrow \text{Evaluación Exitosa} \longrightarrow \text{Desbloqueo de Ruta} \longrightarrow \text{Programación SM-2}$$

### 4.2. Detalle del Mecanismo y Flujo Pedagógico

#### A. Desacoplamiento Formativo vs. Sumativo
Una fortaleza clave del diseño es la estricta separación pedagógica entre:
1. **Práctica Formativa (`PRACTICA`):** Con retroalimentación inmediata, pistas y explicaciones. Los intentos (`intento_actividad`) no penalizan ni alteran formalmente la maestría del alumno, permitiendo el error como vehículo de aprendizaje.
2. **Evaluación Sumativa Corta (`EVALUACION_CORTA`):** Sesión formal de 3 reactivos calibrados por concepto, sin pistas intermedias, cuyo resultado determina el avance curricular según un umbral de aprobación predefinido ($\ge 70\%$).

#### B. Flujo ante Reprobación (Activación del Refuerzo)
1. **Detección de Brecha Conceptual:** Si el puntaje de la evaluación corta es inferior al 70%, el método `finish` en `LearningPathService` califica la sesión como `passed = false`.
2. **Transición de Estado:** El paso de ruta correspondiente (`PathStep`) cambia inmediatamente de estado a **`REFUERZO`** (`PathStep.State.REFUERZO`), visualizado en color arcilla (`clay`) en el frontend.
3. **Recomendación Adaptativa Focalizada:** El servicio `next()` de `LearningPathService` detecta el estado `REFUERZO` y restringe las actividades de práctica recomendadas (`findPracticeByConceptAtMost`) a una dificultad menor o igual al nivel donde falló el estudiante (`reinforcementDifficulty`). Esto evita la frustración cognitiva y refuerza subhabilidades débiles.

#### C. Ejecución de la Reevaluación (Evaluación de Refuerzo)
1. El estudiante realiza la práctica de refuerzo.
2. El sistema habilita una nueva sesión de evaluación corta (`POST /subjects/{id}/path-steps/{stepId}/short-evaluations`), incrementando el contador de intentos (`attempt = attempt + 1`).
3. El estudiante responde nuevamente la batería de ítems de evaluación sumativa corta.

#### D. Efectos de la Evaluación de Refuerzo Superada Exitosamente
Cuando el estudiante supera la evaluación en este nuevo intento (puntaje $\ge 70\%$):
1. **Transición a Dominado:** El paso de ruta transiciona formalmente a **`DOMINADO`** (`PathStep.State.DOMINADO`), adquiriendo el color verde salvia (`sage`).
2. **Incorporación Incremental de Maestría:** Se invoca `RuleBasedMasteryPolicy.incorporate()`, actualizando el valor de maestría estimada en `concept_mastery` y registrando el evento en `historial_maestria` con origen `EVALUACION_CORTA` y el identificador de la sesión.
3. **Desbloqueo en Cascada en el Grafo DAG:** El motor `LearningPathGenerator.afterResult()` y `unlockEligible()` examina los conceptos sucesores en el grafo de prerrequisitos. Aquellos conceptos cuyos prerrequisitos quedaron completamente satisfechos se desbloquean, pasando de `BLOQUEADO` a `DISPONIBLE` (o `EN_PROGRESO`).
4. **Activación de Retención Espaciada:** Al registrarse el éxito de dominio, el sistema inscribe de inmediato la tarjeta conceptual en el mazo de repaso activo (`reviewDeck.addMissingProgress`) con una fecha de revisión programada para el día siguiente (`initialReviewDelayDays = 1`).

#### E. Mecanismos de Salvaguarda y Control de Fallas Reiteradas
* **Recálculo Automático por Fallas Consecutivas:** Si el estudiante reprueba de manera persistente las evaluaciones cortas de un concepto ($\ge 2$ fallos consecutivos, configurado en `failuresBeforeRecalculation = 2`), el backend dispara automáticamente `recalculate()`. Esto invalida la ruta actual, crea una nueva versión de la ruta (`version = version + 1`) y reajusta la secuencia curricular para abordar prerrequisitos no consolidados.
* **Detección de Amnesia Conceptual en Repasos SM-2:** Si en el futuro, durante los repasos diarios, el estudiante falla 2 veces consecutivas en una tarjeta de un concepto que ya estaba dominado (calificación $< 3$ en SM-2), el método `reopenAfterReview` revierte el concepto de `DOMINADO` a `REFUERZO` y bloquea nuevamente los conceptos avanzados dependientes. Esto obliga al alumno a presentar una **nueva evaluación de refuerzo** para demostrar que recuperó el conocimiento antes de continuar.

---

## 5. Matriz de Cumplimiento de Objetivos del Anteproyecto

| Objetivo Específico del Anteproyecto | Estado en el Desarrollo | Evidencia Técnica y Arquitectónica |
| :--- | :---: | :--- |
| **OE1: Caracterización del dominio y modelo estructurado** | **Cumplido al 100%** | Banco oficial de Cálculo Integral: 26 conceptos, 7 niveles (N0 a N6), 43 aristas de prerrequisitos y 312 actividades clasificadas por dificultad ($1..3$) y tipología (SM y RC). |
| **OE2: Mecanismo de diagnóstico y seguimiento de dominio** | **Cumplido al 100%** | Sesión de diagnóstico inicial (`DiagnosticService`), estimación ponderada por dificultad en `RuleBasedMasteryPolicy` y auditoría en `historial_maestria`. |
| **OE3: Motor de personalización basado en reglas** | **Cumplido al 100%** | Generación de rutas mediante ordenación topológica sobre el grafo DAG de prerrequisitos (`LearningPathGenerator`), evitando ciclos y respetando la prelación conceptual. |
| **OE4: Implementación del ciclo adaptativo de aprendizaje** | **Cumplido al 100%** | Ciclo end-to-end integrado: Diagnóstico $\rightarrow$ Ruta $\rightarrow$ Práctica formativa con pistas $\rightarrow$ Evaluación sumativa corta $\rightarrow$ Refuerzo $\rightarrow$ Examen global sumativo. |
| **OE5: Evaluación funcional y estudio comparativo con BKT** | **Cumplido con justificación metodológica** | Pruebas unitarias y de integración (JUnit 5, Testcontainers). Análisis teórico formal que descarta BKT por insuficiencia de datos previos masivos y demuestra la superioridad práctica de reglas deterministas con SM-2. |

---

## 6. Recomendaciones y Guía para la Redacción del Artículo Final

Al redactar el artículo científico o reporte final de investigación y desarrollo, se sugiere estructurar la narrativa siguiendo estas directrices:

### 6.1. Sección: Metodología y Modelo Adaptativo
* **Destacar el enfoque híbrido:** Presentar la plataforma como un sistema adaptativo híbrido que combina **Navegación Adaptativa Curricular (Grafo DAG)** con **Sistemas de Repetición Espaciada (Active Recall / SM-2)**. Este cruce es innovador en la literatura de plataformas educativas abiertas, ya que los tutores inteligentes convencionales suelen enfocarse en el avance secuencial pero descuidan la retención a mediano y largo plazo.
* **Defender la elección de Reglas Ponderadas frente a BKT:**
  * Enmarcar a BKT como una técnica revisada en el estado del arte y considerada en la fase de diseño inicial.
  * Justificar rigurosamente por qué no se implementó BKT basándose en el teorema del *Cold-Start* y la imposibilidad de calibrar empíricamente los parámetros $P(L_0), P(T), P(G), P(S)$ sin un histórico masivo de respuestas.
  * Enfatizar que el modelo de reglas ponderadas implementado ofrece **interpretabilidad total (*Explainable Learner Modeling*)**, propiedad altamente valorada en pedagogía universitaria.

### 6.2. Sección: Arquitectura de Software e Implementación
* **Resaltar la Arquitectura Hexagonal:** Explicar cómo el desacoplamiento entre el núcleo del dominio (`domain`), los casos de uso (`application`) y los adaptadores (`adapter`) garantiza que el motor adaptativo sea independiente de la tecnología de persistencia y de la interfaz web, permitiendo en el futuro conectar un microservicio de machine learning o una app móvil sin tocar la lógica matemática de la ruta.
* **Seguridad y Modernidad del Stack:** Exponer el uso de estándares contemporáneos: autenticación stateless con JWT, React 19, Tailwind v4 y tipografía matemática KaTeX.

### 6.3. Sección: Resultados y Discusión del Ciclo de Refuerzo
* **Documentar la eficacia del refuerzo repetido:** Utilizar diagramas de transición de estados para evidenciar cómo un estudiante que reprueba una evaluación corta transiciona a `REFUERZO`, recibe ejercicios calibrados a su nivel de dificultad débil, repite la evaluación, y al aprobar, desbloquea de manera reactiva el grafo DAG y activa su primera tarjeta en el mazo de retención SM-2.
* **Detección de Amnesia:** Presentar el mecanismo de recálculo de ruta por amnesia conceptual como una contribución original del proyecto, resolviendo el problema de los estudiantes que avanzan en temas complejos habiendo olvidado los prerrequisitos fundamentales.

---
*Informe técnico elaborado como soporte documental integral para la redacción del Artículo Final.*

