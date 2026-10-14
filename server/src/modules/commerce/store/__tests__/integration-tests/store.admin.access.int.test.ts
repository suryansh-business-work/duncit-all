import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { storeAdminResolvers } from '../../store.admin.resolver';
import { storeShippingResolvers } from '../../store.shipping.resolver';
import { STORE_ADMIN_ROLES } from '../../store.shared';

/**
 * Who runs the pet store (ecomm.duncit.com).
 *
 * ECOMM_MANAGER is the Partner Brand role — every approved E-Commerce Brand
 * partner holds it. It used to open the store's operator API too, which handed
 * every brand partner the store's orders, customer PII, coupons and settings.
 * The store now answers only to its own staff role, ECOMM_STORE_MANAGER, and to
 * SUPER_ADMIN.
 */

type Field = (parent: unknown, args: Record<string, unknown>, ctx: GraphQLContext) => unknown;

const ctxFor = (roles: string[]) =>
  ({ user: { id: new Types.ObjectId().toHexString(), email: 'someone@duncit.test', roles } }) as unknown as GraphQLContext;

/** Every operator field the ecomm console can call, by name. */
const operatorFields: [string, Field][] = [
  ...Object.entries(storeAdminResolvers.Query),
  ...Object.entries(storeAdminResolvers.Mutation),
  ...Object.entries(storeShippingResolvers.Query),
  ...Object.entries(storeShippingResolvers.Mutation),
] as [string, Field][];

const call = async (field: Field, ctx: GraphQLContext) => field(undefined, {}, ctx);

describe('store operator API — role gate', () => {
  it('admits only the pet store staff role and SUPER_ADMIN', () => {
    expect([...STORE_ADMIN_ROLES]).toEqual(['SUPER_ADMIN', 'ECOMM_STORE_MANAGER']);
    expect(STORE_ADMIN_ROLES).not.toContain('ECOMM_MANAGER');
  });

  it('covers the whole operator surface (a field missing here would be untested)', () => {
    expect(operatorFields.length).toBeGreaterThan(80);
  });

  it.each(operatorFields)('refuses a Partner Brand partner (ECOMM_MANAGER) on %s', async (_name, field) => {
    await expect(call(field, ctxFor(['USER', 'ECOMM_MANAGER']))).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('refuses a signed-out caller before anything runs', async () => {
    const anonymous = { user: null } as unknown as GraphQLContext;
    await expect(call(storeAdminResolvers.Query.storeOrdersTable as Field, anonymous)).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it.each([['ECOMM_STORE_MANAGER'], ['SUPER_ADMIN']])('lets %s read and write the store', async (role) => {
    const ctx = ctxFor([role]);
    const settings = (await call(storeAdminResolvers.Query.storeAdminSettings as Field, ctx)) as { store_name: string };
    expect(typeof settings.store_name).toBe('string');

    const save = storeAdminResolvers.Mutation.storeSaveSettings as Field;
    const saved = (await save(undefined, { input: { store_name: `Duncit Pets ${role}` } }, ctx)) as {
      store_name: string;
    };
    expect(saved.store_name).toBe(`Duncit Pets ${role}`);
  });

  it('still refuses a brand partner who also holds an unrelated staff role', async () => {
    await expect(
      call(storeAdminResolvers.Query.storeCustomersTable as Field, ctxFor(['ECOMM_MANAGER', 'MARKETING_MANAGER']))
    ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });
});
