import type { APIRoute } from 'astro';

/** Liveness for the container healthcheck: answers without a host or an API call. */
export const GET: APIRoute = () => new Response('ok', { headers: { 'cache-control': 'no-store', 'content-type': 'text/plain' } });
