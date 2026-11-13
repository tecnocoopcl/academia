import { Link } from '../ruta.jsx'
import { ESTADO, FORMATO } from '../catalogo/textos.js'

export default function TarjetaCurso({ curso }) {
  return (
    <article className="tarjeta" data-estado={curso.status}>
      <div className="tarjeta-portada">{curso.cover && <img src={curso.cover} alt="" loading="lazy" />}</div>
      <div className="tarjeta-cuerpo">
        {curso.status !== 'available' && <span className="pildora">{ESTADO[curso.status]}</span>}
        <h3>
          <Link href={`/catalogo/${curso.id}`}>{curso.title}</Link>
        </h3>
        <p>{curso.summary}</p>
        <p className="tarjeta-meta">
          <span>{curso.teacher.name}</span>
          <span aria-hidden="true">·</span>
          <span>{curso.formats.map((f) => FORMATO[f]).join(', ')}</span>
        </p>
      </div>
    </article>
  )
}

export function Grilla({ cursos }) {
  return (
    <ul className="grilla">
      {cursos.map((c) => (
        <li key={c.id}>
          <TarjetaCurso curso={c} />
        </li>
      ))}
    </ul>
  )
}

export function EstadoCarga({ catalogo }) {
  if (catalogo.cargando) return <p className="estado" role="status">Cargando cursos…</p>
  if (catalogo.error) return <p className="estado error" role="alert">No se pudo cargar el catálogo: {catalogo.error}</p>
  return null
}
