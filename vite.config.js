import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

function devProxyPlugin() {
  return {
    name: 'dev-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || ''
        if (!rawUrl.startsWith('/api-proxy')) return next()
        const u = new URL(rawUrl, 'http://localhost')
        const target = u.searchParams.get('url')
        if (!target) {
          res.statusCode = 400
          res.end('Missing url')
          return
        }
        try {
          const chunks = []
          await new Promise((resolve) => {
            req.on('data', (c) => chunks.push(c))
            req.on('end', resolve)
          })
          const body = chunks.length ? Buffer.concat(chunks) : undefined

          const headers = {}
          for (const [key, value] of Object.entries(req.headers)) {
            if (value == null) continue
            if (key === 'host') continue
            headers[key] = Array.isArray(value) ? value.join(',') : value
          }

          const resp = await fetch(target, {
            method: req.method,
            headers,
            body: req.method && ['GET', 'HEAD'].includes(req.method.toUpperCase()) ? undefined : body
          })

          res.statusCode = resp.status
          resp.headers.forEach((v, k) => {
            if (k.toLowerCase() === 'content-length') return
            if (k.toLowerCase() === 'content-encoding') return
            res.setHeader(k, v)
          })
          const arrayBuffer = await resp.arrayBuffer()
          res.end(Buffer.from(arrayBuffer))
        } catch (err) {
          res.statusCode = 502
          res.end('Proxy error: ' + (err?.message || String(err)))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [
    vue(),
    devProxyPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'LifeGuard AI',
        short_name: 'LifeGuard',
        description: '云端家庭AI多医生会诊系统',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: './',
  server: {
    port: 5173
  }
})
