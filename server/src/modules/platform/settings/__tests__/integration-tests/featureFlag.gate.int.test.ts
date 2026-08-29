import { settingsService } from '../../settings.service';
import { FeatureFlagModel } from '../../settings.model';
import {
  gateResolvers,
  invalidateFeatureFlagCache,
  isFeatureEnabled,
  PRODUCT_VISIBILITY_FLAG,
} from '../../featureFlag.gate';

describe('feature flag gate', () => {
  beforeEach(() => invalidateFeatureFlagCache());

  it('seeds the product flag OFF, as a system flag that cannot be deleted', async () => {
    await settingsService.seedDefaults();
    const flag = await FeatureFlagModel.findOne({ key: PRODUCT_VISIBILITY_FLAG });
    expect(flag?.enabled).toBe(false);
    expect(flag?.is_system).toBe(true);
    await expect(settingsService.deleteFlag(String(flag?.id))).rejects.toThrow(/system flag/i);
  });

  it('promotes a hand-made row of the same key into a system flag, keeping its switch position', async () => {
    // What the live databases look like: the key was created from the Admin
    // table before it shipped in the catalogue, so it is a deletable custom row.
    await FeatureFlagModel.deleteMany({ key: PRODUCT_VISIBILITY_FLAG });
    const custom = await settingsService.createFlag({
      key: PRODUCT_VISIBILITY_FLAG,
      name: 'Made by hand',
      enabled: true,
    });
    expect(custom.is_system).toBe(false);

    await settingsService.seedDefaults();

    const promoted = await FeatureFlagModel.findOne({ key: PRODUCT_VISIBILITY_FLAG });
    expect(promoted?.is_system).toBe(true);
    // The operator's ON stays ON — the seed names a default, not a decision.
    expect(promoted?.enabled).toBe(true);
    expect(promoted?.name).toBe('Made by hand');
  });

  it('reads the flag, and a write busts the cached answer at once', async () => {
    await FeatureFlagModel.deleteMany({ key: 'gate_probe' });
    const flag = await settingsService.createFlag({ key: 'gate_probe', name: 'Probe' });
    expect(await isFeatureEnabled('gate_probe')).toBe(false);

    await settingsService.setFlagEnabled(flag.id, true);
    expect(await isFeatureEnabled('gate_probe')).toBe(true);
  });

  it('refuses a gated operation while the flag is off and lets it through once on', async () => {
    await FeatureFlagModel.deleteMany({ key: 'gate_probe' });
    const flag = await settingsService.createFlag({ key: 'gate_probe', name: 'Probe' });

    const listProducts = jest.fn().mockResolvedValue(['a']);
    const brandName = jest.fn().mockReturnValue('Acme');
    const gated = gateResolvers(
      { Query: { listProducts }, Brand: { name: brandName } },
      'gate_probe',
    );

    await expect((gated.Query as any).listProducts()).rejects.toThrow(/unavailable/i);
    expect(listProducts).not.toHaveBeenCalled();
    // Field resolvers on the module's own types are untouched — they can only be
    // reached through an entry point that is already gated.
    expect((gated.Brand as any).name()).toBe('Acme');

    await settingsService.setFlagEnabled(flag.id, true);
    await expect((gated.Query as any).listProducts()).resolves.toEqual(['a']);
  });

  it('gates only the named fields when a subset is given', async () => {
    await FeatureFlagModel.deleteMany({ key: 'gate_probe' });
    await settingsService.createFlag({ key: 'gate_probe', name: 'Probe' });

    const productCheckout = jest.fn().mockResolvedValue('product');
    const podCheckout = jest.fn().mockResolvedValue('pod');
    const gated = gateResolvers(
      { Mutation: { productCheckout, podCheckout } },
      'gate_probe',
      ['productCheckout'],
    );

    await expect((gated.Mutation as any).productCheckout()).rejects.toThrow(/unavailable/i);
    await expect((gated.Mutation as any).podCheckout()).resolves.toBe('pod');
  });
});
