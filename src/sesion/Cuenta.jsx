import { useEffect, useRef, useState } from 'react'
import { conectar, desconectar, nombreCorto, nombreDelPerfil, resolverProveedor, PROVEEDOR_POR_DEFECTO } from './solid.js'

// Botón de la barra superior: iniciar sesión con WebID, o la cuenta y salir.
export default function Cuenta({ sesion }) {
  const [abierto, setAbierto] = useState(false)
  const nombre = useNombre(sesion.webId)

  if (sesion.conectada) {
    return (
      <div className="cuenta-sesion">
        <span className="cuenta-nombre" title={sesion.webId}>
          {nombre}
        </span>
        <button type="button" className="boton secundario chico" onClick={() => desconectar().then(() => window.location.reload())}>
          Cerrar sesión
        </button>
      </div>
    )
  }

  return (
    <>
      <button type="button" className="boton chico" onClick={() => setAbierto(true)}>
        Iniciar sesión<span className="cuenta-extra">con WebID</span>
      </button>
      {abierto && <Dialogo onClose={() => setAbierto(false)} />}
    </>
  )
}

// Muestra de inmediato el nombre del pod y lo cambia por el del perfil cuando llega.
function useNombre(webId) {
  const [nombre, setNombre] = useState(() => (webId ? nombreCorto(webId) : null))
  useEffect(() => {
    if (!webId) return
    let vigente = true
    nombreDelPerfil(webId).then((n) => vigente && setNombre(n))
    return () => {
      vigente = false
    }
  }, [webId])
  return nombre
}

function Dialogo({ onClose }) {
  const ref = useRef(null)
  const [entrada, setEntrada] = useState(PROVEEDOR_POR_DEFECTO)
  const [estado, setEstado] = useState({ enviando: false, error: null })

  // Sin close() al desmontar: dispara el evento close, que llama a onClose y,
  // con el doble montaje de StrictMode, cerraría el diálogo recién abierto.
  useEffect(() => {
    if (!ref.current.open) ref.current.showModal()
  }, [])

  async function enviar(e) {
    e.preventDefault()
    setEstado({ enviando: true, error: null })
    try {
      await conectar(await resolverProveedor(entrada))
      // login() redirige al proveedor; si vuelve aquí, algo falló.
    } catch (err) {
      setEstado({ enviando: false, error: err.message || 'No se pudo iniciar sesión.' })
    }
  }

  return (
    <dialog ref={ref} className="dialogo" aria-labelledby="t-sesion" onClose={onClose} onCancel={onClose}>
      <form onSubmit={enviar}>
        <h2 id="t-sesion">Iniciar sesión con WebID</h2>
        <p>
          El material de academia es abierto y no necesita cuenta. Con tu WebID podrás pedir clases a los profes,
          directo en su calendario.
        </p>
        <label htmlFor="sesion-entrada">Tu WebID o proveedor de identidad</label>
        <input
          id="sesion-entrada"
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck="false"
          required
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
        />
        {estado.error && (
          <p className="dialogo-error" role="alert">
            {estado.error}
          </p>
        )}
        <div className="dialogo-acciones">
          <button type="button" className="boton secundario" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="boton" disabled={estado.enviando}>
            {estado.enviando ? 'Conectando…' : 'Iniciar sesión'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
