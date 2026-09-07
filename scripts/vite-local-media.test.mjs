import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Writable } from 'node:stream'
import test from 'node:test'
import { localMediaPlugin } from './vite-local-media.mjs'

const video = readFileSync(new URL('../ui/public/assets/hero-video.mp4', import.meta.url))
let middleware
localMediaPlugin(resolve('ui')).configureServer({ middlewares: { use: handler => { middleware = handler } } })

const requestMedia = (range, method = 'GET') => new Promise((done, reject) => {
  const chunks = [], headers = {}
  const response = new Writable({ write(chunk, _encoding, callback) { chunks.push(chunk); callback() } })
  response.statusCode = 200
  response.setHeader = (name, value) => { headers[name] = value }
  response.writeHead = (status, values) => { response.statusCode = status; Object.assign(headers, values) }
  response.on('error', reject)
  response.on('finish', () => done({ status: response.statusCode, headers, body: Buffer.concat(chunks) }))
  middleware({ url: '/assets/hero-video.mp4', method, headers: range ? { range } : {} }, response, () => reject(new Error('Asset not found')))
})

test('Safari two-byte probe returns 206 and exactly the requested bytes', async () => {
  const result = await requestMedia('bytes=0-1')
  assert.equal(result.status, 206)
  assert.equal(result.headers['Content-Type'], 'video/mp4')
  assert.equal(result.headers['Content-Range'], `bytes 0-1/${video.length}`)
  assert.equal(result.headers['Content-Length'], 2)
  assert.deepEqual(result.body, video.subarray(0, 2))
})

test('video supports suffix ranges and open-ended ranges', async () => {
  for (const range of ['bytes=-16', `bytes=${video.length - 16}-`]) {
    const result = await requestMedia(range)
    assert.equal(result.status, 206)
    assert.deepEqual(result.body, video.subarray(-16))
  }
})

test('HEAD reports the full video size without sending a body', async () => {
  const result = await requestMedia(undefined, 'HEAD')
  assert.equal(result.status, 200)
  assert.equal(result.headers['Content-Length'], video.length)
  assert.equal(result.headers['Accept-Ranges'], 'bytes')
  assert.equal(result.body.length, 0)
})

test('invalid and unsatisfiable ranges return 416', async () => {
  for (const range of ['invalid', 'bytes=-', 'bytes=9-1', `bytes=${video.length}-`]) {
    const result = await requestMedia(range)
    assert.equal(result.status, 416)
    assert.equal(result.headers['Content-Range'], `bytes */${video.length}`)
    assert.equal(result.body.length, 0)
  }
})
