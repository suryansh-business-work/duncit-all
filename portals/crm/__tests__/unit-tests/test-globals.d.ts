// Loads the `@testing-library/jest-dom` augmentation into the TypeScript
// project so unit tests can use matchers like `.toBeInTheDocument()`. The
// matchers are runtime-loaded via `vitest.setup.ts`; this file just makes
// the same type extension visible during `tsc -b --noEmit`.
import '@testing-library/jest-dom/vitest';
