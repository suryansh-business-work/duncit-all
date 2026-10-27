import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import CostSummary from '../../../src/pages/team-structure/CostSummary';
import SeatCard, { type SeatData } from '../../../src/pages/team-structure/SeatCard';
import TeamFormDialog from '../../../src/pages/team-structure/TeamFormDialog';
import { renderWithProviders } from '../../testkit';
import { seat, structure } from './support';

vi.mock('@duncit/app-settings', async (io) => (await import('./support')).withKeys(await io<typeof import('@duncit/app-settings')>()));
vi.mock('@xyflow/react', () => ({
  Handle: ({ type }: { type: string }) => <i data-testid={`handle-${type}`} />,
  Position: { Top: 'top', Bottom: 'bottom' },
}));

describe('CostSummary', () => {
  it('shows the grand total and one chip per employment type, leaving out optional seats', () => {
    render(
      <CostSummary
        currency="INR"
        nodes={[
          seat('a', { monthly_cost: 10000 }),
          seat('b', { monthly_cost: 2000, employment_type: 'PART_TIME' }),
          seat('c', { monthly_cost: 9999, status: 'OPTIONAL' }),
        ]}
      />
    );
    expect(screen.getByText(/hr\.teamStructure\.cost\.total\|.*12,?000/)).toBeInTheDocument();
    expect(screen.getByText(/hr\.teamStructure\.employment\.FULL_TIME: .*10,?000/)).toBeInTheDocument();
    expect(screen.getByText(/hr\.teamStructure\.employment\.PART_TIME: .*2,?000/)).toBeInTheDocument();
    expect(screen.queryByText(/9,?999/)).not.toBeInTheDocument();
  });

  it('shows a zero total and no chips for an empty chart', () => {
    render(<CostSummary currency="INR" nodes={[]} />);
    expect(screen.getByText(/hr\.teamStructure\.cost\.total\|.*"amount":"[^"]*0"/)).toBeInTheDocument();
    expect(screen.queryByText(/employment/)).not.toBeInTheDocument();
  });
});

describe('SeatCard', () => {
  const card = (data: Partial<SeatData> & { node: SeatData['node'] }, selected = false) =>
    render(
      <SeatCard
        {...({ data: { currency: 'INR', onAddChild: null, ...data }, selected } as unknown as Parameters<typeof SeatCard>[0])}
      />
    );

  it('shows the kind, title, person and employment type with its monthly cost', () => {
    card({ node: seat('a', { kind: 'HEAD', title: 'CEO', person_name: 'Asha', monthly_cost: 50000 }) });
    expect(screen.getByText('hr.teamStructure.kind.HEAD')).toBeInTheDocument();
    expect(screen.getByText('CEO')).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('hr.teamStructure.employment.FULL_TIME')).toBeInTheDocument();
    expect(screen.getByText(/hr\.teamStructure\.perMonth\|.*50,?000/)).toBeInTheDocument();
    expect(screen.getByTestId('handle-target')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source')).toBeInTheDocument();
  });

  it('says Vacant instead of a person for a vacant seat', () => {
    card({ node: seat('a', { status: 'VACANT', person_name: 'Ignored' }) });
    expect(screen.getByText('hr.teamStructure.status.VACANT')).toBeInTheDocument();
    expect(screen.queryByText('Ignored')).not.toBeInTheDocument();
  });

  it('falls back to the employment type when no person is named', () => {
    card({ node: seat('a', { person_name: null, employment_type: 'AI_AGENT', kind: 'AI_AGENT' }) });
    expect(screen.getAllByText('hr.teamStructure.employment.AI_AGENT')).toHaveLength(2);
  });

  it('hides the cost when pay is not visible, as on a public link without salary', () => {
    card({ node: seat('a', { monthly_cost: null, pay: null }) });
    expect(screen.queryByText(/perMonth/)).not.toBeInTheDocument();
  });

  it('offers no add button on a read-only chart', () => {
    card({ node: seat('a') });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('adds a seat under this one and does not let the click reach the seat itself', () => {
    const onAddChild = vi.fn();
    const onOuterClick = vi.fn();
    const Wrap = ({ children }: { children: ReactNode }) => <div onClick={onOuterClick}>{children}</div>;
    render(
      <Wrap>
        <SeatCard {...({ data: { node: seat('a', { title: 'CEO' }), currency: 'INR', onAddChild }, selected: true } as unknown as Parameters<typeof SeatCard>[0])} />
      </Wrap>
    );
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.addUnder|{"title":"CEO"}' }));
    expect(onAddChild).toHaveBeenCalledWith('a');
    expect(onOuterClick).not.toHaveBeenCalled();
  });

  it('draws optional seats like vacant ones, dashed', () => {
    const { container } = card({ node: seat('a', { status: 'OPTIONAL' }) });
    expect(getComputedStyle(container.firstElementChild as Element).borderStyle).toBe('dashed');
  });
});

describe('TeamFormDialog', () => {
  const open = (over: Partial<Parameters<typeof TeamFormDialog>[0]> = {}) => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<TeamFormDialog open team={null} busy={false} onClose={onClose} onSubmit={onSubmit} {...over} />);
    return { onSubmit, onClose };
  };
  const field = (key: string) => screen.getByLabelText(new RegExp(key)) as HTMLInputElement;

  it('starts a new team with the default currency and refuses a blank name', async () => {
    const { onSubmit } = open();
    expect(screen.getByText('hr.teamStructure.form.createTitle')).toBeInTheDocument();
    expect(field('hr.teamStructure.form.currency').value).toBe('INR');
    fireEvent.click(screen.getByRole('button', { name: 'shell.common.save' }));
    expect(await screen.findByText('hr.teamStructure.validation.teamName')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a currency that is not three letters', async () => {
    const { onSubmit } = open();
    fireEvent.change(field('hr.teamStructure.form.name'), { target: { value: 'Ops' } });
    fireEvent.change(field('hr.teamStructure.form.currency'), { target: { value: 'RUPEE' } });
    fireEvent.click(screen.getByRole('button', { name: 'shell.common.save' }));
    expect(await screen.findByText('hr.teamStructure.validation.currency')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the trimmed name, description and currency', async () => {
    const { onSubmit } = open();
    fireEvent.change(field('hr.teamStructure.form.name'), { target: { value: '  Ops  ' } });
    fireEvent.change(field('hr.teamStructure.form.description'), { target: { value: 'Runs things' } });
    fireEvent.click(screen.getByRole('button', { name: 'shell.common.save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: 'Ops', description: 'Runs things', currency: 'INR' });
  });

  it('edits an existing team with its values filled in', async () => {
    const { onSubmit } = open({ team: { ...structure, currency: 'USD' } });
    expect(screen.getByText('hr.teamStructure.form.editTitle')).toBeInTheDocument();
    expect(field('hr.teamStructure.form.name').value).toBe('Core Team');
    expect(field('hr.teamStructure.form.description').value).toBe('The core');
    expect(field('hr.teamStructure.form.currency').value).toBe('USD');
    fireEvent.click(screen.getByRole('button', { name: 'shell.common.save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Core Team', currency: 'USD' });
  });

  it('fills missing description with an empty box', () => {
    open({ team: { id: 's2', name: 'Bare', currency: 'INR' } });
    expect(field('hr.teamStructure.form.description').value).toBe('');
  });

  it('cancels, and cannot be saved while a save is running', () => {
    const { onClose } = open({ busy: true });
    expect(screen.getByRole('button', { name: 'shell.common.save' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'shell.common.cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
