# Guía de diseño para cursos

Recomendaciones, no reglas. Cada curso decide cómo se ve y cómo se enseña;
esta guía existe para que, si quieres, tu curso se sienta parte de la casa
sin esfuerzo.

## La paleta

Academia usa la misma paleta que espacio (ADR-034): las variables
`--esp-*` de `kit/tema.css`, en claro y oscuro según el sistema. Si cargas
`kit/academia.css` la tienes. Si usas tu propio CSS, apóyate en esas
variables en vez de colores sueltos y tu curso seguirá al tema.

| Variable | Para |
| --- | --- |
| `--esp-bg`, `--esp-bg-elevated`, `--esp-bg-sunken` | fondo, tarjetas, zonas hundidas |
| `--esp-text`, `--esp-text-muted` | texto y texto secundario |
| `--esp-accent` / `--esp-accent-text` | enlaces, botones, la onda del osciloscopio |
| `--esp-border`, `--esp-border-control` | separar zonas / borde de campos |
| `--esp-ok`, `--esp-warn`, `--esp-danger` | estados |

## Piezas de lección (`kit/academia.css`)

- `.ac-pagina`: columna de lectura (~44rem).
- `.ac-cabecera` con `h1` y `.ac-bajada`.
- `.ac-nota`: comentario al margen.
- `.ac-ejercicio`: algo para que quien lee lo pruebe.
- `.ac-laboratorio` + `.ac-controles`: los controles de un concepto, juntos.
- `.ac-figura`, `.ac-boton`, `.ac-migas`.

## Componentes interactivos (`kit/academia-kit.js`)

`<ac-perilla>`, `<ac-oscilador>`, `<ac-osciloscopio>`, `<ac-opciones>`. Se
conectan sin JavaScript con `for="<id>"` + `atributo="…"`. Referencia y
ejemplos en [`/kit/demo.html`](../kit/demo.html).

Próximos, pensados para el curso de armonía: `<ac-teclado>` (teclado que
suena y marca notas), `<ac-pentagrama>` (escribir y leer notas),
`<ac-intervalo>` (entrenamiento de oído). Si tu curso necesita otro, propónlo:
un componente nuevo entra al kit cuando sirve a más de un curso.

## Principios

1. **Lo que se explica, se toca.** Si el texto habla de un parámetro, que haya
   un control para moverlo y una forma de ver u oír el efecto.
2. **Primero el sonido y la mano, después la fórmula.**
3. **Accesible**: todo control se usa con teclado, tiene nombre y valor
   legibles por lector de pantalla, y el contraste cumple AA. Los componentes
   del kit ya lo hacen.
4. **Sin sorpresas de audio**: nada suena sin un gesto de quien lee, y el
   volumen parte bajo.
5. **Abierto**: el material se lee sin cuenta ni pago. La cuenta (WebID)
   solo hace falta para pedir una clase.
