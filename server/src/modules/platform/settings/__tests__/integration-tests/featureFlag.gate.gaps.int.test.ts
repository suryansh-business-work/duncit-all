/**
 * The flag gate's cache and its list answer, against a real database: a read
 * is served from memory for thirty seconds unless a write busts it, and a gated
 * list lookup answers "none" rather than failing everything beside it.
 */
import { GraphQLError } from 'graphql';
import { FeatureFlagModel } from '../../settings.model';
import { gateResolvers, invalidateFeatureFlagCache, isFeatureEnabled } from '../../featureFlag.gate';

const flag = (key: string, enabled: boolean) => FeatureFlagModel.create({ key, name: key, enabled });

beforeEach(() => invalidateFeatureFlagCache());
afterEach(() => jest.restoreAllMocks());

describe('isFeatureEnabled', () => {
  it('serves a flag from memory until the window ends or a write busts it', async () => {
    await flag('cached_flag', true);
    await expect(isFeatureEnabled('cached_flag')).resolves.toBe(true);
    await FeatureFlagModel.updateOne({ key: 'cached_flag' }, { $set: { enabled: false } });
    await expect(isFeatureEnabled('cached_flag')).resolves.toBe(true);
    invalidateFeatureFlagCache();
    await expect(isFeatureEnabled('cached_flag')).resolves.toBe(false);
  });

  it('reads the database again once the thirty seconds are up', async () => {
    await flag('timed_flag', true);
    const realNow = Date.now();
    await expect(isFeatureEnabled('timed_flag')).resolves.toBe(true);
    await FeatureFlagModel.updateOne({ key: 'timed_flag' }, { $set: { enabled: false } });
    jest.spyOn(Date, 'now').mockReturnValue(realNow + 31_000);
    await expect(isFeatureEnabled('timed_flag')).resolves.toBe(false);
  });

  it('is off for a key with no row, and remembers that too', async () => {
    await expect(isFeatureEnabled('no_such_flag')).resolves.toBe(false);
    await flag('no_such_flag', true);
    await expect(isFeatureEnabled('no_such_flag')).resolves.toBe(false);
  });
});

describe('gateResolvers', () => {
  const calls: string[] = [];
  const map = {
    Query: { products: async () => (calls.push('products'), ['p1']), settings: async () => (calls.push('settings'), 'ok') },
    Mutation: { buy: async () => (calls.push('buy'), true) },
    Product: { name: () => 'field-resolver' },
  };
  beforeEach(() => {
    calls.length = 0;
  });

  it('answers an empty list, instead of refusing, for a list lookup named in emptyList while the flag is off', async () => {
    const gated = gateResolvers(map, 'shop_flag', { emptyList: ['products'] });
    await expect(gated.Query.products()).resolves.toEqual([]);
    await expect(gated.Query.settings()).rejects.toMatchObject({ extensions: { code: 'FEATURE_DISABLED', flag: 'shop_flag' } });
    await expect(gated.Mutation.buy()).rejects.toBeInstanceOf(GraphQLError);
    expect(calls).toEqual([]);
  });

  it('runs every gated field once the flag is on, and leaves the module’s own field resolvers alone', async () => {
    await flag('shop_flag', true);
    const gated = gateResolvers(map, 'shop_flag', { emptyList: ['products'] });
    await expect(gated.Query.products()).resolves.toEqual(['p1']);
    await expect(gated.Mutation.buy()).resolves.toBe(true);
    expect(gated.Product.name()).toBe('field-resolver');
  });

  it('gates only the fields it is told to, leaving the rest open with the flag off', async () => {
    const gated = gateResolvers(map, 'shop_flag', { fields: ['buy'] });
    await expect(gated.Query.products()).resolves.toEqual(['p1']);
    await expect(gated.Mutation.buy()).rejects.toMatchObject({ extensions: { code: 'FEATURE_DISABLED' } });
  });
});
