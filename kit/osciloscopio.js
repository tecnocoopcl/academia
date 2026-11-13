import { FORMAS, muestra } from './audio.js'

// <ac-osciloscopio> — dibuja la onda de un <ac-oscilador>.
//
//   <ac-osciloscopio for="osc" ventana="20"></ac-osciloscopio>
//
// Dibuja la onda ideal en una ventana fija de tiempo (`ventana`, en ms), así
// lo que se ve es exactamente lo que dice la teoría: al doble de frecuencia
// caben el doble de ciclos. No necesita que el sonido esté andando. Se
// actualiza solo cuando cambian los atributos del oscilador.

const html = `
<style>
  :host { display: block; font-family: var(--esp-font, system-ui, sans-serif);
    color: var(--esp-text-muted, #636779); }
  .pantalla { position: relative; border-radius: var(--esp-radius, 10px); overflow: hidden;
    background: var(--esp-bg-sunken, #eceef5); border: 1px solid var(--esp-border, #d9dce8); }
  canvas { display: block; width: 100%; height: var(--ac-osciloscopio-alto, 180px); }
  .pie { display: flex; justify-content: space-between; font-size: .8rem; padding-top: .35rem;
    font-family: var(--esp-mono, monospace); }
</style>
<div class="pantalla"><canvas role="img"></canvas></div>
<div class="pie"><span>0 ms</span><span class="ciclos"></span><span class="fin"></span></div>`

export class AcOsciloscopio extends HTMLElement {
  static observedAttributes = ['for', 'ventana', 'frecuencia', 'forma']

  constructor() {
    super()
    this.attachShadow({ mode: 'open' }).innerHTML = html
    this._canvas = this.shadowRoot.querySelector('canvas')
    this._pedido = 0
  }

  connectedCallback() {
    this._redimensionar = new ResizeObserver(() => this._dibujar())
    this._redimensionar.observe(this._canvas)
    // El tema puede cambiar (sistema o espacio): se vuelve a pintar.
    this._tema = matchMedia('(prefers-color-scheme: dark)')
    this._tema.addEventListener('change', this._pedirDibujo)
    this._conectar()
  }

  disconnectedCallback() {
    this._redimensionar?.disconnect()
    this._observador?.disconnect()
    this._tema?.removeEventListener('change', this._pedirDibujo)
  }

  attributeChangedCallback(nombre) {
    if (!this.isConnected) return
    if (nombre === 'for') this._conectar()
    this._pedirDibujo()
  }

  _pedirDibujo = () => {
    cancelAnimationFrame(this._pedido)
    this._pedido = requestAnimationFrame(() => this._dibujar())
  }

  // Fuente de los datos: el oscilador indicado en `for`, o los propios
  // atributos `frecuencia` y `forma` si se usa suelto.
  _fuente() {
    const id = this.getAttribute('for')
    return (id && (this.getRootNode().getElementById?.(id) ?? document.getElementById(id))) || this
  }

  _conectar() {
    this._observador?.disconnect()
    const fuente = this._fuente()
    if (fuente !== this) {
      this._observador = new MutationObserver(this._pedirDibujo)
      this._observador.observe(fuente, { attributes: true, attributeFilter: ['frecuencia', 'forma'] })
    }
    this._pedirDibujo()
  }

  _dibujar() {
    const c = this._canvas
    const dpr = window.devicePixelRatio || 1
    const ancho = c.clientWidth
    const alto = c.clientHeight
    if (!ancho || !alto) return
    c.width = Math.round(ancho * dpr)
    c.height = Math.round(alto * dpr)
    const g = c.getContext('2d')
    g.setTransform(dpr, 0, 0, dpr, 0, 0)

    const fuente = this._fuente()
    const hz = Math.max(1, Number(fuente.getAttribute('frecuencia') ?? 220) || 220)
    const formaAttr = fuente.getAttribute('forma')
    const forma = formaAttr in FORMAS ? formaAttr : 'sine'
    const ventana = Math.max(1, Number(this.getAttribute('ventana') ?? 20))
    const ciclos = (hz * ventana) / 1000

    const estilo = getComputedStyle(this)
    const color = (v, def) => estilo.getPropertyValue(v).trim() || def
    const medio = alto / 2
    const amp = alto * 0.38

    g.clearRect(0, 0, ancho, alto)
    g.strokeStyle = color('--esp-border', '#d9dce8')
    g.lineWidth = 1
    g.beginPath()
    for (let i = 1; i < 10; i++) {
      const x = Math.round((ancho * i) / 10) + 0.5
      g.moveTo(x, 0)
      g.lineTo(x, alto)
    }
    g.moveTo(0, Math.round(medio) + 0.5)
    g.lineTo(ancho, Math.round(medio) + 0.5)
    g.stroke()

    g.strokeStyle = color('--esp-accent', '#4351e8')
    g.lineWidth = 2.5
    g.lineJoin = 'round'
    g.beginPath()
    // Cuántos puntos: suficientes para que una cuadrada de muchos ciclos siga
    // viéndose cuadrada.
    const puntos = Math.max(ancho * 2, Math.ceil(ciclos * 64))
    for (let i = 0; i <= puntos; i++) {
      const x = (i / puntos) * ancho
      const y = medio - muestra(forma, (i / puntos) * ciclos) * amp
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()

    const ciclosTexto = ciclos >= 10 ? Math.round(ciclos) : ciclos.toFixed(1)
    this.shadowRoot.querySelector('.ciclos').textContent = `${ciclosTexto} ciclos`
    this.shadowRoot.querySelector('.fin').textContent = `${ventana} ms`
    c.setAttribute('aria-label', `Onda ${FORMAS[forma].toLowerCase()} de ${Math.round(hz)} Hz: ${ciclosTexto} ciclos en ${ventana} ms`)
  }
}
