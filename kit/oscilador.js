import { FORMAS, describirNota } from './audio.js'

// <ac-oscilador> — un oscilador que se puede oír.
//
//   <ac-oscilador id="osc" frecuencia="220" forma="sine" volumen="0.2">
//
// Los navegadores solo dejan sonar audio después de un gesto, así que trae su
// propio botón Tocar/Detener. Cambiar `frecuencia`, `forma` o `volumen` (a
// mano o desde una <ac-perilla for="osc">) se oye en el acto, con una rampa
// corta para que no haga clic.

const html = `
<style>
  :host { display: inline-flex; align-items: center; gap: .75rem; flex-wrap: wrap;
    font-family: var(--esp-font, system-ui, sans-serif); color: var(--esp-text, #1a1c24); }
  button { font: inherit; font-weight: 600; min-height: 2.25rem; padding: 0 1rem; cursor: pointer;
    border-radius: var(--esp-radius-control, 8px); border: 1px solid var(--esp-accent, #4351e8);
    background: var(--esp-accent, #4351e8); color: var(--esp-accent-text, #fff); }
  button[aria-pressed="true"] { background: transparent; color: var(--esp-accent, #4351e8); }
  button:focus-visible { outline: 2px solid var(--esp-accent, #4351e8); outline-offset: 2px; }
  .lectura { font-family: var(--esp-mono, monospace); font-size: .9rem; }
  .nota { color: var(--esp-text-muted, #636779); }
</style>
<button type="button" aria-pressed="false" part="boton">▶ Tocar</button>
<span class="lectura" aria-live="polite"><span class="hz"></span> <span class="nota"></span></span>`

let contexto = null
function audio() {
  contexto ??= new AudioContext()
  return contexto
}

export class AcOscilador extends HTMLElement {
  static observedAttributes = ['frecuencia', 'forma', 'volumen']

  constructor() {
    super()
    this.attachShadow({ mode: 'open' }).innerHTML = html
    this._boton = this.shadowRoot.querySelector('button')
    this._boton.addEventListener('click', () => (this.sonando ? this.detener() : this.tocar()))
  }

  get frecuencia() { return Math.max(1, Number(this.getAttribute('frecuencia') ?? 220) || 220) }
  get forma() { const f = this.getAttribute('forma'); return f in FORMAS ? f : 'sine' }
  get volumen() { return Math.min(1, Math.max(0, Number(this.getAttribute('volumen') ?? 0.2))) }
  get sonando() { return Boolean(this._osc) }

  connectedCallback() { this._leer() }
  disconnectedCallback() { this.detener() }

  attributeChangedCallback() {
    this._leer()
    if (!this._osc) return
    const t = audio().currentTime
    this._osc.type = this.forma
    this._osc.frequency.setTargetAtTime(this.frecuencia, t, 0.01)
    this._vol.gain.setTargetAtTime(this._ganancia(), t, 0.01)
  }

  // La cuadrada y la sierra suenan bastante más fuerte que la senoidal con la
  // misma amplitud; se compensa para que comparar formas no asuste a nadie.
  _ganancia() {
    const factor = { sine: 1, triangle: 0.9, square: 0.45, sawtooth: 0.55 }[this.forma]
    return this.volumen * factor
  }

  async tocar() {
    const ctx = audio()
    await ctx.resume()
    this._osc = new OscillatorNode(ctx, { type: this.forma, frequency: this.frecuencia })
    this._vol = new GainNode(ctx, { gain: 0 })
    this._osc.connect(this._vol).connect(ctx.destination)
    this._osc.start()
    this._vol.gain.setTargetAtTime(this._ganancia(), ctx.currentTime, 0.015)
    this._boton.textContent = '■ Detener'
    this._boton.setAttribute('aria-pressed', 'true')
  }

  detener() {
    if (!this._osc) return
    const ctx = audio()
    const { _osc: osc, _vol: vol } = this
    vol.gain.setTargetAtTime(0, ctx.currentTime, 0.015)
    osc.stop(ctx.currentTime + 0.1)
    osc.onended = () => vol.disconnect()
    this._osc = this._vol = null
    this._boton.textContent = '▶ Tocar'
    this._boton.setAttribute('aria-pressed', 'false')
  }

  _leer() {
    const hz = this.frecuencia
    this.shadowRoot.querySelector('.hz').textContent = `${hz >= 100 ? Math.round(hz) : hz.toFixed(1)} Hz`
    this.shadowRoot.querySelector('.nota').textContent = `· ${describirNota(hz)}`
  }
}
