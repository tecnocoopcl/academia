import { Link } from '../ruta.jsx'
import { ESTADO, FORMATO } from '../catalogo/textos.js'
import { EstadoCarga } from './TarjetaCurso.jsx'

export default function Curso({ id, catalogo }) {
  const curso = catalogo.cursos.find((c) => c.id === id)

  if (!curso) {
    return (
      <div className="contenedor seccion">
        <EstadoCarga catalogo={catalogo} />
        {!catalogo.cargando && !catalogo.error && (
          <>
            <h1>No encontramos ese curso</h1>
            <p>
              Puede que haya cambiado de nombre. <Link href="/catalogo">Vuelve al catálogo</Link>.
            </p>
          </>
        )}
      </div>
    )
  }

  const disponible = curso.status === 'available'

  return (
    <article className="contenedor seccion ficha">
      <nav className="migas" aria-label="Migas">
        <Link href="/catalogo">Catálogo</Link> › <span aria-current="page">{curso.title}</span>
      </nav>

      <div className="ficha-cabecera">
        <div>
          {!disponible && <span className="pildora">{ESTADO[curso.status]}</span>}
          <h1>{curso.title}</h1>
          <p className="bajada">{curso.summary}</p>
          <p className="ficha-profe">
            Dicta <strong>{curso.teacher.name}</strong>
            {curso.teacher.url && (
              <>
                {' · '}
                <a href={curso.teacher.url} rel="author">
                  Conoce su trabajo
                </a>
              </>
            )}
          </p>
          <div className="acciones">
            {disponible && curso.url && (
              <a className="boton" href={curso.url}>
                Ir al curso
              </a>
            )}
            {curso.pdf && (
              <a className="boton secundario" href={curso.pdf}>
                Descargar el PDF
              </a>
            )}
            {!disponible && <p className="nota-estado">Este curso todavía se está preparando. Vuelve pronto.</p>}
          </div>
        </div>
        {curso.cover && <img className="ficha-portada" src={curso.cover} alt="" />}
      </div>

      <div className="ficha-cuerpo">
        <div>
          {curso.description && <p>{curso.description}</p>}
          {curso.kit && (
            <>
              <h2>Kit</h2>
              <p>{curso.kit}</p>
            </>
          )}
        </div>

        <aside className="ficha-lateral">
          <dl>
            <dt>Formatos</dt>
            <dd>
              <ul className="etiquetas">
                {curso.formats.map((f) => (
                  <li key={f}>{FORMATO[f]}</li>
                ))}
              </ul>
            </dd>
            {curso.topics.length > 0 && (
              <>
                <dt>Temas</dt>
                <dd>
                  <ul className="etiquetas">
                    {curso.topics.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </dd>
              </>
            )}
          </dl>

          <section className="clases" aria-labelledby="t-clases">
            <h2 id="t-clases">Pedir una clase</h2>
            {curso.classes ? (
              <>
                <p>Clases particulares con {curso.teacher.name}, de pago.</p>
                <dl className="datos">
                  {curso.classes.duration && (
                    <>
                      <dt>Duración</dt>
                      <dd>{curso.classes.duration}</dd>
                    </>
                  )}
                  {curso.classes.price && (
                    <>
                      <dt>Valor</dt>
                      <dd>{curso.classes.price}</dd>
                    </>
                  )}
                </dl>
              </>
            ) : (
              <p>Este curso aún no ofrece clases.</p>
            )}
            <p className="pronto">
              Muy pronto podrás reservar con tu WebID, directo en el calendario de espacio del profe.
            </p>
            {curso.teacher.contact && (
              <a className="boton secundario" href={curso.teacher.contact}>
                Contactar al profe
              </a>
            )}
          </section>
        </aside>
      </div>
    </article>
  )
}
