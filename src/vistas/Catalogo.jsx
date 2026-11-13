import { useMemo, useState } from 'react'
import { FORMATO } from '../catalogo/textos.js'
import { EstadoCarga, Grilla } from './TarjetaCurso.jsx'

export default function Catalogo({ catalogo }) {
  const [formato, setFormato] = useState('')
  const [soloDisponibles, setSoloDisponibles] = useState(false)

  const formatos = useMemo(
    () => Object.keys(FORMATO).filter((f) => catalogo.cursos.some((c) => c.formats.includes(f))),
    [catalogo.cursos],
  )
  const cursos = catalogo.cursos.filter(
    (c) => (!formato || c.formats.includes(formato)) && (!soloDisponibles || c.status === 'available'),
  )

  return (
    <div className="contenedor seccion">
      <h1>Catálogo</h1>
      <p className="bajada">Todos los cursos de la cooperativa. El material es abierto; las clases se piden a cada profe.</p>

      <div className="filtros" role="group" aria-label="Filtrar cursos">
        <label>
          Formato{' '}
          <select value={formato} onChange={(e) => setFormato(e.target.value)}>
            <option value="">Todos</option>
            {formatos.map((f) => (
              <option key={f} value={f}>
                {FORMATO[f]}
              </option>
            ))}
          </select>
        </label>
        <label className="casilla">
          <input type="checkbox" checked={soloDisponibles} onChange={(e) => setSoloDisponibles(e.target.checked)} />
          Solo disponibles
        </label>
        {!catalogo.cargando && (
          <span className="cuenta" role="status">
            {cursos.length} {cursos.length === 1 ? 'curso' : 'cursos'}
          </span>
        )}
      </div>

      <EstadoCarga catalogo={catalogo} />
      <Grilla cursos={cursos} />
      {!catalogo.cargando && !catalogo.error && cursos.length === 0 && (
        <p className="estado">Ningún curso calza con esos filtros.</p>
      )}
    </div>
  )
}
