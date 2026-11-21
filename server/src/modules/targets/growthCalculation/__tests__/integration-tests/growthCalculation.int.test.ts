/**
 * Saved Growth Calculator runs, against a real database: every Save is its own
 * record with outputs the SERVER calculated, attributed to the signed-in
 * person; a double-pressed Save writes once; edits keep the creator and lose
 * nothing to a concurrent edit; Delete hides a record without erasing it; and
 * only the Targets console's seats get in at all.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { UserModel } from '@modules/access/user/user.model';
import { GrowthCalculationModel } from '../../growthCalculation.model';
import { growthCalculationResolvers } from '../../growthCalculation.resolver';

const Q = growthCalculationResolvers.Query as Record<string, (...a: any[]) => any>;
const M = growthCalculationResolvers.Mutation as Record<string, (...a: any[]) => any>;

const DEFAULTS = {
  pax_per_pod: 10,
  price_per_pax: 400,
  profit_margin_pct: 20,
  hosts_per_venue: 2,
  pods_per_host_per_month: 2,
  venues_per_city: 100,
  target_cities: 10,
  host_conversion_pct: 10,
  venue_conversion_pct: 5,
};

let seq = 0;
async function person(first: string, roles: string[]) {
  const user = await UserModel.create({
    auth: { email: `growth${++seq}@x.com` },
    profile: { first_name: first, last_name: 'Planner' },
  });
  return makeContext({ id: String(user._id), email: `growth${seq}@x.com`, roles });
}

const save = (ctx: ReturnType<typeof makeContext>, over: Record<string, unknown> = {}) =>
  M.saveGrowthCalculation({}, { input: { title: 'Ten cities', inputs: DEFAULTS, ...over } }, ctx);

const tableOf = (ctx: ReturnType<typeof makeContext>, query: Record<string, unknown> = {}) =>
  Q.growthCalculationsTable({}, { query }, ctx);

beforeAll(async () => {
  // The unique (person, request id) index has to exist before the race test.
  await GrowthCalculationModel.syncIndexes();
});

describe('saving', () => {
  it('stores the inputs with the outputs the server calculated, attributed to the caller', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const row = await save(asha, { description: '  First plan  ' });

    expect(row).toMatchObject({
      title: 'Ten cities',
      description: 'First plan',
      inputs: DEFAULTS,
      per_pod: { pod_value: '4000.00', earnings_per_pod: '800.00' },
      per_city: { hosts: 200, monthly_pods: 400, monthly_earnings: '320000.00' },
      totals: {
        venues: 1000,
        hosts: 2000,
        monthly_pods: 4000,
        total_leads: 40000,
        monthly_gmv: '16000000.00',
        monthly_earnings: '3200000.00',
        annual_earnings: '38400000.00',
      },
      formula_version: 1,
      calculated_by: { user_id: asha.user!.id, name: 'Asha Planner', email: asha.user!.email, roles: ['TARGETS_MANAGER'] },
      last_edited_by: null,
      revision: 0,
      can_edit: true,
    });
    expect(new Date(row.created_at).getTime()).not.toBeNaN();

    // Exact in storage too: Decimal128, not a float.
    const stored = await GrowthCalculationModel.findById(row.id).lean();
    expect(stored!.totals.annual_earnings.toString()).toBe('38400000.00');
  });

  it('makes a new, independent record on every save — even with the same title', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const a = await save(asha);
    const b = await save(asha, { inputs: { ...DEFAULTS, target_cities: 20 } });
    expect(a.id).not.toBe(b.id);
    expect(await GrowthCalculationModel.countDocuments()).toBe(2);
    expect((await Q.growthCalculation({}, { id: a.id }, asha)).totals.cities).toBe(10);
  });

  it('turns a repeated press of the same Save into one record, even when the presses race', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const first = await save(asha, { client_request_id: 'press-1' });
    const again = await save(asha, { client_request_id: 'press-1' });
    expect(again.id).toBe(first.id);

    const raced = await Promise.all([1, 2, 3].map(() => save(asha, { client_request_id: 'press-2' })));
    expect(new Set(raced.map((r) => r.id)).size).toBe(1);
    expect(await GrowthCalculationModel.countDocuments()).toBe(2);
  });

  it('keeps two people with the same request id apart', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const ravi = await person('Ravi', ['TARGETS_MANAGER']);
    const a = await save(asha, { client_request_id: 'same' });
    const r = await save(ravi, { client_request_id: 'same' });
    expect(a.id).not.toBe(r.id);
  });

  it('refuses a blank or over-long title, an over-long description and a zero conversion rate, writing nothing', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const bad = { extensions: { code: 'BAD_USER_INPUT' } };
    await expect(save(asha, { title: '   ' })).rejects.toMatchObject({ ...bad, message: 'Title is required' });
    await expect(save(asha, { title: 'x'.repeat(121) })).rejects.toMatchObject(bad);
    await expect(save(asha, { description: 'x'.repeat(1001) })).rejects.toMatchObject(bad);
    await expect(save(asha, { inputs: { ...DEFAULTS, venue_conversion_pct: 0 } })).rejects.toMatchObject(bad);
    await expect(save(asha, { client_request_id: 'r'.repeat(101) })).rejects.toMatchObject(bad);
    expect(await GrowthCalculationModel.countDocuments()).toBe(0);
    // The limits themselves are accepted.
    await expect(save(asha, { title: 'x'.repeat(120), description: 'y'.repeat(1000) })).resolves.toBeDefined();
  });
});

describe('who may use it', () => {
  it('lets a Targets manager and a super admin in, and nobody else', async () => {
    const member = await person('Mo', ['USER']);
    await expect(save(member)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(tableOf(member)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(Q.growthCalculationPreview({}, { inputs: DEFAULTS }, member)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(save(makeContext(null))).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
    await expect(save(await person('Sam', ['SUPER_ADMIN']))).resolves.toMatchObject({ can_edit: true });
  });

  it('marks only the creator’s rows editable for another manager, and every row for a super admin', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const ravi = await person('Ravi', ['TARGETS_MANAGER']);
    const admin = await person('Sam', ['SUPER_ADMIN']);
    const row = await save(asha);
    expect((await Q.growthCalculation({}, { id: row.id }, ravi)).can_edit).toBe(false);
    expect((await Q.growthCalculation({}, { id: row.id }, admin)).can_edit).toBe(true);
  });
});

describe('the listing', () => {
  it('lists newest first, searches title, description and creator, and pages', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const ravi = await person('Ravi', ['TARGETS_MANAGER']);
    const older = await save(asha, { title: 'Metro push', description: 'Mumbai and Delhi' });
    const newer = await save(ravi, { title: 'Tier two' });

    const all = await tableOf(asha);
    expect(all.rows.map((r: { id: string }) => r.id)).toEqual([newer.id, older.id]);
    expect(all.total).toBe(2);

    expect((await tableOf(asha, { search: 'mumbai' })).rows.map((r: { id: string }) => r.id)).toEqual([older.id]);
    expect((await tableOf(asha, { search: 'Ravi' })).rows.map((r: { id: string }) => r.id)).toEqual([newer.id]);

    const page2 = await tableOf(asha, { page: 2, page_size: 1 });
    expect(page2).toMatchObject({ total: 2, page: 2, page_size: 1 });
    expect(page2.rows.map((r: { id: string }) => r.id)).toEqual([older.id]);
  });

  it('sorts money numerically, not as text, and filters on totals', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const big = await save(asha, { title: 'Big' }); // ₹1,60,00,000 a month
    const small = await save(asha, { title: 'Small', inputs: { ...DEFAULTS, target_cities: 1, venues_per_city: 56 } }); // ₹8,96,000
    const ids = (page: { rows: { id: string }[] }) => page.rows.map((r) => r.id);

    expect(ids(await tableOf(asha, { sort_by: 'monthly_gmv', sort_dir: 'desc' }))).toEqual([big.id, small.id]);
    expect(ids(await tableOf(asha, { sort_by: 'monthly_gmv', sort_dir: 'asc' }))).toEqual([small.id, big.id]);
    expect(ids(await tableOf(asha, { filters: [{ field: 'cities', op: 'gte', value: '5' }] }))).toEqual([big.id]);
    expect(ids(await tableOf(asha, { filters: [{ field: 'monthly_earnings', op: 'lte', value: '500000' }] }))).toEqual([small.id]);
  });

  it('never shows a deleted record', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const gone = await save(asha);
    await M.deleteGrowthCalculation({}, { id: gone.id }, asha);
    expect((await tableOf(asha)).total).toBe(0);
  });
});

describe('editing', () => {
  it('recalculates, keeps the creator and creation date, and stamps the editor', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const row = await save(asha);
    const edited = await M.updateGrowthCalculation(
      {},
      {
        id: row.id,
        input: { title: 'Twenty cities', inputs: { ...DEFAULTS, target_cities: 20 }, expected_revision: row.revision },
      },
      asha
    );
    expect(edited).toMatchObject({
      id: row.id,
      title: 'Twenty cities',
      description: '',
      created_at: row.created_at,
      calculated_by: row.calculated_by,
      last_edited_by: { user_id: asha.user!.id, name: 'Asha Planner' },
      totals: { cities: 20, monthly_gmv: '32000000.00' },
      revision: 1,
    });
    expect(edited.last_edited_at).toEqual(expect.any(String));
    expect(await GrowthCalculationModel.countDocuments()).toBe(1);
  });

  it('refuses an edit made against a version someone else has since saved', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const row = await save(asha);
    const input = { title: 'A', inputs: DEFAULTS, expected_revision: row.revision };
    await M.updateGrowthCalculation({}, { id: row.id, input }, asha);
    await expect(
      M.updateGrowthCalculation({}, { id: row.id, input: { ...input, title: 'B' } }, asha)
    ).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
    expect((await Q.growthCalculation({}, { id: row.id }, asha)).title).toBe('A');
    await expect(
      M.updateGrowthCalculation({}, { id: row.id, input: { ...input, expected_revision: -1 } }, asha)
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('is the creator’s or a super admin’s to make', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const ravi = await person('Ravi', ['TARGETS_MANAGER']);
    const admin = await person('Sam', ['SUPER_ADMIN']);
    const row = await save(asha);
    const input = { title: 'Changed', inputs: DEFAULTS, expected_revision: row.revision };
    await expect(M.updateGrowthCalculation({}, { id: row.id, input }, ravi)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    const byAdmin = await M.updateGrowthCalculation({}, { id: row.id, input }, admin);
    expect(byAdmin.calculated_by.user_id).toBe(asha.user!.id);
    expect(byAdmin.last_edited_by.user_id).toBe(admin.user!.id);
  });
});

describe('duplicating', () => {
  it('makes a separate record from the source inputs, attributed to whoever duplicated it', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const ravi = await person('Ravi', ['TARGETS_MANAGER']);
    const source = await save(asha, { description: 'Original', inputs: { ...DEFAULTS, target_cities: 7 } });
    const copy = await M.duplicateGrowthCalculation({}, { id: source.id, title: 'Ten cities (copy)' }, ravi);

    expect(copy.id).not.toBe(source.id);
    expect(copy).toMatchObject({
      title: 'Ten cities (copy)',
      description: 'Original',
      inputs: { ...DEFAULTS, target_cities: 7 },
      totals: source.totals,
      duplicated_from: source.id,
      calculated_by: { user_id: ravi.user!.id, name: 'Ravi Planner' },
      can_edit: true,
    });
    expect(await Q.growthCalculation({}, { id: source.id }, asha)).toMatchObject({ title: 'Ten cities', duplicated_from: null });
  });

  it('writes once for a repeated press, and refuses a missing source', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const source = await save(asha);
    const args = { id: source.id, title: 'Copy', client_request_id: 'dup-1' };
    const a = await M.duplicateGrowthCalculation({}, args, asha);
    const b = await M.duplicateGrowthCalculation({}, args, asha);
    expect(b.id).toBe(a.id);
    await expect(
      M.duplicateGrowthCalculation({}, { id: new Types.ObjectId().toString(), title: 'Copy' }, asha)
    ).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('deleting', () => {
  it('hides the record but keeps it, with who deleted it and when', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const row = await save(asha);
    await expect(M.deleteGrowthCalculation({}, { id: row.id }, asha)).resolves.toBe(true);

    await expect(Q.growthCalculation({}, { id: row.id }, asha)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(M.deleteGrowthCalculation({}, { id: row.id }, asha)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    const kept = await GrowthCalculationModel.findById(row.id).lean();
    expect(kept!.deleted_at).toBeInstanceOf(Date);
    expect(String(kept!.deleted_by)).toBe(asha.user!.id);
  });

  it('is refused for another manager and allowed for a super admin', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const ravi = await person('Ravi', ['TARGETS_MANAGER']);
    const admin = await person('Sam', ['SUPER_ADMIN']);
    const row = await save(asha);
    await expect(M.deleteGrowthCalculation({}, { id: row.id }, ravi)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(M.deleteGrowthCalculation({}, { id: row.id }, admin)).resolves.toBe(true);
  });
});

describe('reading one and previewing', () => {
  it('refuses a malformed id', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    await expect(Q.growthCalculation({}, { id: 'nope' }, asha)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('previews the outputs without saving anything', async () => {
    const asha = await person('Asha', ['TARGETS_MANAGER']);
    const preview = await Q.growthCalculationPreview({}, { inputs: DEFAULTS }, asha);
    expect(preview.totals.annual_earnings).toBe('38400000.00');
    expect(await GrowthCalculationModel.countDocuments()).toBe(0);
    await expect(
      Q.growthCalculationPreview({}, { inputs: { ...DEFAULTS, host_conversion_pct: 0 } }, asha)
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });
});
