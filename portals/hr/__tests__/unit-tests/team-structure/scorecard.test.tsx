import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SeatCard from '../../../src/pages/team-structure/SeatCard';
import SeatDetail from '../../../src/pages/team-structure/SeatDetail';
import SeatDrawer from '../../../src/pages/team-structure/SeatDrawer';
import { addsUp, makeSeatSchema } from '../../../src/pages/team-structure/seat.schema';
import { draftOf, type KraLine } from '../../../src/pages/team-structure/types';
import { renderWithProviders } from '../../testkit';
import { fixedLine, seat } from './support';

vi.mock('@duncit/app-settings', async (io) => (await import('./support')).withKeys(await io<typeof import('@duncit/app-settings')>()));
vi.mock('@xyflow/react', () => ({ Handle: () => null, Position: { Top: 'top', Bottom: 'bottom' } }));

const kra = (over: Partial<KraLine> = {}): KraLine => ({
  title: 'Sales',
  description: 'Hit the number',
  weight: 100,
  kpis: [{ name: 'Calls', unit: 'calls', target: 200, frequency: 'MONTHLY', weight: 100 }],
  ...over,
});

describe('weights', () => {
  it('adds up to 100 with a little float slack', () => {
    expect(addsUp([100])).toBe(true);
    expect(addsUp([60, 40])).toBe(true);
    expect(addsUp([33.3, 33.3, 33.4])).toBe(true);
    expect(addsUp([99])).toBe(false);
    expect(addsUp([60, 50])).toBe(false);
    expect(addsUp([])).toBe(false);
  });
});

describe('scorecard in the seat schema', () => {
  const schema = makeSeatSchema((key) => key);
  const seatBase = { kind: 'ROLE', title: 'Rep', employment_type: 'FULL_TIME', status: 'FILLED', pay: [] };
  const kpi = (over: Record<string, unknown> = {}) => ({ name: 'Calls', unit: '', target: '200', frequency: 'MONTHLY', weight: '100', ...over });
  const area = (over: Record<string, unknown> = {}) => ({ title: 'Sales', description: '', weight: '100', kpis: [kpi()], ...over });
  const messages = (kras: unknown[]) => {
    const result = schema.safeParse({ ...seatBase, kras });
    return result.success ? [] : result.error.issues.map((i) => i.message);
  };

  it('accepts no scorecard, and a complete one, turning typed numbers into numbers', () => {
    expect(schema.safeParse({ ...seatBase, kras: [] }).success).toBe(true);
    const out = schema.parse({ ...seatBase, kras: [area()] });
    expect(out.kras[0]).toMatchObject({ weight: 100, kpis: [{ target: 200, weight: 100 }] });
  });

  it('accepts a KRA with no KPIs yet, and a blank or negative target', () => {
    expect(schema.safeParse({ ...seatBase, kras: [area({ kpis: [] })] }).success).toBe(true);
    expect(schema.parse({ ...seatBase, kras: [area({ kpis: [kpi({ target: '' })] })] }).kras[0].kpis[0].target).toBeNull();
    expect(schema.parse({ ...seatBase, kras: [area({ kpis: [kpi({ target: '-5' })] })] }).kras[0].kpis[0].target).toBe(-5);
  });

  it('refuses KRA weights that do not make 100', () => {
    expect(messages([area({ weight: '60', kpis: [] })])).toContain('hr.teamStructure.validation.kraTotal');
    expect(messages([area({ weight: '60', kpis: [] }), area({ title: 'B', weight: '60', kpis: [] })])).toContain('hr.teamStructure.validation.kraTotal');
    expect(messages([area({ weight: '60', kpis: [] }), area({ title: 'B', weight: '40', kpis: [] })])).toEqual([]);
  });

  it('refuses KPI weights that do not make 100', () => {
    expect(messages([area({ kpis: [kpi({ weight: '50' })] })])).toContain('hr.teamStructure.validation.kpiTotal');
    expect(messages([area({ kpis: [kpi({ weight: '50' }), kpi({ name: 'Deals', weight: '50' })] })])).toEqual([]);
  });

  it('requires a title, a KPI name, a weight in range and a numeric target', () => {
    expect(messages([area({ title: ' ' })])).toContain('hr.teamStructure.validation.kraTitle');
    expect(messages([area({ kpis: [kpi({ name: ' ' })] })])).toContain('hr.teamStructure.validation.kpiName');
    for (const weight of ['', '-1', '101', 'abc']) {
      expect(messages([area({ weight, kpis: [] })])).toContain('hr.teamStructure.validation.weight');
      expect(messages([area({ kpis: [kpi({ weight })] })])).toContain('hr.teamStructure.validation.weight');
    }
    expect(messages([area({ kpis: [kpi({ target: 'abc' })] })])).toContain('hr.teamStructure.validation.target');
  });

  it('allows at most ten KRAs and ten KPIs in one', () => {
    const tenAreas = Array.from({ length: 10 }, (_, i) => area({ title: `K${i}`, weight: '10', kpis: [] }));
    expect(schema.safeParse({ ...seatBase, kras: tenAreas }).success).toBe(true);
    expect(schema.safeParse({ ...seatBase, kras: [...tenAreas, area({ title: 'K10', weight: '0', kpis: [] })] }).success).toBe(false);
    const tenKpis = Array.from({ length: 10 }, (_, i) => kpi({ name: `P${i}`, weight: '10' }));
    expect(schema.safeParse({ ...seatBase, kras: [area({ kpis: tenKpis })] }).success).toBe(true);
    expect(schema.safeParse({ ...seatBase, kras: [area({ kpis: [...tenKpis, kpi({ name: 'P10', weight: '0' })] })] }).success).toBe(false);
  });
});

describe('draftOf and the scorecard', () => {
  it('copies KRAs and KPIs without server-only fields, filling absent values with null', () => {
    const withTypename = { ...kra({ description: null, kpis: [{ name: 'CSAT', frequency: 'ANNUAL', weight: 100 }] }), __typename: 'TeamKra' };
    const draft = draftOf(seat('a', { kras: [withTypename as never, kra()] }));
    expect(draft.kras).toEqual([
      { title: 'Sales', description: null, weight: 100, kpis: [{ name: 'CSAT', unit: null, target: null, frequency: 'ANNUAL', weight: 100 }] },
      { title: 'Sales', description: 'Hit the number', weight: 100, kpis: [{ name: 'Calls', unit: 'calls', target: 200, frequency: 'MONTHLY', weight: 100 }] },
    ]);
    expect(JSON.stringify(draft)).not.toContain('__typename');
  });

  it('treats a hidden scorecard as empty', () => {
    expect(draftOf(seat('a', { kras: null })).kras).toEqual([]);
  });
});

describe('SeatCard scorecard badge', () => {
  const card = (kras: KraLine[] | null) =>
    render(<SeatCard {...({ data: { node: seat('a', { kras }), currency: 'INR', onAddChild: null }, selected: false } as unknown as Parameters<typeof SeatCard>[0])} />);

  it('shows how many KRAs a seat has', () => {
    card([kra(), kra({ title: 'Quality' })]);
    expect(screen.getByText('hr.teamStructure.kra.badge|{"count":2}')).toBeInTheDocument();
  });

  it('shows no badge without a scorecard, or when the scorecard is hidden', () => {
    card([]);
    expect(screen.queryByText(/kra\.badge/)).not.toBeInTheDocument();
    card(null);
    expect(screen.queryByText(/kra\.badge/)).not.toBeInTheDocument();
  });
});

/** Lets react-hook-form's async validation finish, so "was not saved" is a fact and not a race. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });

describe('editing a scorecard in the drawer', () => {
  const mount = (node = seat('a', { title: 'Rep' })) => {
    const onSave = vi.fn();
    renderWithProviders(
      <SeatDrawer open node={node} parentId={null} currency="INR" nextOrder={0} busy={false} onClose={vi.fn()} onSave={onSave} onDelete={vi.fn()} />
    );
    return { onSave };
  };
  const field = (key: string) => screen.getByLabelText(new RegExp(key.replaceAll('.', '\\.'))) as HTMLInputElement;
  const save = () => fireEvent.click(screen.getByRole('button', { name: 'shell.common.save' }));
  const add = (key: string) => fireEvent.click(screen.getByRole('button', { name: key }));
  const type = (key: string, value: string) => fireEvent.change(field(key), { target: { value } });

  it('adds a KRA with a KPI and saves them with typed numbers and empty text as null', async () => {
    const { onSave } = mount();
    add('hr.teamStructure.kra.addKra');
    type('hr.teamStructure.kra.kraTitle', 'Sales');
    type('hr.teamStructure.kra.kraWeight', '100');
    add('hr.teamStructure.kra.addKpi');
    type('hr.teamStructure.kra.kpiName', 'Calls');
    type('hr.teamStructure.kra.target', '200');
    type('hr.teamStructure.kra.kpiWeight', '100');
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].kras).toEqual([
      { title: 'Sales', description: null, weight: 100, kpis: [{ name: 'Calls', unit: null, target: 200, frequency: 'MONTHLY', weight: 100 }] },
    ]);
  });

  it('chooses how often a KPI is reviewed', async () => {
    const { onSave } = mount();
    add('hr.teamStructure.kra.addKra');
    type('hr.teamStructure.kra.kraTitle', 'Quality');
    type('hr.teamStructure.kra.kraWeight', '100');
    add('hr.teamStructure.kra.addKpi');
    type('hr.teamStructure.kra.kpiName', 'CSAT');
    type('hr.teamStructure.kra.kpiWeight', '100');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /hr\.teamStructure\.kra\.frequency/ }));
    fireEvent.click(screen.getByRole('option', { name: 'hr.teamStructure.kra.frequencies.QUARTERLY' }));
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].kras[0].kpis[0]).toMatchObject({ frequency: 'QUARTERLY', target: null });
  });

  it('shows the running totals, in red until they make 100%', () => {
    mount();
    add('hr.teamStructure.kra.addKra');
    type('hr.teamStructure.kra.kraWeight', '60');
    const short = screen.getByText('hr.teamStructure.kra.kraTotal|{"total":60}');
    expect(short).toHaveAttribute('role', 'status');
    const shortColour = getComputedStyle(short).color;
    type('hr.teamStructure.kra.kraWeight', '100');
    const whole = screen.getByText('hr.teamStructure.kra.kraTotal|{"total":100}');
    expect(getComputedStyle(whole).color).not.toBe(shortColour);
    add('hr.teamStructure.kra.addKpi');
    type('hr.teamStructure.kra.kpiWeight', '70');
    expect(screen.getByText('hr.teamStructure.kra.kpiTotal|{"total":70}')).toBeInTheDocument();
  });

  it('counts a blank weight as zero while typing', () => {
    mount();
    add('hr.teamStructure.kra.addKra');
    type('hr.teamStructure.kra.kraWeight', '');
    expect(screen.getByText('hr.teamStructure.kra.kraTotal|{"total":0}')).toBeInTheDocument();
  });

  it('will not save KRA weights or KPI weights that do not make 100%', async () => {
    const { onSave } = mount();
    add('hr.teamStructure.kra.addKra');
    type('hr.teamStructure.kra.kraTitle', 'Sales');
    type('hr.teamStructure.kra.kraWeight', '60');
    save();
    await settle();
    expect(screen.getByText('hr.teamStructure.kra.kraTotal|{"total":60}')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    type('hr.teamStructure.kra.kraWeight', '100');
    add('hr.teamStructure.kra.addKpi');
    type('hr.teamStructure.kra.kpiName', 'Calls');
    type('hr.teamStructure.kra.kpiWeight', '40');
    save();
    await settle();
    expect(screen.getByText('hr.teamStructure.kra.kpiTotal|{"total":40}')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows an existing scorecard filled in, with absent text as empty boxes, and saves it unchanged', async () => {
    const { onSave } = mount(
      seat('a', {
        title: 'Rep',
        kras: [kra({ description: null, kpis: [{ name: 'Calls', unit: null, target: null, frequency: 'ANNUAL', weight: 100 }] })],
      })
    );
    expect(field('hr.teamStructure.kra.kraTitle').value).toBe('Sales');
    expect(field('hr.teamStructure.kra.description').value).toBe('');
    expect(field('hr.teamStructure.kra.unit').value).toBe('');
    expect(field('hr.teamStructure.kra.target').value).toBe('');
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].kras).toEqual([
      { title: 'Sales', description: null, weight: 100, kpis: [{ name: 'Calls', unit: null, target: null, frequency: 'ANNUAL', weight: 100 }] },
    ]);
  });

  it('keeps description and unit when they are filled', async () => {
    const { onSave } = mount(seat('a', { title: 'Rep', kras: [kra()] }));
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].kras[0]).toMatchObject({ description: 'Hit the number', kpis: [{ unit: 'calls', target: 200 }] });
  });

  it('removes a KPI and a KRA', async () => {
    const { onSave } = mount(
      seat('a', {
        title: 'Rep',
        kras: [kra({ weight: 50, kpis: [{ name: 'One', frequency: 'MONTHLY', weight: 50 }, { name: 'Two', frequency: 'MONTHLY', weight: 50 }] }), kra({ title: 'Quality', weight: 50, kpis: [] })],
      })
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'hr.teamStructure.kra.removeKpi' })[0]);
    expect(screen.queryByDisplayValue('One')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'hr.teamStructure.kra.removeKra' })[1]);
    expect(screen.queryByDisplayValue('Quality')).not.toBeInTheDocument();
    type('hr.teamStructure.kra.kraWeight', '100');
    type('hr.teamStructure.kra.kpiWeight', '100');
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].kras).toHaveLength(1);
    expect(onSave.mock.calls[0][0].kras[0].kpis.map((k: { name: string }) => k.name)).toEqual(['Two']);
  });

  it('starts empty for a seat whose scorecard is hidden', () => {
    mount(seat('a', { kras: null }));
    expect(screen.queryByLabelText(/hr\.teamStructure\.kra\.kraTitle/)).not.toBeInTheDocument();
    expect(screen.queryByText(/kra\.kraTotal/)).not.toBeInTheDocument();
    expect(within(document.body).getByRole('button', { name: 'hr.teamStructure.kra.addKra' })).toBeInTheDocument();
  });
});

describe('SeatDetail', () => {
  const show = (node: ReturnType<typeof seat> | null, onClose = vi.fn()) => {
    render(<SeatDetail node={node} currency="INR" onClose={onClose} />);
    return onClose;
  };

  it('is closed without a seat', () => {
    show(null);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('shows the basics only, when pay and the scorecard are hidden', () => {
    show(seat('a', { title: 'Rep', person_name: 'Ira', department: 'Sales', pay: null, kras: null, monthly_cost: null }));
    expect(screen.getByRole('heading', { name: 'Rep' })).toBeInTheDocument();
    expect(screen.getByText('Ira')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('hr.teamStructure.kind.ROLE')).toBeInTheDocument();
    expect(screen.getByText('hr.teamStructure.employment.FULL_TIME')).toBeInTheDocument();
    expect(screen.getByText('hr.teamStructure.status.FILLED')).toBeInTheDocument();
    expect(screen.queryByLabelText('hr.teamStructure.pay.title')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('hr.teamStructure.kra.title')).not.toBeInTheDocument();
  });

  it('omits the person and department when there are none', () => {
    show(seat('a', { person_name: null, department: null }));
    expect(screen.queryByText('Ira')).not.toBeInTheDocument();
  });

  it('shows fixed pay as an amount and variable pay as its range', () => {
    show(
      seat('a', {
        pay: [
          fixedLine({ label: 'Base', amount: 25000 }),
          fixedLine({ label: 'Incentive', kind: 'VARIABLE', frequency: 'ANNUAL', amount: 5000, min_amount: 1000, max_amount: 9000 }),
          fixedLine({ label: 'Odd', kind: 'VARIABLE', amount: 700, min_amount: null, max_amount: null }),
        ],
      })
    );
    const pay = screen.getByLabelText('hr.teamStructure.pay.title');
    expect(within(pay).getByText(/Base: .*25,?000/)).toBeInTheDocument();
    expect(within(pay).getByText(/Incentive: .*1,?000 – .*9,?000/)).toBeInTheDocument();
    expect(within(pay).getByText(/Odd: .*700/)).toBeInTheDocument();
    expect(within(pay).getByText('hr.teamStructure.pay.frequencies.ANNUAL')).toBeInTheDocument();
  });

  it('shows each KRA with its weight, description and KPIs with target, unit and review cadence', () => {
    show(
      seat('a', {
        kras: [
          kra({ weight: 70, kpis: [{ name: 'Calls', unit: 'calls', target: 200, frequency: 'MONTHLY', weight: 60 }, { name: 'Deals', unit: null, target: 5, frequency: 'QUARTERLY', weight: 40 }] }),
          kra({ title: 'Quality', description: null, weight: 30, kpis: [{ name: 'CSAT', target: null, frequency: 'ANNUAL', weight: 100 }] }),
        ],
      })
    );
    const area = screen.getByLabelText('hr.teamStructure.kra.title');
    expect(within(area).getByText('Sales (70%)')).toBeInTheDocument();
    expect(within(area).getByText('Hit the number')).toBeInTheDocument();
    expect(within(area).getByText('Calls (60%)')).toBeInTheDocument();
    expect(within(area).getByText('200 calls · hr.teamStructure.kra.frequencies.MONTHLY')).toBeInTheDocument();
    expect(within(area).getByText('5 · hr.teamStructure.kra.frequencies.QUARTERLY')).toBeInTheDocument();
    expect(within(area).getByText('Quality (30%)')).toBeInTheDocument();
    expect(within(area).getByText('hr.teamStructure.kra.frequencies.ANNUAL')).toBeInTheDocument();
  });

  it('closes', () => {
    const onClose = show(seat('a'));
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.share.close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
