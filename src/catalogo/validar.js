// Validación del manifiesto de un curso (`curso.json`). Puro: sin red ni DOM,
// para probarlo con `node --test`. La especificación está en
// docs/ESPECIFICACION-curso.md.

export const FORMATOS = ['web', 'pdf', 'interactive', 'kit', 'video', 'live']
export const ESTADOS = ['available', 'preparing']

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const esTexto = (v) => typeof v === 'string' && v.trim() !== ''

// Resuelve una URL del manifiesto contra la URL del propio manifiesto, así un
// curso puede usar rutas relativas ("./", "portada.svg") y mudarse de dominio
// sin reescribirlas.
function resolver(valor, base) {
  try {
    return new URL(valor, base).href
  } catch {
    return null
  }
}

/**
 * @param {unknown} datos   el JSON leído
 * @param {string} base     URL desde la que se leyó (para resolver rutas)
 * @returns {{ ok: true, curso: object } | { ok: false, errores: string[] }}
 */
export function validarCurso(datos, base) {
  const errores = []
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    return { ok: false, errores: ['el manifiesto no es un objeto JSON'] }
  }
  const d = datos

  if (!esTexto(d.id) || !SLUG.test(d.id)) errores.push('`id` debe ser un slug: minúsculas, números y guiones')
  if (!esTexto(d.title)) errores.push('falta `title`')
  if (!esTexto(d.summary)) errores.push('falta `summary`')

  if (!d.teacher || !esTexto(d.teacher.name)) errores.push('falta `teacher.name`')
  for (const campo of ['webId', 'contact', 'url']) {
    const v = d.teacher?.[campo]
    if (v !== undefined && !(esTexto(v) && URL.canParse(v))) {
      errores.push(`\`teacher.${campo}\` debe ser una URL absoluta (https:, mailto:…)`)
    }
  }

  const estado = d.status ?? 'available'
  if (!ESTADOS.includes(estado)) errores.push(`\`status\` debe ser uno de: ${ESTADOS.join(', ')}`)

  if (!Array.isArray(d.formats) || d.formats.length === 0) {
    errores.push('`formats` debe ser una lista con al menos un formato')
  } else {
    const raros = d.formats.filter((f) => !FORMATOS.includes(f))
    if (raros.length) errores.push(`formatos desconocidos: ${raros.join(', ')}`)
  }

  if (estado === 'available' && !esTexto(d.url)) errores.push('un curso `available` necesita `url`')
  if (d.topics !== undefined && (!Array.isArray(d.topics) || !d.topics.every(esTexto))) {
    errores.push('`topics` debe ser una lista de textos')
  }
  if (d.classes !== undefined && (typeof d.classes !== 'object' || d.classes === null)) {
    errores.push('`classes` debe ser un objeto')
  }

  const urls = {}
  for (const [clave, valor] of [
    ['url', d.url],
    ['cover', d.cover],
    ['pdf', d.pdf],
    ['calendar', d.classes?.calendar],
  ]) {
    if (valor === undefined) continue
    const r = esTexto(valor) ? resolver(valor, base) : null
    if (!r) errores.push(`\`${clave}\` no es una URL válida`)
    else urls[clave] = r
  }

  if (errores.length) return { ok: false, errores }

  return {
    ok: true,
    curso: {
      id: d.id,
      title: d.title.trim(),
      summary: d.summary.trim(),
      description: esTexto(d.description) ? d.description.trim() : '',
      teacher: {
        name: d.teacher.name.trim(),
        webId: d.teacher.webId ?? null,
        contact: d.teacher.contact ?? null,
        url: d.teacher.url ?? null,
      },
      status: estado,
      formats: [...d.formats],
      topics: d.topics ? [...d.topics] : [],
      url: urls.url ?? null,
      cover: urls.cover ?? null,
      pdf: urls.pdf ?? null,
      kit: esTexto(d.kit) ? d.kit.trim() : null,
      classes: d.classes
        ? {
            calendar: urls.calendar ?? null,
            duration: esTexto(d.classes.duration) ? d.classes.duration : null,
            price: esTexto(d.classes.price) ? d.classes.price : null,
          }
        : null,
      source: base,
    },
  }
}
