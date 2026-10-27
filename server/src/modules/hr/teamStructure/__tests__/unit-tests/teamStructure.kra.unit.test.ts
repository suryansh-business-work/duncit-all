import type { IKpi, IKra } from '../../teamStructure.model';
import { MAX_KPIS_PER_KRA, MAX_KRAS, kraProblem } from '../../teamStructure.kra';

const kpi = (over: Partial<IKpi> = {}): IKpi => ({ name: 'Calls made', frequency: 'MONTHLY', weight: 100, target: 200, unit: 'calls', ...over });
const kra = (over: Partial<IKra> = {}): IKra => ({ title: 'Sales', weight: 100, kpis: [kpi()], ...over });

describe('kraProblem', () => {
  it('has no objection to a seat without a scorecard', () => {
    expect(kraProblem([])).toBeNull();
  });

  it('accepts one KRA of 100% with one KPI of 100%', () => {
    expect(kraProblem([kra()])).toBeNull();
  });

  it('accepts several KRAs and KPIs that each add up to 100%', () => {
    const kras = [
      kra({ title: 'Sales', weight: 60, kpis: [kpi({ weight: 70 }), kpi({ name: 'Deals', weight: 30 })] }),
      kra({ title: 'Quality', weight: 40, kpis: [kpi({ name: 'CSAT', weight: 100, target: null, unit: null })] }),
    ];
    expect(kraProblem(kras)).toBeNull();
  });

  it('accepts a KRA that has no KPIs yet, as long as the KRA weights still total 100%', () => {
    expect(kraProblem([kra({ weight: 100, kpis: [] })])).toBeNull();
  });

  it('tolerates float rounding such as 33.3 + 33.3 + 33.4', () => {
    const kras = [33.3, 33.3, 33.4].map((weight, i) => kra({ title: `KRA ${i}`, weight, kpis: [] }));
    expect(kraProblem(kras)).toBeNull();
  });

  it('refuses KRA weights that do not make up the whole seat', () => {
    expect(kraProblem([kra({ weight: 60, kpis: [] }), kra({ title: 'B', weight: 30, kpis: [] })])).toBe('KRA weights must add up to 100%');
    expect(kraProblem([kra({ weight: 60, kpis: [] }), kra({ title: 'B', weight: 60, kpis: [] })])).toBe('KRA weights must add up to 100%');
  });

  it('refuses KPI weights that do not make up their KRA, naming it', () => {
    expect(kraProblem([kra({ title: 'Sales', kpis: [kpi({ weight: 50 })] })])).toBe('Sales: KPI weights must add up to 100%');
  });

  it('refuses a blank KRA title or KPI name', () => {
    expect(kraProblem([kra({ title: '   ' })])).toBe('Every KRA needs a title');
    expect(kraProblem([kra({ kpis: [kpi({ name: ' ' })] })])).toBe('Sales: every KPI needs a name');
  });

  it('refuses a weight outside 0..100 or not a number', () => {
    expect(kraProblem([kra({ weight: 101, kpis: [] })])).toContain('weight must be between 0 and 100');
    expect(kraProblem([kra({ weight: -1, kpis: [] })])).toContain('weight must be between 0 and 100');
    expect(kraProblem([kra({ weight: Number.NaN, kpis: [] })])).toContain('weight must be between 0 and 100');
    expect(kraProblem([kra({ kpis: [kpi({ weight: 150 })] })])).toBe('Calls made: weight must be between 0 and 100');
  });

  it('refuses a target that is not a finite number but allows a missing one', () => {
    expect(kraProblem([kra({ kpis: [kpi({ target: Number.POSITIVE_INFINITY })] })])).toBe('Calls made: target must be a number');
    expect(kraProblem([kra({ kpis: [kpi({ target: null })] })])).toBeNull();
    expect(kraProblem([kra({ kpis: [kpi({ target: 0 })] })])).toBeNull();
  });

  it('caps the number of KRAs and of KPIs per KRA, at the limit exactly', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => kra({ title: `K${i}`, weight: 100 / n, kpis: [] }));
    expect(kraProblem(many(MAX_KRAS))).toBeNull();
    expect(kraProblem(many(MAX_KRAS + 1))).toContain(`more than ${MAX_KRAS}`);
    const kpis = (n: number) => Array.from({ length: n }, (_, i) => kpi({ name: `P${i}`, weight: 100 / n }));
    expect(kraProblem([kra({ kpis: kpis(MAX_KPIS_PER_KRA) })])).toBeNull();
    expect(kraProblem([kra({ kpis: kpis(MAX_KPIS_PER_KRA + 1) })])).toContain(`more than ${MAX_KPIS_PER_KRA}`);
  });
});
