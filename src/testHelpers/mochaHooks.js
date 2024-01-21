// This file hooks into the test runner and ensures certain code runs before, after, and between tests.

import '../components/todos/controllers.js';
import { startServer, stopServer } from '../index.js';
import { setup, setTestMode } from '../tools/Dependency.js';

const integratedTestMode = process.env.INTEGRATION_MODE === 'true';
setTestMode(integratedTestMode ? 'integration' : 'unit');

export const mochaHooks = {
  async beforeAll() {
    if (integratedTestMode) {
      startServer();
    }
  },

  afterAll() {
    if (integratedTestMode) {
      stopServer();
    }
  },

  async beforeEach() {
    setup();
  },
};
