# academia

Los cursos de tecnocooperativa. No es un LMS: es el catálogo y el punto de
encuentro. Cada socio arma su curso como quiera —PDF, una página donde los
conceptos se tocan, un kit para la protoboard— y academia lo presenta. El
conocimiento es público y gratuito; las clases con el profe se piden aparte.
Las decisiones están en [ADR-001](docs/ADR-001-academia.md).

Publicado en https://academia.tecnocooperativa.cl

- `/` portada · `/catalogo` · `/catalogo/<id>` ficha de un curso
- `/kit/` componentes y estilos para cursos ([demo](kit/demo.html))
- `/cursos/<id>/` cursos alojados aquí mientras no tengan sitio propio

## Estructura

| Carpeta | Qué |
| --- | --- |
| `src/` | El sitio (Vite + React, JS plano) |
| `cursos/registro.json` | Lista curada de cursos (URL de cada `curso.json`) |
| `cursos/<id>/` | Manifiesto y, si se aloja aquí, el curso mismo |
| `kit/` | Web Components (`<ac-perilla>`, `<ac-oscilador>`, `<ac-osciloscopio>`, `<ac-opciones>`) y `academia.css`. Se sirven tal cual, sin compilar |
| `plantilla-curso/` | Punto de partida para un curso nuevo |
| `docs/` | [Especificación de `curso.json`](docs/ESPECIFICACION-curso.md), [guía de diseño](docs/GUIA-diseno.md), ADR |

`kit/tema.css` es una copia del tema de espacio (ADR-034); se actualiza
copiándolo desde la SDK.

## Sumar un curso

1. Arma el curso donde quieras (ver `plantilla-curso/`).
2. Publica su `curso.json`.
3. PR a `cursos/registro.json` con su URL.

## Desarrollo

```bash
npm install
npm run dev
```

Queda en http://localhost:5186.

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Pruebas con `node --test` |
| `npm run lint` | oxlint |
| `npm run build` | Compila en `dist/` (copia `kit/` y `cursos/` tal cual) |

## Despliegue

`.github/workflows/deploy.yml` publica `dist/` en GitHub Pages con cada push
a `main`; `public/CNAME` fija `academia.tecnocooperativa.cl`, que debe
apuntar por CNAME a GitHub Pages de la organización. `ci.yml` corre lint,
pruebas y build en cada PR.
