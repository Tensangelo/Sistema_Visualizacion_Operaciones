# AGENTS.md — Reglas de ingeniería para agentes de IA

> **Aplicación:** Unatrans Operations Dashboard.  
> **Stack obligatorio:** Next.js App Router + React + TypeScript estricto + Tailwind CSS.  
> **Gestor de paquetes obligatorio:** pnpm (no usar npm, Yarn ni Bun).  
> **Documento de contexto obligatorio:** [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).  
> **Autoridad:** requisitos del usuario y prueba técnica > contexto/decisiones aprobadas > este archivo > sugerencias del agente.

## 0. Rol y modo de trabajo

Actúa como **ingeniero/a senior full-stack con criterio de arquitectura, experiencia en React/Next.js, UX, seguridad y pruebas**. Sé pragmático: entrega software funcional, sencillo, de alto rendimiento, extensible y explicable. **No confundas cantidad de código con calidad.**

### Uso de consola y terminal

- Por defecto, no ejecutes comandos de consola o terminal: indica el comando exacto y su propósito para que la persona usuaria lo ejecute.
- Si una acción o comprobación esencial requiere que el agente ejecute un comando, informa primero qué comando ejecutarías y por qué; prioriza siempre que lo ejecute la persona usuaria.

Al comenzar una tarea:

1. Lee `PROJECT_CONTEXT.md`, este archivo y la estructura real del repositorio.
2. Identifica el requerimiento, contratos afectados, límites y criterios de aceptación.
3. Busca implementaciones existentes y reutilízalas; **no crees código duplicado**.
4. Propón o ejecuta el **cambio mínimo coherente** según la instrucción del usuario.
5. Comprueba con tests, lint, typecheck y build cuando sea posible.
6. Resume cambios, evidencias verificadas, limitaciones y siguiente paso. **Nunca inventes ejecuciones de pruebas ni resultados.**

No agregues funcionalidades fuera del alcance sin autorización. Si hay ambigüedad material, identifica el supuesto que utilizaste. Mantén el MVP de la prueba como prioridad.

## 1. Principios arquitectónicos (obligatorios)

- **Separation of concerns:** UI presenta; hooks/controladores coordinan; casos de uso ejecutan; dominio calcula; infraestructura interpreta archivos.
- **Dependency rule:** dominio no importa React, Next.js, `xlsx`, componentes UI ni servicios externos.
- **DRY con criterio:** eliminar duplicación de comportamiento, no extraer componentes genéricos prematuramente por similitud superficial.
- **KISS y YAGNI:** no introducir repositorios, factories, servicios, clases, patrones o capas si no resuelven problemas reales.
- **Single responsibility:** módulos y componentes tienen un propósito claro; funciones cortas y nombres precisos.
- **Composición sobre herencia**; interfaces para contratos reales, no para cada función.
- **Inmutabilidad de datos:** no mutar arrays de operaciones al filtrar, ordenar o agregar.
- **Cambios localizados:** una nueva fuente no exige modificar dashboard; otro formato visual no modifica métricas; un nuevo idioma no modifica dominio.
- No modificar reglas de negocio por razones puramente visuales.

## 2. Convenciones Next.js y React

- **App Router**, con `src/app` para rutas, layout y composición; no situar lógica extensa en `page.tsx`.
- Usar Server Components por defecto donde aporten valor; establecer `'use client'` **solamente** en límites que requieran estado, eventos, hooks o browser APIs.
- El lector de Excel, la selección de archivos, el filtrado interactivo y el estado del dashboard viven en el **cliente**.
- No referenciar `window`, `document`, `File`, `localStorage` o APIs browser durante SSR o build.
- No enviar Excel a APIs externas. No introducir API routes, Server Actions ni backend en el MVP.
- Mantener los estados de datos cerca de su dueño; elevar sólo lo necesario. Evitar estado global como reflejo.
- **No duplicar estado derivado:** los KPIs, gráfico y tabla derivan del **mismo conjunto filtrado**, mediante selectores o funciones puras.
- Evitar `useEffect` para cálculos que pueden derivarse de props/state durante render. `useMemo` para cálculos relevantes cuando se justifique.
- Usar listas con claves semánticas estables (ID de operación), no índices salvo casos estáticos demostrables.
- No usar `any` ni casts forzados para acallar TypeScript; preferir `unknown`, narrowing y validación.
- No crear componentes gigantes: separar por propósito (FileUploader, KPIGrid, OperationsChart, OperationsTable, Filters, EmptyState, ErrorState).
- Propiedades tipadas; interfaces exportadas sólo si se comparten o actúan como contrato público.

## 3. Tipado, límites de confianza y validación

- TypeScript `strict: true`; mantener checks rigurosos de null/undefined.
- **La entrada del Excel siempre es `unknown`** hasta que Zod valide las filas mapeadas; nunca asumir que el parser entrega entidades válidas.
- Especificar tipos de dominio pequeños y semánticos (`Operation`, `Money`, `PlainDate`, `OperationStatus`).
- **No propagar nombres de columnas del Excel** a métricas, tarjetas ni componentes. Únicamente `infrastructure/excel` conoce su esquema.
- Los adaptadores son responsables de normalizar etiquetas de estado, fechas, números y divisa de origen.
- Validar encabezados, hoja requerida (`Datos`), nulos, identificadores, límites numéricos y datos inválidos.
- Evitar coerciones silenciosas: `Number('') === 0` no convierte una celda vacía en dinero válido.
- Informar al usuario errores de lectura y validación con contexto útil, sin exponer trazas crudas ni datos sensibles.
- Mantener un reporte claro de registros rechazados o advertencias. Rechazar archivos incorrectos cuando no sea seguro producir resultados.

## 4. Fechas internacionales

- No asumir que todos los usuarios usan `dd/MM/yyyy` ni que toda cadena es desambiguable.
- **PlainDate** (fecha de calendario sin zona) y **Instant** (timestamp con zona) son conceptos distintos.
- Normalizar la fecha de operación actual como `YYYY-MM-DD` sin cambiar de día por huso horario.
- Soportar seriales válidos de Excel, considerando modo 1900/1904 y sus peculiaridades; verificar la semántica de cada librería de conversión.
- Aceptar fechas textuales sólo mediante formatos explícitos; fechas ambiguas o imposibles producen error, no interpretaciones arbitrarias.
- Formatear para mostrar con `Intl.DateTimeFormat` y locale explícito.
- Tests de fechas bisiestas, 1900/1904, día imposible, valores vacíos y cambio de zona horaria.

## 5. Dinero internacional y exactitud

- Cada cantidad monetaria debe conservar **monto + código de moneda ISO 4217** (COP, USD, EUR, etc.).
- La fuente actual contiene `Ingresos_COP`/`Costos_COP`/`Margen_COP`; ese acoplamiento queda **sólo en el adaptador Excel**.
- No sumar ni comparar directamente importes con monedas diferentes; agrupar por divisa o exigir conversión explícita.
- No implementar conversión de moneda ni tasas de cambio no solicitadas.
- Elegir representación decimal exacta o de unidades menores adecuada; **nunca introducir errores financieros previsibles por float**.
- Documentar política de redondeo, validación y precisión. Respetar escalas de cada moneda al presentar.
- Formatear con `Intl.NumberFormat(locale, { style: 'currency', currency })`.
- `Margen = Ingresos - Costos`; contrastar con `Margen_COP` de origen y reportar inconsistencias; preservar márgenes negativos.
- No inventar que `USD` es sólo un formato de COP: **formatear no equivale a convertir**.

## 6. Reglas de negocio del dashboard

- Los KPIs, gráficos y tablas **no deben contener constantes de los resultados del Excel**: calcularlos desde los registros normalizados.
- Fuente única para filtros: `filteredOperations` y selectores puros de dominio.
- `totalOperations = filteredOperations.length`.
- `totalRevenue`, `totalCost`, `totalMargin`: agregaciones compatibles con divisa; manejar dataset vacío.
- `slaComplianceRate`: número con `Cumplimiento_SLA = Sí` dividido entre operaciones pertinentes; explicitar denominador y regla de estados.
- No excluir registros `Cancelado` por defecto; toda exclusión debe responder a un filtro o a una regla confirmada.
- No deducir SLA comparando horas si el origen ya proporciona un indicador de cumplimiento.
- No eliminar márgenes negativos, operaciones con novedad ni valores extremos válidos.
- Recalcular TODAS las vistas visibles ante carga/cambio de filtro sin desincronizaciones.
- Si el usuario carga un nuevo archivo, sustituir atómicamente el estado anterior o mantener el anterior con aviso claro si falla: nunca mezclar datasets accidentalmente.

## 7. Componentes, diseño y jerarquía visual

- Priorizar **claridad y legibilidad** sobre estética ornamental.
- Orden visual sugerido: encabezado + origen del dataset -> acción de cargar archivo -> KPIs -> gráfico -> filtros + tabla -> detalles/errores.
- Definir escala coherente de espaciado, tipografía, radii, superficies y estados visuales; usar tokens CSS/Tailwind, no colores arbitrarios replicados.
- **Jerarquía semántica:** un `<h1>` por página, encabezados en secuencia, etiquetas claras, indicadores con nombre, valor y unidad/divisa.
- Componentes desacoplados del dato concreto; recibir DTOs / props presentacionales, no hacer parsing dentro de ellos.
- Utilizar **shadcn/ui sólo cuando ahorre trabajo** (Button, Card, Select, Input, Table, Alert, Skeleton, etc.). Leer el código incorporado y evitar modificaciones repetitivas que obstaculicen upgrades.
- No crear abstracciones genéricas gigantes ni variantes de un mismo componente con estilos copiados.
- Accesibilidad: labels reales, navegación por teclado, `focus-visible`, estados `aria-*` pertinentes, contraste suficiente, feedback de errores mediante regiones de estado.
- Responsive real: no desbordar horizontalmente tarjetas/gráficos; permitir desplazamiento controlado de tablas en móvil; controles táctiles utilizables.
- Estados explícitos: inicial, cargando, cargado, vacío por filtro, inválido/error.
- Tablas: encabezados, cantidad visible, formato consistente, alineación numérica, unidades en columnas, claves estables.
- Gráfico: título comprensible, ejes/leyendas legibles, accesibilidad mediante tabla o resumen textual. No usar gráficos sólo por decoración.

## 8. Rendimiento y extensibilidad

- Importación de librería XLSX **bajo demanda** al seleccionar archivo si ayuda al bundle inicial.
- Evitar reparsear el workbook cada vez que cambia un filtro.
- Mantener funciones puras y selectores reutilizables para agregaciones.
- No realizar N agregaciones completas idénticas por componente; derivar datos una sola vez por cambio relevante.
- Paginar o virtualizar tablas cuando el volumen lo requiera; **no introducir complejidad para 160 registros si no hay síntomas**.
- Controlar errores de importación y memoria con límites de tamaño y formato configurables.
- Evitar efectos, listeners o recursos sin limpieza.
- Optimizar imágenes/assets si se incluyen; evitar librerías pesadas adicionales sin necesidad.
- Medir antes de optimizar y documentar los compromisos (peso JS, interacción, carga).
- Preparar posibles cambios de almacenamiento mediante un **puerto de acceso a datos solamente cuando aparezca un segundo proveedor real**; no implementar repositorios ficticios.

## 9. Seguridad (no negociable)

- Tratar cada archivo y celda como datos no confiables, aunque la muestra sea sintética.
- Limitar tamaño de archivos, extensiones permitidas y tipos esperados; atrapar excepciones del parser.
- No hacer `eval`, `new Function`, ni procesar fórmulas de celdas como JavaScript.
- No usar `dangerouslySetInnerHTML` con datos del Excel. React debe escapar el contenido.
- No enviar archivos ni datos a servicios externos, telemetría, logs remotos o APIs sin autorización.
- No guardar el contenido del Excel en `localStorage`, cookies o servidores en esta versión.
- No introducir secretos en cliente, `.env` público, historial git, capturas o README. Si en el futuro hay secretos, permanecerán del lado del servidor.
- No confiar en extensión/MIME declarados únicamente; validar posibilidad real de abrir el archivo y estructura esperada.
- Proteger contra cargas grandes y datos corruptos; errores visibles, sin fallos silenciosos.
- Revisar dependencias y alertas de seguridad, especialmente los paquetes de parsing de Excel; usar fuente/versiones oficiales.
- Cumplir políticas de mínimo privilegio si se añaden servicios más adelante.

## 10. Pruebas y definición de terminado

El mínimo aceptable por cambio:

1. Cumple el requisito y sus criterios de aceptación.
2. TypeScript sin errores, sin `any` injustificado ni warnings ignorados.
3. Sin duplicación de lógica ni lógica de negocio dentro de presentación.
4. Tests actualizados para reglas importantes y regresiones conocidas.
5. UX de error/vacío revisada cuando aplica.
6. `lint`, `typecheck`, pruebas y `build` ejecutados si el entorno lo permite.
7. No introducir credenciales, datos de prueba hardcodeados en producción ni APIs externas.
8. Cambios documentados si modifican contrato, decisión o limitación.

### Tests de referencia del Excel original

- 160 operaciones; ingresos **134350665 COP**; costos **104646676 COP**; margen **29703989 COP**; SLA **89/160**.
- 27 márgenes negativos conservados.
- 30 operaciones para filtro `Zona = Bogotá`.
- Archivo sin hoja `Datos` y campos ausentes deben producir error manejado.
- Filtros modifican KPIs, gráfico y tabla de forma coherente.
- Montos en diferentes monedas no se mezclan.
- Parsing de fechas cubre formatos válidos explícitos e invalidez/ambigüedad.

Usar estos datos **sólo en pruebas**. La UI debe calcularlos en tiempo real después de importar el archivo.

## 11. Estándares de código y mantenimiento

- Nombres claros en inglés para código (`Operation`, `calculateRevenue`, `parseExcelDate`), texto de interfaz inicialmente en español.
- Nombrar carpetas propias en `camelCase` (por ejemplo, `importOperations`) y archivos propios de código en `PascalCase` (por ejemplo, `ImportPanel.tsx`, `UseOperationImport.ts`). Evitar repetir el nombre de la feature en archivos que ya viven dentro de ella.
- Mantener las pruebas fuera de `src/`, bajo una carpeta raíz `test/`, organizadas por feature/capa y con nombres PascalCase más el sufijo `.test` (por ejemplo, `test/features/importOperations/ImportPanel.test.tsx`).
- Respetar los nombres de archivo obligatorios de Next.js y herramientas (`page.tsx`, `layout.tsx`, `next.config.ts`, etc.), así como documentos y artefactos de paquete (`README.md`, `AGENTS.md`, `pnpm-lock.yaml`).
- Preferir imports absolutos configurados con `@/`; evitar rutas relativas profundas.
- Mantener convenciones del repositorio: archivos y componentes con nombres coherentes.
- Evitar funciones con demasiados parámetros; preferir objetos de opciones tipados cuando sea útil.
- Evitar boolean flags ambiguos como `process(data, true, false)`.
- Errores mediante resultados tipados o excepciones controladas en fronteras; **no usar `catch {}` vacío**.
- Evitar logs de depuración y comentarios redundantes en el código final.
- Comentarios para _por qué_ de decisiones no obvias, no para repetir _qué_ hace el código.
- Sin librerías por moda. Justificar dependencias con funcionalidad, tamaño y mantenimiento.
- Usar **pnpm exclusivamente** para instalar dependencias y ejecutar scripts (`pnpm install`, `pnpm lint`, `pnpm test`, etc.); conservar `pnpm-lock.yaml` como único lockfile y no generar lockfiles de otros gestores.
- No editar masivamente archivos no relacionados con una tarea.
- No cambiar el stack acordado sin consentimiento explícito.

## 12. Manejo de documentación y cambios

- `PROJECT_CONTEXT.md` = fuente de decisiones y alcance (actualizar cuando se apruebe un cambio).
- `AGENTS.md` = reglas permanentes para IA y colaboradores (actualizar sólo con decisión explícita o mejora relevante).
- `README.md` = manual público de instalación, uso, pruebas y despliegue.
- Si una nueva decisión contradice los documentos, solicitar o registrar la nueva decisión y **actualizar los archivos en el mismo cambio**.
- Informar siempre qué es **implementado**, **propuesto**, **diferido** y **no probado**.
- Si tienes acceso a herramientas de ejecución, corre comandos y presenta resultados; si no, da los comandos exactos y sé transparente.

## 13. Prohibiciones explícitas para este ejercicio

- No construir backend, base de datos, Docker, autenticación, microservicios ni integraciones remotas sin petición explícita posterior.
- No sustituir lectura real de Excel por datos constantes, mocks permanentes o fixtures mostradas como producción.
- No interpretar toda fecha con `new Date(text)` sin validar semántica.
- No asumir COP como moneda de todo registro futuro ni convertir divisas con valores inventados.
- No introducir lógica de cálculo en JSX, ni duplicarla entre tarjetas y gráficos.
- No acallar warnings de lint/TypeScript con comentarios masivos, `ts-ignore` o desactivando reglas en bloque.
- No generar archivos vacíos para representar patrones arquitectónicos abstractos.
- No declarar que algo está probado, desplegado, seguro o accesible sin evidencia real.
- No comprometer la entrega de 3 horas por implementar funcionalidades que pertenecen al roadmap futuro.

## 14. Plantilla de respuesta del agente para cada incremento

Usar un informe breve con estas secciones cuando se modifique código:

```text
Objetivo: <qué requisito resolvemos>
Cambios: <archivos/componentes y decisiones relevantes>
Validación: <comandos ejecutados y resultados; o no ejecutados con motivo>
Riesgos/limitaciones: <aspectos pendientes relevantes>
Siguiente paso: <incremento pequeño recomendado>
```
