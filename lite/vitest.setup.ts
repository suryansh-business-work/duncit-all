import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// React Router builds a Request for every navigation with the signal of
// jsdom's AbortController, which Node's own Request refuses ("Expected signal
// to be an instance of AbortSignal") — so every redirect, link and tab change
// in the URL would throw. Lite's routes have no loaders to abort, so tests
// leave the signal off and keep the rest of the request as React Router built it.
class JsdomSafeRequest extends globalThis.Request {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init ? { ...init, signal: undefined } : init);
  }
}
globalThis.Request = JsdomSafeRequest;

afterEach(() => {
  cleanup();
});
