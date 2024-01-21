// This file is in charge of providing the system's current time.

import { Dependency } from '../tools/Dependency.js';

export const dateDependency = new Dependency('date');

export const getCurrentDate = dateDependency.defineSync('getCurrentDate', () => {
  return new Date();
});
