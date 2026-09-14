/**
 * Cypress E2E Test Suite: Segmentation AI Preferences
 * 
 * Tests the preferences modal functionality including:
 * 1. Basic modal open/close operations
 * 2. Editing AI model parameters and persisting across page reloads
 * 3. Form validation (preventing invalid configurations)
 * 
 * @see cypress/support/commands.js for custom command implementations
 */

// Test-specific timeouts
// Note: These are longer than command timeouts to account for page reloads
const TIMEOUTS = {
  PAGE_RELOAD_WAIT: 2000,  // Time for React to fully hydrate after reload
  TOOLBAR_READY: 3000,     // Max time to wait for toolbar to appear
  VALIDATION_CHECK: 1000,  // Time to wait for validation errors to appear
};

describe('Preferences Modal - Segmentation AI Tab', () => {
  beforeEach(() => {
    // Authenticate before each test to ensure clean state
    cy.login();
  });

  it('should open and close the preferences dialog', () => {
    // Open preferences
    cy.openPreferences();
    
    // Select Segmentation AI tab
    cy.selectSegmentationAITab();
    
    // Verify modal is open
    cy.get('[data-testid="preferences-modal"]').should('be.visible');
    cy.get('[data-testid="preferences-modal"]').contains('Preferences').should('be.visible');
    
    // Close preferences and verify
    cy.closePreferences();
  });

  it('should save all preferences and persist after page reload', () => {
    // Test configuration values (different from defaults to verify persistence)
    const testValues = {
      n_estimators: 120,        // Default: 20
      max_depth: 60,             // Default: 10
      n_leaves: 40,              // Default: 31
      meshgrid_cells: '7x7',     // Default: '5x5'
      suppression_filter_size: '5', // Default: '3'
      suppression_threshold: 80  // Default: 50
    };
    
    cy.openPreferences();
    cy.selectSegmentationAITab();
    
    // === STEP 1: Modify AI Model Parameters ===
    cy.log('Modifying AI model parameters...');
    
    // Update slider values (now editable number inputs)
    cy.setSliderValue('input-n-estimators', testValues.n_estimators);
    cy.setSliderValue('input-max-depth', testValues.max_depth);
    cy.setSliderValue('input-n-leaves', testValues.n_leaves);
    
    // Update dropdown selections
    cy.get('[data-testid="select-meshgrid-cells"]').select(testValues.meshgrid_cells);
    cy.get('[data-testid="select-suppression-filter-size"]').select(testValues.suppression_filter_size);
    
    // Update checkbox
    cy.get('[data-testid="checkbox-use-edge-filter"]').click();
    
    // Update postprocessing slider
    cy.setSliderValue('input-suppression-threshold', testValues.suppression_threshold);
    
    // === STEP 2: Save Configuration ===
    cy.log('Saving configuration...');
    cy.savePreferences();
    
    // === STEP 3: Reload Page ===
    cy.log('Reloading page to verify persistence...');
    cy.reload();
    
    // Wait for application to reinitialize
    cy.get('[data-testid="top-bar"]', { timeout: TIMEOUTS.TOOLBAR_READY }).should('be.visible');
    cy.wait(TIMEOUTS.PAGE_RELOAD_WAIT); // Extra time for React hydration after reload
    
    // === STEP 4: Verify Persistence ===
    cy.log('Verifying saved values persisted...');
    cy.openPreferences();
    cy.selectSegmentationAITab();
    
    // Verify all values match what we saved
    cy.get('[data-testid="input-n-estimators"]')
      .should('have.value', testValues.n_estimators.toString());
    
    cy.get('[data-testid="input-max-depth"]')
      .should('have.value', testValues.max_depth.toString());
    
    cy.get('[data-testid="input-n-leaves"]')
      .should('have.value', testValues.n_leaves.toString());
    
    cy.get('[data-testid="select-meshgrid-cells"]')
      .should('have.value', testValues.meshgrid_cells);
    
    cy.get('[data-testid="select-suppression-filter-size"]')
      .should('have.value', testValues.suppression_filter_size);
    
    cy.get('[data-testid="input-suppression-threshold"]')
      .should('have.value', testValues.suppression_threshold.toString());
    
    cy.closePreferences();
  });

  it('should show error when trying to save with no bands selected', () => {
    cy.openPreferences();
    cy.selectSegmentationAITab();
    
    // Move all bands to excluded
    cy.get('[data-testid="select-bands-included"] option')
      .should('have.length.greaterThan', 0) // Ensure bands exist
      .then($options => {
        // Select all bands
        cy.get('[data-testid="select-bands-included"]').invoke('val', 
          Array.from($options).map(opt => opt.value)
        );
        
        // Move them all to excluded
        cy.get('[data-testid="button-move-bands-right"]').click();
        
        // Try to save
        cy.get('[data-testid="save-preferences-button"]').click({ force: true });
        
        // Should show an error message (this is the key validation test)
        // Use a longer timeout and scroll into view since modal might have overflow
        cy.get('[data-testid="preferences-error-message"]', { timeout: TIMEOUTS.PAGE_RELOAD_WAIT })
          .should('exist')
          .scrollIntoView()
          .should('be.visible')
          .and('contain', '[Segmentation] Need at least one band as input!');
        
        // Modal should remain open when there's a validation error
        cy.get('[data-testid="preferences-modal"]').should('be.visible');
      });
  });
});
