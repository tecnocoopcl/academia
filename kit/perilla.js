import { posicionDesdeValor, valorDesdePosicion } from './audio.js'

// <ac-perilla> — una perilla accesible.
//
//   <ac-perilla etiqueta="Pitch" min="55" max="1760" valor="220"
//               escala="log" unidad="Hz" for="osc" atributo="frecuencia">
//
// Se gira arrastrando hacia arriba/abajo o con el teclado (flechas, Re Pág /
// Av Pág, Inicio, Fin). Emite `input` en cada cambio (`event.target.valor`).
// Con `for` + `atributo` escribe ese atributo en el elemento con ese id, sin
// JavaScript del profe.

const GIRO = 270 // grados entre el mínimo y el máximo
const html = `
<style>
  :host { display: inline-flex; flex-direction: column; align-items: center; gap: .35rem;
    font-family: var(--esp-font, system-ui, sans-serif); color: var(--esp-text, #1a1c24);
    user-select: none; -webkit-user-select: none; touch-action: none; }
  .perilla { width: var(--ac-perilla-tamano, 84px); aspect-ratio: 1; border-radius: 50%;
    cursor: ns-resize; outline: none; }
  .perilla:focus-visible { box-shadow: var(--esp-focus-ring, 0 0 0 3px #4351e855); }
  svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .pista { stroke: var(--esp-border, #d9dce8); }
  .arco { stroke: var(--esp-accent, #4351e8); }
  .cuerpo { fill: var(--esp-bg-elevated, #fff); stroke: var(--esp-border-control, #7d8295); }
  .marca { stroke: var(--esp-text, #1a1c24); }
  .etiqueta { font-size: .85rem; font-weight: 600; }
  .valor { font-family: var(--esp-mono, monospace); font-size: .8rem; color: var(--esp-text-muted, #636779); }
</style>
<div class="perilla" role="slider" tabindex="0">
  <svg viewBox="-50 -50 100 100" aria-hidden="true">
    <path class="pista" fill="none" stroke-width="6" stroke-linecap="round"></path>
    <path class="arco" fill="none" stroke-width="6" stroke-linecap="round"></path>
    <circle class="cuerpo" r="30" stroke-width="1.5"></circle>
    <line class="marca" x1="0" y1="-12" x2="0" y2="-26" stroke-width="4" stroke-linecap="round"></line>
  </svg>
</div>
<span class="etiqueta" part="etiqueta"></span>
<span class="valor" part="valor"></span>`

function arco(desde, hasta, r = 42) {
  const pto = (a) => {
    const rad = ((a - 90) * Math.PI) / 180
    return `${(r * Math.cos(rad)).toFixed(2)} ${(r * Math.sin(rad)).toFixed(2)}`
  }
  const grande = hasta - desde > 180 ? 1 : 0
  return `M ${pto(desde)} A ${r} ${r} 0 ${grande} 1 ${pto(hasta)}`
}

function formatear(v) {
  const abs = Math.abs(v)
  return abs >= 100 ? Math.round(v).toString() : abs >= 10 ? v.toFixed(1) : v.toFixed(2)
}

export class AcPerilla extends HTMLElement {
  static observedAttributes = ['valor', 'min', 'max', 'etiqueta', 'unidad', 'escala']

  constructor() {
    super()
    this.attachShadow({ mode: 'open' }).innerHTML = html
    this._perilla = this.shadowRoot.querySelector('.perilla')
    this._perilla.addEventListener('pointerdown', (e) => this._agarrar(e))
    this._perilla.addEventListener('keydown', (e) => this._tecla(e))
    this._perilla.addEventListener('dblclick', () => this._fijar(this._inicial, true))
  }

  connectedCallback() {
    this._inicial ??= this.valor
    this._pintar()
    this._propagar()
  }

  attributeChangedCallback() {
    if (this.isConnected) this._pintar()
  }

  get min() { return Number(this.getAttribute('min') ?? 0) }
  get max() { return Number(this.getAttribute('max') ?? 1) }
  get escala() { return this.getAttribute('escala') === 'log' ? 'log' : 'lineal' }
  get valor() {
    const v = Number(this.getAttribute('valor'))
    return Number.isFinite(v) && this.hasAttribute('valor') ? v : this.min
  }
  set valor(v) { this._fijar(Number(v), false) }

  get _posicion() { return posicionDesdeValor(this.valor, this.min, this.max, this.escala) }

  _fijar(v, emitir = true) {
    // toPrecision evita valores como 440.0000000000001 en el atributo.
    const c = Number(Math.min(this.max, Math.max(this.min, v)).toPrecision(6))
    if (c === this.valor && this.hasAttribute('valor')) return
    this.setAttribute('valor', String(c))
    this._propagar()
    if (emitir) this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }

  _mover(dp) {
    this._fijar(valorDesdePosicion(this._posicion + dp, this.min, this.max, this.escala))
  }

  _propagar() {
    const id = this.getAttribute('for')
    const atributo = this.getAttribute('atributo')
    if (!id || !atributo) return
    const destino = this.getRootNode().getElementById?.(id) ?? document.getElementById(id)
    destino?.setAttribute(atributo, String(this.valor))
  }

  _agarrar(e) {
    e.preventDefault()
    this._perilla.focus()
    this._perilla.setPointerCapture(e.pointerId)
    let y = e.clientY
    const mover = (ev) => {
      // 200 px de arrastre recorren la perilla entera; con Mayús, ajuste fino.
      const dp = (y - ev.clientY) / (ev.shiftKey ? 1000 : 200)
      y = ev.clientY
      if (dp) this._mover(dp)
    }
    const soltar = () => {
      this._perilla.removeEventListener('pointermove', mover)
      this._perilla.removeEventListener('pointerup', soltar)
      this._perilla.removeEventListener('pointercancel', soltar)
    }
    this._perilla.addEventListener('pointermove', mover)
    this._perilla.addEventListener('pointerup', soltar)
    this._perilla.addEventListener('pointercancel', soltar)
  }

  _tecla(e) {
    const paso = e.shiftKey ? 0.002 : 0.01
    const acciones = {
      ArrowUp: () => this._mover(paso),
      ArrowRight: () => this._mover(paso),
      ArrowDown: () => this._mover(-paso),
      ArrowLeft: () => this._mover(-paso),
      PageUp: () => this._mover(0.1),
      PageDown: () => this._mover(-0.1),
      Home: () => this._fijar(this.min),
      End: () => this._fijar(this.max),
    }
    if (!acciones[e.key]) return
    e.preventDefault()
    acciones[e.key]()
  }

  _pintar() {
    const p = this._posicion
    const inicio = -GIRO / 2
    const angulo = inicio + p * GIRO
    const s = this.shadowRoot
    s.querySelector('.pista').setAttribute('d', arco(inicio, GIRO / 2))
    s.querySelector('.arco').setAttribute('d', p > 0.001 ? arco(inicio, angulo) : '')
    s.querySelector('.marca').setAttribute('transform', `rotate(${angulo})`)

    const unidad = this.getAttribute('unidad') ?? ''
    const etiqueta = this.getAttribute('etiqueta') ?? ''
    const texto = `${formatear(this.valor)}${unidad ? ` ${unidad}` : ''}`
    s.querySelector('.etiqueta').textContent = etiqueta
    s.querySelector('.valor').textContent = texto
    const el = this._perilla
    el.setAttribute('aria-label', etiqueta || 'Perilla')
    el.setAttribute('aria-valuemin', String(this.min))
    el.setAttribute('aria-valuemax', String(this.max))
    el.setAttribute('aria-valuenow', String(this.valor))
    el.setAttribute('aria-valuetext', texto)
  }
}
