import { describe, expect, it } from 'vitest';
import { resolveServerBase } from './server';

describe('resolveServerBase', () => {
  it('prefers an explicit VITE_SERVER_URL', () => {
    expect(resolveServerBase({ VITE_SERVER_URL: 'https://staging.server.duncit.com', DEV: true })).toBe(
      'https://staging.server.duncit.com',
    );
  });

  it('falls back to localhost in dev', () => {
    expect(resolveServerBase({ DEV: true })).toBe('http://localhost:2001');
  });

  it('falls back to the production API otherwise', () => {
    expect(resolveServerBase({ DEV: false })).toBe('https://server.duncit.com');
    expect(resolveServerBase({})).toBe('https://server.duncit.com');
  });

  it('treats an empty VITE_SERVER_URL as unset', () => {
    expect(resolveServerBase({ VITE_SERVER_URL: '', DEV: false })).toBe('https://server.duncit.com');
  });
});
