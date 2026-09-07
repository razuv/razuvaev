import { createReadStream, cpSync, existsSync, mkdirSync, statSync, readFileSync } from 'node:fs'
import { basename, extname, resolve } from 'node:path'

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
}

/**
 * Makes the repository-owned API media available to every frontend at /media/*.
 * In production builds the same files are copied into dist/media.
 */
export const localMediaPlugin = (frontendDirectory) => {
  const mediaDirectory = resolve(frontendDirectory, '../api/media')
  const sharedPublicDirectory = resolve(frontendDirectory, '../ui/public')
  const sharedMediaDirectory = resolve(sharedPublicDirectory, 'media')
  const sharedAssetsDirectory = resolve(sharedPublicDirectory, 'assets')
  const outputDirectory = resolve(frontendDirectory, 'dist/media')
  const outputAssetsDirectory = resolve(frontendDirectory, 'dist/assets')
  const settingsFile = resolve(frontendDirectory, '../api/settings/settings.json')

  const sendFile = (filePath, request, response, next) => {
    if(!existsSync(filePath) || !statSync(filePath).isFile()) return next()

    const size = statSync(filePath).size
    response.setHeader('Content-Type', contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream')
    response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
    response.setHeader('Accept-Ranges', 'bytes')
    let start = 0, end = size - 1
    if (request.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range)
      if (!range || (!range[1] && !range[2])) {
        response.writeHead(416, { 'Content-Range': `bytes */${size}` }); response.end(); return
      }
      start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
      end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
        response.writeHead(416, { 'Content-Range': `bytes */${size}` }); response.end(); return
      }
      response.statusCode = 206
      response.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
    }
    response.setHeader('Content-Length', end - start + 1)
    if (request.method === 'HEAD') { response.end(); return }
    const stream = createReadStream(filePath, { start, end })
    stream.on('error', () => response.destroy())
    response.on('close', () => stream.destroy())
    stream.pipe(response)
  }

  return {
    name: 'razuvaev-local-media',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = request.url || ''
        if(/[?&](?:import|raw|url)(?:[=&]|$)/.test(requestUrl)) return next()
        let pathname
        try { pathname = decodeURIComponent(requestUrl.split('?')[0]) }
        catch { response.statusCode = 400; response.end('Invalid URL'); return }
        // Keep the local UI self-contained in development. The remote settings
        // endpoint is unavailable in some local environments, which otherwise
        // leaves App.vue stuck in its loading state and renders a blank page.
        if(pathname === '/__settings' && existsSync(settingsFile)) {
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.setHeader('Cache-Control', 'no-store')
          response.end(readFileSync(settingsFile))
          return
        }
        if(pathname.startsWith('/media/')) {
          const filename = basename(pathname)
          if(!filename) return next()
          const localFile = resolve(mediaDirectory, filename)
          if(existsSync(localFile)) return sendFile(localFile, request, response, next)
          return sendFile(resolve(sharedMediaDirectory, filename), request, response, next)
        }

        if(pathname.startsWith('/assets/')) {
          const relativePath = pathname.slice('/assets/'.length)
          const filePath = resolve(sharedAssetsDirectory, relativePath)
          if(!filePath.startsWith(`${sharedAssetsDirectory}/`)) return next()
          return sendFile(filePath, request, response, next)
        }

        return next()
      })
    },
    closeBundle() {
      mkdirSync(outputDirectory, { recursive: true })
      cpSync(sharedMediaDirectory, outputDirectory, { recursive: true })
      cpSync(mediaDirectory, outputDirectory, { recursive: true })
      mkdirSync(outputAssetsDirectory, { recursive: true })
      cpSync(sharedAssetsDirectory, outputAssetsDirectory, { recursive: true })
    },
  }
}
