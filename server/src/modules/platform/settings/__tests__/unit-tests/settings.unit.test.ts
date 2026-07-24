import { settingsService } from '../../settings.service';
import { settingsResolvers } from '../../settings.resolver';
import { makeContext } from '@test/harness';

describe('settings unit', () => {
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

  it('updatePodShopSlider is gated to slider-write roles', async () => {
    await expect(
      (settingsResolvers.Mutation as any).updatePodShopSlider({}, { input: [] }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });
});
