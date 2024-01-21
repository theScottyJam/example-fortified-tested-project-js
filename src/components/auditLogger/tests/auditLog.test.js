import assert from 'node:assert/strict';
import { AuditLog } from '../AuditLog.js';
import { dateDependency } from '../../../external/date.js';
import { auditLogFileDependency, readAuditLogFile } from '../../../external/auditLogFile.js';
import { AuditLogFileFake } from '../../../external/testDoubles/AuditLogFileFake.js';
import { getTestMode } from '../../../tools/Dependency.js';

// Jan 02 2000 05:06:07
const NOW = new Date(Date.UTC(2000, 0, 2, 5, 6, 7));

async function init({ sourceIpAddress = '1.2.3.4', forceMockDate = true } = {}) {
  await dateDependency.replaceWith({
    getCurrentDate(ctx) {
      return NOW;
    },
  }, { force: forceMockDate });

  await auditLogFileDependency.replaceWith(new AuditLogFileFake());

  return new AuditLog({ sourceIpAddress });
}

describe('auditLog', () => {
  specify('it can write a message to the log file in the correct format', async () => {
    const auditLog = await init({ sourceIpAddress: '0.0.0.0' });

    await auditLog.log('This is an audit log message');

    assert.equal(
      await readAuditLogFile(),
      '2000-01-02T05:06:07.000Z 0.0.0.0: This is an audit log message\n',
    );
  });

  if (getTestMode() === 'integration') specify('can use real dependencies to write to the log file in the correct format', async () => {
    const auditLog = await init({ sourceIpAddress: '0.0.0.0', forceMockDate: false });

    await auditLog.log('This is an audit log message');

    const fileContents = await readAuditLogFile();
    assert.match(fileContents, /^[\d-]*T[\d:]*[\d.]*Z 0\.0\.0\.0: This is an audit log message\n$/);
  });

  specify('it can append a message to an existing log file', async () => {
    const auditLog = await init();

    await auditLog.log('message #1');
    await auditLog.log('message #2');

    const fileContents = await readAuditLogFile();
    assert(fileContents.includes('message #1'));
    assert(fileContents.includes('message #2'));
  });
});
