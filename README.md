# Example Fortified Tested Project (JavaScript)

This project is a TODO-management REST API written in Node, and tested in accordance with the guidelines outlined in [the Fortified Testing Philosophy](https://thescottyjam.github.io/fortified-testing-philosophy/revisions/1/). It's purpose is to demonstrate one way to follow the philosophy, but it isn't the only way. As one example - in order to replace dependencies with test doubles, it uses a pattern akin to the service locator pattern, but you could also use dependency inversion if you prefer. Bear in mind that this project is just an example - the core business logic is fairly simple (so as to be easier to comprehend), and the testing effort being put into it is overkill for what little it does, but hopefully it can still do the job of demonstrating the philosophy in action.

Comments or questions? Feel free to [open an issue](https://github.com/theScottyJam/example-fortified-tested-project-js/issues) or [start a discussion](https://github.com/theScottyJam/example-fortified-tested-project-js/discussions) on gitHub.

## Using this project

This project supports Node version 18 and later.

Do an `npm ci` to install dependencies. If this fails, it may be because of the better-sqlite3 dependency which has to run custom build logic on your machine. Try following [its troubleshooting guide](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/troubleshooting.md) to fix any issues.

Start the web server with `npm start`. Look at src/components/todos/controllers.js to see what endpoints are available to be used.

Run the unit tests with `npm run test`.

Run the integration tests with `npm run test:integration`.

When the tests run, a code coverage report will be generated. A summary will show after the tests have finished. A detailed report that shows any coverage errors can also be found by viewing the generated coverage/index.html file in your browser. The code coverage tool is configured to ignore different files and folders depending on if you're running unit or integration tests. See package.json for details on how it is configured.

## Project structure

### src/components/

This holds the main business logic of the application. It is divided into separate "components", where each component is generally tested in isolated - the exception being src/components/todos/tests/auditIntegration.test.js, which tests the (internal) integration between the todos component and the auditLog component.

### src/external/

Any time the business logic needs to interact with an external dependency (such as the file system), it does so through a function exported from this external/ folder. These external-providing files are intended to be thin, with most logic happening in components/. No unit tests are written against this area of the code base, but integration tests do pass through it.

### src/tools/

This folder contains stand-alone tools that help support development using the Fortified Testing Philosophy. Please refer to the files in src/tools/ for documentation on how to use them - they're heavily used throughout the codebase, and it may be difficult to understand the codebase without first understanding how these core tools operate. These tools are complete enough to support this example project, but may need some tweaking if you wish to use them in your own project. In the future, some NPM packages will be provided to help aid this style of testing.
