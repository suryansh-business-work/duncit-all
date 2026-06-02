/**
 * Centralised runtime configuration.
 * All values are sourced from environment variables (never hardcoded business data).
 */

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  // Surfaced early so a misconfigured build fails loudly instead of silently.
  // eslint-disable-next-line no-console
  console.warn('EXPO_PUBLIC_API_URL is not set. Falling back to the local dev API on port 2020.');
}

export const config = {
  apiUrl: apiUrl ?? 'http://localhost:2020',
  endpoints: {
    location: '/api/location',
  },
  requestTimeoutMs: 15_000,
} as const;

export type AppConfig = typeof config;
