# ADR-001 — Academia: catálogo, no LMS

Fecha: 2026-11-13

## El problema

Varios socios quieren enseñar (síntesis, armonía, electrónica, cultura
técnica de la cooperativa, espacio), cada uno de una forma distinta: PDF,
páginas interactivas, kits físicos, video. Un LMS obligaría a todos a la
misma forma de curso.

## Decisión

1. **Academia es un catálogo y un punto de encuentro**, no la plataforma
   donde vive el curso. El material es público y gratuito; lo pagado es la
   clase con el profe.
2. **Cada curso publica su `curso.json`** (ver
   [ESPECIFICACION-curso.md](ESPECIFICACION-curso.md)), y la cooperativa
   cura el catálogo en `cursos/registro.json` por PR. Es el mismo espíritu que
   el descubrimiento por dominio de espacio (ADR-008): el curso se anuncia a sí
   mismo; la cooperativa solo decide qué lista.
3. **Kit opcional**: componentes como Web Components sin dependencias y CSS
   sobre la paleta de espacio (ADR-034). Web Components porque los cursos
   no comparten stack: sirven en HTML plano, Docusaurus o React.
4. Mientras un curso no tenga sitio propio, se aloja en `cursos/<id>/` de este
   repo. Mudarlo es cambiar una URL del registro.
5. **Dominio**: `academia.tecnocooperativa.cl`; cursos propios en
   subdominios de `tecnocooperativa.cl`.

## Fase 2: sesión y reserva de clases

- **Conectar con WebID**, con el mismo patrón que música
  (`@inrupt/solid-client-authn-browser`) y, dentro de espacio, la SDK
  (ADR-004).
- **Disponibilidad**: `classes.calendar` apunta a un calendario del pod del
  profe con lectura pública; cada `schema:Event` es un bloque libre (ADR-010).
- **Reserva**: el alumno elige un bloque; academia escribe el
  `schema:Event` en el pod del alumno y deja un `as:Invite` en el buzón del
  profe (ADR-019: el contenido vive en el pod de quien lo escribe; al buzón
  va un aviso verificable). El profe acepta o rechaza en Calendario de
  espacio, que responde `Accept`/`Reject` al buzón del alumno.
- El pago queda fuera por ahora: lo acuerdan alumno y profe
  (`classes.price`).
- Pendiente: confirmar que Calendario de espacio ya procesa `Invite`+`Event`
  entrantes; si no, se abre en espacio.

## Consecuencias

- Academia no puede garantizar que un curso siga en línea: si un manifiesto
  falla, el catálogo lo omite y lo avisa.
- No hay seguimiento de progreso del alumno. Si algún curso lo necesita, lo
  guardará en el pod del alumno, no academia.
