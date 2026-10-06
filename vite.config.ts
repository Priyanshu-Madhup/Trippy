import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url))

/**
 * Runs the Vercel functions in /api inside the Vite dev server so that
 * `npm run dev` works end-to-end without `vercel dev`. Handlers use the
 * Web-standard `export async function POST(request: Request)` signature,
 * which is exactly what Vercel invokes in production.
 */
function devApi(): Plugin {
  return {
    name: 'trippy-dev-api',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
        const name = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '')
        const file = path.join(root, 'api', `${name}.ts`)
        if (!/^[a-z0-9-]+$/.test(name) || !fs.existsSync(file)) {
          res.statusCode = 404
          res.end(JSON.stringify({ error: 'not_found' }))
          return
        }
        try {
          const mod = await server.ssrLoadModule(file)
          const handler = mod[req.method ?? 'GET'] as ((r: Request) => Promise<Response>) | undefined
          if (!handler) {
            res.statusCode = 405
            res.end(JSON.stringify({ error: 'method_not_allowed' }))
            return
          }
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === 'string') headers.set(k, v)
          }
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && chunks.length > 0
          const response = await handler(
            new Request(url, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined }),
          )
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          server.config.logger.error(`[api/${name}] ${(err as Error).stack ?? err}`)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'internal_error', message: (err as Error).message }))
        }
      })
    },
  }
}

/** Parses .env files in Vite's precedence order (file values win over stale process.env). */
function readEnvFiles(mode: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const name of ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]) {
    const file = path.join(root, name)
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
      if (!m) continue
      out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
    }
  }
  return out
}

export default defineConfig(({ mode }) => {
  // Expose server-only variables (GROQ_API_KEY, …) to the dev API handlers.
  // Re-applied on every config reload so edits to .env take effect without a manual restart.
  for (const [key, value] of Object.entries(readEnvFiles(mode))) process.env[key] = value

  return {
    plugins: [react(), tailwindcss(), devApi()],
    // Listen on all interfaces so the app can be opened from a phone on the same Wi-Fi.
    server: { host: true, port: 5173 },
    preview: { host: true, port: 4173 },
    // Pre-bundle everything up front: otherwise Vite discovers deps on the first
    // visit to each lazy route and reloads the page mid-session.
    optimizeDeps: {
      include: [
        'react',
        'react-dom/client',
        'react-router-dom',
        '@tanstack/react-query',
        '@supabase/supabase-js',
        'framer-motion',
        'lucide-react',
        'clsx',
        'tailwind-merge',
        'class-variance-authority',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-switch',
        'sonner',
        'pdfjs-dist',
      ],
    },
    resolve: {
      alias: { '@': path.join(root, 'src') },
    },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('pdfjs-dist')) return 'pdf'
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion'
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react'
            return undefined
          },
        },
      },
    },
  }
})
