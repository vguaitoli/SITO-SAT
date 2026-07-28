
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

function redirectTinaAdmin(server) {
  server.middlewares.use((request, response, next) => {
    const pathname = request.url?.split('?')[0]

    if (pathname === '/admin' || pathname === '/admin/') {
      response.statusCode = 302
      response.setHeader('Location', '/admin/index.html')
      response.end()
      return
    }

    next()
  })
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'tina-admin-redirect',
      configureServer: redirectTinaAdmin,
      configurePreviewServer: redirectTinaAdmin,
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Onora la porta assegnata dall'ambiente (PORT); altrimenti default di Vite.
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
});
