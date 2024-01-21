import assert from 'node:assert/strict';
import { getTestMode } from '../tools/Dependency.js';
import { PORT } from '../index.js';
import { router } from '../components/todos/controllers.js';
import { HttpError } from '../tools/router.js';

/**
 * Sends a request to this service.
 * If we're in unit-test mode, this will just ask the router to emulate the request being sent.
 * If we're in integration-test mode, this will send a real request to the running service.
 */
export async function sendRequest({ method, path, body, headers: rawHeaders = {} }) {
  const headers = new Headers(rawHeaders);
  if (body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
  }

  if (getTestMode() === 'integration') {
    assert(path.startsWith('/'));
    const response = await fetch(`http://localhost:${PORT}${path}`, { method, body, headers });
    const responseBody = await response.text();
    const extractedInfo = {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers),
      body: responseBody,
    };

    if (extractedInfo.statusCode >= 300) {
      throw new HttpError(extractedInfo);
    } else {
      return extractedInfo;
    }
  } else {
    assert.equal(getTestMode(), 'unit');
    return await router.emulateRequest({ method, path, body, headers });
  }
}
