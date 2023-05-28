import type {
  EventContext,
  PagesPluginFunction
} from '@cloudflare/workers-types'
import { fromZodError } from 'zod-validation-error'
import { post_request_body } from './_schemas.js'
import type { CalWebhookEvent } from './_schemas.js'
import {
  badRequest,
  defaultOrOptional,
  hexStringToArrayBuffer,
  hmacKey
} from './_utils.js'

// https://emojipedia.org/
export enum Emoji {
  SpeakingHead = '🗣️'
}

const PREFIX = `[${Emoji.SpeakingHead} cal.com webhooks plugin]`

/**
 * Environment variables used by this Cloudflare Pages Functions plugin.
 */
export interface CalComPluginEnv {
  CAL_WEBHOOK_SECRET?: string
}

/**
 * Data that this plugin will add to each `fetch` request.
 *
 * - If you use "vanilla" Cloudflare Pages Function, access the data at `ctx.data.verifyCalComWebhook`
 * - If you use a web framework like Hono, access the data at `ctx.env.eventContext.data.verifyCalComWebhook`
 */
export interface Data {
  calComValidatedWebhookEvent: CalWebhookEvent
}

/**
 * Configuration object for this plugin.
 */
export interface PluginArgs {
  secret?: string
  shouldValidate?: boolean
}

export type PluginData = { calComValidatedWebhookEvent: CalWebhookEvent }

const defaults = {
  secret: undefined,
  shouldValidate: true
}

export type TelegramPagesPluginFunction<
  Env extends CalComPluginEnv = CalComPluginEnv,
  Params extends string = any,
  Data extends Record<string, unknown> = Record<string, unknown>
> = PagesPluginFunction<Env, Params, Data & PluginData, PluginArgs>

export const calComPlugin = <E extends CalComPluginEnv = CalComPluginEnv>(
  pluginArgs?: PluginArgs
) => {
  const options = pluginArgs || {}

  let secret = defaultOrOptional(defaults.secret, options.secret)
  const shouldValidate = defaultOrOptional(
    defaults.shouldValidate,
    options.shouldValidate
  )

  console.log({
    message: `${PREFIX} configuration`,
    secret,
    shouldValidate
  })

  // we declare the HMAC key here, to avoid recreating it on every request
  let key: CryptoKey
  const decoder = new TextDecoder('utf-8')

  return async function calComPluginInner(
    ctx: EventContext<E, any, Record<string, CalWebhookEvent>>
  ) {
    const audit_trail: string[] = []

    if (secret) {
      audit_trail.push(`secret set from pluginArgs: ${secret}`)
    }

    if (ctx.env.CAL_WEBHOOK_SECRET) {
      if (secret) {
        audit_trail.push(
          `secret overridden using environment variable CAL_WEBHOOK_SECRET: ${ctx.env.CAL_WEBHOOK_SECRET}`
        )
      } else {
        audit_trail.push(
          `secret set from environment variable CAL_WEBHOOK_SECRET: ${ctx.env.CAL_WEBHOOK_SECRET}`
        )
      }
      secret = ctx.env.CAL_WEBHOOK_SECRET
    }

    if (!secret) {
      throw new Error(
        `${PREFIX} secret not set. Set a signing secret for your cal.com webhooks either passing it when you instantiate this plugin, or using the environment variable CAL_WEBHOOK_SECRET`
      )
    }

    // Verify the authenticity of the received payload
    // https://cal.com/docs/core-features/webhooks#verifying-the-authenticity-of-the-received-payload

    if (!key) {
      key = await hmacKey(secret)
      audit_trail.push(`created HMAC key using secret: ${secret}`)
    }

    // cal.com uses a hex string as the signature. See here:
    // https://github.com/calcom/cal.com/blob/main/packages/features/webhooks/lib/sendPayload.ts#L153
    const signature_as_hex = ctx.request.headers.get('X-Cal-Signature-256')
    if (!signature_as_hex) {
      return badRequest('missing webhook signature')
    }
    audit_trail.push(`found request header X-Cal-Signature-256`)

    // https://community.cloudflare.com/t/how-do-i-read-the-request-body-as-json/155393/2
    // Here we need to read the request body twice. We can either:
    // - clone the entire request using ctx.request.clone()
    // - use JSON parse on the UTF-8 decoded string
    const req_payload = await ctx.request.arrayBuffer()

    // https://developers.cloudflare.com/fundamentals/get-started/reference/http-request-headers/#x-real-ip
    // https://developers.cloudflare.com/support/troubleshooting/restoring-visitor-ips/restoring-original-visitor-ips/
    const x_real_ip = ctx.request.headers.get('x-real-ip')

    let signature: ArrayBuffer
    if (x_real_ip === '127.0.0.1') {
      // If the POST request originated from localhost (e.g. curl making a POST
      // request to a ngrok forwarding URL), we discard the given signature and
      // compute it here instead. This way we ALWAYS verify the request body.
      signature = await crypto.subtle.sign('HMAC', key, req_payload)
    } else {
      signature = hexStringToArrayBuffer(signature_as_hex)
    }

    const verified = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      req_payload
    )

    if (!verified) {
      return badRequest('invalid cal.com webhook event (signature mismatch)')
    }
    audit_trail.push(`verified X-Cal-Signature-256 using HMAC key`)

    const req_body: CalWebhookEvent = JSON.parse(decoder.decode(req_payload))

    if (shouldValidate) {
      const result = post_request_body.safeParse(req_body)

      if (!result.success) {
        const err = fromZodError(result.error)
        console.log({
          message: `${PREFIX} ${err.name}: ${err.message}`
        })
        return badRequest('invalid cal.com webhook event (invalid schema)')
      }
      audit_trail.push(`validated schema of request body`)
    } else {
      audit_trail.push(`skipped request body validation`)
    }

    // make the validated webhook event available to downstream middlewares and
    // request handlers
    ctx.data.calComValidatedWebhookEvent = req_body
    audit_trail.push(
      `request body stored in ctx.data.calComValidatedWebhookEvent`
    )

    console.log({ message: `${PREFIX} request audit trail`, audit_trail })

    return ctx.next()
  }
}

export const onRequest = async (
  ctx: EventContext<CalComPluginEnv, any, Record<string, CalWebhookEvent>>
) => {
  const fn = calComPlugin({
    secret: ctx.env.CAL_WEBHOOK_SECRET
  })

  return fn(ctx)
}
