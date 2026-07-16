// Type-only augmentation: teaches vitest's `expect` about the jest-dom matchers
// (toBeInTheDocument, toHaveTextContent, …) that setup.ts registers at runtime
// via `expect.extend`. Being a .d.ts, this adds no runtime import.
import '@testing-library/jest-dom/vitest';
