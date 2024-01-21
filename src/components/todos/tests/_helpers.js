import assert from 'node:assert';
import { HttpError } from '../../../tools/router.js';
import { sendRequest } from '../../../testHelpers/requests.js';
import { routeToolsDependency } from '../controllers.js';
import { AuditLogFake } from '../../auditLogger/testDoubles/AuditLogFake.js';

export async function fetchAllTodos() {
  return await sendRequest({
    method: 'GET',
    path: '/todos',
  }).then(response => JSON.parse(response.body));
}

export async function fetchTodo(id) {
  return await sendRequest({
    method: 'GET',
    path: `/todos/${encodeURIComponent(id)}`,
  }).then(response => JSON.parse(response.body));
}

export async function saveTodo(body) {
  return await sendRequest({
    method: 'POST',
    path: '/todos',
    body: JSON.stringify(body),
  }).then(response => JSON.parse(response.body));
}

export async function updateTodo(id, body) {
  return await sendRequest({
    method: 'PUT',
    path: `/todos/${encodeURIComponent(id)}`,
    body: JSON.stringify(body),
  });
}

export async function deleteTodo(id) {
  return await sendRequest({
    method: 'DELETE',
    path: `/todos/${encodeURIComponent(id)}`,
  });
}

/**
 * Failed requests all get returned with a similar shape.
 * This helper function can be used to ensure the error response looks the way it should.
 */
export async function assertRequestError(promise, statusCode, bodyPattern = undefined) {
  await assert.rejects(promise, error => {
    assert(error instanceof HttpError, 'Expected an HTTPError instance to be thrown. Received: ' + error.stack);
    assert.equal(error.response.statusCode, statusCode);
    assert.equal(error.response.headers['content-type'], 'text/plain; charset=utf-8');
    if (bodyPattern !== undefined) {
      assert.match(error.response.body, bodyPattern);
    }
    return true;
  });
}

export class RouteToolsFake {
  constructor() {
    this.auditLog = new AuditLogFake();
  }

  initTools() {
    return {
      auditLog: this.auditLog,
    };
  }

  /**
   * Returns the contents of the audit log fake.
   * routeToolsDependency must be replaced with a RouteToolsFake instance for this function to work.
   */
  static getAuditLogContents() {
    return routeToolsDependency.getReplacement().auditLog.contents();
  }
}
