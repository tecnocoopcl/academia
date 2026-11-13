import { useEffect, useState } from 'react'

// Router mínimo, sin dependencias (el mismo patrón que música).
//
//   /                  portada
//   /catalogo          todos los cursos
//   /catalogo/<id>     ficha de un curso
//
// Los cursos alojados aquí viven en /cursos/<id>/ y son sitios estáticos
// propios: no pasan por este router. En GitHub Pages cualquier otra ruta
// llega aquí gracias a 404.html (copia de index.html).
export function parseRuta(pathname) {
  const [seccion, param] = pathname.split('/').filter(Boolean).map(decodeURIComponent)
  if (seccion === 'catalogo' && param) return { vista: 'curso', id: param }
  if (seccion === 'catalogo') return { vista: 'catalogo' }
  return { vista: 'inicio' }
}

export function navegar(href) {
  const url = new URL(href, window.location.origin)
  if (url.pathname + url.search + url.hash === window.location.pathname + window.location.search + window.location.hash) return
  window.history.pushState(null, '', url.pathname + url.search + url.hash)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRuta() {
  const [ruta, setRuta] = useState(() => parseRuta(window.location.pathname))

  useEffect(() => {
    function onPop() {
      setRuta(parseRuta(window.location.pathname))
      const id = window.location.hash.slice(1)
      requestAnimationFrame(() => {
        const destino = id && document.getElementById(decodeURIComponent(id))
        if (destino) destino.scrollIntoView({ behavior: 'smooth' })
        else window.scrollTo(0, 0)
      })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return ruta
}

// <a> que navega sin recargar. Ctrl/Cmd+clic y clic central siguen abriendo
// una pestaña nueva, como cualquier enlace.
export function Link({ href, onClick, ...props }) {
  function handleClick(e) {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navegar(href)
  }
  return <a href={href} onClick={handleClick} {...props} />
}
