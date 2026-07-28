/**
 * Portal-scoped server code.
 *
 * There is exactly ONE genuinely per-portal concern on the server: which roles
 * may log in to which console (`portal_key` on the login mutation). Everything
 * else a portal renders is a domain module (finance, crm, tech, ...) that the
 * portal happens to consume, so this module is deliberately flat — no
 * per-portal subfolders, because there would be nothing to put in them.
 */
export { assertPortalLogin } from './portal.gate';
export { PORTAL_ROLE_REQUIREMENTS, PORTAL_GATE_EXEMPT_KEYS } from './portal.constants';
