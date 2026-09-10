/**
 * `__tests__/setup.ts` loads `@testing-library/jest-dom/vitest` at runtime, but
 * the setup file is outside this tsconfig's `include`, so `tsc` never sees the
 * matcher augmentation. Referencing it here registers `toBeInTheDocument`,
 * `toHaveTextContent`, `toBeDisabled`… on vitest's `Assertion` for the whole
 * program — the same reason the admin portal carries this file.
 */
import '@testing-library/jest-dom/vitest';
