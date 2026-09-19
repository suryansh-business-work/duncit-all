import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { storeAdminMerchService } from '../../store.admin.merch.service';
import { StoreCollectionModel } from '../../storeMerch.model';
import { StoreProductModel } from '../../storeProduct.model';
import { StoreBrandModel } from '../../storeTaxonomy.model';

/**
 * The pet store's own brands, and which Razorpay account its online payments
 * go through — both run from the Ecomm portal.
 */

const operator = { user: { id: new Types.ObjectId().toHexString() } } as unknown as GraphQLContext;

describe('store brands', () => {
  it('creates brands in order, with a URL key made from the name', async () => {
    const drools = await storeAdminMerchService.saveBrand(null, { name: 'Drools', tagline: 'Real chicken, real good' });
    const royal = await storeAdminMerchService.saveBrand(null, { name: 'Royal Canin', logo_url: 'https://cdn.duncit.com/rc.png' });

    expect(drools).toMatchObject({ name: 'Drools', slug: 'drools', tagline: 'Real chicken, real good', sort_order: 0, is_active: true });
    expect(royal).toMatchObject({ slug: 'royal-canin', logo_url: 'https://cdn.duncit.com/rc.png', sort_order: 1 });
    expect((await storeAdminMerchService.brands()).map((b) => b.name)).toEqual(['Drools', 'Royal Canin']);
  });

  it('refuses a brand with no name or a URL key another brand holds', async () => {
    await expect(storeAdminMerchService.saveBrand(null, { name: '  ' })).rejects.toThrow('Enter the brand name');
    await storeAdminMerchService.saveBrand(null, { name: 'Pedigree' });
    await expect(storeAdminMerchService.saveBrand(null, { name: 'Pedigree Pro', slug: 'pedigree' })).rejects.toThrow(
      'The URL key "pedigree" is already used'
    );
  });

  it('renames a brand on every product that carries it', async () => {
    const brand = await storeAdminMerchService.saveBrand(null, { name: 'Drools' });
    await StoreProductModel.create({ product_name: 'Drools Puppy 3 kg', sku: 'DRL-3', brand_id: brand.id, brand_name: 'Drools' });

    await storeAdminMerchService.saveBrand(brand.id, { name: 'Drools India' });

    expect((await StoreProductModel.findOne({ sku: 'DRL-3' }).lean())?.brand_name).toBe('Drools India');
  });

  it('will not delete a brand products still carry, and drops a deleted brand from collection rules', async () => {
    const used = await storeAdminMerchService.saveBrand(null, { name: 'Whiskas' });
    await StoreProductModel.create({ product_name: 'Whiskas Tuna', sku: 'WHK-1', brand_id: used.id });
    await expect(storeAdminMerchService.deleteBrand(used.id)).rejects.toThrow('1 product(s) carry this brand');

    const unused = await storeAdminMerchService.saveBrand(null, { name: 'Farmina' });
    await StoreCollectionModel.create({
      name: 'Grain free',
      slug: 'grain-free',
      mode: 'SMART',
      rules: { brand_ids: [unused.id, used.id] },
    });
    expect(await storeAdminMerchService.deleteBrand(unused.id)).toBe(true);

    expect(await StoreBrandModel.exists({ _id: unused.id })).toBeNull();
    const rules = (await StoreCollectionModel.findOne({ slug: 'grain-free' }).lean())?.rules;
    expect(rules?.brand_ids.map(String)).toEqual([used.id]);
  });

  it('reorders brands', async () => {
    const a = await storeAdminMerchService.saveBrand(null, { name: 'Alpha' });
    const b = await storeAdminMerchService.saveBrand(null, { name: 'Beta' });
    await storeAdminMerchService.reorderBrands([b.id, a.id]);
    expect((await storeAdminMerchService.brands()).map((x) => x.name)).toEqual(['Beta', 'Alpha']);
  });
});

describe('the store’s Razorpay account', () => {
  const account = (name: string, keyId: string, over: Record<string, unknown> = {}) =>
    EnvEntryModel.create({
      name,
      category: 'RAZORPAY',
      config: { key_id: keyId, key_secret: 'not-a-real-secret' },
      ...over,
    });

  it('lists the Tech portal accounts, default first, with a key hint and mode and never a secret', async () => {
    await account('Duncit Test', 'rzp_test_Q8m1abcdWXYZ');
    await account('Duncit Live', 'rzp_live_P4k9efghLMNO', { is_default: true });
    await account('Legacy', 'short', { is_active: false });

    const accounts = await storeAdminMerchService.razorpayAccounts();

    expect(accounts.map((a) => a.name)).toEqual(['Duncit Live', 'Duncit Test', 'Legacy']);
    expect(accounts[0]).toMatchObject({ mode: 'LIVE', is_default: true, is_active: true, key_hint: 'rzp_live_…LMNO' });
    expect(accounts[1]).toMatchObject({ mode: 'TEST', key_hint: 'rzp_test_…WXYZ' });
    expect(accounts[2]).toMatchObject({ mode: 'UNKNOWN', key_hint: '', is_active: false });
    expect(JSON.stringify(accounts)).not.toContain('not-a-real-secret');
  });

  it('saves an active account as the store’s choice, and an empty choice as the default', async () => {
    const live = await account('Duncit Live', 'rzp_live_P4k9efghLMNO');

    const chosen = await storeAdminMerchService.saveSettings(operator, { razorpay_account: String(live._id) });
    expect(chosen?.razorpay_account).toBe(String(live._id));

    const reset = await storeAdminMerchService.saveSettings(operator, { razorpay_account: '' });
    expect(reset?.razorpay_account).toBe('');
  });

  it('refuses an account that is switched off or not a Razorpay entry', async () => {
    const off = await account('Old', 'rzp_test_OLD0000000', { is_active: false });
    const smtp = await EnvEntryModel.create({ name: 'Mailer', category: 'EMAIL', config: {} });

    for (const id of [String(off._id), String(smtp._id), 'not-an-id']) {
      await expect(storeAdminMerchService.saveSettings(operator, { razorpay_account: id })).rejects.toThrow(
        'That Razorpay account is not an active entry in the Tech portal'
      );
    }
  });
});
