import assert from 'assert/strict';
import { addTodo, findTodo, deleteTodo, listTodos, updateTodo } from '../../external/todosRepository.js';
import { Router, STATUS_CODES } from '../../tools/router.js';
import { AuditLog } from '../auditLogger/AuditLog.js';
import { Dependency } from '../../tools/Dependency.js';

export const routeToolsDependency = new Dependency('routeTools');

// Each request callback receives a "tools" parameter that gets build from
// deriveToolsFromReq() (which gets executed by integration tests and production code),
// or provideToolsForEmulatedReq() (which gets executed by unit tests).
export const router = new Router({
  /* c8 ignore start */ // Unit tests don't cover this, but integration tests should
  deriveToolsFromReq(req) {
    return routeToolsDependency.defineSync('initTools', () => ({
      auditLog: AuditLog.fromReq(req),
    }))();
  },
  /* c8 ignore end */
  provideToolsForEmulatedReq: routeToolsDependency.defineSync('initTools', () => {
    // This function is only executed by unit tests, and those tests should always
    // provide a replacement for this function, meaning this error should never execute.
    /* c8 ignore next */
    throw new Error('An emulated request was made without substitute tools being defined.');
  }),
});

const responses = {
  badRequest(message) {
    return {
      statusCode: STATUS_CODES.BAD_REQUEST,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: message,
    };
  },
  notFound(message) {
    return {
      statusCode: STATUS_CODES.NOT_FOUND,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: message,
    };
  },
};

router.on('GET', '/todos', async () => {
  const todos = await listTodos();
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(todos),
  };
});

router.on('GET', '/todos/:id', async ({ pathParams }) => {
  const id = Number(pathParams.id);
  if (Number.isNaN(id)) {
    return responses.badRequest('Expected the "id" field found in the path to be a number.');
  }

  const todo = await findTodo(id);
  if (todo === undefined) {
    return responses.notFound(`No TODO item with ID ${id} was found.`);
  }

  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(todo),
  };
});

router.on('POST', '/todos', async ({ body, tools }) => {
  const { text } = body;
  const { auditLog } = tools;
  if (typeof text !== 'string') {
    return responses.badRequest('Expected to find a "text" property of type string in the request body.');
  }

  const todoId = await addTodo(text);
  await auditLog.log(`The TODO item ${todoId} was added.`);
  return {
    statusCode: STATUS_CODES.CREATED,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(todoId),
  };
});

router.on('PUT', '/todos/:id', async ({ pathParams, body, tools }) => {
  const { text } = body;
  const { auditLog } = tools;
  const id = Number(pathParams.id);
  if (Number.isNaN(id)) {
    return responses.badRequest('Expected the "id" field found in the path to be a number.');
  }
  if (typeof text !== 'string') {
    return responses.badRequest('Expected to find a "text" property of type string in the request body.');
  }

  const updatedOk = await updateTodo(id, text);
  if (updatedOk.type === 'notFound') {
    return responses.notFound(`No TODO item with ID ${id} was found.`);
  }
  assert(updatedOk.type === 'ok');

  await auditLog.log(`The TODO item ${id} was updated.`);
  return { statusCode: STATUS_CODES.NO_CONTENT };
});

router.on('DELETE', '/todos/:id', async ({ pathParams, tools }) => {
  const { auditLog } = tools;
  const id = Number(pathParams.id);
  if (Number.isNaN(id)) {
    return responses.badRequest('Expected the "id" field found in the path to be a number.');
  }

  const deletedOk = await deleteTodo(id);
  if (deletedOk.type === 'notFound') {
    return responses.notFound(`No TODO item with ID ${id} was found.`);
  }
  assert(deletedOk.type === 'ok');

  await auditLog.log(`The TODO item ${id} was deleted.`);
  return { statusCode: STATUS_CODES.NO_CONTENT };
});
