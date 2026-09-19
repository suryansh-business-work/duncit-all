import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import ContractFormDialog, {
  EMPTY_CONTRACT_FORM,
  type ContractFormState,
} from '../../src/pages/contracts/ContractFormDialog';
import { renderWithProviders } from '../testkit';

// The Legal portal is a desktop console, so the only media query that matches
// is the fine-pointer one MUI X uses to pick its desktop date picker (an
// editable field plus a calendar popover).
Object.defineProperty(window, 'matchMedia', {
  value: (query: string) => ({
    matches: query.includes('pointer: fine'),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
  writable: true,
  configurable: true,
});

const FILLED: ContractFormState = {
  title: 'Venue Partnership — Court 2',
  counterparty: 'Smash Arena LLP',
  description: 'Weekend slots at the Indiranagar courts.',
  status: 'ACTIVE',
  effective_from: '2026-04-01',
  effective_to: '',
  content: '<p>The venue grants Duncit weekend access.</p>',
};

interface Options {
  isNew?: boolean;
  readOnly?: boolean;
  saving?: boolean;
  error?: string | null;
  form?: ContractFormState;
  contractNo?: string;
}

const renderDialog = ({
  isNew = false,
  readOnly = false,
  saving = false,
  error = null,
  form = FILLED,
  contractNo = 'CTR-000042',
}: Options = {}) => {
  const onChange = vi.fn();
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  renderWithProviders(
    <ContractFormDialog
      open
      isNew={isNew}
      editingTitle="Venue Partnership — Court 2"
      contractNo={contractNo}
      readOnly={readOnly}
      form={form}
      error={error}
      saving={saving}
      onChange={onChange}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  );
  return { onChange, onClose, onSubmit, dialog: screen.getAllByRole('dialog')[0] };
};

describe('ContractFormDialog — modes', () => {
  it('creates a new contract once it has a title', () => {
    const { dialog } = renderDialog({ isNew: true, form: EMPTY_CONTRACT_FORM });
    expect(within(dialog).getByText('New Contract')).toBeInTheDocument();
    // A contract number is minted on insert, so a new one has none to show.
    expect(within(dialog).queryByText('CTR-000042')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create Contract' })).toBeDisabled();
  });

  it('edits an existing contract under its number', () => {
    const { dialog, onSubmit } = renderDialog();
    expect(within(dialog).getByText('Edit · Venue Partnership — Court 2')).toBeInTheDocument();
    expect(within(dialog).getByText('CTR-000042')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows a contract read-only, with nothing to save', () => {
    const { dialog, onClose } = renderDialog({ readOnly: true });
    expect(within(dialog).getByText('View · Venue Partnership — Court 2')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Title/)).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the error the page reports', () => {
    const { dialog } = renderDialog({ error: 'A contract with this title already exists' });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('A contract with this title already exists');
  });

  it('holds still while saving', () => {
    const { dialog, onClose } = renderDialog({ saving: true });
    expect(within(dialog).getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape when nothing is in flight', () => {
    const { dialog, onClose } = renderDialog();
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ContractFormDialog — fields', () => {
  it('reports every text field edit as a patch', () => {
    const { dialog, onChange } = renderDialog();
    fireEvent.change(within(dialog).getByLabelText(/^Title/), { target: { value: 'Venue Partnership — Court 3' } });
    expect(onChange).toHaveBeenCalledWith({ title: 'Venue Partnership — Court 3' });
    fireEvent.change(within(dialog).getByLabelText('Counterparty'), { target: { value: 'Smash Arena Pvt Ltd' } });
    expect(onChange).toHaveBeenCalledWith({ counterparty: 'Smash Arena Pvt Ltd' });
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Weekday evenings too.' } });
    expect(onChange).toHaveBeenCalledWith({ description: 'Weekday evenings too.' });
  });

  it('reports the status picked from the list', () => {
    const { dialog, onChange } = renderDialog();
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Status' }));
    fireEvent.click(screen.getByRole('option', { name: 'Expired' }));
    expect(onChange).toHaveBeenCalledWith({ status: 'EXPIRED' });
  });

  it('writes a start day picked from the calendar back as yyyy-MM-dd', async () => {
    const { onChange } = renderDialog();
    const [from] = screen.getAllByRole('button', { name: /^Choose date/ });

    fireEvent.click(from);
    fireEvent.click(within(await screen.findByRole('grid')).getByRole('gridcell', { name: '15' }));

    expect(onChange).toHaveBeenCalledWith({ effective_from: '2026-04-15' });
  });

  it('opens an unset end date on the current month and writes the pick back', async () => {
    const { onChange } = renderDialog();
    const [, to] = screen.getAllByRole('button', { name: /^Choose date/ });

    fireEvent.click(to);
    fireEvent.click(within(await screen.findByRole('grid')).getByRole('gridcell', { name: '15' }));

    expect(onChange).toHaveBeenCalledWith({ effective_to: expect.stringMatching(/^\d{4}-\d{2}-15$/) });
  });

  it('writes a cleared date back as blank', () => {
    const { onChange } = renderDialog();
    const [fromMonth] = screen.getAllByRole('spinbutton', { name: 'Month' });
    fireEvent.keyDown(fromMonth, { key: 'Delete' });
    expect(onChange).toHaveBeenCalledWith({ effective_from: '' });
  });
});
