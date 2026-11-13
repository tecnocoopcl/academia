import { validarCurso } from './validar.js'

// Lee el registro (la lista curada de manifiestos) y cada `curso.json`.
// Un curso que no responde o no valida no tumba el catálogo: queda en
// `avisos` y el resto se muestra igual. `fetch` se inyecta para las pruebas.
export async function cargarCatalogo(registroUrl, { fetch = globalThis.fetch } = {}) {
  const res = await fetch(registroUrl)
  if (!res.ok) throw new Error(`No se pudo leer el registro (${res.status})`)
  const registro = await res.json()
  const entradas = Array.isArray(registro?.courses) ? registro.courses : []
  const base = new URL(registroUrl, globalThis.location?.href).href

  const resultados = await Promise.allSettled(
    entradas.map(async (entrada) => {
      const url = new URL(entrada, base).href
      const r = await fetch(url)
      if (!r.ok) throw new Error(`${url}: ${r.status}`)
      const v = validarCurso(await r.json(), url)
      if (!v.ok) throw new Error(`${url}: ${v.errores.join('; ')}`)
      return v.curso
    }),
  )

  const cursos = []
  const avisos = []
  const vistos = new Set()
  for (const r of resultados) {
    if (r.status === 'rejected') avisos.push(r.reason?.message ?? String(r.reason))
    else if (vistos.has(r.value.id)) avisos.push(`id repetido: ${r.value.id}`)
    else {
      vistos.add(r.value.id)
      cursos.push(r.value)
    }
  }
  // Primero lo disponible; dentro de cada grupo, el orden del registro.
  cursos.sort((a, b) => (a.status === b.status ? 0 : a.status === 'available' ? -1 : 1))
  return { cursos, avisos }
}
