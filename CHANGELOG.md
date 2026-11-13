# Changelog

## 0.1.0 — 2026-11-13

- Portada, catálogo con filtros y ficha de curso.
- Especificación de `curso.json` y registro curado de cursos.
- Módulos: un curso puede listar sus módulos en `curso.json`; se ven en la ficha y el catálogo puede mostrarlos uno por uno.
- Cursos: Síntesis sustractiva en VCV Rack (la aplicación web de zinte con prólogo e introducción, y la guía en PDF) y fichas en preparación de Armonía básica, Programación tangible, Cultura técnica de la cooperativa y Espacio.
- Plantilla de curso.
- Iniciar sesión con WebID desde la barra superior (Solid OIDC, como música). Por ahora solo identifica; pedir clases con la sesión viene después.
- Módulos numerados en un acordeón en la ficha, incluidos el prólogo y la introducción.
- Síntesis: una página por sección, con barra de progreso (dónde estás en el curso; las pruebas en otro color), botón Siguiente y una prueba para pasar al capítulo 2.
- La ficha ya no ofrece descargar el PDF: los materiales los presenta cada curso (se quita `pdf` de `curso.json`).
