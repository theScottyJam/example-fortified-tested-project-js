import assert from 'node:assert/strict';
import { sendRequest } from '../../../testHelpers/requests.js';
import { assertRequestError, fetchTodo, saveTodo, RouteToolsFake } from './_helpers.js';
import { todosRepositoryDependency } from '../../../external/todosRepository.js';
import { TodosRepositoryFake } from '../../../external/testDoubles/TodosRepositoryFake.js';
import { routeToolsDependency } from '../controllers.js';

async function init() {
  await todosRepositoryDependency.replaceWith(new TodosRepositoryFake());
  await routeToolsDependency.replaceWith(new RouteToolsFake(), { force: true });
}

describe('POST /todos', () => {
  specify('a successful request returns the correct response metadata', async () => {
    await init();

    const response = await sendRequest({
      method: 'POST',
      path: '/todos',
      body: JSON.stringify({ text: 'The todo item' }),
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
  });

  specify('it returns a numeric ID', async () => {
    await init();

    const id = await saveTodo({ text: 'The todo item' });

    assert.equal(typeof id, 'number');
  });

  specify('the returned id can be used to look up the saved todo item', async () => {
    await init();

    const id = await saveTodo({ text: 'The todo item' });

    const savedTodo = await fetchTodo(id);
    assert.equal(savedTodo.text, 'The todo item');
  });

  specify('it logs an audit event', async () => {
    await init();

    const todoId = await saveTodo({ text: 'The todo item' });

    const logged = await RouteToolsFake.getAuditLogContents();
    assert.equal(logged, `The TODO item ${todoId} was added.`);
  });

  describe('parameter validation', () => {
    specify('invalid parameter type', async () => {
      await init();
      await assertRequestError(saveTodo({ text: 42 }), 400, /Expected to find a "text" property of type string in the request body./);
    });

    specify('missing required parameter', async () => {
      await init();
      await assertRequestError(saveTodo({}), 400, /Expected to find a "text" property of type string in the request body./);
    });
  });
});
