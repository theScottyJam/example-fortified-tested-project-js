// This file is in charge of managing the physical audit log file

import fs from 'node:fs';
import { Dependency } from '../tools/Dependency.js';

const LOG_FILE_PATH = 'audit.log';

export const auditLogFileDependency = new Dependency('auditLogFile');

export const appendToAuditLogFile = auditLogFileDependency.define('appendToAuditLogFile', async (text) => {
  await fs.promises.appendFile(LOG_FILE_PATH, text);
});

export const readAuditLogFile = auditLogFileDependency.define('readAuditLogFile', async () => {
  return await fs.promises.readFile(LOG_FILE_PATH, 'utf-8');
});

/* c8 ignore start */ // No need to have full coverage for test-specific code
auditLogFileDependency.beforeUsedInTests.subscribe(async () => {
  try {
    await fs.promises.unlink(LOG_FILE_PATH);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // ignore file-not-found errors
    } else {
      throw error;
    }
  }
});
/* c8 ignore end */
