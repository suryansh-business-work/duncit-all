import { Linking } from 'react-native';

import { fromTelLink, linking } from '../linking';

/** Every way into the app from outside: tel: links, the caller card, the widget, the shortcuts. */

describe('fromTelLink', () => {
  it('turns a tapped phone number into the CRM dialer with the number filled in', () => {
    expect(fromTelLink('tel:+91%2098110%2000001')).toBe(
      'duncitcrm://dialer?number=%2B919811000001',
    );
    expect(fromTelLink('TEL:*123#')).toBe('duncitcrm://dialer?number=*123%23');
  });

  it('passes every other link through untouched', () => {
    expect(fromTelLink('duncitcrm://lead/VENUE_LEAD/abc')).toBe('duncitcrm://lead/VENUE_LEAD/abc');
    expect(fromTelLink(null)).toBeNull();
  });
});

describe('linking', () => {
  afterEach(() => jest.restoreAllMocks());

  it('maps the caller card, the post-call notification and the widget targets to screens', () => {
    const screens = linking.config?.screens as Record<string, unknown>;
    expect(screens.LeadDetail).toBe('lead/:kind/:id');
    expect(screens.PostCall).toBe('post-call');
    expect((screens.Tabs as { screens: Record<string, string> }).screens.Dialer).toBe('dialer');
  });

  it('opens the dialer when the app was launched to dial a number', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('tel:9811000001');
    await expect(linking.getInitialURL?.()).resolves.toBe('duncitcrm://dialer?number=9811000001');
  });

  it('forwards links that arrive while the app is open, mapped the same way', () => {
    let handler: ((e: { url: string }) => void) | undefined;
    const remove = jest.fn();
    jest.spyOn(Linking, 'addEventListener').mockImplementation((_type, fn) => {
      handler = fn as typeof handler;
      return { remove } as never;
    });
    const listener = jest.fn();
    const unsubscribe = linking.subscribe?.(listener);
    handler?.({ url: 'tel:9811000001' });
    expect(listener).toHaveBeenCalledWith('duncitcrm://dialer?number=9811000001');
    (unsubscribe as () => void)();
    expect(remove).toHaveBeenCalled();
  });
});
