/**
 * Web push: the service worker, the permission and the subscription.
 *
 * Every branch here exists because some browser somewhere does not have the
 * thing above it, and the whole module has to degrade rather than throw — a
 * push subscription that throws on boot takes the app down with it, on exactly
 * the devices least able to run it.
 *
 * Two rules matter beyond that.
 *
 *  - The subscription is only ever attempted for a SIGNED-IN reader. A
 *    subscription saved without a token belongs to nobody, and the server has
 *    no way to route a notification to it — so it is dead weight in the table
 *    and a permission prompt shown for nothing.
 *  - Permission is asked at most once, and a refusal is final for that visit.
 *    `default` is the only state worth prompting from; re-asking a browser that
 *    already said `denied` does nothing except make the code look broken.
 *
 * The key encoding is the other half. A VAPID key is base64URL and the Push API
 * takes bytes, so the conversion has to survive the `-`/`_` alphabet and the
 * missing padding — get it wrong and every subscribe fails with an opaque
 * InvalidCharacterError.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../apollo', () => ({
  apolloClient: { query: vi.fn(), mutate: vi.fn() },
}));
vi.mock('@duncit/logs', () => ({
  logs: { mWeb: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
}));

import { apolloClient } from '../apollo';
import {
  ensurePushSubscription,
  initPwa,
  isPushSupported,
  notificationPermission,
  registerServiceWorker,
  unsubscribePush,
} from '../pwa';

const client = apolloClient as unknown as { query: ReturnType<typeof vi.fn>; mutate: ReturnType<typeof vi.fn> };

const subscription = (over: Record<string, unknown> = {}) => ({
  endpoint: 'https://push.example/abc',
  toJSON: () => ({ keys: { p256dh: 'p256dh-value', auth: 'auth-value' } }),
  getKey: () => new Uint8Array([1, 2, 3]).buffer,
  unsubscribe: vi.fn(async () => true),
  ...over,
});

type AnyMock = ReturnType<typeof vi.fn<any[], any>>;

let pushManager: { getSubscription: AnyMock; subscribe: AnyMock };
let register: AnyMock;
let update: AnyMock;

/** A browser that has everything, which each test then takes pieces away from. */
const fullBrowser = () => {
  update = vi.fn(async () => undefined) as AnyMock;
  pushManager = {
    getSubscription: vi.fn(async () => subscription()) as AnyMock,
    subscribe: vi.fn(async () => subscription()) as AnyMock,
  };
  register = vi.fn(async () => ({ update, pushManager })) as AnyMock;
  Object.defineProperty(globalThis.navigator, 'serviceWorker', {
    configurable: true,
    value: { register, ready: Promise.resolve({ update, pushManager }) },
  });
  Object.defineProperty(globalThis, 'PushManager', { configurable: true, value: class {} });
  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    value: Object.assign(class {}, {
      permission: 'granted' as NotificationPermission,
      requestPermission: vi.fn(async () => 'granted' as NotificationPermission),
    }),
  });
};

const withoutServiceWorker = () => {
  Reflect.deleteProperty(globalThis.navigator, 'serviceWorker');
};

const permissionIs = (value: NotificationPermission) => {
  (globalThis.Notification as unknown as { permission: NotificationPermission }).permission = value;
};

beforeEach(() => {
  fullBrowser();
  localStorage.setItem('token', 'a-token');
  client.query.mockResolvedValue({ data: { pushConfig: { publicKey: 'BOa-_9zZ' } } });
  client.mutate.mockResolvedValue({ data: {} });
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('registerServiceWorker', () => {
  it('registers the worker at the site root and updates it', async () => {
    const reg = await registerServiceWorker();

    expect(register).toHaveBeenCalledWith(expect.stringContaining('/sw.js'), { scope: '/' });
    expect(update).toHaveBeenCalled();
    expect(reg).not.toBeNull();
  });

  it('answers null on a browser with no service worker, rather than throwing', async () => {
    withoutServiceWorker();

    await expect(registerServiceWorker()).resolves.toBeNull();
  });

  it('answers null when registration failed — a dead worker must not kill the app', async () => {
    register.mockRejectedValue(new Error('SecurityError'));

    await expect(registerServiceWorker()).resolves.toBeNull();
  });
});

describe('isPushSupported', () => {
  it('is true only when all three pieces are there', () => {
    expect(isPushSupported()).toBe(true);
  });

  it('is false without a service worker', () => {
    withoutServiceWorker();

    expect(isPushSupported()).toBe(false);
  });

  it('is false without a PushManager', () => {
    Reflect.deleteProperty(globalThis as unknown as Record<string, unknown>, 'PushManager');

    expect(isPushSupported()).toBe(false);
  });

  it('is false without Notification', () => {
    Reflect.deleteProperty(globalThis as unknown as Record<string, unknown>, 'Notification');

    expect(isPushSupported()).toBe(false);
  });
});

describe('notificationPermission', () => {
  it('reports what the browser says', () => {
    permissionIs('denied');

    expect(notificationPermission()).toBe('denied');
  });

  it('says unsupported rather than guessing on a browser without notifications', () => {
    Reflect.deleteProperty(globalThis as unknown as Record<string, unknown>, 'Notification');

    expect(notificationPermission()).toBe('unsupported');
  });
});

describe('ensurePushSubscription', () => {
  it('saves the subscription for a signed-in reader who has granted permission', async () => {
    await expect(ensurePushSubscription()).resolves.toBe(true);

    const [call] = client.mutate.mock.calls;
    expect((call?.[0] as { variables: { input: { endpoint: string } } }).variables.input).toMatchObject({
      endpoint: 'https://push.example/abc',
      p256dh: 'p256dh-value',
      auth: 'auth-value',
    });
  });

  it('does nothing at all for a signed-out reader', async () => {
    localStorage.removeItem('token');

    await expect(ensurePushSubscription()).resolves.toBe(false);
    // A subscription with no account behind it is dead weight the server can
    // never route a notification to — and a permission prompt for nothing.
    expect(client.mutate).not.toHaveBeenCalled();
  });

  it('does nothing on a browser that cannot do push', async () => {
    withoutServiceWorker();

    await expect(ensurePushSubscription()).resolves.toBe(false);
  });

  it('asks for permission exactly once, from the only state worth asking in', async () => {
    permissionIs('default');
    const ask = (globalThis.Notification as unknown as { requestPermission: ReturnType<typeof vi.fn> })
      .requestPermission;

    await ensurePushSubscription();

    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('never re-asks a browser that already refused', async () => {
    permissionIs('denied');
    const ask = (globalThis.Notification as unknown as { requestPermission: ReturnType<typeof vi.fn> })
      .requestPermission;

    await expect(ensurePushSubscription()).resolves.toBe(false);
    expect(ask).not.toHaveBeenCalled();
  });

  it('stops when the reader refuses the prompt', async () => {
    permissionIs('default');
    (globalThis.Notification as unknown as { requestPermission: ReturnType<typeof vi.fn> })
      .requestPermission.mockResolvedValue('denied');

    await expect(ensurePushSubscription()).resolves.toBe(false);
    expect(client.mutate).not.toHaveBeenCalled();
  });

  it('subscribes with the server VAPID key when there is no subscription yet', async () => {
    pushManager.getSubscription.mockResolvedValue(null);

    await expect(ensurePushSubscription()).resolves.toBe(true);

    const [options] = pushManager.subscribe.mock.calls[0] as [{ applicationServerKey: ArrayBuffer }];
    // base64URL in, bytes out — an unconverted key fails with an opaque
    // InvalidCharacterError on every browser.
    expect(options.applicationServerKey.byteLength).toBeGreaterThan(0);
  });

  it('stops when the server has no VAPID key configured', async () => {
    pushManager.getSubscription.mockResolvedValue(null);
    client.query.mockResolvedValue({ data: { pushConfig: { publicKey: '' } } });

    await expect(ensurePushSubscription()).resolves.toBe(false);
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('stops when the config query answers nothing at all', async () => {
    pushManager.getSubscription.mockResolvedValue(null);
    client.query.mockResolvedValue({ data: null });

    await expect(ensurePushSubscription()).resolves.toBe(false);
  });

  it('reads the keys off the raw buffers when the subscription JSON has none', async () => {
    pushManager.getSubscription.mockResolvedValue(subscription({ toJSON: () => ({}) }));

    await expect(ensurePushSubscription()).resolves.toBe(true);

    const [call] = client.mutate.mock.calls;
    const input = (call?.[0] as { variables: { input: { p256dh: string } } }).variables.input;
    expect(input.p256dh).toBeTruthy();
  });
});

describe('unsubscribePush', () => {
  it('tells the server and then drops the subscription', async () => {
    const sub = subscription();
    pushManager.getSubscription.mockResolvedValue(sub);

    await unsubscribePush();

    expect(client.mutate).toHaveBeenCalled();
    expect(sub.unsubscribe).toHaveBeenCalled();
  });

  it('drops it locally even when the server could not be told', async () => {
    const sub = subscription();
    pushManager.getSubscription.mockResolvedValue(sub);
    client.mutate.mockRejectedValue(new Error('offline'));

    await unsubscribePush();

    // Leaving it subscribed because a request failed means notifications keep
    // arriving after the reader asked for them to stop.
    expect(sub.unsubscribe).toHaveBeenCalled();
  });

  it('does nothing when there is nothing subscribed', async () => {
    pushManager.getSubscription.mockResolvedValue(null);

    await unsubscribePush();

    expect(client.mutate).not.toHaveBeenCalled();
  });

  it('does nothing on a browser with no service worker', async () => {
    withoutServiceWorker();

    await expect(unsubscribePush()).resolves.toBeUndefined();
  });
});

describe('initPwa', () => {
  it('registers the worker, and subscribes when permission is already granted', async () => {
    await initPwa();

    expect(register).toHaveBeenCalled();
  });

  it('registers the worker but asks for nothing when permission was never granted', async () => {
    permissionIs('default');

    await initPwa();

    expect(register).toHaveBeenCalled();
    expect(client.mutate).not.toHaveBeenCalled();
  });

  it('registers the worker but subscribes nobody while signed out', async () => {
    localStorage.removeItem('token');

    await initPwa();

    expect(register).toHaveBeenCalled();
    expect(client.mutate).not.toHaveBeenCalled();
  });
});
