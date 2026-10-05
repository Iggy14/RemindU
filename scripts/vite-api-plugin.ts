import { existsSync } from 'node:fs'
import type { IncomingMessage } from 'node:http'
import { join } from 'node:path'
import { loadEnv, type Plugin } from 'vite'

const ROUTE = /^\/api\/[a-z0-9-]+(\/[a-z0-9-]+)*$/ // no segments starting with "_": those are private helpers, as on Vercel

function toRequest(req: IncomingMessage, body: Buffer): Request {
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
  }
  const method = req.method ?? 'GET'
  const hasBody = method !== 'GET' && method !== 'HEAD'
  return new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, { method, headers, body: hasBody ? new Uint8Array(body) : undefined })
}

/**
 * Serves /api/** during `npm run dev` by loading the same handler files Vercel deploys.
 * A route file exports one function per HTTP method (`export async function POST(request: Request)`).
 */
export function apiDevPlugin(): Plugin {
  return {
    name: 'remindu-api-dev',
    configureServer(server) {
      // Make .env.local secrets (e.g. GEMINI_API_KEY) visible to handlers, as Vercel env vars would be.
      for (const [key, value] of Object.entries(loadEnv(server.config.mode, server.config.root, ''))) {
        process.env[key] ??= value
      }

      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        if (!path.startsWith('/api/')) return next()
        if (!ROUTE.test(path) || !existsSync(join(server.config.root, `${path}.ts`))) {
          res.statusCode = 404
          return res.end('Not found')
        }

        try {
          const module = await server.ssrLoadModule(`${path}.ts`)
          const handler = module[req.method ?? 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            return res.end('Method not allowed')
          }
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const response: Response = await handler(toRequest(req, Buffer.concat(chunks)))
          res.statusCode = response.status
          response.headers.forEach((value, name) => res.setHeader(name, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          if (error instanceof Error) server.ssrFixStacktrace(error)
          console.error(error)
          res.statusCode = 500
          res.end('Internal error')
        }
      })
    },
  }
}
