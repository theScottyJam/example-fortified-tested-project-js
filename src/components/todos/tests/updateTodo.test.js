import assert from 'node:assert/strict';
import { sendRequest } from '../../../testHelpers/requests.js';
import { assertRequestError, fetchTodo, saveTodo, updateTodo, RouteToolsFake } from './_helpers.js';
import { todosRepositoryDependency } from '../../../external/todosRepository.js';
import { TodosRepositoryFake } from '../../../external/testDoubles/TodosRepositoryFake.js';
import { routeToolsDependency } from '../controllers.js';

async function init({ initialTodos = [] } = {}) {
  await todosRepositoryDependency.replaceWith(new TodosRepositoryFake());
  const routeToolsFake = new RouteToolsFake();
  await routeToolsDependency.replaceWith(routeToolsFake, { force: true });

  const ids = [];
  for (const initialTodo of initialTodos) {
    ids.push(await saveTodo(initialTodo));
  }

  routeToolsFake.auditLog.reset();
  return ids;
}

describe('PUT /todos/:id', () => {
  specify('a successful request returns the correct response information', async () => {
    const [id] = await init({ initialTodos: [{ text: 'The todo item' }] });

    const response = await sendRequest({
      method: 'PUT',
      path: `/todos/${encodeURIComponent(id)}`,
      body: JSON.stringify({ text: 'The updated todo item' }),
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.body, '');
  });

  specify('it can update a saved todo item', async () => {
    const [id] = await init({ initialTodos: [{ text: 'The todo item' }] });

    await updateTodo(id, { text: 'The updated todo item' });

    const savedTodo = await fetchTodo(id);
    assert.equal(savedTodo.text, 'The updated todo item');
  });

  specify('it returns a not-found error when an invalid ID is given', async () => {
    await init();

    await assertRequestError(
      updateTodo(12345, { text: 'The updated todo item' }),
      404,
      /No TODO item with ID 12345 was found./,
    );
  });

  specify('it logs an audit event', async () => {
    const [id] = await init({ initialTodos: [{ text: 'The todo item' }] });

    await updateTodo(id, { text: 'The updated todo item' });

    const logged = await RouteToolsFake.getAuditLogContents();
    assert.equal(logged, `The TODO item ${id} was updated.`);
  });

  describe('parameter validation', () => {
    specify('invalid path parameter', async () => {
      await init({ initialTodos: [{ text: 'The todo item' }] });
      await assertRequestError(updateTodo('xxx', { text: 'The updated todo item' }), 400, /Expected the "id" field found in the path to be a number./);
    });

    specify('invalid parameter type', async () => {
      const [id] = await init({ initialTodos: [{ text: 'The todo item' }] });
      await assertRequestError(updateTodo(id, { text: 42 }), 400, /Expected to find a "text" property of type string in the request body./);
    });

    specify('missing required parameter', async () => {
      const [id] = await init({ initialTodos: [{ text: 'The todo item' }] });
      await assertRequestError(updateTodo(id, {}), 400, /Expected to find a "text" property of type string in the request body./);
    });
  });
});
