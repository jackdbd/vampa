import type { PagesPluginFunction } from "@cloudflare/workers-types";

export type ChatId = string | number;

export interface Credentials {
  chat_id: ChatId;
  token: string;
}

export interface Config {
  chat_id: ChatId;
  token: string;
  disable_notification: boolean;
  disable_web_page_preview: boolean;
}

/**
 * Arguments that can be used to configure this plugin.
 */
export interface PluginArgs {
  chat_id?: ChatId;
  token?: string;
  disable_notification?: boolean;
  disable_web_page_preview?: boolean;
}

/**
 * Environment variables that can be used to configure this plugin.
 */
export interface TelegramPluginEnv {
  TELEGRAM?: string;
  TELEGRAM_CHAT_ID?: string;
  TELEGRAM_TOKEN?: string;
}

export type SendMessage = (text: string) => Promise<{
  successes: string[];
  failures: string[];
  warnings: string[];
}>;

export interface Client {
  sendMessage: SendMessage;
}

export type PluginData = { telegram: Client };

export type TelegramPagesPluginFunction<
  Env extends TelegramPluginEnv = TelegramPluginEnv,
  Params extends string = any,
  Data extends Record<string, unknown> = Record<string, unknown>
> = PagesPluginFunction<Env, Params, Data & PluginData, PluginArgs>;

export default function (args?: PluginArgs): TelegramPagesPluginFunction;
