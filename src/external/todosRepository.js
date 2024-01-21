// This file is in charge of all communication with the todos table in the database.

import Database from 'better-sqlite3';
import { Dependency, getTestMode } from '../tools/Dependency.js';

let db;
// If we are not testing right now, or if we are running integration tests,
// then create and set up the database.
if ([undefined, 'integration'].includes(getTestMode())) {
  db = new Database(':memory:');

  await db.prepare(`
    CREATE TABLE todos (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL
    )
  `).run();
}

export const todosRepositoryDependency = new Dependency('todosRepository');

export const listTodos = todosRepositoryDependency.define('listTodos', async () => {
  return await db.prepare('SELECT id, text FROM todos;').all();
});

export const findTodo = todosRepositoryDependency.define('findTodo', async (id) => {
  return await db.prepare('SELECT text FROM todos WHERE id = ?;').get(id);
});

export const addTodo = todosRepositoryDependency.define('addTodo', async text => {
  const response = await db.prepare('INSERT INTO todos (text) VALUES (?);').run(text);
  return response.lastInsertRowid;
});

export const updateTodo = todosRepositoryDependency.define('updateTodo', async (id, text) => {
  const response = await db.prepare('UPDATE todos SET text = ? WHERE id = ?;').run(text, id);
  return { type: response.changes > 0 ? 'ok' : 'notFound' };
});

export const deleteTodo = todosRepositoryDependency.define('deleteTodo', async (id, text) => {
  const response = await db.prepare('DELETE FROM todos WHERE id = ?;').run(id);
  return { type: response.changes > 0 ? 'ok' : 'notFound' };
});

todosRepositoryDependency.beforeUsedInTests.subscribe(async () => {
  await db.prepare('DELETE FROM todos;').run();
});
