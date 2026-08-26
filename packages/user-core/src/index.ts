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
export { SURFACE_HEADER } from './surface';
export type { ClientSurface } from './surface';
export {
  SESSION_REVOKED_EVENT,
  USER_CHANGED_EVENT,
  parseUserChangedFrame,
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
