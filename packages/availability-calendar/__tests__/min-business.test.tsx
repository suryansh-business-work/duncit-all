import { describe, expect, it, vi } from 'vitest';
import { useMemo } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@duncit/app-settings';
import { makeBookingOffersSchema, type BookingOffersValues, type MinBusinessRowValues } from '@duncit/forms/schemas';
import MinBusinessFields from '../src/offers/settings/MinBusinessFields';
import VenueMinBusinessNote from '../src/offers/settings/VenueMinBusinessNote';

interface FormProps {
  rows: MinBusinessRowValues[];
  disabled?: boolean;
  onSubmit: (values: BookingOffersValues) => void;
}

/** Venue settings' Booking offers form, cut down to the business rows, under its own rules. */
function BookingOffersForm({ rows, disabled, onSubmit }: Readonly<FormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeBookingOffersSchema(t), [t]);
  const { control, handleSubmit } = useForm<BookingOffersValues>({
    resolver: zodResolver(schema),
    defaultValues: { min_guests: '', response_hours: '', min_business: rows },
  });
  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))}>
      <MinBusinessFields control={control} idPrefix="offers" disabled={disabled} />
      <button type="submit">Save</button>
    </form>
  );
}

const renderRows = (rows: MinBusinessRowValues[], disabled?: boolean) => {
  const onSubmit = vi.fn();
  render(<BookingOffersForm rows={rows} disabled={disabled} onSubmit={onSubmit} />);
  return { onSubmit, section: within(screen.getByTestId('offers-min-business')) };
};

const bases = (section: ReturnType<typeof renderRows>['section']) =>
  section.queryAllByRole('combobox', { name: /Basis/ }).map((basis) => basis.textContent);

describe('MinBusinessFields', () => {
  it('lists each amount on its basis, and adds the next basis not listed until all three are', () => {
    const { section } = renderRows([{ model: 'PER_GUEST', amount: '200' }]);
    expect(section.getByRole('heading', { name: 'Business you expect per booking' })).toBeInTheDocument();
    // The hint says where hosts meet the amount, and that a lower offer is refused.
    expect(section.getByText(/Hosts see it on Create Pod, and an offer below the amount .* cannot be sent/)).toBeInTheDocument();
    expect(bases(section)).toEqual(['Per guest']);
    expect(section.getByLabelText('Amount (₹)')).toHaveValue(200);

    fireEvent.click(section.getByRole('button', { name: 'Add amount' }));
    expect(bases(section)).toEqual(['Per guest', 'Per hour']);
    expect(section.getAllByLabelText('Amount (₹)')[1]).toHaveValue(null);
    fireEvent.click(section.getByRole('button', { name: 'Add amount' }));
    expect(bases(section)).toEqual(['Per guest', 'Per hour', 'Per booking']);
    expect(section.queryByRole('button', { name: 'Add amount' })).not.toBeInTheDocument();
  });

  it('removes a row, but never the last one', () => {
    const { section } = renderRows([
      { model: 'PER_GUEST', amount: '200' },
      { model: 'FLAT', amount: '5000' },
    ]);
    const removes = section.getAllByRole('button', { name: 'Remove this amount' });
    for (const remove of removes) expect(remove).toBeEnabled();
    fireEvent.click(removes[0]);
    expect(bases(section)).toEqual(['Per booking']);
    expect(section.getByRole('button', { name: 'Remove this amount' })).toBeDisabled();
    expect(section.getByRole('button', { name: 'Add amount' })).toBeInTheDocument();
  });

  it('saves the basis picked and the amount typed', async () => {
    const { section, onSubmit } = renderRows([{ model: 'PER_GUEST', amount: '200' }]);
    fireEvent.mouseDown(section.getByRole('combobox', { name: /Basis/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Per hour' }));
    fireEvent.change(section.getByLabelText('Amount (₹)'), { target: { value: '450' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].min_business).toEqual([{ model: 'PER_HOUR', amount: '450' }]);
  });

  it('asks for at least one amount when none is listed', async () => {
    const { section, onSubmit } = renderRows([]);
    expect(bases(section)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await section.findByText('Add at least one amount')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('flags a basis listed twice on its own row, not on the list', async () => {
    const { section, onSubmit } = renderRows([
      { model: 'PER_GUEST', amount: '200' },
      { model: 'PER_GUEST', amount: '300' },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await within(section.getByTestId('offers-min-business-row-1')).findByText('List each basis once')).toBeInTheDocument();
    expect(within(section.getByTestId('offers-min-business-row-0')).queryByText('List each basis once')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('locks every control while disabled', () => {
    const { section } = renderRows(
      [
        { model: 'PER_GUEST', amount: '200' },
        { model: 'PER_HOUR', amount: '400' },
      ],
      true,
    );
    for (const basis of section.getAllByRole('combobox', { name: /Basis/ })) expect(basis).toHaveAttribute('aria-disabled', 'true');
    for (const amount of section.getAllByLabelText('Amount (₹)')) expect(amount).toBeDisabled();
    for (const remove of section.getAllByRole('button', { name: 'Remove this amount' })) expect(remove).toBeDisabled();
    expect(section.getByRole('button', { name: 'Add amount' })).toBeDisabled();
  });
});

describe('VenueMinBusinessNote', () => {
  const money = (rupees: number) => `Rs ${rupees}`;

  it.each([
    ['no amounts on record', null],
    ['an empty list', []],
    ['only zero amounts and bases this client does not know', [{ model: 'FLAT', amount: 0 }, { model: 'PER_DAY', amount: 900 }]],
  ])('says nothing for %s', (_case, rows) => {
    const { container } = render(<VenueMinBusinessNote rows={rows} money={money} testId="create-pod-min-business" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists the venue's minimum business, in the pickers' order and the surface's money, as the offer's floor", () => {
    const rows = [
      { model: 'PER_HOUR', amount: 400 },
      { model: 'PER_GUEST', amount: 200 },
      { model: 'FLAT', amount: 0 },
    ];
    render(<VenueMinBusinessNote rows={rows} money={money} testId="create-pod-min-business" />);
    const note = within(screen.getByTestId('create-pod-min-business'));
    expect(note.getByText('Minimum business for this venue')).toBeInTheDocument();
    expect(note.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Rs 200 per guest', 'Rs 400 per hour']);
    expect(note.getByText(/Your offer must be at least the amount for the way you pay\./)).toBeInTheDocument();
  });
});
