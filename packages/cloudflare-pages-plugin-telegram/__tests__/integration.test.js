import fs from 'node:fs'
import path from 'node:path'
import { unstable_dev } from 'wrangler'

const script = path.join('__tests__', 'worker.js')

describe('integration test suite', () => {
  let worker // UnstableDevWorker from wrangler

  beforeAll(async () => {
    worker = await unstable_dev(script, {
      vars: {
        TELEGRAM: '{"chat_id": "some-chat-id", "token": "some-bot-token"}',
        NAME: 'My test Cloudflare Worker'
      },
      experimental: { disableExperimentalWarning: true }
    })
  })

  afterAll(async () => {
    await worker.stop()
  })

  describe('GET /', () => {
    it(`returns "Hello World"`, async () => {
      const res = await worker.fetch('/', {
        method: 'GET'
      })

      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toMatchInlineSnapshot(`"Hello World!"`)
    })
  })

  describe('POST /', () => {
    it('returns HTTP 200', async () => {
      const res = await worker.fetch('/', {
        method: 'POST',
        headers: {},
        body: JSON.stringify({})
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({})
    })
  })
})
