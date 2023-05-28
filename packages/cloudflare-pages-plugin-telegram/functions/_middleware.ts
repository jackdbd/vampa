import type {
  EventContext,
  PagesPluginFunction
} from '@cloudflare/workers-types'
import { errorText } from '@jackdbd/telegram-text-messages'
import { ChatId, makeSendTelegramMessage } from './api/index.js'
import type { Credentials, Client } from './api/index.js'
export type { Client } from './api/index.js'

// https://emojipedia.org/
enum Emoji {
  Hook = '🪝',
  Notification = '💬'
}

const PREFIX = `[ ${Emoji.Notification} telegram-plugin]`

const defaultOrProvided = (default_value: boolean, b?: boolean) => {
  if (b === true || b === false) {
    return b!
  } else {
    return default_value
  }
}

/**
 * Environment variables used by this Cloudflare Pages Functions plugin.
 */
export interface TelegramPluginEnv {
  TELEGRAM?: string
  TELEGRAM_CHAT_ID?: string
  TELEGRAM_TOKEN?: string
}

/**
 * Data that this plugin will add to each fetch request.
 *
 * - If you use "vanilla" Cloudflare Pages Function, access the data at `ctx.data.telegram`
 * - If you use a web framework like Hono, access the data at `ctx.env.eventContext.data.telegram`
 */
export interface Data {
  telegram: Client
}

/**
 * Configuration object for the Telegram plugin.
 */
export interface PluginArgs {
  chat_id?: ChatId
  token?: string
  disable_notification?: boolean
  disable_web_page_preview?: boolean
}

export type PluginData = { telegram: Client }

const defaults = {
  disable_notification: false,
  disable_web_page_preview: true
}

export type TelegramPagesPluginFunction<
  Env extends TelegramPluginEnv = TelegramPluginEnv,
  Params extends string = any,
  Data extends Record<string, unknown> = Record<string, unknown>
> = PagesPluginFunction<Env, Params, Data & PluginData, PluginArgs>

// store the Telegram client in a global variable, so we reuse it across requests
let telegram: Client | undefined = undefined

export const telegramPlugin = <E extends TelegramPluginEnv = TelegramPluginEnv>(
  pluginArgs?: PluginArgs
) => {
  // TODO: decide precedence: args vs TELEGRAM environment variable
  let chat_id = pluginArgs ? pluginArgs.chat_id : undefined
  let token = pluginArgs ? pluginArgs.token : undefined

  return async function telegramPluginInner(
    ctx: EventContext<E, any, Record<string, Client>>
  ) {
    if (!telegram) {
      console.log(`${PREFIX} initialize Telegram client`)
      if (ctx.env && ctx.env.TELEGRAM) {
        const creds = JSON.parse(ctx.env.TELEGRAM) as Credentials
        if (creds.chat_id) {
          chat_id = creds.chat_id
        }
        if (creds.token) {
          token = creds.token
        }
      }

      if (!chat_id) {
        throw new Error(`Telegram chat_id not set`)
      }

      if (!token) {
        throw new Error(`Telegram token not set`)
      }

      telegram = {
        sendMessage: makeSendTelegramMessage({
          chat_id,
          token,
          disable_notification: defaultOrProvided(
            defaults.disable_notification,
            pluginArgs && pluginArgs.disable_notification
          ),
          disable_web_page_preview: defaultOrProvided(
            defaults.disable_web_page_preview,
            pluginArgs && pluginArgs.disable_web_page_preview
          )
        })
      }
    }

    // make the telegram client available to middlewares and handlers
    ctx.data.telegram = telegram

    // same pattern used here:
    // https://github.com/cloudflare/pages-plugins/blob/main/packages/sentry/functions/_middleware.ts
    try {
      return await ctx.next()
    } catch (ex: any) {
      const req_url = new URL(ctx.request.url)
      const err_name = ex.name || 'Error'
      const error_title = `${err_name} encountered at <code>${ctx.request.method} ${req_url.pathname}</code>`

      try {
        const result = await ctx.data.telegram.sendMessage(
          errorText({
            app_name: `${Emoji.Hook} webhooks`,
            app_version: '0.0.1',
            error_title,
            error_message: ex.message || 'no error message'
          })
        )
        console.log({
          ...result,
          message: `${PREFIX} message sent to Telegram chat: ${error_title}`
        })
      } catch (ex: any) {
        console.error({
          error: ex,
          message: `${PREFIX} could not sent message to Telegram chat`
        })
      } finally {
        throw ex
      }
    }
  }
}

export const onRequest = async (
  ctx: EventContext<TelegramPluginEnv, any, Record<string, Client>>
) => {
  const fn = telegramPlugin({
    chat_id: ctx.env.TELEGRAM_CHAT_ID,
    token: ctx.env.TELEGRAM_TOKEN,
    disable_notification: false,
    disable_web_page_preview: true
  })

  return fn(ctx)
}
