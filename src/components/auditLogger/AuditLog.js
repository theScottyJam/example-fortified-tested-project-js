import { getCurrentDate } from '../../external/date.js';
import { appendToAuditLogFile } from '../../external/auditLogFile.js';

export class AuditLog {
  #sourceIpAddress;
  constructor({ sourceIpAddress }) {
    this.#sourceIpAddress = sourceIpAddress;
  }

  // Unit tests don't cover this, but integration tests should
  /* c8 ignore start */
  static fromReq(req) {
    return new AuditLog({ sourceIpAddress: req.connection.remoteAddress });
  }
  /* c8 ignore end */

  async log(text) {
    const lineToLog = `${getCurrentDate().toISOString()} ${this.#sourceIpAddress}: ${text}\n`;
    await appendToAuditLogFile(lineToLog);
  };
}
