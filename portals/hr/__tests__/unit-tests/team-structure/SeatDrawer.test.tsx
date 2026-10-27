import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import SeatDrawer from '../../../src/pages/team-structure/SeatDrawer';
import { renderWithProviders } from '../../testkit';
import { fixedLine, seat } from './support';

vi.mock('@duncit/app-settings', async (io) => (await import('./support')).withKeys(await io<typeof import('@duncit/app-settings')>()));

type Props = Parameters<typeof SeatDrawer>[0];

const mount = (over: Partial<Props> = {}) => {
  const handlers = { onClose: vi.fn(), onSave: vi.fn(), onDelete: vi.fn() };
  const props: Props = { open: true, node: null, parentId: 'p1', currency: 'INR', nextOrder: 3, busy: false, ...handlers, ...over };
  const view = renderWithProviders(<SeatDrawer {...props} />);
  return { ...handlers, rerender: (next: Partial<Props>) => view.rerender(<SeatDrawer {...props} {...next} />) };
};

const label = (key: string) => screen.getByLabelText(new RegExp(key.replaceAll('.', '\\.'))) as HTMLInputElement;
const save = () => fireEvent.click(screen.getByRole('button', { name: 'shell.common.save' }));
const pick = (field: string, option: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: new RegExp(field.replaceAll('.', '\\.')) }));
  fireEvent.click(screen.getByRole('option', { name: option }));
};

describe('adding a seat', () => {
  it('opens blank with the add title and no delete button', () => {
    mount();
    expect(screen.getByText('hr.teamStructure.seat.addTitle')).toBeInTheDocument();
    expect(label('hr.teamStructure.seat.title').value).toBe('');
    expect(screen.queryByRole('button', { name: 'hr.teamStructure.seat.delete' })).not.toBeInTheDocument();
  });

  it('refuses a blank title', async () => {
    const { onSave } = mount();
    save();
    expect(await screen.findByText('hr.teamStructure.validation.title')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves under the chosen parent, at the next position, with empty text sent as null', async () => {
    const { onSave } = mount();
    fireEvent.change(label('hr.teamStructure.seat.title'), { target: { value: '  QA Lead ' } });
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      id: undefined,
      parent_id: 'p1',
      sort_order: 3,
      kind: 'ROLE',
      title: 'QA Lead',
      person_name: null,
      department: null,
      employment_type: 'FULL_TIME',
      status: 'FILLED',
      notes: null,
      pay: [],
      kras: [],
    });
  });

  it('can add a top-level seat', async () => {
    const { onSave } = mount({ parentId: null, nextOrder: 0 });
    fireEvent.change(label('hr.teamStructure.seat.title'), { target: { value: 'CEO' } });
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ parent_id: null, sort_order: 0 });
  });

  it('saves the kind, status, employment and text fields that were chosen', async () => {
    const { onSave } = mount();
    fireEvent.change(label('hr.teamStructure.seat.title'), { target: { value: 'Support Bot' } });
    fireEvent.change(label('hr.teamStructure.seat.person'), { target: { value: 'Claude' } });
    fireEvent.change(label('hr.teamStructure.seat.department'), { target: { value: 'Support' } });
    fireEvent.change(label('hr.teamStructure.seat.notes'), { target: { value: '24x7' } });
    pick('hr.teamStructure.seat.kind', 'hr.teamStructure.kind.AI_AGENT');
    pick('hr.teamStructure.seat.status', 'hr.teamStructure.status.VACANT');
    pick('hr.teamStructure.seat.employment', 'hr.teamStructure.employment.AI_AGENT');
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      title: 'Support Bot',
      person_name: 'Claude',
      department: 'Support',
      notes: '24x7',
      kind: 'AI_AGENT',
      status: 'VACANT',
      employment_type: 'AI_AGENT',
    });
  });
});

describe('editing a seat', () => {
  const existing = seat('a', {
    parent_id: 'boss',
    title: 'Designer',
    person_name: 'Ira',
    department: 'Product',
    notes: 'remote',
    sort_order: 7,
    pay: [fixedLine({ label: 'Base', amount: 25000, note: 'gross' })],
  });

  it('fills the form from the seat and keeps its id, parent and position on save', async () => {
    const { onSave } = mount({ node: existing, parentId: 'ignored', nextOrder: 99 });
    expect(screen.getByText('hr.teamStructure.seat.editTitle')).toBeInTheDocument();
    expect(label('hr.teamStructure.seat.title').value).toBe('Designer');
    expect(label('hr.teamStructure.seat.person').value).toBe('Ira');
    expect(label('hr.teamStructure.pay.label').value).toBe('Base');
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      id: 'a',
      parent_id: 'boss',
      sort_order: 7,
      title: 'Designer',
      pay: [{ label: 'Base', kind: 'FIXED', frequency: 'MONTHLY', amount: 25000, min_amount: null, max_amount: null, note: 'gross' }],
    });
  });

  it('shows empty fields for optional values the seat does not have, and no pay when pay is hidden', () => {
    mount({ node: seat('b', { person_name: null, department: null, notes: null, pay: null }) });
    expect(label('hr.teamStructure.seat.person').value).toBe('');
    expect(label('hr.teamStructure.seat.department').value).toBe('');
    expect(screen.queryByLabelText(/hr\.teamStructure\.pay\.label/)).not.toBeInTheDocument();
  });

  it('deletes through the button, which is disabled while a write is running', () => {
    const { onDelete } = mount({ node: existing });
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.seat.delete' }));
    expect(onDelete).toHaveBeenCalledWith(existing);
  });

  it('cannot be saved or deleted while busy', () => {
    mount({ node: existing, busy: true });
    expect(screen.getByRole('button', { name: 'shell.common.save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'hr.teamStructure.seat.delete' })).toBeDisabled();
  });

  it('switches to another seat’s values when reopened on it', () => {
    const view = mount({ node: existing });
    view.rerender({ node: seat('c', { title: 'Engineer' }) });
    expect(label('hr.teamStructure.seat.title').value).toBe('Engineer');
    view.rerender({ node: null });
    expect(label('hr.teamStructure.seat.title').value).toBe('');
  });

  it('cancels', () => {
    const { onClose } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'shell.common.cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing while closed', () => {
    mount({ open: false });
    expect(screen.queryByText('hr.teamStructure.seat.addTitle')).not.toBeInTheDocument();
  });
});

describe('pay lines', () => {
  const titled = () => fireEvent.change(label('hr.teamStructure.seat.title'), { target: { value: 'Seat' } });

  it('adds a fixed line and saves its amount as a number', async () => {
    const { onSave } = mount();
    titled();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.pay.add' }));
    fireEvent.change(label('hr.teamStructure.pay.label'), { target: { value: 'Stipend' } });
    fireEvent.change(label('hr.teamStructure.pay.amount'), { target: { value: '5000' } });
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].pay).toEqual([
      { label: 'Stipend', kind: 'FIXED', frequency: 'MONTHLY', amount: 5000, min_amount: null, max_amount: null, note: null },
    ]);
  });

  it('shows the range fields only for a variable line, and saves the range', async () => {
    const { onSave } = mount();
    titled();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.pay.add' }));
    expect(screen.queryByLabelText(/hr\.teamStructure\.pay\.min/)).not.toBeInTheDocument();
    pick('hr.teamStructure.pay.kind', 'hr.teamStructure.pay.kinds.VARIABLE');
    pick('hr.teamStructure.pay.frequency', 'hr.teamStructure.pay.frequencies.ANNUAL');
    fireEvent.change(label('hr.teamStructure.pay.label'), { target: { value: 'Incentive' } });
    fireEvent.change(label('hr.teamStructure.pay.expected'), { target: { value: '5000' } });
    fireEvent.change(label('hr.teamStructure.pay.min'), { target: { value: '1000' } });
    fireEvent.change(label('hr.teamStructure.pay.max'), { target: { value: '9000' } });
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].pay[0]).toMatchObject({ kind: 'VARIABLE', frequency: 'ANNUAL', amount: 5000, min_amount: 1000, max_amount: 9000 });
  });

  it('refuses a variable line whose expected amount is outside its range', async () => {
    const { onSave } = mount();
    titled();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.pay.add' }));
    pick('hr.teamStructure.pay.kind', 'hr.teamStructure.pay.kinds.VARIABLE');
    fireEvent.change(label('hr.teamStructure.pay.label'), { target: { value: 'Incentive' } });
    fireEvent.change(label('hr.teamStructure.pay.expected'), { target: { value: '20000' } });
    fireEvent.change(label('hr.teamStructure.pay.min'), { target: { value: '1000' } });
    fireEvent.change(label('hr.teamStructure.pay.max'), { target: { value: '9000' } });
    save();
    expect(await screen.findByText('hr.teamStructure.validation.range')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('refuses a line with no name', async () => {
    const { onSave } = mount();
    titled();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.pay.add' }));
    save();
    expect(await screen.findByText('hr.teamStructure.validation.payLabel')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('removes a line', async () => {
    const { onSave } = mount({ node: seat('a', { pay: [fixedLine({ label: 'One' }), fixedLine({ label: 'Two' })] }) });
    fireEvent.click(screen.getAllByRole('button', { name: 'hr.teamStructure.pay.remove' })[0]);
    expect(screen.getAllByLabelText(/hr\.teamStructure\.pay\.label/)).toHaveLength(1);
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].pay.map((p: { label: string }) => p.label)).toEqual(['Two']);
  });

  it('labels amounts with the currency symbol of the team', () => {
    mount({ currency: 'USD' });
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.pay.add' }));
    expect(screen.getByLabelText(/"currency":"\$"/)).toBeInTheDocument();
  });
});
