// ***********************************************
// Custom Cypress Commands for IRIS E2E Testing
// ***********************************************

// Configuration constants
// Note: These timeouts are generous to account for React hydration delays
const TIMEOUTS = {
  PAGE_LOAD: 2000,
  REACT_HYDRATION: 1500,  // Time for React to attach event handlers
  API_CALL: 1500,
  MODAL_RENDER: 2000,
  STATE_UPDATE: 300,
};

const SELECTORS = {
  DIALOGUE: '#dialogue',
  TOOLBAR: '[data-testid="top-bar"]', // Updated to use TopBar instead of old toolbar
  PREFERENCES_BUTTON: '[data-testid="preferences-button"]',
  PREFERENCES_MODAL: '[data-testid="preferences-modal"]',
  SAVE_BUTTON: '[data-testid="save-preferences-button"]',
  CLOSE_BUTTON: '[data-testid="close-preferences-button"]',
};

/**
 * Login to IRIS application
 * 
 * Handles the complete authentication flow including:
 * - Navigating to the segmentation page
 * - Detecting if login/registration is required
 * - Auto-registering on first run (no users exist)
 * - Logging in on subsequent runs
 * - Waiting for page initialization
 * 
 * On first run (CI/CD or fresh database):
 * - Detects "I have no account yet" button
 * - Automatically registers the user
 * - First user becomes admin automatically (IRIS behavior)
 * 
 * @param {string} username - Username (default: 'admin')
 * @param {string} password - Password (default: '123')
 * 
 * @example
 * cy.login(); // Uses defaults
 * cy.login('testuser', 'testpass'); // Custom credentials
 */
Cypress.Commands.add('login', (username = 'admin', password = '123') => {
  cy.visit('/segmentation', { 
    timeout: TIMEOUTS.PAGE_LOAD, 
    failOnStatusCode: false 
  });
  
  // Wait for page to load
  cy.wait(TIMEOUTS.PAGE_LOAD);
  
  cy.get('body').should('exist');
  
  // Try to find the login form directly
  cy.get('body').then($body => {
    // Check if login username field exists and is visible
    const $loginUsername = $body.find('#login-username:visible');
    const $registerUsername = $body.find('#register-username:visible');
    
    const isLoginRequired = $loginUsername.length > 0;
    const isRegisterDialog = $registerUsername.length > 0;
    
    cy.log(`Login form visible: ${isLoginRequired}, Register form visible: ${isRegisterDialog}`);
    
    if (isRegisterDialog) {
      // First time - no users exist, need to register
      cy.log(`First run detected - registering user ${username}`);
      
      // Wait for React to fully render and attach event handlers
      cy.wait(TIMEOUTS.REACT_HYDRATION);
      
      cy.get('#register-username').should('be.visible').should('not.be.disabled').clear().type(username);
      cy.get('#register-password').should('be.visible').should('not.be.disabled').clear().type(password);
      cy.get('#register-password-again').should('be.visible').should('not.be.disabled').clear().type(password);
      
      // Fill email if the field exists (required by themed LoginForm)
      cy.get('body').then($body => {
        if ($body.find('#register-email').length > 0) {
          cy.get('#register-email').should('be.visible').clear().type(`${username}@test.com`);
        }
      });
      
      // Click register button (works with both legacy .dialogue and themed LoginForm)
      cy.contains('button', 'Register').click();
      
      // Wait for the page to reload (LoginForm calls window.location.reload())
      cy.url().should('include', '/segmentation');
      cy.wait(TIMEOUTS.PAGE_LOAD);
      
      // Wait for toolbar to appear after reload
      cy.get(SELECTORS.TOOLBAR, { timeout: TIMEOUTS.PAGE_LOAD * 10 })
        .should('exist')
        .and('have.css', 'visibility', 'visible');
      
      cy.log(`Registration successful - ${username} is now admin (first user)`);
    } else if (isLoginRequired) {
      // User exists, need to login
      cy.log(`Login required - authenticating as ${username}`);
      
      // Wait for React to fully render and attach event handlers
      cy.wait(TIMEOUTS.REACT_HYDRATION);
      
      cy.get('#login-username').should('be.visible').should('not.be.disabled').clear().type(username);
      cy.get('#login-password').should('be.visible').should('not.be.disabled').clear().type(password);
      
      // Click login button (works with both legacy .dialogue and themed LoginForm)
      cy.contains('button', 'Login').click();
      
      // Wait for the page to reload (LoginForm calls window.location.reload())
      cy.wait(TIMEOUTS.PAGE_LOAD * 3); // Extra time for reload
      
      // Debug: Check if we're still seeing a login dialog
      cy.get('body').then($body => {
        const $loginForm = $body.find('#login-username:visible');
        if ($loginForm.length > 0) {
          cy.log('⚠️ Login form still visible after reload - login may have failed');
          cy.screenshot('login-failed-dialog-still-visible');
        }
      });
      
      // Wait for toolbar to appear after reload
      cy.get(SELECTORS.TOOLBAR, { timeout: TIMEOUTS.PAGE_LOAD * 10 })
        .should('exist')
        .and('have.css', 'visibility', 'visible');
      
      cy.log('Login successful');
    } else {
      cy.log('Already authenticated or no login required');
      
      // Wait for application to be ready
      cy.get(SELECTORS.TOOLBAR, { timeout: TIMEOUTS.PAGE_LOAD * 10 })
        .should('exist')
        .and('have.css', 'visibility', 'visible');
    }
  });
  
  // Extra wait for React to fully hydrate
  cy.wait(TIMEOUTS.PAGE_LOAD);
  cy.log('Application ready');
});

/**
 * Close help dialogue if it's open
 * 
 * Clicks the X button on the dialogue to close it if visible.
 * Does nothing if the dialogue is not open.
 * 
 * @example
 * cy.closeHelpDialogue();
 */
Cypress.Commands.add('closeHelpDialogue', () => {
  cy.get('body').then($body => {
    // Check for themed HelpModal (data-testid="help-modal")
    const $helpModal = $body.find('[data-testid="help-modal"]');
    if ($helpModal.length > 0 && $helpModal.is(':visible')) {
      cy.log('Closing themed help modal...');
      cy.get('[data-testid="close-help-button"]').click({ force: true });
      cy.wait(500);
      cy.get('[data-testid="help-modal"]').should('not.exist');
      return;
    }
    // Fallback: check for legacy #dialogue
    const $dialogue = $body.find('#dialogue');
    if ($dialogue.length > 0 && $dialogue.css('display') !== 'none' && $dialogue.is(':visible')) {
      cy.log('Closing legacy dialogue...');
      cy.get('#dialogue-close').click({ force: true });
      cy.wait(500);
      cy.get('#dialogue').should('not.be.visible');
    }
  });
});

/**
 * Open the preferences modal
 * 
 * Clicks the preferences button and waits for the modal to load.
 * Automatically closes help dialog if it's open.
 * 
 * @example
 * cy.openPreferences();
 */
Cypress.Commands.add('openPreferences', () => {
  // Close help dialogue if it's open (appears on first launch)
  cy.closeHelpDialogue();
  
  // Wait a bit for any animations to complete
  cy.wait(1000);
  
  // Intercept config fetch to know when modal is ready
  cy.intercept('GET', '/segmentation/api/user-config').as('getUserConfig');
  
  // Click preferences button (force: true bypasses visibility checks for clipped elements)
  cy.get(SELECTORS.PREFERENCES_BUTTON)
    .should('exist')
    .click({ force: true });
  
  // Wait for config to load and modal to render
  cy.wait('@getUserConfig', { timeout: TIMEOUTS.API_CALL });
  cy.get(SELECTORS.PREFERENCES_MODAL).should('be.visible');
});

/**
 * Save preferences and close the modal
 * 
 * Clicks the save button and waits for the save API call to complete.
 * The modal should close automatically on successful save.
 * 
 * @example
 * cy.savePreferences();
 */
Cypress.Commands.add('savePreferences', () => {
  // Intercept save API call
  cy.intercept('POST', '/segmentation/api/user-config').as('saveConfig');
  
  // Click save button (force: true to handle modal overflow/positioning)
  cy.get(SELECTORS.SAVE_BUTTON).click({ force: true });
  
  // Wait for save to complete
  cy.wait('@saveConfig', { timeout: TIMEOUTS.API_CALL }).then((interception) => {
    if (interception.response.statusCode !== 200) {
      cy.log(`WARNING: Save returned status ${interception.response.statusCode}`);
    }
  });
  
  // Verify modal closed (React unmounts it, so it won't exist in DOM)
  cy.get(SELECTORS.PREFERENCES_MODAL).should('not.exist');
});

/**
 * Close preferences modal without saving
 * 
 * Clicks the close button to dismiss the modal.
 * 
 * @example
 * cy.closePreferences();
 */
Cypress.Commands.add('closePreferences', () => {
  cy.get(SELECTORS.CLOSE_BUTTON).click({ force: true });
  // Verify modal closed (React unmounts it, so it won't exist in DOM)
  cy.get(SELECTORS.PREFERENCES_MODAL).should('not.exist');
});

/**
 * Select the Segmentation AI tab in the preferences modal
 * 
 * Clicks the Segmentation AI tab button to switch to that tab.
 * Should be called after openPreferences().
 * 
 * @example
 * cy.openPreferences();
 * cy.selectSegmentationAITab();
 */
Cypress.Commands.add('selectSegmentationAITab', () => {
  cy.log('Selecting Segmentation AI tab...');
  cy.get('[data-testid="tab-segmentation-ai"]')
    .should('be.visible')
    .click();
  
  // Wait for tab content to render
  cy.wait(TIMEOUTS.STATE_UPDATE);
  cy.log('✓ Segmentation AI tab selected');
});

/**
 * Set a slider value by typing into its editable number input
 * 
 * Uses data-testid for robust, semantic selection.
 * Directly sets the value and triggers React's onChange event.
 * 
 * Note: Sliders have editable number inputs for better UX and testability.
 * 
 * @param {string} testId - The data-testid value (without 'data-testid=' prefix)
 * @param {number|string} value - The value to set
 * 
 * @example
 * cy.setSliderValue('input-n-estimators', 120);
 * cy.setSliderValue('input-max-depth', 60);
 */
Cypress.Commands.add('setSliderValue', (testId, value) => {
  cy.log(`Setting slider [data-testid="${testId}"] to ${value}`);
  
  // Set value directly and trigger React onChange
  cy.get(`[data-testid="${testId}"]`).then($input => {
    const input = $input[0];
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    
    // Set the value using native setter
    nativeInputValueSetter.call(input, String(value));
    
    // Trigger React's onChange by dispatching input event
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);
    
    // Also trigger change event for good measure
    const changeEvent = new Event('change', { bubbles: true });
    input.dispatchEvent(changeEvent);
  });
  
  // Wait for React state update
  cy.wait(TIMEOUTS.STATE_UPDATE);
  
  // Verify the value was set
  cy.get(`[data-testid="${testId}"]`)
    .should('have.value', String(value));
  
  cy.log(`✓ Slider [data-testid="${testId}"] updated to ${value}`);
});
