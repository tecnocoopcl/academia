# Guía de diseño para cursos

Recomendaciones, no reglas. Cada curso decide cómo se ve, cómo se enseña y
con qué herramientas; esta guía existe para que, si quieres, tu curso se
sienta parte de la casa.

## La paleta

Academia usa la misma paleta que espacio (ADR-034): las variables `--esp-*`
del tema de espacio, en claro y oscuro según el sistema. Si quieres que tu
curso combine, copia ese tema y apóyate en sus variables en vez de colores
sueltos.

| Variable | Para |
| --- | --- |
| `--esp-bg`, `--esp-bg-elevated`, `--esp-bg-sunken` | fondo, tarjetas, zonas hundidas |
| `--esp-text`, `--esp-text-muted` | texto y texto secundario |
| `--esp-accent` / `--esp-accent-text` | enlaces y botones |
| `--esp-border`, `--esp-border-control` | separar zonas / borde de campos |
| `--esp-ok`, `--esp-warn`, `--esp-danger` | estados |

## Principios

1. **Lo que se explica, se toca.** Si el texto habla de un parámetro, que haya
   una forma de moverlo y de ver u oír el efecto.
2. **Primero la experiencia, después la fórmula.**
3. **Accesible**: todo control se usa con teclado, tiene nombre y valor
   legibles por lector de pantalla, y el contraste cumple AA.
4. **Sin sorpresas de audio**: nada suena sin un gesto de quien lee, y el
   volumen parte bajo.
5. **Abierto**: el material se lee sin cuenta ni pago. La cuenta (WebID)
   solo hace falta para pedir una clase.
6. **Cuenta por qué existe tu curso.** El origen y la motivación del profe son
   parte de la narrativa.
