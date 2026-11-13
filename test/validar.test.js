import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { validarCurso } from '../src/catalogo/validar.js'

const BASE = 'https://academia.tecnocooperativa.cl/cursos/x/curso.json'
const minimo = {
  id: 'x',
  title: 'Curso',
  summary: 'Resumen',
  teacher: { name: 'Ana' },
  formats: ['web'],
  url: './',
}

test('un manifiesto mínimo es válido y resuelve URLs relativas', () => {
  const r = validarCurso(minimo, BASE)
  assert.equal(r.ok, true)
  assert.equal(r.curso.status, 'available')
  assert.equal(r.curso.url, 'https://academia.tecnocooperativa.cl/cursos/x/')
  assert.deepEqual(r.curso.topics, [])
})

test('acepta URLs absolutas en otro dominio', () => {
  const r = validarCurso({ ...minimo, url: 'https://sintesis.tecnocooperativa.cl/' }, BASE)
  assert.equal(r.curso.url, 'https://sintesis.tecnocooperativa.cl/')
})

test('un curso en preparación no necesita url', () => {
  const { url: _, ...sinUrl } = minimo
  assert.equal(validarCurso(sinUrl, BASE).ok, false)
  assert.equal(validarCurso({ ...sinUrl, status: 'preparing' }, BASE).ok, true)
})

test('rechaza lo que falta o está mal', () => {
  const casos = [
    [null, /objeto/],
    [{ ...minimo, id: 'Con Espacios' }, /slug/],
    [{ ...minimo, title: ' ' }, /title/],
    [{ ...minimo, teacher: {} }, /teacher.name/],
    [{ ...minimo, formats: [] }, /formats/],
    [{ ...minimo, formats: ['holograma'] }, /holograma/],
    [{ ...minimo, status: 'borrador' }, /status/],
    [{ ...minimo, topics: [1] }, /topics/],
    [{ ...minimo, teacher: { name: 'Ana', contact: 'ana@correo' } }, /contact/],
  ]
  for (const [datos, error] of casos) {
    const r = validarCurso(datos, BASE)
    assert.equal(r.ok, false, JSON.stringify(datos))
    assert.match(r.errores.join(' '), error)
  }
})

test('todos los manifiestos del repo y la plantilla son válidos', () => {
  const registro = JSON.parse(readFileSync('cursos/registro.json', 'utf8'))
  const ids = new Set()
  for (const ruta of registro.courses) {
    const archivo = `cursos/${ruta}`
    assert.ok(existsSync(archivo), `${archivo} existe`)
    const r = validarCurso(JSON.parse(readFileSync(archivo, 'utf8')), `${BASE}/../${ruta}`)
    assert.equal(r.ok, true, `${archivo}: ${r.errores?.join('; ')}`)
    assert.ok(!ids.has(r.curso.id), `id repetido ${r.curso.id}`)
    ids.add(r.curso.id)
  }
  // Ningún manifiesto en cursos/ queda fuera del registro sin querer.
  const enDisco = readdirSync('cursos', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => `${d.name}/curso.json`)
  assert.deepEqual(enDisco.sort(), [...registro.courses].sort())
  assert.equal(validarCurso(JSON.parse(readFileSync('plantilla-curso/curso.json', 'utf8')), BASE).ok, true)
})
