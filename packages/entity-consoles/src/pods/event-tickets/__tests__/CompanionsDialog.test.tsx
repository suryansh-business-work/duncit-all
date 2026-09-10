import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CompanionsDialog, { type CompanionValue } from '../CompanionsDialog';

interface RenderArgs {
  ticketCode?: string | null;
  required?: number;
  busy?: boolean;
  onClose?: () => void;
  onSubmit?: (companions: CompanionValue[]) => void;
}

const renderDialog = ({
  ticketCode = 'DUN-TKT-1001',
  required = 1,
  busy = false,
  onClose = vi.fn(),
  onSubmit = vi.fn(),
}: RenderArgs = {}) => {
  const view = render(
    <CompanionsDialog
      ticketCode={ticketCode}
      required={required}
      busy={busy}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  );
  return { ...view, onClose, onSubmit };
};

const personSection = (index: number) =>
  screen.getByText(`Person ${index}`).closest('div') as HTMLElement;

describe('CompanionsDialog / open state', () => {
  it('renders nothing when there is no ticket code', () => {
    renderDialog({ ticketCode: null });
    expect(screen.queryByText('Who else is coming in?')).not.toBeInTheDocument();
  });

  it('shows the title, ticket code and required count when a ticket is set', () => {
    renderDialog({ ticketCode: 'DUN-TKT-1001', required: 2 });
    expect(screen.getByText('Who else is coming in?')).toBeInTheDocument();
    expect(
      screen.getByText('Ticket DUN-TKT-1001 admits more than one person. Add the other 2 to mark attendance.'),
    ).toBeInTheDocument();
  });

  it('renders one Name/Phone row per required companion', () => {
    renderDialog({ required: 3 });
    expect(screen.getByText('Person 1')).toBeInTheDocument();
    expect(screen.getByText('Person 2')).toBeInTheDocument();
    expect(screen.getByText('Person 3')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Name')).toHaveLength(3);
    expect(screen.getAllByLabelText('Phone')).toHaveLength(3);
  });
});

describe('CompanionsDialog / editing a row', () => {
  it('updates only the row that was typed into', () => {
    renderDialog({ required: 2 });
    const names = screen.getAllByLabelText('Name');
    fireEvent.change(names[0], { target: { value: 'Asha' } });
    fireEvent.change(names[1], { target: { value: 'Ravi' } });
    expect(names[0]).toHaveValue('Asha');
    expect(names[1]).toHaveValue('Ravi');
  });

  it('shows the default "Required" helper text before the form has been touched', () => {
    renderDialog({ required: 1 });
    const section = personSection(1);
    expect(within(section).getAllByText('Required')).toHaveLength(2);
    expect(screen.queryByText('Fill in every name and phone number.')).not.toBeInTheDocument();
  });
});

describe('CompanionsDialog / validation on submit', () => {
  it('blocks submit and shows field + summary errors when rows are incomplete', () => {
    const onSubmit = vi.fn();
    renderDialog({ required: 1, onSubmit });
    fireEvent.click(screen.getByRole('button', { name: 'Mark attendance' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Fill in every name and phone number.')).toBeInTheDocument();
    expect(screen.getByText('Enter the name')).toBeInTheDocument();
    expect(screen.getByText('Enter a phone number — digits only, 6 to 15')).toBeInTheDocument();
  });

  it('rejects a name shorter than two characters and a phone with the wrong shape', () => {
    renderDialog({ required: 1 });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark attendance' }));

    expect(screen.getByText('Enter the name')).toBeInTheDocument();
    expect(screen.getByText('Enter a phone number — digits only, 6 to 15')).toBeInTheDocument();
  });

  it('accepts a name of exactly two characters and a 6-to-15 digit phone', () => {
    const onSubmit = vi.fn();
    renderDialog({ required: 1, onSubmit });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Al' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark attendance' }));

    expect(onSubmit).toHaveBeenCalledWith([{ name: 'Al', phone_number: '123456' }]);
  });

  it('rejects a phone number longer than 15 digits', () => {
    const onSubmit = vi.fn();
    renderDialog({ required: 1, onSubmit });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Al' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '1234567890123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark attendance' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a phone number — digits only, 6 to 15')).toBeInTheDocument();
  });

  it('trims the name before handing the row to onSubmit', () => {
    const onSubmit = vi.fn();
    renderDialog({ required: 1, onSubmit });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  Priya  ' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '9998887776' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark attendance' }));

    expect(onSubmit).toHaveBeenCalledWith([{ name: 'Priya', phone_number: '9998887776' }]);
  });

  it('requires every row to be valid before submitting a multi-seat group', () => {
    const onSubmit = vi.fn();
    renderDialog({ required: 2, onSubmit });
    const names = screen.getAllByLabelText('Name');
    const phones = screen.getAllByLabelText('Phone');
    fireEvent.change(names[0], { target: { value: 'Asha' } });
    fireEvent.change(phones[0], { target: { value: '9998887776' } });
    // Second row left blank.
    fireEvent.click(screen.getByRole('button', { name: 'Mark attendance' }));

    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(names[1], { target: { value: 'Ravi' } });
    fireEvent.change(phones[1], { target: { value: '8887776665' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark attendance' }));

    expect(onSubmit).toHaveBeenCalledWith([
      { name: 'Asha', phone_number: '9998887776' },
      { name: 'Ravi', phone_number: '8887776665' },
    ]);
  });
});

describe('CompanionsDialog / busy + close', () => {
  it('calls onClose from Cancel', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables both actions and shows the busy label while marking attendance', () => {
    renderDialog({ busy: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Marking…' })).toBeDisabled();
  });
});

describe('CompanionsDialog / ticket or count changes', () => {
  it('resets rows and clears touched errors when the ticket code changes', () => {
    const { rerender } = renderDialog({ ticketCode: 'DUN-TKT-1', required: 1 });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Asha' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark attendance' }));
    // Incomplete (phone still blank) — shows the touched error state.
    expect(screen.getByText('Enter a phone number — digits only, 6 to 15')).toBeInTheDocument();

    rerender(
      <CompanionsDialog
        ticketCode="DUN-TKT-2"
        required={1}
        busy={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.queryByText('Enter a phone number — digits only, 6 to 15')).not.toBeInTheDocument();
  });

  it('resizes the row count when required changes for the same ticket', () => {
    const { rerender } = renderDialog({ ticketCode: 'DUN-TKT-1', required: 1 });
    expect(screen.getAllByLabelText('Name')).toHaveLength(1);

    rerender(
      <CompanionsDialog
        ticketCode="DUN-TKT-1"
        required={3}
        busy={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getAllByLabelText('Name')).toHaveLength(3);
  });
});
