export class AuditLogFake {
  #messages = [];

  async log(message) {
    this.#messages.push(message);
  }

  /**
   * Clears the contents of the audit log.
   */
  reset() {
    this.#messages = [];
  }

  contents() {
    return this.#messages.join('\n');
  }
}
