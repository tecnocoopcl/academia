import { useEffect, useState } from 'react'
import { cargarCatalogo } from './cargar.js'

export const REGISTRO = '/cursos/registro.json'

// Una sola carga por visita: el catálogo es chico y cambia con un PR.
let pendiente = null

export function useCatalogo() {
  const [estado, setEstado] = useState({ cargando: true, cursos: [], avisos: [], error: null })

  useEffect(() => {
    let vivo = true
    pendiente ??= cargarCatalogo(REGISTRO)
    pendiente.then(
      ({ cursos, avisos }) => {
        if (avisos.length) console.warn('academia: cursos que no se pudieron cargar', avisos)
        if (vivo) setEstado({ cargando: false, cursos, avisos, error: null })
      },
      (error) => {
        pendiente = null
        if (vivo) setEstado({ cargando: false, cursos: [], avisos: [], error: error.message })
      },
    )
    return () => {
      vivo = false
    }
  }, [])

  return estado
}
