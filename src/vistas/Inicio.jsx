import { Link } from '../ruta.jsx'
import { EstadoCarga, Grilla } from './TarjetaCurso.jsx'

export default function Inicio({ catalogo, repo }) {
  return (
    <>
      <section className="portada">
        <div className="contenedor">
          <p className="antetitulo">academia de tecnocooperativa</p>
          <h1>Aprender haciendo, con quien sabe hacerlo.</h1>
          <p className="bajada">
            Cursos que cada socio arma a su manera: un manual en PDF, una página donde los conceptos se tocan, un kit
            para armar con las manos. Todo lo que se enseña aquí es público y gratuito. Si quieres ir más allá, pides
            una clase con el profe.
          </p>
          <div className="acciones">
            <Link className="boton" href="/catalogo">Ver los cursos</Link>
            <Link className="boton secundario" href="/#dictar">Quiero dictar un curso</Link>
          </div>
        </div>
      </section>

      <section className="contenedor seccion" aria-labelledby="t-cursos">
        <div className="seccion-cabecera">
          <h2 id="t-cursos">Cursos</h2>
          <Link href="/catalogo">Todo el catálogo →</Link>
        </div>
        <EstadoCarga catalogo={catalogo} />
        <Grilla cursos={catalogo.cursos.slice(0, 6)} />
      </section>

      <section className="contenedor seccion" aria-labelledby="t-como">
        <h2 id="t-como">Cómo funciona</h2>
        <ol className="pasos">
          <li>
            <h3>El conocimiento es libre</h3>
            <p>Cada curso publica su material abierto: textos, PDF, ejercicios y herramientas interactivas, sin cuenta ni pago.</p>
          </li>
          <li>
            <h3>Cada curso a su manera</h3>
            <p>No hay una plantilla obligatoria. Un curso de síntesis trae perillas y osciloscopios; uno de electrónica, un kit para la protoboard.</p>
          </li>
          <li>
            <h3>Clases con el profe</h3>
            <p>Cuando quieras acompañamiento, pides una clase con quien dicta el curso. Pronto podrás reservarla con tu WebID desde el calendario de espacio.</p>
          </li>
        </ol>
      </section>

      <section id="dictar" className="contenedor seccion dictar" aria-labelledby="t-dictar">
        <h2 id="t-dictar">Dictar un curso</h2>
        <p>
          Si eres socio de la cooperativa, puedes publicar tu curso aquí. Lo armas como quieras y lo alojas donde
          quieras (lo recomendado es un subdominio de <code>tecnocooperativa.cl</code>); academia solo necesita una
          ficha.
        </p>
        <ol className="lista-numerada">
          <li>Arma tu curso: una página estática, un PDF, un video… Si quieres, usa el <a href="/kit/demo.html">kit de componentes</a> y la paleta de la cooperativa.</li>
          <li>Publica junto a él un <code>curso.json</code> con título, resumen, formatos y cómo pedir clases.</li>
          <li>Propón un cambio a <code>cursos/registro.json</code> con la dirección de tu <code>curso.json</code>.</li>
        </ol>
        <p>
          <a className="boton secundario" href={`${repo}/blob/main/docs/ESPECIFICACION-curso.md`}>Leer la especificación</a>{' '}
          <a className="boton secundario" href={`${repo}/blob/main/docs/GUIA-diseno.md`}>Guía de diseño</a>
        </p>
      </section>
    </>
  )
}
