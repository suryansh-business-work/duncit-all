export { ME_FIELDS, buildMeQuerySource } from './me-selection';
export {
  accountEmail,
  accountName,
  can,
  canAny,
  hasAppAccess,
  initials,
  normalizeMe,
} from './derive';
export {
  DUID_STORAGE_KEY,
  deviceTimezone,
  getOrCreateDuid,
  makeDevice,
  makeDeviceId,
} from './device';
export {
  NO_REDIS_HEADER,
  NO_REDIS_STORAGE_KEY,
  resolveNoRedisFlag,
} from './no-redis';
export { APP_HEADER, SURFACE_HEADER, clientIdentityHeaders } from './surface';
export type { ClientSurface, ClientSurfaceName } from './surface';
export {
  ACCOUNT_DELETION_REVOKE_REASON,
  SESSION_REVOKED_EVENT,
  USER_CHANGED_EVENT,
  holdSessionRevoked,
  parseUserChangedFrame,
  releaseSessionRevoked,
  subscribeSessionRevoked,
  subscribeUserChanged,
} from './realtime';
export type { SessionRevokedFrame, SocketLike, UserChangedFrame } from './realtime';
export type {
  FeatureFlags,
  SessionDevice,
  SessionSnapshot,
  SessionStatus,
  SessionUser,
} from './types';
export { PRODUCT_EVENTS, SESSION_TIMEOUT_MS, deviceTypeForWidth } from './analytics/taxonomy';
export type { ProductEventName, ProductEventPayload, ProductPlatform, ProductProperties } from './analytics/taxonomy';
export { createSessionClock } from './analytics/session';
export type { SessionClock } from './analytics/session';
export { createEventQueue } from './analytics/queue';
export type { EventQueue } from './analytics/queue';
export { redactText } from './analytics/redact';
export { isIdSegment, screenNameFromPath } from './analytics/screen';
export { createProductTracker } from './analytics/tracker';
export type { ElementRef, EventContext, ProductTracker, TrackerOptions } from './analytics/tracker';
