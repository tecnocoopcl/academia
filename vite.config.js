import { cpSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `cursos/` no pasa por el bundler: cada curso es un sitio estático propio,
// por eso se copia tal cual. En desarrollo Vite ya lo sirve desde la raíz.
// 404.html = index.html, para que GitHub Pages entregue la app en cualquier
// ruta (/catalogo, /catalogo/<id>).
function estaticos() {
  return {
    name: 'academia-estaticos',
    apply: 'build',
    closeBundle() {
      const dist = resolve('dist')
      cpSync('cursos', resolve(dist, 'cursos'), { recursive: true })
      copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))
    },
  }
}

// Puerto 5186: 5173 es el shell de espacio, 5180–5182 Notas, Archivador y Archivos.
export default defineConfig({
  base: '/',
  plugins: [react(), estaticos()],
  server: { port: 5186, strictPort: true },
  preview: { port: 5186 },
})
