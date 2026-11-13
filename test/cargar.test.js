import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cargarCatalogo } from '../src/catalogo/cargar.js'

function fetchFalso(rutas) {
  return async (url) => {
    const cuerpo = rutas[url]
    if (cuerpo === undefined) return { ok: false, status: 404 }
    return { ok: true, status: 200, json: async () => cuerpo }
  }
}

const curso = (id, extra = {}) => ({ id, title: id, summary: 's', teacher: { name: 'n' }, formats: ['web'], url: './', ...extra })

test('carga el registro, omite lo roto y ordena disponibles primero', async () => {
  const R = 'https://a.cl/cursos/registro.json'
  const fetch = fetchFalso({
    [R]: { courses: ['uno/curso.json', 'roto/curso.json', 'invalido/curso.json', 'https://otro.cl/curso.json', 'dos/curso.json'] },
    'https://a.cl/cursos/uno/curso.json': curso('uno', { status: 'preparing' }),
    'https://a.cl/cursos/invalido/curso.json': { id: 'malo' },
    'https://otro.cl/curso.json': curso('externo'),
    'https://a.cl/cursos/dos/curso.json': curso('uno'),
  })
  const { cursos, avisos } = await cargarCatalogo(R, { fetch })
  assert.deepEqual(cursos.map((c) => c.id), ['externo', 'uno'])
  assert.equal(cursos[0].url, 'https://otro.cl/')
  assert.equal(avisos.length, 3)
  assert.ok(avisos.some((a) => a.includes('404')))
  assert.ok(avisos.some((a) => a.includes('repetido')))
})

test('si el registro no responde, falla con un mensaje claro', async () => {
  await assert.rejects(cargarCatalogo('https://a.cl/r.json', { fetch: fetchFalso({}) }), /registro/)
})
