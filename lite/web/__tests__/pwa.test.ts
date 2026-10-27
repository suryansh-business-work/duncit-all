import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '../pwa';

const register = vi.fn<(url: string, options: RegistrationOptions) => Promise<unknown>>();
/** The `load` listeners registerServiceWorker added, captured so each case runs only its own. */
let onLoad: (() => void)[] = [];

const giveBrowserServiceWorkers = () => {
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
};

beforeEach(() => {
  onLoad = [];
  register.mockReset();
  vi.spyOn(globalThis, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject | null) => {
    if (type === 'load' && typeof listener === 'function') onLoad.push(() => listener(new Event('load')));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('registerServiceWorker', () => {
  it('registers the worker for the whole site once the page has loaded, in a production build', async () => {
    vi.stubEnv('PROD', true);
    giveBrowserServiceWorkers();
    register.mockResolvedValue({});

    registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
    for (const fire of onLoad) fire();

    expect(register).toHaveBeenCalledWith('/sw.js?v=lite-v1', { scope: '/' });
  });

  it('never registers under the dev server, whose modules the worker must not cache', () => {
    vi.stubEnv('PROD', false);
    giveBrowserServiceWorkers();

    registerServiceWorker();

    expect(onLoad).toHaveLength(0);
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing in a browser without service workers', () => {
    vi.stubEnv('PROD', true);
    registerServiceWorker();
    expect(onLoad).toHaveLength(0);
  });

  it('reports a failed registration and leaves the site working as a normal page', async () => {
    vi.stubEnv('PROD', true);
    giveBrowserServiceWorkers();
    const failure = new Error('SecurityError');
    register.mockRejectedValue(failure);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    registerServiceWorker();
    for (const fire of onLoad) fire();
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith('[lite] service worker registration failed', failure));
  });
});
