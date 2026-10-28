/**
 * Seat scorecards (KRAs and KPIs) against a real database: what is stored and
 * returned, what a partial update leaves alone, which weights are refused, and
 * that a public link shows the scorecard only when that link allows it —
 * independently of salary.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { TeamStructureNodeModel } from '../../teamStructure.model';
import { teamStructureResolvers } from '../../teamStructure.resolver';

const Q = teamStructureResolvers.Query as Record<string, (...a: any[]) => any>;
const M = teamStructureResolvers.Mutation as Record<string, (...a: any[]) => any>;
const hr = makeContext({ id: new Types.ObjectId().toString(), roles: ['HR_MANAGER'] });

const team = (name = 'Scored') => M.saveTeamStructure({}, { name }, hr);
const addSeat = (structure_id: string, over: Record<string, unknown> = {}) =>
  M.upsertTeamStructureNode({}, { structure_id, input: { kind: 'ROLE', title: 'Seat', employment_type: 'FULL_TIME', ...over } }, hr);
const kpi = (over: Record<string, unknown> = {}) => ({ name: 'Calls', frequency: 'MONTHLY', weight: 100, target: 200, unit: 'calls', ...over });
const kra = (over: Record<string, unknown> = {}) => ({ title: 'Sales', description: 'Hit the number', weight: 100, kpis: [kpi()], ...over });
const fixed = (amount: number) => ({ label: 'Base', kind: 'FIXED', frequency: 'MONTHLY', amount });

describe('storing a scorecard', () => {
  it('stores KRAs with their KPIs on a seat and returns them to the console', async () => {
    const t = await team();
    const s = await addSeat(t.id, { kras: [kra({ weight: 70 }), kra({ title: 'Quality', weight: 30, kpis: [] })] });
    expect(s.kras).toHaveLength(2);
    expect(s.kras[0]).toMatchObject({
      title: 'Sales',
      weight: 70,
      description: 'Hit the number',
      kpis: [{ name: 'Calls', target: 200, unit: 'calls', frequency: 'MONTHLY', weight: 100 }],
    });
    const view = await Q.teamStructure({}, { id: t.id }, hr);
    expect(view.nodes[0].kras.map((k: { title: string }) => k.title)).toEqual(['Sales', 'Quality']);
  });

  it('gives a seat with no scorecard an empty list', async () => {
    const t = await team();
    expect((await addSeat(t.id)).kras).toEqual([]);
  });

  it('keeps the scorecard when an update leaves kras out, and clears it when given an empty list', async () => {
    const t = await team();
    const s = await addSeat(t.id, { kras: [kra()] });
    const renamed = await addSeat(t.id, { id: s.id, title: 'Renamed' });
    expect(renamed.kras).toHaveLength(1);
    const cleared = await addSeat(t.id, { id: s.id, title: 'Renamed', kras: [] });
    expect(cleared.kras).toEqual([]);
  });
});

describe('refusing a scorecard that does not add up', () => {
  it('refuses KRA weights, KPI weights, a blank title and too many KRAs — and creates no seat', async () => {
    const t = await team();
    const bad = { extensions: { code: 'BAD_USER_INPUT' } };
    await expect(addSeat(t.id, { kras: [kra({ weight: 60 })] })).rejects.toMatchObject({ ...bad, message: 'KRA weights must add up to 100%' });
    await expect(addSeat(t.id, { kras: [kra({ kpis: [kpi({ weight: 40 })] })] })).rejects.toMatchObject({
      ...bad,
      message: expect.stringContaining('KPI weights'),
    });
    await expect(addSeat(t.id, { kras: [kra({ title: ' ' })] })).rejects.toMatchObject(bad);
    const eleven = Array.from({ length: 11 }, (_, i) => kra({ title: `K${i}`, weight: 9, kpis: [] }));
    await expect(addSeat(t.id, { kras: eleven })).rejects.toMatchObject(bad);
    expect(await TeamStructureNodeModel.countDocuments({ structure_id: new Types.ObjectId(t.id) })).toBe(0);
  });

  it('does not let a refused update disturb the seat it was meant to change', async () => {
    const t = await team();
    const s = await addSeat(t.id, { title: 'Stable', kras: [kra()] });
    await expect(addSeat(t.id, { id: s.id, title: 'Broken', kras: [kra({ weight: 1 })] })).rejects.toBeDefined();
    const view = await Q.teamStructure({}, { id: t.id }, hr);
    expect(view.nodes[0]).toMatchObject({ title: 'Stable' });
    expect(view.nodes[0].kras).toHaveLength(1);
  });
});

describe('sharing a scorecard', () => {
  it('makes links that hide the scorecard unless the choice is made', async () => {
    const t = await team();
    const closed = await M.createTeamStructureShare({}, { structure_id: t.id }, hr);
    const open = await M.createTeamStructureShare({}, { structure_id: t.id, show_kpi_kra: true }, hr);
    expect(closed.show_kpi_kra).toBe(false);
    expect(open.show_kpi_kra).toBe(true);
    const list = await Q.teamStructureShares({}, { structure_id: t.id }, hr);
    expect(list.map((s: { show_kpi_kra: boolean }) => s.show_kpi_kra)).toEqual([true, false]);
  });

  it('shows the scorecard on a public link only when that link allows it, independently of salary', async () => {
    const t = await team('Both');
    await addSeat(t.id, { title: 'Rep', pay: [fixed(9000)], kras: [kra()] });
    const salaryOnly = await M.createTeamStructureShare({}, { structure_id: t.id, show_salary: true }, hr);
    const scoreOnly = await M.createTeamStructureShare({}, { structure_id: t.id, show_kpi_kra: true }, hr);

    const a = await Q.publicTeamStructure({}, { token: salaryOnly.token });
    expect(a).toMatchObject({ show_salary: true, show_kpi_kra: false });
    expect(a.nodes[0].kras).toBeNull();
    expect(a.nodes[0].monthly_cost).toBe(9000);

    const b = await Q.publicTeamStructure({}, { token: scoreOnly.token });
    expect(b).toMatchObject({ show_salary: false, show_kpi_kra: true });
    expect(b.nodes[0].kras).toEqual([expect.objectContaining({ title: 'Sales', weight: 100 })]);
    expect(b.nodes[0].pay).toBeNull();
  });
});
