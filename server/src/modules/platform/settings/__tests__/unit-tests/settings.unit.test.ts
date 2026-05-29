import { settingsService } from '../../settings.service';
import { settingsResolvers } from '../../settings.resolver';
import { makeContext } from '@test/harness';

describe('settings unit', () => {
  it('updateEnvironmentVariable rejects an unmanaged key', async () => {
    await expect(
      settingsService.updateEnvironmentVariable('NOT_A_REAL_KEY', 'x')
    ).rejects.toThrow(/not managed/i);
  });

  it('clearEnvironmentVariable rejects an unmanaged key', async () => {
    await expect(
      settingsService.clearEnvironmentVariable('NOT_A_REAL_KEY')
    ).rejects.toThrow(/not managed/i);
  });

  it('appSettings query is gated to admin read roles', async () => {
    await expect(
      (settingsResolvers.Query as any).appSettings({}, {}, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });

  it('createFeatureFlag is gated to admin write', async () => {
    await expect(
      (settingsResolvers.Mutation as any).createFeatureFlag({}, { input: {} }, makeContext({ roles: ['CITY_ADMIN'] }))
    ).rejects.toThrow(/access denied/i);
  });
});
