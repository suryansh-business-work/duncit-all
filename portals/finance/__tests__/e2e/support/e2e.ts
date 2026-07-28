// Loaded before every spec via cypress.config.ts > e2e.supportFile.
import './commands';
// Persists the instrumented `window.__coverage__` into `.nyc_output` after
// every test so `nyc` can merge E2E with unit coverage (see coverage-tasks.ts).
import './coverage';
