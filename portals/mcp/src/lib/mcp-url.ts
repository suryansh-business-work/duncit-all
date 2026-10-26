/**
 * Where the MCP endpoints live, for the Guide's URL pattern.
 *
 * The console and the MCP service share a host — nginx sends /mcp,
 * /<console>/mcp and the OAuth paths to the API and everything else to this
 * SPA — so the console's own origin IS the service's address on every deployed
 * environment. `VITE_MCP_URL` only exists for local development, where the
 * two run on different ports. The signed-in Connect page never uses this: it
 * shows the exact URLs the server reports.
 */
export function mcpBaseUrl(): string {
  const configured: unknown = import.meta.env.VITE_MCP_URL;
  if (typeof configured === 'string' && configured) {
    try {
      return new URL(configured).origin;
    } catch {
      console.warn('VITE_MCP_URL is not a valid URL; using this console’s own address.');
    }
  }
  return globalThis.location.origin;
}
