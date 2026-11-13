// Kit de academia: componentes interactivos para cursos de tecnocooperativa.
// Web Components sin dependencias: sirven en HTML plano, Docusaurus, React…
//
//   <link rel="stylesheet" href="https://academia.tecnocooperativa.cl/kit/academia.css">
//   <script type="module" src="https://academia.tecnocooperativa.cl/kit/academia-kit.js"></script>
//
// Documentación y ejemplos: /kit/demo.html y docs/GUIA-diseno.md.

import { AcOpciones } from './opciones.js'
import { AcOscilador } from './oscilador.js'
import { AcOsciloscopio } from './osciloscopio.js'
import { AcPerilla } from './perilla.js'

const componentes = {
  'ac-perilla': AcPerilla,
  'ac-oscilador': AcOscilador,
  'ac-osciloscopio': AcOsciloscopio,
  'ac-opciones': AcOpciones,
}

for (const [nombre, clase] of Object.entries(componentes)) {
  if (!customElements.get(nombre)) customElements.define(nombre, clase)
}

export { AcOpciones, AcOscilador, AcOsciloscopio, AcPerilla }
export * from './audio.js'
