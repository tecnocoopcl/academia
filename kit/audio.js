// Utilidades puras del kit (sin DOM ni Web Audio): conversión entre Hz y
// notas, formas de onda y escalas de perilla. Se prueban con `node --test`.

const NOMBRES = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si']
const INGLES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

export const LA4 = 440

/** Número MIDI (69 = La4) a frecuencia en Hz, con afinación La4 = 440 Hz. */
export function midiAHz(midi, la = LA4) {
  return la * 2 ** ((midi - 69) / 12)
}

/** Frecuencia a número MIDI fraccional. */
export function hzAMidi(hz, la = LA4) {
  return 69 + 12 * Math.log2(hz / la)
}

/**
 * La nota más cercana a una frecuencia y cuánto se aleja, en cents.
 * Octava en notación científica (La4 = 440 Hz, Do4 = do central).
 */
export function nota(hz, la = LA4) {
  const exacto = hzAMidi(hz, la)
  const midi = Math.round(exacto)
  const i = ((midi % 12) + 12) % 12
  return {
    midi,
    nombre: NOMBRES[i],
    ingles: INGLES[i],
    octava: Math.floor(midi / 12) - 1,
    cents: Math.round((exacto - midi) * 100),
  }
}

/** "La4 · +3 cents" — para mostrar junto a los Hz. */
export function describirNota(hz) {
  const n = nota(hz)
  const cents = n.cents === 0 ? '' : ` ${n.cents > 0 ? '+' : '−'}${Math.abs(n.cents)} cents`
  return `${n.nombre}${n.octava}${cents}`
}

export const FORMAS = {
  sine: 'Senoidal',
  square: 'Cuadrada',
  sawtooth: 'Sierra',
  triangle: 'Triangular',
}

/** Valor de una forma de onda ideal en la fase `f` (0–1), entre −1 y 1. */
export function muestra(forma, f) {
  const fase = f - Math.floor(f)
  switch (forma) {
    case 'square':
      return fase < 0.5 ? 1 : -1
    case 'sawtooth':
      return 2 * fase - 1
    case 'triangle':
      return fase < 0.25 ? 4 * fase : fase < 0.75 ? 2 - 4 * fase : 4 * fase - 4
    default:
      return Math.sin(2 * Math.PI * fase)
  }
}

/**
 * Perillas: la posición va de 0 a 1 y el valor de `min` a `max`. En escala
 * `log` cada tramo igual de giro multiplica el valor por lo mismo, que es como
 * oímos la altura (una octava = el doble de Hz).
 */
export function valorDesdePosicion(p, min, max, escala = 'lineal') {
  const q = Math.min(1, Math.max(0, p))
  if (escala === 'log' && min > 0) return min * (max / min) ** q
  return min + (max - min) * q
}

export function posicionDesdeValor(v, min, max, escala = 'lineal') {
  if (max === min) return 0
  const c = Math.min(max, Math.max(min, v))
  if (escala === 'log' && min > 0) return Math.log(c / min) / Math.log(max / min)
  return (c - min) / (max - min)
}
