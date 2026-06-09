// Each case re-imports the module with a fresh expo-constants mock so the
// module-level `resolveApiUrl()` runs against the given Metro host.
const ORIGINAL_ENV = process.env.EXPO_PUBLIC_API_URL;

function loadConfig(hostUri?: string) {
  jest.resetModules();
  jest.doMock('expo-constants', () => ({
    __esModule: true,
    default: { expoConfig: hostUri ? { hostUri } : {} },
  }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/constants/config').config as { apiUrl: string };
}

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = ORIGINAL_ENV;
  jest.resetModules();
});

describe('config.apiUrl resolution', () => {
  it('uses a non-loopback EXPO_PUBLIC_API_URL verbatim (production)', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://server.duncit.com';
    expect(loadConfig('192.168.1.5:2022').apiUrl).toBe('https://server.duncit.com');
  });

  it('swaps a localhost env for the Metro LAN host on port 2001 (Expo on device)', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:2001';
    expect(loadConfig('192.168.1.50:2022').apiUrl).toBe('http://192.168.1.50:2001');
  });

  it('keeps localhost when the Metro host is also localhost (iOS simulator)', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:2001';
    expect(loadConfig('localhost:2022').apiUrl).toBe('http://localhost:2001');
  });

  it('falls back to localhost:2001 with no env and no Metro host', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(loadConfig(undefined).apiUrl).toBe('http://localhost:2001');
  });

  it('falls back when the Expo config object itself is absent', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    jest.resetModules();
    jest.doMock('expo-constants', () => ({ __esModule: true, default: {} }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { config } = require('@/constants/config') as { config: { apiUrl: string } };
    expect(config.apiUrl).toBe('http://localhost:2001');
  });

  it('skips the dev origin log outside development', () => {
    const g = global as unknown as { __DEV__: boolean };
    const dev = g.__DEV__;
    g.__DEV__ = false;
    try {
      process.env.EXPO_PUBLIC_API_URL = 'https://server.duncit.com';
      expect(loadConfig('192.168.1.5:2022').apiUrl).toBe('https://server.duncit.com');
    } finally {
      g.__DEV__ = dev;
    }
  });
});
