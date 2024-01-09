import plugin from '../lib/index.js'

const pluginArgs = { shouldValidate: true }

const onRequestPost = [plugin(pluginArgs)]

// console.log(`=== self ===`, self)

// TODO: this is very hacky and incomplete, but I couldn't figure out how to
// implement the worker context. Also, move this test utils to a standalone package.

const bind = (worker_ctx) => {
  // console.log(`bind worker_ctx`, worker_ctx)
  return worker_ctx
}

const next = (request) => {
  // console.log(`next request`, request)
  return request
}

export default {
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
    }

    if (request.method === 'POST') {
      const response = await onRequestPost[0](workerContext)
      return response
    }

    return new Response('Hello World!')
  }
}
