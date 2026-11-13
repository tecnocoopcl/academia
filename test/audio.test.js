import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describirNota, hzAMidi, midiAHz, muestra, nota, posicionDesdeValor, valorDesdePosicion } from '../kit/audio.js'

const cerca = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`)

test('notas y frecuencias', () => {
  cerca(midiAHz(69), 440)
  cerca(midiAHz(57), 220)
  cerca(midiAHz(60), 261.6255653005986)
  cerca(hzAMidi(880), 81)
  assert.deepEqual(nota(440), { midi: 69, nombre: 'La', ingles: 'A', octava: 4, cents: 0 })
  assert.equal(nota(261.63).nombre, 'Do')
  assert.equal(nota(261.63).octava, 4)
  assert.equal(nota(445).cents, 20)
  assert.equal(describirNota(220), 'La3')
  assert.equal(describirNota(445), 'La4 +20 cents')
  assert.equal(describirNota(435), 'La4 −20 cents')
})

test('formas de onda ideales', () => {
  cerca(muestra('sine', 0.25), 1)
  assert.equal(muestra('square', 0.1), 1)
  assert.equal(muestra('square', 0.6), -1)
  cerca(muestra('sawtooth', 0.75), 0.5)
  cerca(muestra('triangle', 0.25), 1)
  cerca(muestra('triangle', 0.75), -1)
  cerca(muestra('triangle', 1.25), 1) // periódica
})

test('escala logarítmica: mitad de giro = media geométrica', () => {
  cerca(valorDesdePosicion(0.5, 55, 1760, 'log'), Math.sqrt(55 * 1760))
  cerca(valorDesdePosicion(0.2, 55, 1760, 'log'), 110) // 1 de 5 octavas
  cerca(posicionDesdeValor(220, 55, 1760, 'log'), 0.4)
  cerca(valorDesdePosicion(0.5, 0, 1), 0.5)
  assert.equal(valorDesdePosicion(2, 0, 1), 1)
  assert.equal(posicionDesdeValor(-3, 0, 1), 0)
})
