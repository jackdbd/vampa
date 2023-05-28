import type { PagesPluginFunction } from '@cloudflare/workers-types'
// TODO: how do I bundle all .d.ts files into one?
// import type { CalWebhookEvent } from './functions/_schemas.js'

/**
 * Webhook event sent by cal.com
 *
 * @see https://cal.com/docs/core-features/webhooks
 */
export interface CalWebhookEvent {
  triggerEvent: string
  createdAt: string
  payload: any
}

/**
 * Arguments that can be used to configure this plugin.
 */
export interface PluginArgs {
  secret?: string
  shouldValidate?: boolean
}

/**
 * Environment variables that can be used to configure this plugin.
 */
export interface PluginEnv {
  CAL_WEBHOOK_SECRET?: string
}

/**
 * Data that this plugin will add to each `fetch` request.
 */
export type PluginData = { calComValidatedWebhookEvent: CalWebhookEvent }

export type CalComPagesPluginFunction<
  Env extends PluginEnv = PluginEnv,
  Params extends string = any,
  Data extends Record<string, unknown> = Record<string, unknown>
> = PagesPluginFunction<Env, Params, Data & PluginData, PluginArgs>

export default function (args?: PluginArgs): CalComPagesPluginFunction
