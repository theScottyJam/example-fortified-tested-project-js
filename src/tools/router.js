/*
Provides a router for the application to use. The router is designed with a couple of nice features in mind:
1. The callbacks are triggered with plain JavaScript objects containing the request body/headers/etc and are expected
   to return plain objects describing what body/headers/etc should get returned. The use of plain objects makes it
   easy to write tests against these callbacks.
2. An emulateRequest() function is provided that can be used to automatically find and trigger a callback given a request's path.
   This makes it easy to write tests that can either send a real request, or a fake request through this emulateRequest() function,
   depending on if you're wanting to write unit tests or integration tests.
*/

import assert from 'node:assert/strict';
import express from 'express';

export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

export class Router {
  #routeHandlers = [];
  #server;
  #deriveToolsFromReq;
  #provideToolsForEmulatedReq;

  constructor({ deriveToolsFromReq, provideToolsForEmulatedReq } = {}) {
    this.#deriveToolsFromReq = deriveToolsFromReq ?? (() => ({}));
    this.#provideToolsForEmulatedReq = provideToolsForEmulatedReq ?? (() => ({}));
  }

  on(method, path, callback) {
    assert(typeof path === 'string', 'Only string paths are currently supported');
    assert.doesNotMatch(path, /\*\+\?\(\)/, 'Pattern-matching characters, such as "*", "+", "?", "(", and ")" are currently not supported.');
    this.#routeHandlers.push({ method, path, callback });
  }

  async startServer(port) {
    assert(this.#server === undefined, 'The server is already running');

    const app = express();
    app.use(express.json({ strict: false }));

    for (const { method, path, callback } of this.#routeHandlers) {
      app[method.toLowerCase()](path, async (req, res, next) => {
        let callbackResponse;
        try {
          callbackResponse = await callback({
            pathParams: req.params,
            body: req.body,
            tools: this.#deriveToolsFromReq(req),
          });
        } catch (error) {
          return next(error);
        }

        res.header(callbackResponse?.headers ?? {});
        res.status(callbackResponse?.statusCode ?? STATUS_CODES.OK);
        res.send(callbackResponse?.body ?? '');
      });
    }

    // Register a 500 error handler
    app.use((error, req, res, next) => {
      if (res.headersSent) {
        return next(error);
      }

      res
        .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
        .send(
          process.env.NODE_ENV !== 'production'
            ? error.stack
            : 'An internal error occured.',
        );
    });

    return new Promise(resolve => {
      this.#server = app.listen(port, resolve);
    });
  }

  stopServer() {
    this.#server.close();
    this.#server = undefined;
  }

  async emulateRequest({ method, path, body, headers }) {
    for (const routeHandler of this.#routeHandlers) {
      if (routeHandler.method.toUpperCase() !== method.toUpperCase()) {
        continue;
      }

      const maybeMatchInfo = this.#matchPath(routeHandler.path, path);
      if (maybeMatchInfo === null) {
        continue;
      }

      const response = await routeHandler.callback({
        pathParams: maybeMatchInfo?.pathVars,
        body: headers.get('Content-Type')?.split(';')[0] === 'application/json' ? JSON.parse(body) : body,
        headers: Object.fromEntries(headers),
        tools: this.#provideToolsForEmulatedReq(),
      });

      const extractedInfo = {
        statusCode: response.statusCode ?? STATUS_CODES.OK,
        // Normalizes headers, such as lowercasing the keys.
        headers: Object.fromEntries(new Headers(response.headers)),
        body: response.body ?? '',
      };

      if (extractedInfo.statusCode >= 300) {
        throw new HttpError(extractedInfo);
      } else {
        return extractedInfo;
      }
    }
    throw new Error(`Failed to find a route handler for ${method} ${path}`);
  }

  #matchPath(pathPattern, realPath) {
    const pathPatternSegments = pathPattern.split('/');
    const realPathSegments = realPath.split('/');
    const pathVars = Object.create(null);

    if (pathPatternSegments.length !== realPathSegments.length) {
      return null;
    }

    for (let i = 0; i < pathPatternSegments.length; i++) {
      if (pathPatternSegments[i].startsWith(':')) {
        const varName = pathPatternSegments[i].slice(1);
        pathVars[varName] = decodeURIComponent(realPathSegments[i]);
      } else if (pathPatternSegments[i] === realPathSegments[i]) {
        continue;
      } else {
        return null;
      }
    }

    return { pathVars };
  }
}

export class HttpError extends Error {
  constructor({ statusCode, headers, body }) {
    super([
      `Received an HTTP response with the bad status code of ${statusCode}.`,
      '~~ truncated response body ~~',
      body.slice(0, 5_000),
    ].join('\n'));

    // Set the property as non-enumerable, so Node
    // doesn't display it as part of the uncaught error.
    // (This is important, as the object could be fairly large).
    Object.defineProperty(this, 'response', {
      value: { statusCode, headers, body },
      enumerable: false,
    });
  }
}
