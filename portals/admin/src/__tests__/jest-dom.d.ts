/**
 * `vitest.setup.ts` loads `@testing-library/jest-dom/vitest` at runtime, but the
 * setup file is excluded from this tsconfig, so `tsc -b` never sees the matcher
 * augmentation. Referencing it here registers `toBeInTheDocument`,
 * `toHaveTextContent`, `toBeDisabled`… on vitest's `Assertion` for the whole
 * program.
 */
import '@testing-library/jest-dom/vitest';
