import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { logs } from '@observability/log';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venueResolvers } from '@modules/venues/venue/venue.resolver';
import { venueService } from '@modules/venues/venue/venue.service';
import { FinanceSettingsModel } from '../../finance.model';
import { financeResolvers } from '../../finance.resolver';

/**
 * Finance → Food Menu Defaults: the GST every venue without its own is priced
 * with, who may read and set it, and how the venue's public page resolves it.
 */
const as = (roles: string[]) => ({ user: { id: new Types.ObjectId().toHexString(), roles } }) as unknown as GraphQLContext;
const finance = as(['FINANCE_MANAGER']);

const read = (ctx: GraphQLContext) => financeResolvers.Query.foodTaxDefaults(undefined, undefined, ctx);
const update = (ctx: GraphQLContext, input: { tax_mode: unknown; gst_pct: unknown }) =>
  financeResolvers.Mutation.updateFoodTaxDefaults(undefined, { input }, ctx);

describe('the food GST default', () => {
  it('starts as today: prices include GST at 5%', async () => {
    expect(await read(finance)).toMatchObject({ tax_mode: 'INCLUSIVE', gst_pct: 5 });
  });

  it('reads the shipped default for a settings document written before it existed', async () => {
    await FinanceSettingsModel.collection.insertOne({ singleton_key: 'finance', updated_at: new Date() });
    expect(await read(finance)).toMatchObject({ tax_mode: 'INCLUSIVE', gst_pct: 5 });
  });

  it('is set by Finance, touching nothing else in the settings, and logged with who changed it from what', async () => {
    const info = jest.spyOn(logs.server, 'info');
    await FinanceSettingsModel.create({ singleton_key: 'finance', gst_pct: 18, currency_symbol: '₹' });
    expect(await update(finance, { tax_mode: 'EXCLUSIVE', gst_pct: 12 })).toMatchObject({ tax_mode: 'EXCLUSIVE', gst_pct: 12 });
    expect(await FinanceSettingsModel.findOne({ singleton_key: 'finance' }).lean()).toMatchObject({
      food_tax_mode: 'EXCLUSIVE',
      food_gst_pct: 12,
      gst_pct: 18,
    });
    expect(info).toHaveBeenCalledWith(
      'finance-settings',
      'foodTaxDefaults',
      expect.objectContaining({ before: { tax_mode: 'INCLUSIVE', gst_pct: 5 }, after: { tax_mode: 'EXCLUSIVE', gst_pct: 12 } })
    );
    info.mockRestore();
  });

  it('refuses a percent outside 0 to 28 or not whole, and a mode it does not know, changing nothing', async () => {
    for (const gst_pct of [-1, 29, 2.5, null]) {
      await expect(update(finance, { tax_mode: 'INCLUSIVE', gst_pct })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    }
    await expect(update(finance, { tax_mode: 'SOMETIMES', gst_pct: 5 })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(await read(finance)).toMatchObject({ tax_mode: 'INCLUSIVE', gst_pct: 5 });
  });

  it('takes both ends of the range', async () => {
    expect(await update(finance, { tax_mode: 'INCLUSIVE', gst_pct: 0 })).toMatchObject({ gst_pct: 0 });
    expect(await update(finance, { tax_mode: 'INCLUSIVE', gst_pct: 28 })).toMatchObject({ gst_pct: 28 });
  });

  it('is read and set by finance roles only', async () => {
    for (const ctx of [as(['USER']), as(['VENUE_OWNER']), { user: null } as unknown as GraphQLContext]) {
      await expect(read(ctx)).rejects.toThrow();
      await expect(update(ctx, { tax_mode: 'EXCLUSIVE', gst_pct: 12 })).rejects.toThrow();
    }
    expect(await read(finance)).toMatchObject({ tax_mode: 'INCLUSIVE', gst_pct: 5 });
  });
});

describe("a venue's GST as its public page reads it", () => {
  const owner = new Types.ObjectId();
  const resolve = async (venueId: string, ctx: GraphQLContext) => {
    const venue = await venueService.getPublicById(venueId);
    const ordering = venue?.food_ordering;
    if (!ordering) throw new Error('venue not public');
    return {
      tax_override: ordering.tax_override,
      tax_mode: await venueResolvers.VenueFoodOrdering.tax_mode(ordering, undefined, ctx),
      gst_pct: await venueResolvers.VenueFoodOrdering.gst_pct(ordering, undefined, ctx),
    };
  };
  const seed = async (food_ordering: Record<string, unknown> = {}) =>
    String((await VenueModel.create({ owner_user_id: owner, status: 'APPROVED', is_active: true, offers_food: true, food_ordering }))._id);

  it("is Finance's default while the venue sets none, and the venue's own while it overrides", async () => {
    await update(finance, { tax_mode: 'EXCLUSIVE', gst_pct: 12 });
    const following = await seed({ tax_mode: 'INCLUSIVE', gst_pct: 18 });
    const overriding = await seed({ tax_override: true, tax_mode: 'INCLUSIVE', gst_pct: 18 });
    const guest = { user: null } as unknown as GraphQLContext;
    expect(await resolve(following, guest)).toEqual({ tax_override: false, tax_mode: 'EXCLUSIVE', gst_pct: 12 });
    expect(await resolve(overriding, guest)).toEqual({ tax_override: true, tax_mode: 'INCLUSIVE', gst_pct: 18 });
  });

  it("reads Finance's default once per request however many fields ask", async () => {
    const venueId = await seed();
    const ctx = { user: null } as unknown as GraphQLContext;
    const findOne = jest.spyOn(FinanceSettingsModel, 'findOne');
    await resolve(venueId, ctx);
    await resolve(venueId, ctx);
    expect(findOne).toHaveBeenCalledTimes(1);
    findOne.mockRestore();
  });
});
