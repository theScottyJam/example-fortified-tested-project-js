import assert from 'node:assert/strict';
import { sendRequest } from '../../../testHelpers/requests.js';
import { assertRequestError, deleteTodo, fetchTodo, saveTodo, RouteToolsFake } from './_helpers.js';
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

describe('DELETE /todos/:id', () => {
  specify('a successful request returns the correct response information', async () => {
    const [id] = await init({ initialTodos: [{ text: 'The todo item' }] });

    const response = await sendRequest({
      method: 'DELETE',
      path: `/todos/${encodeURIComponent(id)}`,
    });

    assert.equal(response.statusCode, 204);
  });

  specify('it can delete a saved todo item', async () => {
    const [id] = await init({ initialTodos: [{ text: 'The todo item' }] });

    await deleteTodo(id);

    await assertRequestError(fetchTodo(id), 404);
  });

  specify('it returns a not-found error when an invalid ID is given', async () => {
    await init();

    await assertRequestError(
      deleteTodo(12345),
      404,
      /No TODO item with ID 12345 was found./,
    );
  });

  specify('it logs an audit event', async () => {
    const [id] = await init({ initialTodos: [{ text: 'The todo item' }] });

    await deleteTodo(id);

    const logged = await RouteToolsFake.getAuditLogContents();
    assert.equal(logged, `The TODO item ${id} was deleted.`);
  });

  describe('parameter validation', () => {
    specify('invalid path parameter', async () => {
      await init({ initialTodos: [{ text: 'The todo item' }] });
      await assertRequestError(deleteTodo('xxx', { text: 'The updated todo item' }), 400, /Expected the "id" field found in the path to be a number./);
    });
  });
});
