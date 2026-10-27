import type { IPayComponent } from '../../teamStructure.model';
import { monthlyCost, payProblem } from '../../teamStructure.pay';

const line = (over: Partial<IPayComponent> = {}): IPayComponent => ({
  label: 'Base',
  kind: 'FIXED',
  frequency: 'MONTHLY',
  amount: 5000,
  ...over,
});

describe('monthlyCost', () => {
  it('is zero for a seat with no pay lines', () => {
    expect(monthlyCost([])).toBe(0);
  });

  it('adds monthly lines as they are', () => {
    expect(monthlyCost([line({ amount: 15000 }), line({ label: 'Allowance', amount: 2500 })])).toBe(17500);
  });

  it('spreads an annual line over twelve months', () => {
    expect(monthlyCost([line({ frequency: 'ANNUAL', amount: 120000 })])).toBe(10000);
  });

  it('budgets a variable line at its expected amount, not its range', () => {
    const variable = line({ kind: 'VARIABLE', amount: 4000, min_amount: 1000, max_amount: 9000 });
    expect(monthlyCost([line({ amount: 10000 }), variable])).toBe(14000);
  });

  it('leaves per-unit lines out because they depend on volume', () => {
    const perUnit = line({ kind: 'VARIABLE', frequency: 'PER_UNIT', amount: 50, min_amount: 10, max_amount: 90 });
    expect(monthlyCost([line({ amount: 8000 }), perUnit])).toBe(8000);
  });

  it('rounds to paise so a non-divisible annual figure does not leak float noise', () => {
    expect(monthlyCost([line({ frequency: 'ANNUAL', amount: 100000 })])).toBe(8333.33);
  });
});

describe('payProblem', () => {
  it('accepts any fixed line, whatever its range fields hold', () => {
    expect(payProblem(line())).toBeNull();
    expect(payProblem(line({ min_amount: 99, max_amount: 1 }))).toBeNull();
  });

  it('accepts a variable line whose expected amount sits inside its range, ends included', () => {
    const ok = (amount: number) => payProblem(line({ kind: 'VARIABLE', amount, min_amount: 1000, max_amount: 5000 }));
    expect(ok(3000)).toBeNull();
    expect(ok(1000)).toBeNull();
    expect(ok(5000)).toBeNull();
  });

  it('names the line when the minimum or maximum is missing', () => {
    expect(payProblem(line({ label: 'Incentive', kind: 'VARIABLE', min_amount: null, max_amount: 5000 }))).toBe(
      'Incentive: a variable line needs both a minimum and a maximum'
    );
    expect(payProblem(line({ label: 'Incentive', kind: 'VARIABLE', max_amount: undefined, min_amount: 10 }))).toContain(
      'needs both a minimum and a maximum'
    );
  });

  it('refuses an inverted range and an expected amount outside the range', () => {
    const range = 'expected amount must sit between minimum and maximum';
    expect(payProblem(line({ kind: 'VARIABLE', amount: 3000, min_amount: 5000, max_amount: 1000 }))).toContain(range);
    expect(payProblem(line({ kind: 'VARIABLE', amount: 999, min_amount: 1000, max_amount: 5000 }))).toContain(range);
    expect(payProblem(line({ kind: 'VARIABLE', amount: 5001, min_amount: 1000, max_amount: 5000 }))).toContain(range);
  });
});
