/**
 * HR Team Structure against a real database: who may touch it, the seat tree's
 * rules (no loops, children move up on delete, same-structure parents), pay
 * validation and the monthly budget, and what a share link does and does not
 * reveal to someone who is not signed in.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { TeamStructureNodeModel, TeamStructureShareModel } from '../../teamStructure.model';
import { teamStructureResolvers } from '../../teamStructure.resolver';

const Q = teamStructureResolvers.Query as Record<string, (...a: any[]) => any>;
const M = teamStructureResolvers.Mutation as Record<string, (...a: any[]) => any>;

const oid = () => new Types.ObjectId().toString();
const hr = makeContext({ id: oid(), roles: ['HR_MANAGER'] });
const admin = makeContext({ id: oid(), roles: ['SUPER_ADMIN'] });
const stranger = makeContext({ id: oid(), roles: ['USER'] });
const anon = makeContext();

const team = (name = 'Core') => M.saveTeamStructure({}, { name }, hr);
const seat = (over: Record<string, unknown> = {}) => ({
  kind: 'ROLE',
  title: 'Seat',
  employment_type: 'FULL_TIME',
  ...over,
});
const addSeat = (structure_id: string, over: Record<string, unknown> = {}) =>
  M.upsertTeamStructureNode({}, { structure_id, input: seat(over) }, hr);
const fixed = (amount: number, over: Record<string, unknown> = {}) => ({
  label: 'Base',
  kind: 'FIXED',
  frequency: 'MONTHLY',
  amount,
  ...over,
});

describe('who may use it', () => {
  it('refuses the console calls to anonymous and to signed-in people without the HR seat', async () => {
    const t = await team();
    const calls: Array<(ctx: any) => unknown> = [
      (ctx) => Q.teamStructures({}, {}, ctx),
      (ctx) => Q.teamStructure({}, { id: t.id }, ctx),
      (ctx) => Q.teamStructureShares({}, { structure_id: t.id }, ctx),
      (ctx) => M.saveTeamStructure({}, { name: 'x' }, ctx),
      (ctx) => M.deleteTeamStructure({}, { id: t.id }, ctx),
      (ctx) => M.upsertTeamStructureNode({}, { structure_id: t.id, input: seat() }, ctx),
      (ctx) => M.deleteTeamStructureNode({}, { id: oid() }, ctx),
      (ctx) => M.createTeamStructureShare({}, { structure_id: t.id }, ctx),
      (ctx) => M.revokeTeamStructureShare({}, { id: oid() }, ctx),
    ];
    for (const call of calls) {
      await expect(Promise.resolve().then(() => call(anon))).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
      await expect(Promise.resolve().then(() => call(stranger))).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    }
  });

  it('lets the HR manager and a super admin in', async () => {
    const t = await team('Both');
    await expect(Q.teamStructure({}, { id: t.id }, hr)).resolves.toBeDefined();
    await expect(Q.teamStructure({}, { id: t.id }, admin)).resolves.toBeDefined();
  });
});

describe('teams', () => {
  it('creates with the default currency, upper-cases a given one, and renames in place', async () => {
    const a = await team('Alpha');
    expect(a).toMatchObject({ name: 'Alpha', currency: 'INR', description: null });
    const b = await M.saveTeamStructure({}, { name: 'Beta', currency: 'usd', description: 'Overseas' }, hr);
    expect(b).toMatchObject({ currency: 'USD', description: 'Overseas' });
    const renamed = await M.saveTeamStructure({}, { id: a.id, name: 'Alpha 2' }, hr);
    expect(renamed).toMatchObject({ id: a.id, name: 'Alpha 2', currency: 'INR' });
  });

  it('reports not found for a team that does not exist and bad input for a malformed id', async () => {
    await expect(M.saveTeamStructure({}, { id: oid(), name: 'x' }, hr)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(Q.teamStructure({}, { id: oid() }, hr)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(Q.teamStructure({}, { id: 'nope' }, hr)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('lists every team with its seat count and monthly budget, leaving optional seats out of the budget', async () => {
    const t = await team('Budgeted');
    await addSeat(t.id, { pay: [fixed(10000)] });
    await addSeat(t.id, { pay: [fixed(5000)] });
    await addSeat(t.id, { status: 'OPTIONAL', pay: [fixed(7000)] });
    const empty = await team('Empty');
    const rows = await Q.teamStructures({}, {}, hr);
    expect(rows.find((r: { id: string }) => r.id === t.id)).toMatchObject({ seat_count: 3, monthly_cost: 15000 });
    expect(rows.find((r: { id: string }) => r.id === empty.id)).toMatchObject({ seat_count: 0, monthly_cost: 0 });
  });

  it('deletes the chart together with its seats and share links, and nobody else’s', async () => {
    const t = await team('Doomed');
    const keep = await team('Kept');
    await addSeat(t.id);
    await addSeat(keep.id);
    await M.createTeamStructureShare({}, { structure_id: t.id }, hr);
    await expect(M.deleteTeamStructure({}, { id: t.id }, hr)).resolves.toBe(true);
    expect(await TeamStructureNodeModel.countDocuments({ structure_id: new Types.ObjectId(t.id) })).toBe(0);
    expect(await TeamStructureShareModel.countDocuments({ structure_id: new Types.ObjectId(t.id) })).toBe(0);
    expect(await TeamStructureNodeModel.countDocuments({ structure_id: new Types.ObjectId(keep.id) })).toBe(1);
  });
});

describe('seats', () => {
  it('creates a seat with defaults and returns it ready for the chart', async () => {
    const t = await team();
    const s = await addSeat(t.id, { title: 'CEO', kind: 'HEAD', person_name: 'Asha' });
    expect(s).toMatchObject({
      structure_id: t.id,
      parent_id: null,
      kind: 'HEAD',
      title: 'CEO',
      person_name: 'Asha',
      status: 'FILLED',
      sort_order: 0,
      user_id: null,
      monthly_cost: 0,
    });
    expect(s.id).toEqual(expect.any(String));
  });

  it('updates a seat when its id is given, and recreates a deleted seat under the same id (what undo relies on)', async () => {
    const t = await team();
    const s = await addSeat(t.id, { title: 'Old' });
    const updated = await addSeat(t.id, { id: s.id, title: 'New', status: 'VACANT' });
    expect(updated).toMatchObject({ id: s.id, title: 'New', status: 'VACANT' });
    expect(await TeamStructureNodeModel.countDocuments({ structure_id: new Types.ObjectId(t.id) })).toBe(1);
    await M.deleteTeamStructureNode({}, { id: s.id }, hr);
    const back = await addSeat(t.id, { id: s.id, title: 'Restored' });
    expect(back).toMatchObject({ id: s.id, title: 'Restored' });
  });

  it('links a user when given a valid id and refuses a malformed one', async () => {
    const t = await team();
    const user_id = oid();
    expect(await addSeat(t.id, { user_id })).toMatchObject({ user_id });
    await expect(addSeat(t.id, { user_id: 'bad' })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('computes the monthly cost from fixed, annual and variable lines, ignoring per-unit ones', async () => {
    const t = await team();
    const s = await addSeat(t.id, {
      pay: [
        fixed(30000),
        fixed(12000, { label: 'Bonus', frequency: 'ANNUAL' }),
        fixed(5000, { label: 'Incentive', kind: 'VARIABLE', min_amount: 2000, max_amount: 8000 }),
        fixed(50, { label: 'Per lead', kind: 'VARIABLE', frequency: 'PER_UNIT', min_amount: 10, max_amount: 90 }),
      ],
    });
    expect(s.monthly_cost).toBe(36000);
    expect(s.pay).toHaveLength(4);
  });

  it('refuses invalid pay: a variable line without a range, an expected amount outside it, an inverted range, too many lines', async () => {
    const t = await team();
    const variable = (over: Record<string, unknown>) => fixed(5000, { kind: 'VARIABLE', min_amount: 1000, max_amount: 9000, ...over });
    const bad = { extensions: { code: 'BAD_USER_INPUT' } };
    await expect(addSeat(t.id, { pay: [variable({ min_amount: null })] })).rejects.toMatchObject(bad);
    await expect(addSeat(t.id, { pay: [variable({ amount: 9999 })] })).rejects.toMatchObject(bad);
    await expect(addSeat(t.id, { pay: [variable({ min_amount: 9000, max_amount: 1000 })] })).rejects.toMatchObject(bad);
    await expect(addSeat(t.id, { pay: Array.from({ length: 13 }, () => fixed(1)) })).rejects.toMatchObject({
      message: expect.stringContaining('12'),
    });
    await expect(addSeat(t.id, { pay: Array.from({ length: 12 }, () => fixed(1)) })).resolves.toBeDefined();
    expect(await TeamStructureNodeModel.countDocuments({ structure_id: new Types.ObjectId(t.id) })).toBe(1);
  });

  it('reports a missing team, and a parent that is missing or belongs to another team', async () => {
    const t = await team('One');
    const other = await team('Two');
    const foreign = await addSeat(other.id);
    await expect(M.upsertTeamStructureNode({}, { structure_id: oid(), input: seat() }, hr)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(addSeat(t.id, { parent_id: oid() })).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(addSeat(t.id, { parent_id: foreign.id })).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('refuses to put a seat under itself or under anything below it', async () => {
    const t = await team();
    const root = await addSeat(t.id, { title: 'Root' });
    const child = await addSeat(t.id, { title: 'Child', parent_id: root.id });
    const grandchild = await addSeat(t.id, { title: 'Grandchild', parent_id: child.id });
    const loop = { message: expect.stringContaining('under itself') };
    await expect(addSeat(t.id, { id: root.id, parent_id: root.id })).rejects.toMatchObject(loop);
    await expect(addSeat(t.id, { id: root.id, parent_id: grandchild.id })).rejects.toMatchObject(loop);
    const moved = await addSeat(t.id, { id: grandchild.id, parent_id: root.id });
    expect(moved.parent_id).toBe(root.id);
  });

  it('stops growing at the seat limit but still edits an existing seat', async () => {
    const t = await team();
    const structure_id = new Types.ObjectId(t.id);
    const first = await addSeat(t.id, { title: 'First' });
    await TeamStructureNodeModel.insertMany(
      Array.from({ length: 499 }, (_, i) => ({ structure_id, kind: 'ROLE', title: `S${i}`, employment_type: 'FULL_TIME' }))
    );
    await expect(addSeat(t.id, { title: 'One too many' })).rejects.toMatchObject({ message: expect.stringContaining('500') });
    await expect(addSeat(t.id, { id: first.id, title: 'Renamed' })).resolves.toMatchObject({ title: 'Renamed' });
  });

  it('returns the whole chart in order, with pay, for the console', async () => {
    const t = await team();
    await addSeat(t.id, { title: 'B', sort_order: 2 });
    await addSeat(t.id, { title: 'A', sort_order: 1, pay: [fixed(100)] });
    const view = await Q.teamStructure({}, { id: t.id }, hr);
    expect(view.structure.id).toBe(t.id);
    expect(view.nodes.map((n: { title: string }) => n.title)).toEqual(['A', 'B']);
    expect(view.nodes[0]).toMatchObject({ monthly_cost: 100, pay: [expect.objectContaining({ amount: 100 })] });
  });
});

describe('deleting a seat', () => {
  it('moves its children up to its parent', async () => {
    const t = await team();
    const root = await addSeat(t.id, { title: 'Root' });
    const mid = await addSeat(t.id, { title: 'Mid', parent_id: root.id });
    const leaf = await addSeat(t.id, { title: 'Leaf', parent_id: mid.id });
    await expect(M.deleteTeamStructureNode({}, { id: mid.id }, hr)).resolves.toBe(true);
    const view = await Q.teamStructure({}, { id: t.id }, hr);
    expect(view.nodes.map((n: { id: string }) => n.id).sort()).toEqual([root.id, leaf.id].sort());
    expect(view.nodes.find((n: { id: string }) => n.id === leaf.id).parent_id).toBe(root.id);
  });

  it('turns the children of a top seat into top seats', async () => {
    const t = await team();
    const root = await addSeat(t.id);
    const child = await addSeat(t.id, { parent_id: root.id });
    await M.deleteTeamStructureNode({}, { id: root.id }, hr);
    const view = await Q.teamStructure({}, { id: t.id }, hr);
    expect(view.nodes).toHaveLength(1);
    expect(view.nodes[0]).toMatchObject({ id: child.id, parent_id: null });
  });

  it('is a quiet success for a seat that is already gone, and refuses a malformed id', async () => {
    await expect(M.deleteTeamStructureNode({}, { id: oid() }, hr)).resolves.toBe(true);
    await expect(M.deleteTeamStructureNode({}, { id: 'bad' }, hr)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });
});

describe('share links', () => {
  it('creates a private-by-default link with an unguessable token and lists newest first', async () => {
    const t = await team();
    const first = await M.createTeamStructureShare({}, { structure_id: t.id, label: 'Investors' }, hr);
    const second = await M.createTeamStructureShare({}, { structure_id: t.id, show_salary: true }, hr);
    expect(first).toMatchObject({ structure_id: t.id, label: 'Investors', show_salary: false, expires_at: null, revoked_at: null });
    expect(first.token.length).toBeGreaterThanOrEqual(32);
    expect(first.token).not.toBe(second.token);
    expect(second).toMatchObject({ show_salary: true, label: null });
    const list = await Q.teamStructureShares({}, { structure_id: t.id }, hr);
    expect(list.map((s: { id: string }) => s.id)).toEqual([second.id, first.id]);
  });

  it('accepts a future expiry and refuses a past or unreadable one', async () => {
    const t = await team();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect((await M.createTeamStructureShare({}, { structure_id: t.id, expires_at: future }, hr)).expires_at).toBe(future);
    const bad = { extensions: { code: 'BAD_USER_INPUT' } };
    await expect(M.createTeamStructureShare({}, { structure_id: t.id, expires_at: new Date(Date.now() - 1000).toISOString() }, hr)).rejects.toMatchObject(bad);
    await expect(M.createTeamStructureShare({}, { structure_id: t.id, expires_at: 'not a date' }, hr)).rejects.toMatchObject(bad);
  });

  it('refuses a link for a team that does not exist', async () => {
    await expect(M.createTeamStructureShare({}, { structure_id: oid() }, hr)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('revokes once, stamping the time, and leaves a repeat revoke alone', async () => {
    const t = await team();
    const share = await M.createTeamStructureShare({}, { structure_id: t.id }, hr);
    await expect(M.revokeTeamStructureShare({}, { id: share.id }, hr)).resolves.toBe(true);
    const stamped = (await Q.teamStructureShares({}, { structure_id: t.id }, hr))[0].revoked_at;
    expect(stamped).toEqual(expect.any(String));
    await M.revokeTeamStructureShare({}, { id: share.id }, hr);
    expect((await Q.teamStructureShares({}, { structure_id: t.id }, hr))[0].revoked_at).toBe(stamped);
  });
});

describe('the public link', () => {
  async function chart() {
    const t = await team('Public');
    const user_id = oid();
    const root = await addSeat(t.id, { title: 'Head', user_id, notes: 'internal note', pay: [fixed(20000)] });
    await addSeat(t.id, { title: 'Child', parent_id: root.id, pay: [fixed(6000)] });
    return t;
  }

  it('answers nothing for an unknown token', async () => {
    await expect(Q.publicTeamStructure({}, { token: 'missing' })).resolves.toBeNull();
  });

  it('shows the structure without any pay, linked user or notes by default — and needs no sign-in', async () => {
    const t = await chart();
    const share = await M.createTeamStructureShare({}, { structure_id: t.id }, hr);
    const view = await Q.publicTeamStructure({}, { token: share.token });
    expect(view.show_salary).toBe(false);
    expect(view.structure).toMatchObject({ id: t.id, name: 'Public' });
    expect(view.nodes.map((n: { title: string }) => n.title).sort()).toEqual(['Child', 'Head']);
    for (const node of view.nodes) {
      expect(node.pay).toBeNull();
      expect(node.monthly_cost).toBeNull();
      expect(node.user_id).toBeNull();
      expect(node.notes).toBeNull();
    }
  });

  it('shows pay and the budget only when the link was made to, and still never the linked user or notes', async () => {
    const t = await chart();
    const share = await M.createTeamStructureShare({}, { structure_id: t.id, show_salary: true }, hr);
    const view = await Q.publicTeamStructure({}, { token: share.token });
    expect(view.show_salary).toBe(true);
    const head = view.nodes.find((n: { title: string }) => n.title === 'Head');
    expect(head).toMatchObject({ monthly_cost: 20000, user_id: null, notes: null });
    expect(head.pay).toEqual([expect.objectContaining({ label: 'Base', amount: 20000 })]);
  });

  it('stops answering once the link is revoked or has expired', async () => {
    const t = await chart();
    const revoked = await M.createTeamStructureShare({}, { structure_id: t.id }, hr);
    const expiring = await M.createTeamStructureShare({}, { structure_id: t.id, expires_at: new Date(Date.now() + 60_000).toISOString() }, hr);
    await expect(Q.publicTeamStructure({}, { token: expiring.token })).resolves.not.toBeNull();
    await M.revokeTeamStructureShare({}, { id: revoked.id }, hr);
    await expect(Q.publicTeamStructure({}, { token: revoked.token })).resolves.toBeNull();
    await TeamStructureShareModel.updateOne({ _id: expiring.id }, { $set: { expires_at: new Date(Date.now() - 1000) } });
    await expect(Q.publicTeamStructure({}, { token: expiring.token })).resolves.toBeNull();
  });
});
