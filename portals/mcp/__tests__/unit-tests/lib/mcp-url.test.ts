import { afterEach, describe, expect, it, vi } from 'vitest';
import { mcpBaseUrl } from '../../../src/lib/mcp-url';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('mcpBaseUrl', () => {
  it('is the console’s own origin when nothing is configured — nginx serves MCP on the same host', () => {
    vi.stubEnv('VITE_MCP_URL', '');
    vi.stubGlobal('location', { origin: 'https://mcp.duncit.com' });
    expect(mcpBaseUrl()).toBe('https://mcp.duncit.com');
  });

  it('uses the configured address for local development, reduced to its origin', () => {
    vi.stubEnv('VITE_MCP_URL', 'http://localhost:2001/some/path/');
    vi.stubGlobal('location', { origin: 'http://localhost:2046' });
    expect(mcpBaseUrl()).toBe('http://localhost:2001');
  });

  it('falls back to the console’s origin, and says why, when the configured value is not a URL', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('VITE_MCP_URL', 'not a url');
    vi.stubGlobal('location', { origin: 'https://staging.mcp.duncit.com' });
    expect(mcpBaseUrl()).toBe('https://staging.mcp.duncit.com');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
