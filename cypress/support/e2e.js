// ***********************************************************
// This file is processed and loaded automatically before your test files.
// ***********************************************************

import './commands';

// Prevent Cypress from failing on uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  return false;
});
