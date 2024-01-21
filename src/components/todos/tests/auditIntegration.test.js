// All other todo-endpoint-related tests use a fake audit logger, even with externally integrated tests.
// These tests verify that everything still works properly when a real audit logger implementation is used as well.

import assert from 'node:assert/strict';
import { AuditLog } from '../../auditLogger/AuditLog.js';
import { dateDependency } from '../../../external/date.js';
import { auditLogFileDependency, readAuditLogFile } from '../../../external/auditLogFile.js';
import { AuditLogFileFake } from '../../../external/testDoubles/AuditLogFileFake.js';
import { todosRepositoryDependency } from '../../../external/todosRepository.js';
import { routeToolsDependency } from '../controllers.js';
import { TodosRepositoryFake } from '../../../external/testDoubles/TodosRepositoryFake.js';
import { saveTodo } from './_helpers.js';

const NOW = new Date(Date.UTC(2000, 0, 2, 5, 6, 7));

async function init() {
  await dateDependency.replaceWith({
    getCurrentDate(ctx) {
      return NOW;
    },
  }, { force: true });

  await auditLogFileDependency.replaceWith(new AuditLogFileFake());
  await todosRepositoryDependency.replaceWith(new TodosRepositoryFake());
  await routeToolsDependency.replaceWith({
    initTools: ctx => ({
      auditLog: new AuditLog({ sourceIpAddress: '1.2.3.4' }),
    }),
  });
}

describe('Internal integration between todo endpoints and a real aduit logger', () => {
  specify('it writes the correct message to the log file', async () => {
    await init();

    const todoId = await saveTodo({ text: 'The todo item' });

    const logged = await readAuditLogFile();
    assert(logged.includes(`The TODO item ${todoId} was added.`));
  });
});
