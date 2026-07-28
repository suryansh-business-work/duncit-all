// Loaded before every spec via cypress.config.ts > e2e.supportFile.
import './commands';

// react-native-web + Metro's dev runtime raise async warnings (fonts, video,
// reanimated) that never reached the Playwright suite, which only failed on
// assertions. Keep that contract: app errors are asserted, not inferred.
Cypress.on('uncaught:exception', () => false);
