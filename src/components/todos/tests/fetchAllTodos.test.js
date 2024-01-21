import assert from 'node:assert/strict';
import { sendRequest } from '../../../testHelpers/requests.js';
import { fetchAllTodos, saveTodo, RouteToolsFake } from './_helpers.js';
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

describe('GET /todos', () => {
  specify('a successful request returns the correct response information', async () => {
    const [id1, id2] = await init({ initialTodos: [{ text: 'todo item #1' }, { text: 'todo item #2' }] });

    const response = await sendRequest({
      method: 'GET',
      path: '/todos',
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), [
      { id: id1, text: 'todo item #1' },
      { id: id2, text: 'todo item #2' },
    ]);
  });

  specify('it returns an empty list if no todo items are created', async () => {
    await init({ initialTodos: [] });

    assert.deepEqual(await fetchAllTodos(), []);
  });
});
