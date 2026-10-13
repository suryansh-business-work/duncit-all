jest.mock('../../catalogDeletion.service', () => ({
  catalogDeletionService: {
    preview: jest.fn().mockResolvedValue('preview'),
    mine: jest.fn().mockResolvedValue('mine'),
    window: jest.fn().mockResolvedValue('window'),
    table: jest.fn().mockResolvedValue('table'),
    detail: jest.fn().mockResolvedValue('detail'),
    request: jest.fn().mockResolvedValue('request'),
    withdraw: jest.fn().mockResolvedValue('withdraw'),
    review: jest.fn().mockResolvedValue('review'),
  },
}));
jest.mock('../../catalogDeletion.window', () => ({ updateDeletionWindow: jest.fn().mockResolvedValue('window-updated') }));
jest.mock('../../catalogDeletion.executor', () => ({ runDueDeletions: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));
jest.mock('@utils/clusterJob', () => ({ startClusterJob: jest.fn(() => () => undefined) }));

import type { GraphQLContext } from '@context';
import { startClusterJob } from '@utils/clusterJob';
import { catalogDeletionService } from '../../catalogDeletion.service';
import { updateDeletionWindow } from '../../catalogDeletion.window';
import { runDueDeletions } from '../../catalogDeletion.executor';
import { catalogDeletionResolvers as r } from '../../catalogDeletion.resolver';
import { startCatalogDeletionScheduler } from '../../catalogDeletion.scheduler';
import { logs } from '@observability/log';

/**
 * Who may reach the deletion queue: the partner side needs the ecomm manager
 * role and is scoped to the caller's own id; the review side needs the
 * Products team.
 */

const as = (roles: string[], email: string | null = 'staff@x.com') =>
  ({ user: { id: 'u-1', email, roles } }) as unknown as GraphQLContext;
const partner = as(['ECOMM_MANAGER']);
const products = as(['PRODUCTS_MANAGER']);
const nobody = { user: null } as unknown as GraphQLContext;

describe('partner operations', () => {
  it('pass the caller’s own id, never one from the arguments', async () => {
    await r.Query.catalogDeletionPreview({}, { kind: 'PRODUCT', target_id: 'p1' }, partner);
    expect(catalogDeletionService.preview).toHaveBeenCalledWith('u-1', 'PRODUCT', 'p1');
    await r.Query.myCatalogDeletionRequests({}, { brand_id: 'b1' }, partner);
    expect(catalogDeletionService.mine).toHaveBeenCalledWith('u-1', 'b1');
    await r.Mutation.requestCatalogDeletion({}, { input: { kind: 'BRAND' } as never }, partner);
    expect(catalogDeletionService.request).toHaveBeenCalledWith('u-1', { kind: 'BRAND' });
    await r.Mutation.withdrawCatalogDeletion({}, { id: 'r1' }, partner);
    expect(catalogDeletionService.withdraw).toHaveBeenCalledWith('u-1', 'r1');
  });

  it('refuse a caller without the partner role, and a caller who is signed out', () => {
    expect(() => r.Query.catalogDeletionPreview({}, { kind: 'PRODUCT', target_id: 'p' }, products)).toThrow();
    expect(() => r.Mutation.requestCatalogDeletion({}, { input: {} as never }, nobody)).toThrow();
    expect(catalogDeletionService.preview).not.toHaveBeenCalled();
    expect(catalogDeletionService.request).not.toHaveBeenCalled();
  });
});

describe('Products team operations', () => {
  it('read the queue and one request', () => {
    r.Query.catalogDeletionRequestsTable({}, { kind: 'BRAND', parent_id: 'x' }, products);
    expect(catalogDeletionService.table).toHaveBeenCalledWith('BRAND', undefined, 'x');
    r.Query.catalogDeletionRequest({}, { id: 'r1' }, products);
    expect(catalogDeletionService.detail).toHaveBeenCalledWith('r1');
  });

  it('review as the signed-in user, by email when there is one, else id, with a blank note when none is sent', () => {
    r.Mutation.reviewCatalogDeletion({}, { id: 'r1', approve: true }, products);
    expect(catalogDeletionService.review).toHaveBeenCalledWith('r1', true, '', 'staff@x.com');
    r.Mutation.reviewCatalogDeletion({}, { id: 'r2', approve: false, note: 'no' }, as(['SUPER_ADMIN'], null));
    expect(catalogDeletionService.review).toHaveBeenLastCalledWith('r2', false, 'no', 'u-1');
  });

  it('change the window as the signed-in user', async () => {
    await r.Mutation.updateCatalogDeletionWindow({}, { input: { min_days: 5, max_days: 9 } }, products);
    expect(updateDeletionWindow).toHaveBeenCalledWith({ min_days: 5, max_days: 9 }, 'u-1');
  });

  it('refuse a partner, and anyone signed out', () => {
    expect(() => r.Query.catalogDeletionRequestsTable({}, { kind: 'BRAND' }, partner)).toThrow();
    expect(() => r.Mutation.reviewCatalogDeletion({}, { id: 'r', approve: true }, nobody)).toThrow();
    expect(() => r.Mutation.updateCatalogDeletionWindow({}, { input: { min_days: 1, max_days: 2 } }, partner)).toThrow();
    expect(catalogDeletionService.review).not.toHaveBeenCalled();
  });
});

describe('the window query', () => {
  it('needs a signed-in user but no particular role', async () => {
    expect(() => r.Query.catalogDeletionWindow({}, {}, nobody)).toThrow();
    expect(await r.Query.catalogDeletionWindow({}, {}, partner)).toBe('window');
  });
});

describe('the hourly sweep', () => {
  it('runs the due deletions on its schedule and logs only when something completed', async () => {
    startCatalogDeletionScheduler();
    const config = (startClusterJob as jest.Mock).mock.calls[0][0];
    expect(config).toMatchObject({ component: 'catalog-deletion', intervalMs: 3_600_000, firstDelayMs: 300_000 });

    (runDueDeletions as jest.Mock).mockResolvedValueOnce(2);
    await config.run();
    expect(logs.server.info).toHaveBeenCalledWith('catalog-deletion', 'run', { completed: 2 });

    (logs.server.info as jest.Mock).mockClear();
    (runDueDeletions as jest.Mock).mockResolvedValueOnce(0);
    await config.run();
    expect(logs.server.info).not.toHaveBeenCalled();
  });
});
