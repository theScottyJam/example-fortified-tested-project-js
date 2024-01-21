import assert from 'node:assert';

export class AuditLogFileFake {
  #fileContents = undefined;

  async appendToAuditLogFile(text) {
    this.#fileContents ??= '';
    this.#fileContents += text;
  }

  async readAuditLogFile() {
    assert(this.#fileContents !== undefined, 'The audit log file does not exist.');
    return this.#fileContents;
  }
}
