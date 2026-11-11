# Sistema de visualización de operaciones

Dashboard de operaciones de transporte de Unatrans. Incluye Next.js App Router, TypeScript estricto, Tailwind CSS, métricas puras y una experiencia accesible para importar XLSX localmente.

## Requisitos

- Node.js 22.12 o posterior y pnpm (único gestor de paquetes admitido para este proyecto)

## Desarrollo

```bash
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Verificaciones

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit
```

La importación usa `importOperationsFile` en `src/infrastructure/excel/ImportOperations.ts` y acepta `.xlsx` de hasta 10 MiB. Las pruebas viven en la carpeta raíz `test/`, organizadas por capa y feature. El workspace conserva una sola instancia del flujo de importación; el dashboard muestra métricas derivadas del conjunto aceptado, filtros combinables, gráfico de operaciones por zona y tabla paginada. Las monedas se presentan separadas y los importes mantienen precisión decimal. Los resultados parciales requieren aceptación explícita; su estado incompleto, errores y advertencias permanecen visibles. Un fallo al sustituir un archivo conserva el conjunto anterior. No hay backend, base de datos ni envío de archivos a servicios externos. Usa pnpm exclusivamente; no mezcles gestores ni generes otros lockfiles.
