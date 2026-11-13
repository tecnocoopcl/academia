// <ac-opciones> — elegir una opción entre pocas (botones de radio con estilo).
//
//   <ac-opciones etiqueta="Forma de onda" for="osc" atributo="forma"
//                opciones="sine:Senoidal, square:Cuadrada" valor="sine">
//
// Emite `change`; con `for` + `atributo` escribe la elección en ese elemento.

let siguiente = 0

export class AcOpciones extends HTMLElement {
  static observedAttributes = ['opciones', 'valor', 'etiqueta']

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this._nombre = `ac-opciones-${++siguiente}`
  }

  connectedCallback() {
    this._render()
    this._propagar()
  }

  attributeChangedCallback(nombre) {
    if (!this.isConnected) return
    // Cambiar solo `valor` no rehace el DOM: así no se pierde el foco al
    // moverse con las flechas entre opciones.
    if (nombre === 'valor' && this.shadowRoot.querySelector('input')) {
      for (const input of this.shadowRoot.querySelectorAll('input')) input.checked = input.value === this.valor
    } else this._render()
  }

  get opciones() {
    return (this.getAttribute('opciones') ?? '')
      .split(',')
      .map((par) => par.trim())
      .filter(Boolean)
      .map((par) => {
        const [valor, ...resto] = par.split(':')
        return { valor: valor.trim(), texto: (resto.join(':') || valor).trim() }
      })
  }

  get valor() {
    return this.getAttribute('valor') ?? this.opciones[0]?.valor ?? ''
  }

  set valor(v) {
    this.setAttribute('valor', v)
    this._propagar()
  }

  _propagar() {
    const id = this.getAttribute('for')
    const atributo = this.getAttribute('atributo')
    if (!id || !atributo) return
    const destino = this.getRootNode().getElementById?.(id) ?? document.getElementById(id)
    destino?.setAttribute(atributo, this.valor)
  }

  _render() {
    const actual = this.valor
    const etiqueta = this.getAttribute('etiqueta') ?? ''
    this.shadowRoot.innerHTML = `
<style>
  :host { display: inline-block; font-family: var(--esp-font, system-ui, sans-serif);
    color: var(--esp-text, #1a1c24); }
  fieldset { border: 0; margin: 0; padding: 0; }
  legend { font-size: .85rem; font-weight: 600; padding: 0 0 .35rem; }
  .grupo { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 2px;
    border-radius: var(--esp-radius-control, 8px); background: var(--esp-bg-sunken, #eceef5);
    border: 1px solid var(--esp-border-control, #7d8295); }
  label { position: relative; }
  input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
  span { display: block; padding: .35rem .75rem; border-radius: var(--esp-radius-sm, 6px);
    font-size: .9rem; cursor: pointer; }
  input:checked + span { background: var(--esp-accent, #4351e8); color: var(--esp-accent-text, #fff); }
  input:focus-visible + span { outline: 2px solid var(--esp-accent, #4351e8); outline-offset: 2px; }
</style>
<fieldset>
  ${etiqueta ? `<legend></legend>` : ''}
  <div class="grupo"></div>
</fieldset>`
    if (etiqueta) this.shadowRoot.querySelector('legend').textContent = etiqueta
    const grupo = this.shadowRoot.querySelector('.grupo')
    for (const { valor, texto } of this.opciones) {
      const label = document.createElement('label')
      const input = Object.assign(document.createElement('input'), {
        type: 'radio',
        name: this._nombre,
        value: valor,
        checked: valor === actual,
      })
      input.addEventListener('change', () => {
        this.setAttribute('valor', valor)
        this._propagar()
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      })
      const span = document.createElement('span')
      span.textContent = texto
      label.append(input, span)
      grupo.append(label)
    }
  }
}
