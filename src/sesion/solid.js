import { login, logout, handleIncomingRedirect, getDefaultSession } from '@inrupt/solid-client-authn-browser'
import { getSolidDataset, getThing, getUrlAll, getStringNoLocale, getStringWithLocale } from '@inrupt/solid-client'

// Sesión con WebID, como en música y las demás apps de la cooperativa. Sin
// sesión academia funciona igual: el material es abierto. La sesión servirá
// para pedir clases (ADR-001, fase 2).

export const PROVEEDOR_POR_DEFECTO = 'https://pods-rpi-tc.aebn.cl'

const SOLID_OIDC_ISSUER = 'http://www.w3.org/ns/solid/terms#oidcIssuer'
const PREDICADOS_NOMBRE = [
  'http://xmlns.com/foaf/0.1/name',
  'http://www.w3.org/2006/vcard/ns#fn',
  'http://xmlns.com/foaf/0.1/nick',
  'http://www.w3.org/2006/vcard/ns#nickname',
]
const VOLVER_KEY = 'academia-volver-a'

export function sesionActual() {
  const { info } = getDefaultSession()
  return { conectada: info.isLoggedIn, webId: info.isLoggedIn ? info.webId : null }
}

// Se llama una vez antes de montar la app: completa el login si volvemos del
// proveedor, o restaura la sesión anterior.
export async function iniciarSesion() {
  try {
    await handleIncomingRedirect({
      restorePreviousSession: true,
      onSessionRestore: (url) => volverA(new URL(url).pathname),
    })
  } catch (err) {
    console.warn(`No se pudo restaurar la sesión Solid: ${err.message}`)
  }
  const pendiente = sessionStorage.getItem(VOLVER_KEY)
  if (pendiente) {
    sessionStorage.removeItem(VOLVER_KEY)
    volverA(pendiente)
  }
  return sesionActual()
}

function volverA(pathname) {
  if (pathname && pathname !== window.location.pathname) window.history.replaceState(null, '', pathname)
}

// Acepta un WebID (https://…/profile/card#me) o directamente la URL del
// proveedor. Con un WebID, el proveedor sale de solid:oidcIssuer del perfil.
export async function resolverProveedor(entrada) {
  const valor = entrada.trim()
  const url = new URL(valor.includes('://') ? valor : `https://${valor}`)
  if (!url.hash) return url.origin

  const perfil = await getSolidDataset(url.href)
  const yo = getThing(perfil, url.href)
  const [proveedor] = yo ? getUrlAll(yo, SOLID_OIDC_ISSUER) : []
  if (!proveedor) throw new Error('Ese WebID no declara un proveedor de identidad (solid:oidcIssuer).')
  return proveedor
}

export async function conectar(oidcIssuer) {
  // Siempre se vuelve a la raíz y desde ahí a la página en que estaba, para
  // no depender de 404.html en el callback de GitHub Pages.
  sessionStorage.setItem(VOLVER_KEY, window.location.pathname)
  await login({ oidcIssuer, redirectUrl: `${window.location.origin}/`, clientName: 'academia' })
}

export async function desconectar() {
  await logout()
}

// Nombre para mostrar: el que declara el perfil (foaf:name, vcard:fn o un
// apodo). Si no hay, el del pod según la URL del WebID.
export async function nombreDelPerfil(webId) {
  try {
    const { fetch } = getDefaultSession()
    const perfil = await getSolidDataset(webId, { fetch })
    const yo = getThing(perfil, webId)
    if (yo) {
      for (const predicado of PREDICADOS_NOMBRE) {
        const nombre = getStringNoLocale(yo, predicado) ?? getStringWithLocale(yo, predicado, 'es')
        if (nombre?.trim()) return nombre.trim()
      }
    }
  } catch (err) {
    console.warn(`No se pudo leer el perfil ${webId}: ${err.message}`)
  }
  return nombreCorto(webId)
}

// Community Solid Server usa https://host/<pod>/profile/card#me; con pods en
// subdominio, https://<pod>.host/profile/card#me.
export function nombreCorto(webId) {
  try {
    const url = new URL(webId)
    const [primero] = url.pathname.split('/').filter(Boolean)
    if (primero && primero !== 'profile') return decodeURIComponent(primero)
    return url.hostname.split('.')[0]
  } catch {
    return webId
  }
}
