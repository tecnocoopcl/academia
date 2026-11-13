import { useMemo, useState } from 'react'
import { FORMATO } from '../catalogo/textos.js'
import { EstadoCarga, Grilla, ListaModulos } from './TarjetaCurso.jsx'

export default function Catalogo({ catalogo }) {
  const [formato, setFormato] = useState('')
  const [soloDisponibles, setSoloDisponibles] = useState(false)
  const [vista, setVista] = useState('cursos')

  const formatos = useMemo(
    () => Object.keys(FORMATO).filter((f) => catalogo.cursos.some((c) => c.formats.includes(f))),
    [catalogo.cursos],
  )
  const cursos = catalogo.cursos.filter(
    (c) => (!formato || c.formats.includes(formato)) && (!soloDisponibles || c.status === 'available'),
  )
  // Solo los cursos disponibles abren sus módulos.
  const conModulos = cursos.filter((c) => c.status === 'available' && c.modules.length > 0)
  const nModulos = conModulos.reduce((n, c) => n + c.modules.length, 0)
  const verModulos = vista === 'modulos'

  return (
    <div className="contenedor seccion">
      <h1>Catálogo</h1>
      <p className="bajada">Todos los cursos de la cooperativa. El material es abierto; las clases se piden a cada profe.</p>

      <div className="filtros" role="group" aria-label="Filtrar cursos">
        <label>
          Ver{' '}
          <select value={vista} onChange={(e) => setVista(e.target.value)}>
            <option value="cursos">Cursos</option>
            <option value="modulos">Módulos</option>
          </select>
        </label>
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
        {!verModulos && (
          <label className="casilla">
            <input type="checkbox" checked={soloDisponibles} onChange={(e) => setSoloDisponibles(e.target.checked)} />
            Solo disponibles
          </label>
        )}
        {!catalogo.cargando && (
          <span className="cuenta" role="status">
            {verModulos
              ? `${nModulos} ${nModulos === 1 ? 'módulo' : 'módulos'}`
              : `${cursos.length} ${cursos.length === 1 ? 'curso' : 'cursos'}`}
          </span>
        )}
      </div>

      <EstadoCarga catalogo={catalogo} />
      {verModulos ? <ListaModulos cursos={conModulos} /> : <Grilla cursos={cursos} />}
      {!catalogo.cargando && !catalogo.error && (verModulos ? nModulos : cursos.length) === 0 && (
        <p className="estado">{verModulos ? 'Ningún módulo' : 'Ningún curso'} calza con esos filtros.</p>
      )}
    </div>
  )
}
