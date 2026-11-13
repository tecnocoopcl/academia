import { useEffect } from 'react'
import { Link, useRuta } from './ruta.jsx'
import { useCatalogo } from './catalogo/useCatalogo.js'
import Inicio from './vistas/Inicio.jsx'
import Catalogo from './vistas/Catalogo.jsx'
import Curso from './vistas/Curso.jsx'
import Cuenta from './sesion/Cuenta.jsx'

const REPO = 'https://github.com/tecnocoopcl/academia'

export default function App({ sesion }) {
  const ruta = useRuta()
  const catalogo = useCatalogo()

  useEffect(() => {
    const curso = ruta.vista === 'curso' && catalogo.cursos.find((c) => c.id === ruta.id)
    document.title = curso ? `${curso.title} · academia` : ruta.vista === 'catalogo' ? 'Catálogo · academia' : 'academia'
  }, [ruta, catalogo.cursos])

  return (
    <>
      <a className="saltar" href="#contenido">Ir al contenido</a>
      <header className="barra">
        <div className="barra-interior">
          <Link href="/" className="marca" aria-label="academia, inicio">
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 18c3-8 5-8 7 0s4 8 7 0 5-8 8 0" /></svg>
            academia
          </Link>
          <nav aria-label="Principal">
            <Link href="/catalogo" aria-current={ruta.vista !== 'inicio' ? 'page' : undefined}>Catálogo</Link>
            <Link href="/#dictar">Dictar un curso</Link>
          </nav>
          <Cuenta sesion={sesion} />
        </div>
      </header>

      <main id="contenido" tabIndex={-1}>
        {ruta.vista === 'inicio' && <Inicio catalogo={catalogo} repo={REPO} />}
        {ruta.vista === 'catalogo' && <Catalogo catalogo={catalogo} />}
        {ruta.vista === 'curso' && <Curso id={ruta.id} catalogo={catalogo} />}
      </main>

      <footer className="pie">
        <p>
          academia es parte de <a href="https://tecnocooperativa.cl">tecnocooperativa</a>. El conocimiento de cada
          curso es público y gratuito; las clases con el profe se acuerdan con el profe.
        </p>
        <p>
          <a href={REPO}>Código y cómo sumar un curso</a>
        </p>
      </footer>
    </>
  )
}
