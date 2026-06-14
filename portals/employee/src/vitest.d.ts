// Registers @testing-library/jest-dom's matchers (toBeInTheDocument, …) onto
// Vitest's `expect` for the typechecker. The runtime registration lives in
// vitest.setup.ts, which is excluded from tsconfig, so the `.test.tsx` files
// (which ARE typechecked) need this declaration for `tsc` to see the matchers.
import '@testing-library/jest-dom/vitest';
