// .wrangler/tmp/bundle-Hdk2Vx/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// ../../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}

// lib/index.js
var MAX_CHARS = 4096;
var Emoji;
(function(Emoji2) {
  Emoji2["CocktailGlass"] = "\u{1F378}";
  Emoji2["Error"] = "\u{1F6A8}";
  Emoji2["Failure"] = "\u274C";
  Emoji2["Finished"] = "\u{1F3C1}";
  Emoji2["Notification"] = "\u{1F4AC}";
  Emoji2["Ok"] = "\u2705";
  Emoji2["Started"] = "\u{1F3AC}";
  Emoji2["Stop"] = "\u{1F6D1}";
  Emoji2["Success"] = "\u2705";
  Emoji2["Timer"] = "\u23F1\uFE0F";
  Emoji2["TumblerGlass"] = "\u{1F943}";
  Emoji2["WineGlass"] = "\u{1F377}";
  Emoji2["User"] = "\u{1F464}";
  Emoji2["Warning"] = "\u26A0\uFE0F";
})(Emoji || (Emoji = {}));
var anchor = (link) => `<a href="${link.href}">${link.text}</a>`;
var DEFAULT_OPTIONS = {
  is_title_bold: true,
  is_subtitle_italic: true,
  is_section_title_bold: true
};
var genericText = (config, options = DEFAULT_OPTIONS) => {
  const { description, links, sections, subtitle, title } = config;
  const is_subtitle_italic = options.is_subtitle_italic !== void 0 ? options.is_subtitle_italic : DEFAULT_OPTIONS.is_subtitle_italic;
  const is_title_bold = options.is_title_bold !== void 0 ? options.is_title_bold : DEFAULT_OPTIONS.is_title_bold;
  let s = is_title_bold ? `<b>${title}</b>` : title;
  if (subtitle) {
    s = is_subtitle_italic ? `${s}
<i>${subtitle}</i>` : `${s}
${subtitle}`;
  }
  s = `${s}

${description}`;
  if (sections && sections.length > 0) {
    const is_section_title_bold = options.is_section_title_bold !== void 0 ? options.is_section_title_bold : DEFAULT_OPTIONS.is_section_title_bold;
    const s_sections = sections.map((d) => {
      let s_section = is_section_title_bold ? `<b>${d.title}</b>
${d.body}` : `${d.title}
${d.body}`;
      if (d.links && d.links.length > 0) {
        const s_links = d.links.map(anchor).join("\n");
        s_section = `${s_section}

${s_links}`;
      }
      return s_section;
    }).join("\n\n");
    s = `${s}

${s_sections}`;
  }
  if (links && links.length > 0) {
    const s_links = links.map(anchor).join("\n");
    s = `${s}

${s_links}`;
  }
  if (s.length > MAX_CHARS) {
    throw new Error(`Text message is too long (${s.length} chars). Telegram sendMessage API endpoint accepts a max of ${MAX_CHARS} chars.`);
  }
  return s;
};
var errorText = (config) => {
  const { app_name, app_version, error_message, error_title, links } = config;
  return genericText({
    title: app_name,
    subtitle: app_version,
    description: [
      `<b>${Emoji.Error} ${error_title}</b>`,
      `<pre>${error_message}</pre>`
    ].join("\n"),
    links
  });
};
var DEFAULT_OPTIONS2 = {
  emoji: Emoji.Error,
  should_include_stack_trace: true
};
var DEFAULT_OPTIONS3 = {
  emoji: Emoji.Error,
  should_include_stack_trace: true
};
var PREFIX = "[\u{1F4AC} telegram-plugin]";
var makeSendTelegramMessage = (config) => {
  const { chat_id, token, disable_notification, disable_web_page_preview } = config;
  const options = {
    disable_notification,
    disable_web_page_preview,
    parse_mode: "HTML"
  };
  return async function sendTelegramMessage(text) {
    const successes = [];
    const failures = [];
    const warnings = [];
    const body = {
      chat_id,
      disable_notification: options.disable_notification,
      disable_web_page_preview: options.disable_web_page_preview,
      parse_mode: options.parse_mode,
      text
    };
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          body: JSON.stringify(body),
          headers: {
            "Content-type": `application/json`
          }
        }
      );
      const outcome = await res.json();
      const { ok, result, error_code, description } = outcome;
      const delivered = ok ? true : false;
      let message;
      if (result) {
        message = `${PREFIX} message id ${result.message_id} delivered to chat id ${result.chat.id} (username ${result.chat.username}) by bot ${result.from.first_name}`;
      } else {
        message = `${PREFIX} Telegram error code ${error_code}: ${description}`;
      }
      if (delivered) {
        const delivered_at = new Date(result.date * 1e3).toISOString();
        console.log({
          message,
          delivered,
          delivered_at
        });
        successes.push(message);
      } else {
        console.log({ message });
        warnings.push(message);
      }
    } catch (err) {
      const message = `${PREFIX} could not send Telegram message`;
      console.log({ message, original_error_message: err.message });
      failures.push(message);
    }
    return {
      failures,
      successes,
      warnings
    };
  };
};
var PREFIX2 = `[ ${"\u{1F4AC}"} telegram-plugin]`;
var defaultOrProvided = (default_value, b) => {
  if (b === true || b === false) {
    return b;
  } else {
    return default_value;
  }
};
var defaults = {
  disable_notification: false,
  disable_web_page_preview: true
};
var telegram = void 0;
var telegramPlugin = (pluginArgs2) => {
  let chat_id = pluginArgs2 ? pluginArgs2.chat_id : void 0;
  let token = pluginArgs2 ? pluginArgs2.token : void 0;
  return async function telegramPluginInner(ctx) {
    if (!telegram) {
      console.log(`${PREFIX2} initialize Telegram client`);
      if (ctx.env && ctx.env.TELEGRAM) {
        const creds = JSON.parse(ctx.env.TELEGRAM);
        if (creds.chat_id) {
          chat_id = creds.chat_id;
        }
        if (creds.token) {
          token = creds.token;
        }
      }
      if (!chat_id) {
        throw new Error(`Telegram chat_id not set`);
      }
      if (!token) {
        throw new Error(`Telegram token not set`);
      }
      telegram = {
        sendMessage: makeSendTelegramMessage({
          chat_id,
          token,
          disable_notification: defaultOrProvided(
            defaults.disable_notification,
            pluginArgs2 && pluginArgs2.disable_notification
          ),
          disable_web_page_preview: defaultOrProvided(
            defaults.disable_web_page_preview,
            pluginArgs2 && pluginArgs2.disable_web_page_preview
          )
        })
      };
    }
    ctx.data.telegram = telegram;
    try {
      return await ctx.next();
    } catch (ex) {
      const req_url = new URL(ctx.request.url);
      const err_name = ex.name || "Error";
      const error_title = `${err_name} encountered at <code>${ctx.request.method} ${req_url.pathname}</code>`;
      try {
        const result = await ctx.data.telegram.sendMessage(
          errorText({
            app_name: `${"\u{1FA9D}"} webhooks`,
            app_version: "0.0.1",
            error_title,
            error_message: ex.message || "no error message"
          })
        );
        console.log({
          ...result,
          message: `${PREFIX2} message sent to Telegram chat: ${error_title}`
        });
      } catch (ex2) {
        console.error({
          error: ex2,
          message: `${PREFIX2} could not sent message to Telegram chat`
        });
      } finally {
        throw ex;
      }
    }
  };
};
var onRequest = async (ctx) => {
  const fn = telegramPlugin({
    chat_id: ctx.env.TELEGRAM_CHAT_ID,
    token: ctx.env.TELEGRAM_TOKEN,
    disable_notification: false,
    disable_web_page_preview: true
  });
  return fn(ctx);
};
var routes = [
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest],
    modules: []
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
  var defaultPattern = "[^".concat(escapeString(options.delimiter || "/#?"), "]+?");
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  };
  var consumeText = function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || defaultPattern,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    };
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            route += "((?:".concat(token.pattern, ")").concat(token.modifier, ")");
          } else {
            route += "(".concat(token.pattern, ")").concat(token.modifier);
          }
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request, relativePathname) {
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(relativePathname);
    const mountMatchResult = mountMatcher(relativePathname);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(relativePathname);
    const mountMatchResult = mountMatcher(relativePathname);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
function pages_template_plugin_default(pluginArgs2) {
  const onRequest2 = async (workerContext) => {
    let { request } = workerContext;
    const { env, next: next2 } = workerContext;
    let { data } = workerContext;
    const url = new URL(request.url);
    const relativePathname = `/${url.pathname.replace(workerContext.functionPath, "") || ""}`.replace(/^\/\//, "/");
    const handlerIterator = executeRequest(request, relativePathname);
    const pluginNext = async (input, init) => {
      if (input !== void 0) {
        let url2 = input;
        if (typeof input === "string") {
          url2 = new URL(input, request.url).toString();
        }
        request = new Request(url2, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: workerContext.functionPath + path,
          next: pluginNext,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          pluginArgs: pluginArgs2,
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: workerContext.passThroughOnException.bind(workerContext)
        };
        const response = await handler(context);
        return cloneResponse(response);
      } else {
        return next2(request);
      }
    };
    return pluginNext();
  };
  return onRequest2;
}
var cloneResponse = (response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
);

// __tests__/worker.js
var pluginArgs = { shouldValidate: true };
var onRequestPost = [pages_template_plugin_default(pluginArgs)];
var bind = (worker_ctx) => {
  return worker_ctx;
};
var next = (request) => {
  return request;
};
var worker_default = {
  async fetch(request, env, ctx) {
    const workerContext = {
      data: {},
      env,
      next,
      passThroughOnException: {
        bind
      },
      request,
      waitUntil: {
        bind
      }
    };
    if (request.method === "POST") {
      const response = await onRequestPost[0](workerContext);
      return response;
    }
    return new Response("Hello World!");
  }
};

// ../../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
var jsonError = async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
};
var middleware_miniflare3_json_error_default = jsonError;
var wrap = void 0;

// .wrangler/tmp/bundle-Hdk2Vx/middleware-insertion-facade.js
var envWrappers = [wrap].filter(Boolean);
var facade = {
  ...worker_default,
  envWrappers,
  middleware: [
    middleware_miniflare3_json_error_default,
    ...worker_default.middleware ? worker_default.middleware : []
  ].filter(Boolean)
};
var middleware_insertion_facade_default = facade;

// .wrangler/tmp/bundle-Hdk2Vx/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
var __facade_modules_fetch__ = function(request, env, ctx) {
  if (middleware_insertion_facade_default.fetch === void 0)
    throw new Error("Handler does not export a fetch() function.");
  return middleware_insertion_facade_default.fetch(request, env, ctx);
};
function getMaskedEnv(rawEnv) {
  let env = rawEnv;
  if (middleware_insertion_facade_default.envWrappers && middleware_insertion_facade_default.envWrappers.length > 0) {
    for (const wrapFn of middleware_insertion_facade_default.envWrappers) {
      env = wrapFn(env);
    }
  }
  return env;
}
var registeredMiddleware = false;
var facade2 = {
  ...middleware_insertion_facade_default.tail && {
    tail: maskHandlerEnv(middleware_insertion_facade_default.tail)
  },
  ...middleware_insertion_facade_default.trace && {
    trace: maskHandlerEnv(middleware_insertion_facade_default.trace)
  },
  ...middleware_insertion_facade_default.scheduled && {
    scheduled: maskHandlerEnv(middleware_insertion_facade_default.scheduled)
  },
  ...middleware_insertion_facade_default.queue && {
    queue: maskHandlerEnv(middleware_insertion_facade_default.queue)
  },
  ...middleware_insertion_facade_default.test && {
    test: maskHandlerEnv(middleware_insertion_facade_default.test)
  },
  ...middleware_insertion_facade_default.email && {
    email: maskHandlerEnv(middleware_insertion_facade_default.email)
  },
  fetch(request, rawEnv, ctx) {
    const env = getMaskedEnv(rawEnv);
    if (middleware_insertion_facade_default.middleware && middleware_insertion_facade_default.middleware.length > 0) {
      if (!registeredMiddleware) {
        registeredMiddleware = true;
        for (const middleware of middleware_insertion_facade_default.middleware) {
          __facade_register__(middleware);
        }
      }
      const __facade_modules_dispatch__ = function(type, init) {
        if (type === "scheduled" && middleware_insertion_facade_default.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return middleware_insertion_facade_default.scheduled(controller, env, ctx);
        }
      };
      return __facade_invoke__(
        request,
        env,
        ctx,
        __facade_modules_dispatch__,
        __facade_modules_fetch__
      );
    } else {
      return __facade_modules_fetch__(request, env, ctx);
    }
  }
};
function maskHandlerEnv(handler) {
  return (data, env, ctx) => handler(data, getMaskedEnv(env), ctx);
}
var middleware_loader_entry_default = facade2;
export {
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
