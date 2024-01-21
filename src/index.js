import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { router } from './components/todos/controllers.js';

export const PORT = 8080;

// Change the current working directory to the project root, so paths can be made relative to it.
// The first dirname() call removes the file name from the path, and the second takes us out of the src/ folder.
process.chdir(dirname(dirname(fileURLToPath(import.meta.url))));

export function stopServer() {
  router.stopServer();
}

export async function startServer() {
  await router.startServer(PORT);
  console.info(`Server running on port ${PORT}`);
}
