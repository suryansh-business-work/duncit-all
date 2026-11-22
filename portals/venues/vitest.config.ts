import { defineConfig } from 'vitest/config';

// Unit specs live in __tests__/unit-tests, plus the colocated *.form.cy.tsx specs
// the form structure (rule 17) asks for; the lcov is what SonarQube reads.
// main.tsx only mounts the portal and is outside Sonar's coverage scope too.
export default defineConfig({
  test: {
    include: ['__tests__/unit-tests/**/*.test.{ts,tsx}', 'src/**/*.cy.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.cy.{ts,tsx}'],
    },
  },
});
