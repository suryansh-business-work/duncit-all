import { describe, expect, it } from 'vitest';
import { SEAT_HEIGHT, SEAT_WIDTH, layoutSeats } from '../../../src/pages/team-structure/layout';
import { costByEmployment, currencySymbol, money } from '../../../src/pages/team-structure/money';
import { makeSeatSchema } from '../../../src/pages/team-structure/seat.schema';
import { draftOf, type TeamNode } from '../../../src/pages/team-structure/types';

const node = (id: string, parent_id: string | null = null, over: Partial<TeamNode> = {}): TeamNode => ({
  id,
  structure_id: 's1',
  parent_id,
  kind: 'ROLE',
  title: `Seat ${id}`,
  employment_type: 'FULL_TIME',
  status: 'FILLED',
  sort_order: 0,
  pay: [],
  monthly_cost: 0,
  kras: [],
  ...over,
});

describe('layoutSeats', () => {
  const at = (placed: ReturnType<typeof layoutSeats>, id: string) => placed.find((p) => p.id === id)!;

  it('places nothing for an empty chart', () => {
    expect(layoutSeats([])).toEqual([]);
  });

  it('puts a lone seat at the origin', () => {
    expect(layoutSeats([node('a')])).toEqual([{ id: 'a', x: 0, y: 0 }]);
  });

  it('centres a parent over its children and sets each level one row lower', () => {
    const placed = layoutSeats([node('root'), node('l', 'root'), node('r', 'root')]);
    expect(at(placed, 'l').x).toBeLessThan(at(placed, 'r').x);
    expect(at(placed, 'root').x).toBe((at(placed, 'l').x + at(placed, 'r').x) / 2);
    expect(at(placed, 'root').y).toBe(0);
    expect(at(placed, 'l').y).toBe(at(placed, 'r').y);
    expect(at(placed, 'l').y).toBeGreaterThan(SEAT_HEIGHT);
  });

  it('never lets two seats on one level overlap', () => {
    const placed = layoutSeats([node('root'), node('a', 'root'), node('b', 'root'), node('a1', 'a'), node('a2', 'a')]);
    const level2 = placed.filter((p) => ['a1', 'a2', 'b'].includes(p.id)).sort((p, q) => p.x - q.x);
    for (let i = 1; i < level2.length; i += 1) expect(level2[i].x - level2[i - 1].x).toBeGreaterThanOrEqual(SEAT_WIDTH);
  });

  it('lays several top seats side by side', () => {
    const placed = layoutSeats([node('a'), node('b')]);
    expect(at(placed, 'b').x).toBeGreaterThan(at(placed, 'a').x);
    expect(at(placed, 'a').y).toBe(at(placed, 'b').y);
  });

  it('treats a seat whose parent is not on the chart as a top seat', () => {
    expect(layoutSeats([node('orphan', 'ghost')])).toEqual([{ id: 'orphan', x: 0, y: 0 }]);
  });

  it('survives a very deep chain without recursing', () => {
    const chain = Array.from({ length: 400 }, (_, i) => node(`n${i}`, i === 0 ? null : `n${i - 1}`));
    const placed = layoutSeats(chain);
    expect(at(placed, 'n399').y).toBeGreaterThan(at(placed, 'n1').y);
    expect(new Set(placed.map((p) => p.x)).size).toBe(1);
  });
});

describe('money', () => {
  it('reads the symbol from the currency code', () => {
    expect(currencySymbol('INR')).toBe('₹');
    expect(currencySymbol('USD')).toMatch(/\$/);
  });

  it('falls back to the code when the currency is not a real one', () => {
    expect(currencySymbol('NOT-A-CODE')).toBe('NOT-A-CODE');
  });

  it('formats an amount with that symbol', () => {
    expect(money(15000, 'INR')).toContain('₹');
    expect(money(15000, 'INR')).toContain('15');
  });

  it('totals the budget per employment type, skipping optional seats and seats without a figure', () => {
    const totals = costByEmployment([
      node('a', null, { monthly_cost: 10000 }),
      node('b', null, { monthly_cost: 5000 }),
      node('c', null, { monthly_cost: 1000, employment_type: 'PART_TIME' }),
      node('d', null, { monthly_cost: 9000, status: 'OPTIONAL' }),
      node('e', null, { monthly_cost: null }),
    ]);
    expect(totals).toEqual({ FULL_TIME: 15000, PART_TIME: 1000 });
  });

  it('totals nothing for an empty chart', () => {
    expect(costByEmployment([])).toEqual({});
  });
});

describe('draftOf', () => {
  it('turns a seat into what is sent back, dropping server-derived and typename fields', () => {
    const seat = {
      ...node('a', 'p', {
        person_name: 'Asha',
        department: 'Ops',
        notes: 'n',
        sort_order: 3,
        monthly_cost: 999,
        pay: [{ label: 'Base', kind: 'FIXED', frequency: 'MONTHLY', amount: 100, min_amount: null, max_amount: null, note: 'x', __typename: 'TeamPayComponent' } as never],
      }),
      __typename: 'TeamStructureNode',
    };
    const draft = draftOf(seat as TeamNode);
    expect(draft).toEqual({
      id: 'a',
      parent_id: 'p',
      kind: 'ROLE',
      title: 'Seat a',
      person_name: 'Asha',
      department: 'Ops',
      employment_type: 'FULL_TIME',
      status: 'FILLED',
      notes: 'n',
      sort_order: 3,
      pay: [{ label: 'Base', kind: 'FIXED', frequency: 'MONTHLY', amount: 100, min_amount: null, max_amount: null, note: 'x' }],
      kras: [],
    });
    expect(JSON.stringify(draft)).not.toContain('__typename');
    expect(draft).not.toHaveProperty('monthly_cost');
  });

  it('turns missing optional values and hidden pay into nulls and an empty list', () => {
    const draft = draftOf(node('b', null, { pay: null, monthly_cost: null }));
    expect(draft).toMatchObject({ person_name: null, department: null, notes: null, pay: [], kras: [] });
  });

  it('fills a pay line’s absent range and note with null', () => {
    const draft = draftOf(node('c', null, { pay: [{ label: 'Base', kind: 'FIXED', frequency: 'ANNUAL', amount: 1 }] }));
    expect(draft.pay[0]).toEqual({ label: 'Base', kind: 'FIXED', frequency: 'ANNUAL', amount: 1, min_amount: null, max_amount: null, note: null });
  });
});

describe('seat form schema', () => {
  const schema = makeSeatSchema((key) => key);
  const base = { kind: 'ROLE', title: 'Tester', employment_type: 'PART_TIME', status: 'FILLED', pay: [], kras: [] };
  const line = (over: Record<string, unknown> = {}) => ({ label: 'Base', kind: 'FIXED', frequency: 'MONTHLY', amount: '5000', min_amount: '', max_amount: '', ...over });
  const messages = (input: unknown) => {
    const result = schema.safeParse(input);
    return result.success ? [] : result.error.issues.map((i) => i.message);
  };

  it('accepts a seat with no pay', () => {
    expect(schema.safeParse(base).success).toBe(true);
  });

  it('trims the title and requires one', () => {
    expect(schema.parse({ ...base, title: '  Tester  ' }).title).toBe('Tester');
    expect(messages({ ...base, title: '   ' })).toContain('hr.teamStructure.validation.title');
  });

  it('rejects an unknown kind, employment type or status', () => {
    for (const bad of [{ kind: 'BOSS' }, { employment_type: 'SLAVE' }, { status: 'GONE' }]) {
      expect(schema.safeParse({ ...base, ...bad }).success).toBe(false);
    }
  });

  it('turns typed numbers into numbers and a blank range into null', () => {
    const out = schema.parse({ ...base, pay: [line()] });
    expect(out.pay[0]).toMatchObject({ amount: 5000, min_amount: null, max_amount: null });
  });

  it('refuses a blank, non-numeric or negative amount', () => {
    for (const amount of ['', 'abc', '-1']) {
      expect(messages({ ...base, pay: [line({ amount })] })).toContain('hr.teamStructure.validation.amount');
    }
  });

  it('requires a name on every pay line', () => {
    expect(messages({ ...base, pay: [line({ label: ' ' })] })).toContain('hr.teamStructure.validation.payLabel');
  });

  it('accepts a variable line whose expected amount sits inside its range', () => {
    expect(schema.safeParse({ ...base, pay: [line({ kind: 'VARIABLE', amount: '3000', min_amount: '1000', max_amount: '5000' })] }).success).toBe(true);
  });

  it('refuses a variable line with a missing end, an inverted range or an expected amount outside it', () => {
    const range = 'hr.teamStructure.validation.range';
    expect(messages({ ...base, pay: [line({ kind: 'VARIABLE', min_amount: '1000' })] })).toContain(range);
    expect(messages({ ...base, pay: [line({ kind: 'VARIABLE', max_amount: '1000' })] })).toContain(range);
    expect(messages({ ...base, pay: [line({ kind: 'VARIABLE', amount: '3000', min_amount: '5000', max_amount: '1000' })] })).toContain(range);
    expect(messages({ ...base, pay: [line({ kind: 'VARIABLE', amount: '100', min_amount: '1000', max_amount: '5000' })] })).toContain(range);
    expect(messages({ ...base, pay: [line({ kind: 'VARIABLE', amount: '9000', min_amount: '1000', max_amount: '5000' })] })).toContain(range);
  });

  it('does not check the range of a fixed line', () => {
    expect(schema.safeParse({ ...base, pay: [line({ min_amount: '9', max_amount: '1' })] }).success).toBe(true);
  });

  it('allows at most twelve pay lines', () => {
    expect(schema.safeParse({ ...base, pay: Array.from({ length: 12 }, () => line()) }).success).toBe(true);
    expect(schema.safeParse({ ...base, pay: Array.from({ length: 13 }, () => line()) }).success).toBe(false);
  });
});
