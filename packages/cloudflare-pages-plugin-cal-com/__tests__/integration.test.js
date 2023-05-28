import fs from 'node:fs'
import path from 'node:path'
import { unstable_dev } from 'wrangler'

const script = path.join('__tests__', 'worker.js')

const booking_created_filepath = path.join(
  '..',
  '..',
  'assets',
  'webhook-events',
  'cal-com',
  'booking-created.json'
)

const booking_created = fs.readFileSync(booking_created_filepath).toString()

describe('integration test suite', () => {
  let worker // UnstableDevWorker from wrangler

  beforeAll(async () => {
    worker = await unstable_dev(script, {
      vars: {
        CAL_WEBHOOK_SECRET: 'my-webhook-signing-secret',
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
    it('returns HTTP 400 when the X-Cal-Signature-256 request header is missing', async () => {
      const res = await worker.fetch('/', {
        method: 'POST',
        headers: {},
        body: JSON.stringify({})
      })

      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.message).toContain('Bad Request')
      expect(body.message).toContain('missing webhook signature')
    })

    it('returns HTTP 400 when the request body does not conform to the cal.com webhook event schema', async () => {
      const res = await worker.fetch('/', {
        method: 'POST',
        headers: { 'X-Cal-Signature-256': 'signature-set-by-cal.com' },
        body: JSON.stringify({ foo: 'bar' })
      })

      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.message).toContain('Bad Request')
      expect(body.message).toContain('invalid schema')
    })
  })

  it('returns HTTP 200 when the request body conforms to the cal.com webhook event schema', async () => {
    const res = await worker.fetch('/', {
      method: 'POST',
      headers: { 'X-Cal-Signature-256': 'signature-set-by-cal.com' },
      body: booking_created
    })

    expect(res.status).toBe(200)
  })
})
