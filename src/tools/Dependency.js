/*
This file provides the tooling to create and manage "test seams".

To create a test seam, use `const yourDependency = new Dependency('<name of your test seam>')`.

To register a function as part of this seam, use `yourDependency.define('<name of your function>', (...) => { ... })`.
(or, if it is not an async function, use defineSync() instead).

Lets use the following as a concrete example:

    const configFileDependency = new Dependency('configFile');
    const CONF_FILE_PATH = './config.json';

    export const readConfigFile = configFileDependency.define('readConfigFile', async () => {
      return await fs.promises.readFile(CONF_FILE_PATH, 'utf-8');
    });

    export const writeConfigFile = configFileDependency.define('writeConfigFile', async text => {
      await fs.promises.writeFile(CONF_FILE_PATH, text);
    });

When running the application normally, you can call the exported readConfigFile() or writeConfigFile() as normal, and
the implementations passed into `define()` will be executed.

When running tests, you can call `setTestMode('unit')` or `setTestMode('integration')` to notify this utility that we
are in "unit test mode" or "integration test mode" respectively.
If no further action is done, then any calls to readConfigFile() or writeConfigFile() will cause an error to be thrown,
reminding you that you are required to explicitly state the way you want configFileDependency to behave during each test.

When running unit tests, you can replace the implementations with a test double as follows:

    class ConfigFileFake {
      #contents = '';

      async readConfigFile() {
        return this.#contents;
      }

      async writeConfigFile(text) {
        this.#contents = text;
      }
    }

    await configFileDependency.replaceWith(new ConfigFileFake());

When running in unit test mode, whenever your code calls the exported readConfigFile() or writeConfigFile() functions,
the ConfigFileFake versions of those functions will be called instead of the real versions. In integration test mode,
the real versions will be used instead, just like normal, unless you provide a `force: true` parameter to force the
test double replacement to happen, like this:

    await configFileDependency.replaceWith(new ConfigFileFake(), { force: true });

There is also a `configFileDependency.permitUse()` function available that doesn't get used by this example project,
but who's purpose is to tell the dependency to just use the real implementation.
*/

import assert from 'node:assert/strict';

/** Can be set to either undefined (tests aren't running), "unit", or "integration". */
let testMode = undefined;

class EventEmitter {
  #listeners = [];

  subscribe(fn) {
    this.#listeners.push(fn);
  }

  trigger() {
    for (const listener of this.#listeners) {
      listener();
    }
  }

  async triggerAsync() {
    await Promise.all(this.#listeners.map(async listener => {
      await listener();
    }));
  }
}

const onSetup = new EventEmitter();

/**
 * Call this before running your automated tests.
 * The testMode_ argument must be set to either "unit" or "integration".
 */
export function setTestMode(testMode_) {
  assert(['unit', 'integration'].includes(testMode_));
  testMode = testMode_;
}

/**
 * Returns "unit", "integration" or undefined depending on if we are in unit test mode,
 * integration test mode, or not running tests at the moment.
 */
export function getTestMode() {
  return testMode;
}

/** This function should get called in your global before-each. */
export function setup() {
  onSetup.trigger();
}

/** Use this to define a set of functions that you may wish to replace in automated tests with test doubles. */
export class Dependency {
  #dependencyName;
  #behavior;

  /**
   * This event will fire before this dependency gets used by a test.
   * The event fires only if the real implementation is being used.
   * This can be used as a way to automatically provide test setup logic that will always be
   * associated with the real implementation of this dependency.
   */
  beforeUsedInTests = new EventEmitter();

  #defaultBehavior = (() => {
    const assertInTestMode = () => {
      assert(
        testMode === undefined,
        `No behavior was assosiated with the dependency "${this.#dependencyName}". Please use <dependency>.replaceWith() or <dependency>.permitUse().`,
      );
    };

    return {
      async asyncBehavior({ realImplementation, args }) {
        assertInTestMode();
        return await realImplementation(...args);
      },
      syncBehavior({ realImplementation, args }) {
        assertInTestMode();
        return realImplementation(...args);
      },
    };
  })();

  constructor(name) {
    this.#dependencyName = name;
    this.#behavior = this.#defaultBehavior;
    onSetup.subscribe(() => {
      this.reset();
    });
  }

  /** Registers the real implementation of a given async function. */
  define(fnName, realImplementation) {
    return async (...args) => await this.#behavior.asyncBehavior({ args, realImplementation, fnName });
  }

  /** Registers the real implementation of a given synchronous function. */
  defineSync(fnName, realImplementation) {
    return (...args) => this.#behavior.syncBehavior({ args, realImplementation, fnName });
  }

  /**
   * When in unit test mode, causes the real implementation to be swapped for the provided test double.
   * When in integration test mode, the real implementation will still be used (unless `force: true` is set),
   * and the results of using the real implementation will be provided to the fake implementation via a `ctx` parameter,
   * so the fake implementation can verify that it's behaving the same way the real implementation behaves, if wanted.
   */
  async replaceWith(testDouble, { force = false } = {}) {
    assert(['unit', 'integration'].includes(testMode));
    const getRealResult = testMode === 'integration' && !force;
    if (getRealResult) {
      await this.beforeUsedInTests.triggerAsync();
    }

    this.#setBehavior({
      usingTestDouble: testDouble,
      async asyncBehavior({ realImplementation, args, fnName }) {
        return getRealResult
          ? await realImplementation(...args)
          : await testDouble[fnName](...args);
      },
      syncBehavior({ realImplementation, args, fnName }) {
        return getRealResult
          ? realImplementation(...args)
          : testDouble[fnName](...args);
      },
    });
  }

  /**
   * Causes the real behavior to be used.
   */
  async permitUse() {
    await this.beforeUsedInTests.triggerAsync();
    this.#setBehavior({
      asyncBehavior: async ({ realImplementation, args }) => await realImplementation(...args),
      syncBehavior: ({ realImplementation, args }) => realImplementation(...args),
    });
  }

  /**
   * Undoes the effects of replaceWith() or permitUse().
   * This will be done automatically for you between tests
   * (assuming you're correctly calling the setup() function when you should).
   * But, if you also need to reset it in the middle of a test, you can explicitly call this function.
   */
  reset() {
    this.#behavior = this.#defaultBehavior;
  }

  /** Returns the object this dependency is currently being replaced with (i.e. whatever was passed into .replaceWith()) */
  getReplacement() {
    return this.#behavior.usingTestDouble ?? undefined;
  }

  #setBehavior(newBehavior) {
    assert(
      this.#behavior === this.#defaultBehavior,
      `The dependency "${this.#dependencyName}" already has behavior assosiated with it for this test. ` +
      '(Maybe you forgot to call reset() between tests?)',
    );

    this.#behavior = newBehavior;
  }
}
