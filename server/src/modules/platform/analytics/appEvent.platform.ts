/**
 * The platform on an app analytics event, both ways.
 *
 * Product events (`recordAppEvents`) carry the platform the client names
 * (ios / android / web / mweb). The older clickstream (`recordAppEvent`) never
 * did, so it is stamped from the request with the same rule Last Activity uses
 * (`platformFromRequest`): what the client cannot fake beyond its own surface.
 * Admin's day journey then reads it as a `UserPlatform`, the icons' vocabulary.
 */
import type { Request } from 'express';
import { platformFromRequest, type UserPlatform } from '@modules/access/user/user.activity';
import type { AppEventPlatform } from './appEvent.model';

/** The stored platform for a clickstream event from this request; '' when it is not a Duncit client. */
export function appEventPlatformFromRequest(req: Pick<Request, 'headers'>): AppEventPlatform {
  const platform = platformFromRequest(req);
  if (platform === 'ANDROID') return 'android';
  if (platform === 'IOS') return 'ios';
  if (platform !== 'WEB') return '';
  const surface = req.headers['x-duncit-surface'];
  return String(Array.isArray(surface) ? surface[0] : surface ?? '').trim().toUpperCase() === 'MWEB' ? 'mweb' : 'web';
}

/** A stored event platform as the icons name it: mWeb and the native web build are both the web. */
export function userPlatformOfEvent(platform: string | null | undefined): UserPlatform | null {
  if (platform === 'android') return 'ANDROID';
  if (platform === 'ios') return 'IOS';
  if (platform === 'web' || platform === 'mweb') return 'WEB';
  return null;
}
