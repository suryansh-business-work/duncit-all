/**
 * "Automated" against a real database: a flow is automated when a live spec
 * links to it (catalogue/spec-links.ts). The flows table filters on it, and the
 * Tests dashboard counts it.
 */
import { E2eFlowModel } from '../../e2eFlow.model';
import { e2eFlowService } from '../../e2eFlow.service';
import { specsForFlow } from '../../e2eFlow.stats';
import { scenarioCoverage } from '@modules/platform/testsOverview/testsOverview.sources';

// A flow name the spec links list, and two that no spec tests.
const LINKED = 'Admin: Approvals';
const UNLINKED = ['Zz Untested Journey', 'Zz Another Gap'];

const seed = () =>
  E2eFlowModel.create([LINKED, ...UNLINKED].map((name) => ({ name, description: '', sub_flows: [] })));

const namesOf = (rows: Array<{ name: string }>) => rows.map((r) => r.name).sort((a, b) => a.localeCompare(b));

describe('E2E flows: automated', () => {
  it('relies on a flow name the spec links really list', () => {
    expect(specsForFlow(LINKED).length).toBeGreaterThan(0);
    expect(specsForFlow(UNLINKED[0])).toEqual([]);
  });

  it('filters the table to the flows a spec tests, and to the ones none does', async () => {
    await seed();

    const tested = await e2eFlowService.table({ filters: [{ field: 'automated', op: 'is_true' }] });
    expect(namesOf(tested.rows)).toEqual([LINKED]);
    expect(tested.total).toBe(1);
    expect(tested.rows[0].specs.length).toBeGreaterThan(0);

    const gaps = await e2eFlowService.table({ filters: [{ field: 'automated', op: 'is_false' }] });
    expect(namesOf(gaps.rows)).toEqual([...UNLINKED].sort((a, b) => a.localeCompare(b)));
    expect(gaps.rows.every((r) => r.specs.length === 0 && r.run_stats === null)).toBe(true);
  });

  it('keeps every other filter working beside it, and ignores an op it does not understand', async () => {
    await seed();

    const narrowed = await e2eFlowService.table({
      filters: [
        { field: 'automated', op: 'is_false' },
        { field: 'name', op: 'contains', value: 'Another' },
      ],
    });
    expect(namesOf(narrowed.rows)).toEqual(['Zz Another Gap']);

    const unfiltered = await e2eFlowService.table({ filters: [{ field: 'automated', op: 'eq', value: 'x' }] });
    expect(unfiltered.total).toBe(3);
  });

  it('counts automated flows on the dashboard as a share of the catalogue', async () => {
    await seed();

    const coverage = await scenarioCoverage();
    expect(coverage).toMatchObject({ flows: 3, automated: 1, automated_pct: 33.3 });
  });

  it('has no automated share for an empty catalogue', async () => {
    const coverage = await scenarioCoverage();
    expect(coverage).toMatchObject({ flows: 0, automated: 0, automated_pct: null, pct: null });
  });
});
