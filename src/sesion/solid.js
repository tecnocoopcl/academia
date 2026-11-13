import { login, logout, handleIncomingRedirect, getDefaultSession } from '@inrupt/solid-client-authn-browser'
import { getSolidDataset, getThing, getUrlAll } from '@inrupt/solid-client'

// Sesión con WebID, como en música y las demás apps de la cooperativa. Sin
// sesión academia funciona igual: el material es abierto. La sesión servirá
// para pedir clases (ADR-001, fase 2).

export const PROVEEDOR_POR_DEFECTO = 'https://pods-rpi-tc.aebn.cl'

const SOLID_OIDC_ISSUER = 'http://www.w3.org/ns/solid/terms#oidcIssuer'
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

export function nombreCorto(webId) {
  try {
    return new URL(webId).hostname
  } catch {
    return webId
  }
}
