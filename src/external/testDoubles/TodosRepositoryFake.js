export class TodosRepositoryFake {
  #nextId = 1;
  #todos = [];
  async listTodos() {
    return [...this.#todos];
  }

  async findTodo(id) {
    const todo = this.#todos.find(todo => todo.id === id);
    if (todo === undefined) {
      return undefined;
    }

    return { text: todo.text };
  }

  async addTodo(text) {
    const id = this.#nextId;
    this.#nextId++;

    this.#todos.push({ id, text });
    return id;
  }

  async updateTodo(id, text) {
    const index = this.#todos.findIndex(todo => todo.id === id);
    if (index === -1) {
      return { type: 'notFound' };
    }

    this.#todos[index] = {
      ...this.#todos[index],
      text,
    };

    return { type: 'ok' };
  }

  async deleteTodo(id) {
    const index = this.#todos.findIndex(todo => todo.id === id);
    if (index === -1) {
      return { type: 'notFound' };
    }

    this.#todos.splice(index, 1);
    return { type: 'ok' };
  }
}
