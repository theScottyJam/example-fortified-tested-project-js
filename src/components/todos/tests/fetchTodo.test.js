import assert from 'node:assert/strict';
import { sendRequest } from '../../../testHelpers/requests.js';
import { assertRequestError, fetchTodo, saveTodo, RouteToolsFake } from './_helpers.js';
import { todosRepositoryDependency } from '../../../external/todosRepository.js';
import { TodosRepositoryFake } from '../../../external/testDoubles/TodosRepositoryFake.js';
import { routeToolsDependency } from '../controllers.js';

async function init({ initialTodos = [] } = {}) {
  await todosRepositoryDependency.replaceWith(new TodosRepositoryFake());
  await routeToolsDependency.replaceWith(new RouteToolsFake(), { force: true });

  const ids = [];
  for (const initialTodo of initialTodos) {
    ids.push(await saveTodo(initialTodo));
  }

  return ids;
}

describe('GET /todos/:id', () => {
  specify('a successful request returns the correct response information', async () => {
    const [id] = await init({ initialTodos: [{ text: 'The todo item' }] });

    const response = await sendRequest({
      method: 'GET',
      path: `/todos/${encodeURIComponent(id)}`,
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { text: 'The todo item' });
  });

  specify('it returns a not-found error when an invalid ID is given', async () => {
    await init();

    await assertRequestError(
      fetchTodo(12345),
      404,
      /No TODO item with ID 12345 was found./,
    );
  });

  describe('parameter validation', () => {
    specify('invalid path parameter', async () => {
      await init({ initialTodos: [{ text: 'The todo item' }] });
      await assertRequestError(fetchTodo('xxx'), 400, /Expected the "id" field found in the path to be a number./);
    });
  });
});
