import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { iniciarSesion } from './sesion/solid.js'
import './academia.css'

// La sesión se resuelve antes de montar: si volvemos del proveedor, el login
// se completa aquí y la app arranca ya con el WebID.
iniciarSesion().then((sesion) => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App sesion={sesion} />
    </StrictMode>,
  )
})
