// Re-imports the helper with a fresh expo-constants mock per case so the
// version-resolution branches run against the given Expo config.
function loadVersion(expoConfig?: { version?: string } | null): string {
  jest.resetModules();
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig } }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@/utils/app-version') as typeof import('@/utils/app-version')).appVersion();
}

afterEach(() => jest.resetModules());

describe('appVersion', () => {
  it('reads the configured Expo version', () => {
    expect(loadVersion({ version: '9.9.9' })).toBe('9.9.9');
  });

  it('falls back to 1.0.0 when the version is missing', () => {
    expect(loadVersion({})).toBe('1.0.0');
  });

  it('falls back to 1.0.0 when the Expo config is absent', () => {
    expect(loadVersion(undefined)).toBe('1.0.0');
  });
});
