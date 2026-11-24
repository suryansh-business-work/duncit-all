import { appEventPlatformFromRequest, userPlatformOfEvent } from '../../appEvent.platform';

const req = (headers: Record<string, string | string[]>) => ({ headers });

describe('appEventPlatformFromRequest', () => {
  it('stamps the native app by the OS it declares', () => {
    expect(appEventPlatformFromRequest(req({ 'x-duncit-surface': 'NATIVE', 'x-duncit-platform': 'android' }))).toBe('android');
    expect(appEventPlatformFromRequest(req({ 'x-duncit-surface': 'NATIVE', 'x-duncit-platform': 'IOS' }))).toBe('ios');
  });

  it('tells mWeb apart from the other web surfaces', () => {
    expect(appEventPlatformFromRequest(req({ 'x-duncit-surface': 'mweb' }))).toBe('mweb');
    expect(appEventPlatformFromRequest(req({ 'x-duncit-surface': ['MWEB', 'PORTAL'] }))).toBe('mweb');
    expect(appEventPlatformFromRequest(req({ 'x-duncit-surface': 'PORTAL' }))).toBe('web');
    // The native app's web build: a browser user agent on the native surface.
    expect(appEventPlatformFromRequest(req({ 'x-duncit-surface': 'NATIVE', 'user-agent': 'Mozilla/5.0' }))).toBe('web');
  });

  it('stamps nothing for a caller that is not a Duncit client', () => {
    expect(appEventPlatformFromRequest(req({}))).toBe('');
    expect(appEventPlatformFromRequest(req({ 'x-duncit-surface': 'NATIVE', 'user-agent': 'curl/8' }))).toBe('');
  });
});

describe('userPlatformOfEvent', () => {
  it('reads a stored platform as the icons name it, mWeb and the web build both as WEB', () => {
    expect(userPlatformOfEvent('android')).toBe('ANDROID');
    expect(userPlatformOfEvent('ios')).toBe('IOS');
    expect(userPlatformOfEvent('web')).toBe('WEB');
    expect(userPlatformOfEvent('mweb')).toBe('WEB');
  });

  it('answers null for an event recorded before the platform was', () => {
    expect(userPlatformOfEvent('')).toBeNull();
    expect(userPlatformOfEvent(undefined)).toBeNull();
    expect(userPlatformOfEvent(null)).toBeNull();
  });
});
