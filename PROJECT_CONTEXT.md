# PROJECT_CONTEXT.md — Unatrans Operations Dashboard

> Documento de contexto y decisiones arquitectónicas para asistentes de programación, colaboradores y revisores técnicos.
>
> **Estado:** bootstrap, dominio, importación, dashboard operacional y pruebas incrementales implementados; validación de entrega pendiente. **Fecha de referencia:** 2026-11-10.  
> **Lectura obligatoria junto con:** [`AGENTS.md`](./AGENTS.md).  
> **Fuente funcional:** `Prueba_Tecnica_Candidatos_UAT.docx.pdf`.  
> **Fuente de datos:** `Datos_Sinteticos_Prueba_Tecnica_Unatrans.xlsx`.

## 1. Visión

Construir un **mini dashboard de operaciones de transporte** para una prueba técnica de **Desarrollador Full-Stack & Especialista en IA** de Unión Andina de Transportes. La aplicación debe leer el Excel proporcionado y mostrar indicadores, un gráfico, una tabla y filtros.

**Nuestra intención técnica:** entregar una solución pequeña, terminada, segura, rápida, mantenible y fácil de explicar. El diseño debe permitir evolucionar hacia otras fuentes, formatos, idiomas, divisas y eventualmente un backend **sin implementar ahora funcionalidades que no pide el ejercicio**.

> Escalabilidad no significa añadir infraestructura sin necesidad: significa contratos coherentes, responsabilidades aisladas, validación en los límites y bajo acoplamiento.

## 2. Qué exige realmente la prueba (documento original)

### Requisitos mínimos obligatorios

1. Cargar y leer el Excel entregado.
2. Presentar **al menos tres indicadores principales**.
3. Mostrar **al menos un gráfico** útil.
4. Mostrar **una tabla** con registros.
5. Ofrecer **al menos un filtro** (ej.: zona, servicio o estado).
6. Mantener una interfaz clara y fácil de navegar.

### Condiciones literales y límites

- **Tiempo máximo declarado:** aproximadamente **3 horas de desarrollo**.
- **Tecnologías:** a elección; se permite utilizar herramientas de Vibe Coding.
- **No se requiere** backend, autenticación, Google Drive ni servicios externos. Esto **no equivale a prohibición**, sino a ausencia de obligación.
- **Datos:** utilizar únicamente el Excel suministrado; no introducir otras fuentes operacionales.
- La aplicación debe **poder ejecutarse y demostrarse**.
- Entrega: aplicación funcional y accesible; código fuente o enlace al proyecto; indicación breve de qué herramienta de Vibe Coding se usó y cómo.
- Sustentación posterior: **10 minutos** de demostración y decisiones + **5 minutos** de preguntas.
- El documento aclara que **no se espera un producto listo para producción**, y que se valoran funcionamiento y comprensión por encima de complejidad.

### Rúbrica oficial (100 puntos)

| Criterio | Puntos |
|---|---:|
| Funcionalidad | 30 |
| Procesamiento coherente de datos | 25 |
| Dashboard claro | 20 |
| Uso efectivo de Vibe Coding | 15 |
| Explicación técnica | 10 |

**Implicación:** funcionalidad + exactitud son 55 puntos. No sacrificar requisitos por pulido excesivo.

### Entrega prevista (decisión nuestra, no obligación literal del PDF)

- Repositorio GitHub con código e instrucciones.
- URL funcional desplegada en Vercel para evaluación sin instalación.
- README con ejecución, decisiones de arquitectura, cálculos, límites y explicación del uso de IA.
- Demostración con carga real del archivo; **no valores hardcodeados**.
- Verificar con la persona reclutadora la fecha/hora límite concreta: el correo solicita confirmar recepción para coordinarla; no proporciona una fecha fija.

## 3. Stack acordado

### Adoptado

- **Next.js** con **App Router**.
- **React** + **TypeScript estricto**.
- **Tailwind CSS** para sistema visual.
- **shadcn/ui**, **opcional**, cuando acelere componentes accesibles y consistentes. No copiar el catálogo completo.
- **SheetJS (`xlsx` 0.20.3)** desde el tarball oficial `cdn.sheetjs.com` para interpretar el workbook en el navegador; el paquete npm público está desactualizado según la documentación oficial.
- **Zod** para validar estructuras de entrada en tiempo de ejecución.
- **Recharts** para visualizaciones sencillas.
- **Vitest** para pruebas de reglas puras; React Testing Library cuando aporte valor a componentes interactivos.
- **ESLint y Prettier** para estándares de código.
- **Git + GitHub + Vercel** para control de versiones y despliegue.

### Por decidir sólo cuando se implemente

- Representación monetaria ya resuelta: `DecimalAmount` como texto decimal y operaciones exactas con `BigInt`, sin convertir importes a `number`.
- Biblioteca de tabla (por ejemplo TanStack Table), **sólo** si ordenamiento/paginación justifican la dependencia.
- Biblioteca de fechas **sólo** si `Intl` y utilidades propias claramente delimitadas no bastan.
- Configurar `output: 'export'` **sólo si** se decide explícitamente hacer exportación estática y se comprueba la compatibilidad de toda la aplicación. Vercel puede desplegar Next.js sin esa configuración.

### Fuera de alcance de esta entrega

- Endpoints de API, Server Actions, base de datos, ORM, inicio de sesión, roles, Docker, colas, integración con IA en tiempo de ejecución, FX rates remotas, sincronización en nube, multitenancy.
- Internacionalización completa de todos los textos o conversión real de divisas. **Preparar las abstracciones** pero no desarrollar funcionalidades ficticias.
- Nuevas fuentes de datos, datasets inventados o integración con sistemas reales.

### Estado técnico al completar la fase de importación

- El adaptador `infrastructure/excel` lee únicamente la hoja `Datos` y conoce exclusivamente el esquema de columnas del Excel suministrado; SheetJS se carga dinámicamente cuando se importa un archivo.
- Zod valida las filas externas antes de crear modelos de dominio. Un resultado `failed` representa un error estructural; `partial` comunica errores por fila junto con las filas válidas restantes; `complete` no tiene filas rechazadas. Las discrepancias de margen son advertencias no bloqueantes.
- La importación rechaza archivos mayores de 10 MiB, limita la hoja a 10.000 filas y 64 columnas, y no envía archivos ni datos a servicios externos.
- La fecha se normaliza como `PlainDate`; sólo se aceptan seriales Excel y texto ISO `YYYY-MM-DD`. El serial ficticio 60 del sistema 1900 se rechaza.
- El código de moneda de las columnas terminadas en `_COP` se asigna explícitamente a COP en el adaptador. No se realizan conversiones de divisa.
- Los importes externos aceptan hasta 64 dígitos significativos y 18 decimales, representados como texto y procesados con `BigInt`.
- La pantalla de importación mantiene por separado el proceso activo y el último conjunto aceptado. Los resultados parciales sólo reemplazan ese conjunto tras confirmación explícita; un resultado fallido no lo modifica.
- `OperationsWorkspace` es el único dueño de `useOperationImport`; importa por props el panel y entrega el mismo conjunto aceptado al dashboard. Filtros, KPIs, gráfico y tabla se derivan del mismo selector de operaciones filtradas. El gráfico usa Recharts 3.x cargado dinámicamente, la tabla pagina localmente de 10 en 10 y el formateador monetario conserva decimales grandes sin convertirlos a `number`.
- Los datos de un conjunto parcial aceptado conservan sus errores y advertencias para que el estado incompleto no desaparezca cuando una importación posterior falle.

## 4. Datos de entrada verificados

**Workbook:** `Datos_Sinteticos_Prueba_Tecnica_Unatrans.xlsx`.

- Hojas: `Datos` (operaciones), `Diccionario` (descripción de campos), `Leer_primero` (advertencias).
- `Datos`: **160 filas de operaciones**, **16 columnas** + fila de encabezados.
- Datos **sintéticos**; no representan información real de la empresa.
- No se deben utilizar para decisiones reales de negocio.

### Columnas originales

| Columna | Tipo esperado / observaciones |
|---|---|
| `ID_Operacion` | Identificador único tipo string |
| `Fecha` | Fecha de calendario; en el archivo actual son seriales numéricos de Excel |
| `Zona` | Texto: seis zonas |
| `Ruta` | Texto |
| `Tipo_Servicio` | Texto |
| `Cliente_Anonimizado` | Texto ficticio |
| `Vehiculo_Codigo` | Texto ficticio |
| `Kilometros` | Distancia numérica |
| `Horas_Planeadas` | Horas numéricas |
| `Horas_Reales` | Horas numéricas |
| `Estado` | `Completado`, `Con novedad`, `Cancelado` |
| `Cumplimiento_SLA` | `Sí` / `No`; indicador **provisto por la fuente** |
| `Ingresos_COP` | Dinero, divisa **COP** definida por el esquema de origen |
| `Costos_COP` | Dinero, divisa **COP** |
| `Margen_COP` | Dinero, ingreso menos costo; validar consistencia |
| `Calificacion_Servicio_1a5` | Escala 1–5 |

### Valores de referencia comprobados (fixture de prueba)

| Validación | Resultado |
|---|---:|
| Total operaciones | 160 |
| Ingresos COP | 134.350.665 |
| Costos COP | 104.646.676 |
| Margen COP | 29.703.989 |
| SLA `Sí` | 89 |
| SLA `No` | 71 |
| SLA cumplido global | 55,625 % (mostrar 55,63 % si se redondea a 2 decimales) |
| Estado `Completado` | 108 |
| Estado `Con novedad` | 32 |
| Estado `Cancelado` | 20 |
| Operaciones con margen negativo | 27 |
| Zonas | 6 |

Zonas verificadas: Bogotá 30, Santander 30, Valle del Cauca 29, Eje Cafetero 28, Antioquia 25, Costa Caribe 18.

**Estos números son únicamente resultados esperados para pruebas contra el archivo suministrado, nunca valores de producción ni datos a inyectar en UI.**

### Reglas de interpretación del dataset

1. Mantener por defecto todas las operaciones, incluso canceladas, **sin excluirlas silenciosamente** de totales. Explicitar denominador y permitir filtrar estado.
2. SLA proviene de `Cumplimiento_SLA`. **No reemplazarlo** por `Horas_Reales <= Horas_Planeadas` sin una regla documentada del negocio.
3. Calcular el margen desde ingresos menos costos y comparar contra `Margen_COP`. Reportar discrepancias como advertencias de importación; evitar sustituir silenciosamente la fuente sin informar.
4. El Excel actualmente especifica **COP**, pero el dominio no debe fijar esa divisa globalmente.
5. Fechas pueden ser seriales de Excel; considerar sistema de fechas 1900/1904, particularidades del calendario Excel y fechas inexistentes.
6. Los valores negativos de margen son válidos y deben preservarse.

## 5. Arquitectura: dependencias hacia el dominio

**Capas conceptuales, sin crear carpetas vacías innecesarias:**

1. **Domain:** tipos y reglas puras (operación, dinero, indicadores, filtros).
2. **Application:** casos de uso (importar, filtrar, agregar), contratos de puertos/repositories.
3. **Infrastructure:** adaptadores y mappers de Excel; posible adaptador HTTP en el futuro.
4. **Presentation:** componentes, hooks de estado, UI y formatos visuales.
5. **Shared:** utilidades genéricas acotadas, validaciones comunes, formateadores internacionales.

### Flujo de datos esperado

```text
Archivo .xlsx cargado mediante input/file drop
  → verificar tipo, tamaño y estructura
  → parser XLSX en navegador (hoja Datos)
  → filas raw desconocidas (unknown)
  → mapper y validación Zod
  → entidades de dominio normalizadas
  → estado de aplicación con operaciones / errores
  → selectores puros: filtros y métricas
  → tarjetas, gráfico y tabla
```

**Principio inquebrantable:** ni los componentes ni los cálculos de negocio conocen las columnas `Ingresos_COP`, `Fecha`, etc. Sólo el adaptador conoce el esquema externo. No crear un backend ficticio ni endpoints para leer un archivo que ya está en el navegador.

### Estructura objetivo sugerida

```text
src/
  app/
    layout.tsx
    page.tsx
    GlobalStyles.css
  features/
    dashboard/
      components/         # KPI cards, chart, table, filters, state shells
      hooks/              # orquestación específica de la pantalla
    importOperations/
      components/         # ImportPanel, ImportFeedback, AcceptedDatasetSummary
      hooks/              # UseOperationImport
  domain/
    operations/
      Operation.ts        # modelo y enums/tipos semánticos
      Metrics.ts          # funciones puras
    money/
      Money.ts            # tipo y operaciones con divisa
  infrastructure/
    excel/
      ImportOperations.ts # API externa xlsx -> filas desconocidas -> dominio
test/
  domain/                 # pruebas de dominio
  infrastructure/         # pruebas de adaptadores
  features/               # pruebas de componentes/flujo
```

Convención: carpetas propias en camelCase, archivos propios de código en PascalCase y pruebas en la carpeta raíz `test/`, organizadas por capa/feature. Los nombres especiales exigidos por Next.js y las herramientas conservan su forma convencional. Adaptar la estructura a la realidad del código; **no introducir capas de abstracción por deporte**. El directorio `public/` sólo para assets públicos.

## 6. Next.js: estrategia de renderizado

- Usar **App Router** y dejar `layout.tsx` / `page.tsx` como Server Components si no necesitan interacción.
- Crear un límite `'use client'` **acotado** para la zona que utiliza `File`, `FileReader`, estado del dashboard y eventos.
- No importar librerías de Excel en el bundle inicial si se pueden cargar dinámicamente al seleccionar archivo.
- No usar APIs del navegador durante renderización del servidor o build.
- No crear Server Actions, API routes ni llamadas al servidor para el análisis del Excel de esta versión.
- Proteger el rendimiento con memoización de resultados costosos **cuando haya medición o derivaciones reales**, no envolviendo todo por reflejo.
- Considerar exportación estática como opción, no como obligación. Si se configura, ejecutar build de producción y verificar que no haya funciones incompatibles.

## 7. Contratos globales: fechas y dinero

### Fechas

- Distinguir **PlainDate** (`YYYY-MM-DD`, sin huso horario) de **Instant** (momento UTC ISO 8601 con zona/offset).
- El Excel actual representa **fechas de calendario**, no instantes globales: normalizar a `YYYY-MM-DD` **sin desplazamientos de zona**.
- Parser por formato **explícito**: ISO, tipo Date validado, serial Excel con configuración de workbook, y sólo formatos textuales soportados con `locale`/patrón conocidos.
- Rechazar fechas imposibles o ambiguas (por ejemplo `03/04/2026` sin contexto); no confiar en `Date.parse` universalmente ni inventar heurísticas silenciosas.
- Para presentar usar `Intl.DateTimeFormat` con locale configurable. Mantener parsing separado de formatting.
- Analizar edge cases: año bisiesto, fechas Excel, sistema 1904, vacíos, fechas fuera de rango, husos horarios.

### Dinero

- Un monto siempre pertenece a una divisa. **No mezclar cantidades monetarias de monedas distintas**.
- Modelo conceptual: `Money { amount: DecimalLike; currency: ISO4217Code }`; determinar representación definitiva en implementación y asegurar aritmética exacta, redondeos explícitos y serialización si se necesitara.
- La fuente actual asigna COP por el nombre de columna. Un adaptador futuro podrá especificar otras divisas.
- `Intl.NumberFormat(locale, { style: 'currency', currency })` para presentación; separar importe, divisa y locale.
- **Formatear una cifra en USD no es convertir COP a USD**. No ofrecer conversiones sin tasa de cambio, fecha y fuente explícitas.
- Validar valores numéricos, decimales, negativos, overflow y celdas vacías; no convertir un error en cero.
- Calcular indicadores monetarios sólo sobre registros compatibles; si hay divisas mixtas, agrupar por divisa o informar imposibilidad de agregar sin conversión.

### Categorías y estados

- Mapear las etiquetas originales a estados del dominio (`completed`, `incident`, `cancelled`, etc.) mediante adaptador explícito.
- La UI puede mostrar etiquetas españolas, pero **las reglas internas no deberían depender de textos localizados**.
- Tipos de servicio y zonas son datos de la fuente, no enums codificados para limitar cualquier operación futura.

## 8. Identidad visual acordada

La interfaz usa una paleta oscura de firma personal, aplicada mediante tokens CSS/Tailwind reutilizables:

| Uso | Color |
|---|---|
| Fondo principal | `#001b24` |
| Superficies y futura navegación | `#111822` |
| Acentos, títulos destacados y acciones principales | `#08fdd8` |
| Texto principal | `#ffffff` |
| Texto secundario | `#94a3b8` |

El rojo y el ámbar se reservan para errores y advertencias. La jerarquía debe seguir siendo legible y responsive en móvil, tableta y escritorio.

## 9. Producto mínimo que implementaremos

1. Estado inicial claro con acción **Cargar Excel**.
2. Importación real de la hoja `Datos`; error legible si falla.
3. **Cuatro KPIs preferidos:** número de operaciones, ingresos, margen y SLA cumplido; opcional mostrar costos como quinto si cabe sin perjudicar legibilidad. Se exige sólo tres.
4. **Un gráfico** de operaciones por zona (o selección razonada).
5. **Tabla** de registros con fecha legible, zona, servicio, estado, importes y acceso a más campos si conviene.
6. **Filtros por zona, servicio y/o estado**, al menos uno operativo.
7. **Una misma selección filtrada** alimenta KPIs, gráfico y tabla; contador de registros filtrados.
8. Manejo de cargando, vacío, error de lectura, error de validación y filtro sin resultados.
9. Responsive: móvil, tableta y escritorio; jerarquía visual clara, accesibilidad por teclado y mensajes de estado.
10. README suficiente para que un evaluador lo abra, lo ejecute y lo explique.

### No implementar ahora

- CSV u otros formatos, selector de idioma, conversor de divisas, históricos persistidos, descarga de reportes, login, drag and drop complejo, editor de registros, datos autogenerados, integración con API.
- Todo lo anterior puede añadirse a futuro mediante contratos, pero **no forma parte del MVP**.

## 10. Seguridad y robustez de importación

- Todo archivo es entrada **no confiable** aunque proceda del ejercicio.
- Establecer tamaño máximo razonable y configurable (p.ej. 10 MiB inicialmente, verificando la experiencia) y extensiones/formatos admitidos; parsear con control de errores.
- Validar **por contenido** además de nombre/extensión cuando sea viable; rechazar estructura inesperada.
- Mantener el archivo local al dispositivo: sin envío a terceros, logs con contenido, ni persistencia no consentida.
- No renderizar contenido de celdas como HTML; usar interpolación React con escaping normal. Evitar `dangerouslySetInnerHTML`.
- Nunca introducir secretos, tokens ni credenciales en el repositorio o bundle público.
- Las advertencias deben describir filas/columnas sin revelar información sensible futura.
- Si el parser alcanza límites de rendimiento con archivos grandes, medir antes de proponer Web Workers, streaming u otra optimización.

## 11. Calidad, comprobaciones y entregables

### Pruebas mínimas

- Importación de Excel real con 160 filas y encabezados esperados.
- Métricas generales iguales a la sección 4.
- 1–2 filtros que reduzcan datos y actualicen KPIs + gráfico + tabla.
- Fórmula de margen y compatibilidad de divisas.
- Fecha Excel normalizada, ISO válida, fecha inválida/ambigua rechazada.
- Archivo sin hoja `Datos`, sin columnas requeridas o corrupto.
- UI accesible con teclado; mensajes vacíos/errores visibles.

### Antes de entregar

1. `lint`, `typecheck`, pruebas y build de producción sin errores.
2. Comprobar que Vercel presenta URL accesible y que **el Excel se importa allí**, no sólo localmente.
3. Revisar responsive en al menos móvil y escritorio.
4. README con setup, comandos, diseño, trade-offs, limitaciones, licencia de uso de datos sintéticos y herramienta de IA utilizada.
5. Publicar GitHub + URL Vercel; ensayar presentación de 10 minutos.

## 12. Fases / orden de trabajo

| Fase | Objetivo | Definición de terminado |
|---|---|---|
| 0. Bootstrap | Next.js, TS, Tailwind, calidad | App inicia; lint/build funcionan |
| 1. Dominio | Operación, dinero, fechas, métricas | Contratos y tests de cálculo |
| 2. Importación | XLSX -> normalizado + validaciones | 160 filas reales interpretadas |
| 3. Dashboard | KPIs, gráfico, tabla, filtros | Interactividad coherente |
| 4. Calidad | Errores, responsive, tests | Casos clave comprobados |
| 5. Entrega | README, repositorio, Vercel | Evaluador puede entrar y probar |

**Límite de tiempo:** priorizar funcionalidad mínima dentro de 3 horas. Si una mejora amenaza la entrega, registrar como trabajo futuro, no saltarse validaciones esenciales.

## 13. Decisiones ya tomadas y pendientes

### Decididas

- Next.js + TypeScript (no Vite).
- shadcn/ui condicional; Tailwind CSS.
- Archivo leído y procesado en el navegador; **sin backend ni base de datos en MVP**.
- Arquitectura modular por funcionalidades + dominio aislado.
- Datos, moneda, fechas y estados normalizados antes de llegar a la UI.
- Datos sintéticos del Excel como fuente única.
- Entrega prevista GitHub + Vercel.

### Abiertas (resolver al implementar, sin sobreingeniería)

- Tabla simple o biblioteca dedicada.
- Si conviene usar `output: 'export'` en el deployment.
- Cómo presentar métricas cuando la persona aceptó un conjunto parcial; el conjunto conserva su marca de completitud para que la UI no lo confunda con uno íntegro.
- Opcional: cuadro de costos como KPI adicional si la UI lo justifica.

## 14. Recursos técnicos oficiales de referencia

- Next.js App Router: https://nextjs.org/docs/app
- Server & Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Exportación estática y restricciones: https://nextjs.org/docs/app/guides/static-exports
- shadcn/ui en Next.js: https://ui.shadcn.com/docs/installation/next
- SheetJS instalación: https://docs.sheetjs.com/docs/getting-started/installation/frameworks/
- Vercel + Git: https://vercel.com/docs/git
- Vercel plan Hobby: https://vercel.com/docs/plans/hobby

## 15. Instrucción inicial para el asistente que reciba este documento

> Lee **completamente** `PROJECT_CONTEXT.md` y `AGENTS.md` antes de generar código. Resume en pocas líneas el objetivo, las restricciones y las decisiones existentes. Propón el siguiente cambio pequeño y verificable; no crees backend, base de datos ni Docker. Trabaja en incrementos que compilen, ejecuta o indica qué verificaciones realizaste y no declares como implementado nada que todavía sea sólo una decisión arquitectónica. Los valores de referencia son exclusivamente tests, no datos hardcodeados de la UI.
