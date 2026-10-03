jest.mock('../../inventory.service', () => ({
  inventoryService: new Proxy(
    {},
    {
      get: (target: Record<string, jest.Mock>, key: string) => {
        if (!target[key]) target[key] = jest.fn();
        return target[key];
      },
    }
  ),
}));
jest.mock('@modules/access/user/user.display', () => ({
  userDisplayOf: jest.fn(),
}));
jest.mock('../../../productReview/productReview.service', () => ({
  productReviewService: { summary: jest.fn() },
}));

import { inventoryResolvers, ADMIN_RW } from '../../inventory.resolver';
import { inventoryService } from '../../inventory.service';
import { userDisplayOf } from '@modules/access/user/user.display';
import { makeContext } from '@test/harness';

const svc = inventoryService as unknown as Record<string, jest.Mock>;
const Query = inventoryResolvers.Query as Record<string, (p: unknown, a: any, c: any) => Promise<unknown>>;
const Mutation = inventoryResolvers.Mutation as Record<
  string,
  (p: unknown, a: any, c: any) => Promise<unknown>
>;

const ADMIN_ID = '507f1f77bcf86cd799439011';
const admin = () => makeContext({ id: ADMIN_ID, roles: ['PRODUCTS_MANAGER'] });
const plainUser = () => makeContext({ id: ADMIN_ID, roles: ['USER'] });
const anon = () => makeContext(null);

type Case = {
  name: string;
  resolver: (p: unknown, a: any, c: any) => Promise<unknown>;
  args: Record<string, unknown>;
  method: string;
  expectArgs: (user: unknown) => unknown[];
};

const q = 'query';
const m = 'mutation';
const pick = (kind: string, name: string) => (kind === q ? Query[name] : Mutation[name]);

// Admin-gated resolvers: [kind, resolver, args, service method, expected service args (user => [...])]
const adminCases: Case[] = (
  [
    [q, 'inventoryProducts', { search: 'tea', activeOnly: true }, 'list', () => [{ search: 'tea', activeOnly: true }]],
    [q, 'inventoryProductsTable', { query: { page: 2 } }, 'table', () => [{ page: 2 }]],
    [q, 'marketplaceBrandProducts', { brand_doc_id: 'b1' }, 'listMarketplaceBrandProducts', () => ['b1']],
    [
      q,
      'marketplaceBrandProductsTable',
      { brand_doc_id: 'b1', query: { page: 1 } },
      'marketplaceBrandProductsTable',
      () => ['b1', { page: 1 }],
    ],
    [q, 'productListingRequests', { status: 'PENDING' }, 'listProductRequests', () => ['PENDING']],
    [q, 'productListingRequests', {}, 'listProductRequests', () => [null]],
    [q, 'productListingRequestsTable', { query: { page: 3 } }, 'productListingRequestsTable', () => [{ page: 3 }]],
    [q, 'inventoryProduct', { product_doc_id: 'p1' }, 'getById', () => ['p1']],
    [q, 'inventoryActivityLogs', { product_doc_id: 'p1', limit: 5 }, 'listActivityLogs', () => ['p1', 5]],
    [q, 'inventoryActivityLogs', { product_doc_id: 'p1' }, 'listActivityLogs', () => ['p1', 100]],
    [q, 'inventoryStockMovements', { product_doc_id: 'p1', limit: 7 }, 'listStockMovements', () => ['p1', 7]],
    [q, 'inventoryStockMovements', { product_doc_id: 'p1' }, 'listStockMovements', () => ['p1', 100]],
    [q, 'inventoryAnalytics', { product_doc_id: 'p1', days: 7 }, 'analytics', () => ['p1', 7]],
    [q, 'inventoryAnalytics', { product_doc_id: 'p1' }, 'analytics', () => ['p1', 30]],
    [q, 'inventoryProductLinkedPods', { product_doc_id: 'p1' }, 'listLinkedPods', () => ['p1']],
    [m, 'createInventoryProduct', { input: { name: 'Tea' } }, 'create', (u) => [{ name: 'Tea' }, u]],
    [
      m,
      'reviewProductListing',
      { product_doc_id: 'p1', status: 'APPROVED', notes: 'ok', commission_pct: 12 },
      'reviewProductListing',
      (u) => ['p1', 'APPROVED', 'ok', u, 12],
    ],
    [m, 'updateInventoryProduct', { product_doc_id: 'p1', input: { price: 5 } }, 'update', (u) => ['p1', { price: 5 }, u]],
    [m, 'deleteInventoryProduct', { product_doc_id: 'p1' }, 'remove', (u) => ['p1', u]],
    [m, 'permanentlyDeleteInventoryProduct', { product_doc_id: 'p1' }, 'permanentlyDelete', (u) => ['p1', u]],
    [m, 'archiveInventoryProduct', { product_doc_id: 'p1' }, 'archive', (u) => ['p1', u]],
    [m, 'restoreInventoryProduct', { product_doc_id: 'p1' }, 'restore', (u) => ['p1', u]],
    [
      m,
      'setInventoryProductActive',
      { product_doc_id: 'p1', active: false },
      'setProductActive',
      (u) => ['p1', false, u],
    ],
    [m, 'duplicateInventoryProduct', { product_doc_id: 'p1' }, 'duplicate', (u) => ['p1', u]],
    [
      m,
      'recordInventoryStockMovement',
      { product_doc_id: 'p1', input: { type: 'IN', quantity: 3 } },
      'recordStockMovement',
      (u) => ['p1', { type: 'IN', quantity: 3 }, u],
    ],
    [m, 'generateInventorySku', {}, 'generateSku', () => []],
  ] as const
).map(([kind, name, args, method, expectArgs]) => ({
  name: `${kind} ${name}`,
  resolver: pick(kind, name),
  args: args as Record<string, unknown>,
  method,
  expectArgs: expectArgs as (u: unknown) => unknown[],
}));

// Any-signed-in-user resolvers.
const authCases: Case[] = (
  [
    [q, 'myProductListings', { brand_id: 'b1' }, 'listMyProductListings', (u) => [u, 'b1']],
    [
      q,
      'myProductListingsTable',
      { brand_id: null, query: { page: 1 } },
      'myProductListingsTable',
      (u) => [u, null, { page: 1 }],
    ],
    [q, 'myProductAnalytics', { product_doc_id: 'p1' }, 'myProductAnalytics', (u) => ['p1', u]],
    [
      q,
      'availablePodProducts',
      { super_category_id: 's', category_id: null },
      'listAvailablePodProducts',
      () => [{ super_category_id: 's', category_id: null }],
    ],
    [q, 'publicInventoryProduct', { product_doc_id: 'p1' }, 'getById', () => ['p1']],
    [q, 'podsForProduct', { product_doc_id: 'p1' }, 'podsForProduct', () => ['p1']],
    [m, 'submitProductListing', { input: { name: 'Mat' } }, 'submitProductListing', (u) => [{ name: 'Mat' }, u]],
    [
      m,
      'updateMyProductListing',
      { product_doc_id: 'p1', input: { name: 'Mat 2' } },
      'updateMyProductListing',
      (u) => ['p1', { name: 'Mat 2' }, u],
    ],
    [
      m,
      'updateMyProductListingQuantity',
      { product_doc_id: 'p1', inventory_count: 9 },
      'updateMyProductListingQuantity',
      (u) => ['p1', 9, u],
    ],
    [
      m,
      'updateMyProductSettings',
      { product_doc_id: 'p1', low_stock_alert: 4, notify_low_stock: true },
      'updateMyProductSettings',
      (u) => ['p1', 4, true, u],
    ],
    [m, 'deleteMyProductListing', { product_doc_id: 'p1' }, 'deleteMyProductListing', (u) => ['p1', u]],
    [
      m,
      'setMyProductListingActive',
      { product_doc_id: 'p1', active: true },
      'setMyProductListingActive',
      (u) => ['p1', true, u],
    ],
    [m, 'recordProductView', { product_doc_id: 'p1' }, 'recordProductView', () => ['p1']],
    [
      m,
      'recordProductClick',
      { product_doc_id: 'p1', variant_id: 'v1' },
      'recordProductClick',
      () => ['p1', 'v1'],
    ],
  ] as const
).map(([kind, name, args, method, expectArgs]) => ({
  name: `${kind} ${name}`,
  resolver: pick(kind, name),
  args: args as Record<string, unknown>,
  method,
  expectArgs: expectArgs as (u: unknown) => unknown[],
}));

describe('inventory resolver — gates and delegation', () => {
  it('ADMIN_RW is the products-console roster', () => {
    expect(ADMIN_RW).toEqual(['SUPER_ADMIN', 'CITY_ADMIN', 'PRODUCTS_MANAGER']);
  });

  it.each(adminCases)('$name delegates to the service with the caller and defaults', async (c) => {
    const ctx = admin();
    svc[c.method].mockResolvedValueOnce({ marker: c.name });
    await expect(c.resolver({}, c.args, ctx)).resolves.toEqual({ marker: c.name });
    expect(svc[c.method]).toHaveBeenCalledTimes(1);
    expect(svc[c.method]).toHaveBeenCalledWith(...c.expectArgs(ctx.user));
  });

  it.each(adminCases)('$name refuses a signed-in user without a products role', async (c) => {
    await expect(c.resolver({}, c.args, plainUser())).rejects.toThrow('Access Denied');
    expect(svc[c.method]).not.toHaveBeenCalled();
  });

  it.each(adminCases)('$name refuses an anonymous caller', async (c) => {
    await expect(c.resolver({}, c.args, anon())).rejects.toThrow('Not authenticated');
    expect(svc[c.method]).not.toHaveBeenCalled();
  });

  it.each(authCases)('$name delegates for any signed-in user', async (c) => {
    const ctx = plainUser();
    svc[c.method].mockResolvedValueOnce({ marker: c.name });
    await expect(c.resolver({}, c.args, ctx)).resolves.toEqual({ marker: c.name });
    expect(svc[c.method]).toHaveBeenCalledWith(...c.expectArgs(ctx.user));
  });

  it.each(authCases)('$name refuses an anonymous caller', async (c) => {
    await expect(c.resolver({}, c.args, anon())).rejects.toThrow('Not authenticated');
    expect(svc[c.method]).not.toHaveBeenCalled();
  });
});

describe('InventoryProduct field resolvers', () => {
  const field = inventoryResolvers.InventoryProduct;

  it('last_updated_by_name resolves the actor display name', async () => {
    (userDisplayOf as jest.Mock).mockResolvedValueOnce({ name: 'Asha Rao' });
    await expect(field.last_updated_by_name({ last_updated_by_id: 'u1' })).resolves.toBe('Asha Rao');
    expect(userDisplayOf).toHaveBeenCalledWith('u1');
  });

  it('last_updated_by_name is empty without an actor and does not look one up', async () => {
    await expect(field.last_updated_by_name({ last_updated_by_id: null })).resolves.toBe('');
    await expect(field.last_updated_by_name({})).resolves.toBe('');
    expect(userDisplayOf).not.toHaveBeenCalled();
  });

  it('listing_reviewed_by_name resolves the reviewer display name', async () => {
    (userDisplayOf as jest.Mock).mockResolvedValueOnce({ name: 'Ravi K' });
    await expect(field.listing_reviewed_by_name({ listing_reviewed_by_id: 'u2' })).resolves.toBe('Ravi K');
    expect(userDisplayOf).toHaveBeenCalledWith('u2');
  });

  it('listing_reviewed_by_name is empty when nobody reviewed it', async () => {
    await expect(field.listing_reviewed_by_name({ listing_reviewed_by_id: '' })).resolves.toBe('');
    expect(userDisplayOf).not.toHaveBeenCalled();
  });
});
