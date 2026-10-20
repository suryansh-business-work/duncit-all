import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { VenuePricingForm, toFormValues, type VenuePricingFormValues } from '../src/pricing/form';
import { makePricing } from './pricing-fixtures';

vi.mock('@mui/x-date-pickers/DatePicker', async () => ({ DatePicker: (await import('./picker-stub')).PickerStub }));
vi.mock('@mui/x-date-pickers/TimePicker', async () => ({ TimePicker: (await import('./picker-stub')).PickerStub }));

type Preview = (values: VenuePricingFormValues, valid: boolean) => null;

// useDateFormat reads the admin's formats through Apollo; with no answer it uses the defaults.
const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => <MockedProvider mocks={[]}>{children}</MockedProvider>;

function renderForm(defaults: VenuePricingFormValues = toFormValues(makePricing()), over: { errorMessage?: string | null; saving?: boolean } = {}) {
  const onSubmit = vi.fn<(values: VenuePricingFormValues) => Promise<void>>().mockResolvedValue(undefined);
  const renderPreview = vi.fn<Preview>(() => null);
  const utils = render(
    <VenuePricingForm
      defaultValues={defaults}
      onSubmit={onSubmit}
      saving={over.saving ?? false}
      errorMessage={over.errorMessage ?? null}
      renderPreview={renderPreview}
    />,
    { wrapper },
  );
  /** What the preview was last handed: the current (unsaved) values and whether they pass. */
  const lastPreview = () => renderPreview.mock.calls[renderPreview.mock.calls.length - 1];
  return { ...utils, onSubmit, lastPreview };
}

const pickModel = (model: string) => fireEvent.click(within(screen.getByTestId(`pricing-model-${model}`)).getByRole('radio'));
const save = () => screen.getByRole('button', { name: 'Save pricing' });
const setNumber = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const chooseOption = (combobox: HTMLElement, name: string) => {
  fireEvent.mouseDown(combobox);
  fireEvent.click(screen.getByRole('option', { name }));
};

describe('VenuePricingForm — pricing model', () => {
  it('shows the fields each model reads', () => {
    renderForm();
    // Per guest: a per-guest rate, guest limits, and opening hours.
    expect(screen.getByLabelText('Rate per guest')).toBeInTheDocument();
    expect(screen.queryByLabelText('Minimum hours')).not.toBeInTheDocument();
    expect(screen.getByText('Open dates & hours')).toBeInTheDocument();

    pickModel('PER_HOUR');
    expect(screen.getByLabelText('Rate')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum hours')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum hours')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Booking step' })).toBeInTheDocument();

    pickModel('PER_SLOT');
    expect(screen.queryByLabelText('Rate')).not.toBeInTheDocument();
    expect(screen.queryByText('Open dates & hours')).not.toBeInTheDocument();
    expect(screen.getByText('Slots')).toBeInTheDocument();

    pickModel('FLAT');
    expect(screen.getByLabelText('Rate')).toBeInTheDocument();
    expect(screen.queryByLabelText('Minimum hours')).not.toBeInTheDocument();
    expect(screen.getByText('Open dates & hours')).toBeInTheDocument();
  });

  it('sells a per-hour venue in the booking step the owner picks', async () => {
    const { onSubmit } = renderForm();
    pickModel('PER_HOUR');
    chooseOption(screen.getByRole('combobox', { name: 'Booking step' }), '30 minutes');
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ model: 'PER_HOUR', booking_increment_minutes: 30 });
  });

  it('points at a saved booking step that is not a multiple of 15 minutes', async () => {
    const { onSubmit } = renderForm(toFormValues(makePricing({ model: 'PER_HOUR', base_rate: 1000, booking_increment_minutes: 20 })));
    expect(screen.getByText('Bookings start and end on these steps.')).toBeInTheDocument();
    setNumber('Rate', '1200');
    fireEvent.click(save());
    expect(await screen.findByText('Use a multiple of 15 minutes')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('VenuePricingForm — saving', () => {
  it('stays disabled until something changes, then submits the edited values', async () => {
    const { onSubmit, lastPreview } = renderForm();
    expect(save()).toBeDisabled();
    expect(lastPreview()).toEqual([expect.objectContaining({ base_rate: 300 }), true]);

    setNumber('Rate per guest', '450');
    await waitFor(() => expect(save()).toBeEnabled());
    expect(lastPreview()).toEqual([expect.objectContaining({ base_rate: 450 }), true]);
    fireEvent.click(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ model: 'PER_PAX', base_rate: 450 });
  });

  it('does not submit an emptied number, and tells the preview the form is invalid', async () => {
    const { onSubmit, lastPreview } = renderForm();
    setNumber('Rate per guest', '');
    expect(await screen.findByText('Enter a number')).toBeInTheDocument();
    expect(screen.getByLabelText('Rate per guest')).toHaveValue(null);
    expect(lastPreview()?.[1]).toBe(false);
    fireEvent.click(save());
    await waitFor(() => expect(screen.getByLabelText('Rate per guest')).toHaveAttribute('aria-invalid', 'true'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the server's answer to the last save and spins while saving", () => {
    renderForm(undefined, { errorMessage: 'base_rate must be at most 1000000', saving: true });
    expect(screen.getByTestId('form-actions-row-error')).toHaveTextContent('base_rate must be at most 1000000');
    expect(screen.getByTestId('form-actions-row-submit')).toBeDisabled();
  });

  it('resets to new saved values', () => {
    const { rerender } = renderForm();
    rerender(
      <VenuePricingForm
        defaultValues={toFormValues(makePricing({ base_rate: 999 }))}
        onSubmit={vi.fn()}
        saving={false}
        errorMessage={null}
        renderPreview={() => null}
      />,
    );
    expect(screen.getByLabelText('Rate per guest')).toHaveValue(999);
  });
});

describe('VenuePricingForm — hours', () => {
  it('uses the usual hours until the owner sets their own, then closes the days they untick', async () => {
    const { onSubmit } = renderForm();
    expect(screen.getByText("Hosts can book during the venue's usual opening hours from its settings.")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('pricing-custom-hours'));
    expect(screen.getAllByLabelText('Opens')).toHaveLength(7);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sunday' }));
    expect(screen.getAllByLabelText('Opens')).toHaveLength(6);
    expect(screen.getByText('Closed')).toBeInTheDocument();

    fireEvent.change(screen.getAllByLabelText('Closes')[0], { target: { value: '2026-01-05T23:30' } });
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const hours = onSubmit.mock.calls[0][0].operating_hours;
    expect(hours[0]).toMatchObject({ day: 0, enabled: false });
    expect(hours[1]).toMatchObject({ day: 1, enabled: true, open: '09:00', close: '23:30' });
  });

  it('refuses a week with no open day', async () => {
    const closed = toFormValues(makePricing({ operating_hours: [{ day: 6, open: '10:00', close: '22:00' }] }));
    const { onSubmit } = renderForm(closed);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Saturday' }));
    fireEvent.click(save());
    expect(await screen.findByText('Open on at least one day')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('VenuePricingForm — slots', () => {
  it('adds, edits and removes a per-slot venue’s slots', async () => {
    const { onSubmit } = renderForm();
    pickModel('PER_SLOT');
    expect(screen.getByText('No slots yet. Add the first one hosts can book.')).toBeInTheDocument();

    fireEvent.click(save());
    expect(await screen.findByText('Add at least one slot')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('pricing-slot-add'));
    fireEvent.click(screen.getByTestId('pricing-slot-add'));
    expect(screen.getAllByTestId(/^pricing-slot-\d$/)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Remove slot 2' }));
    expect(screen.getAllByTestId(/^pricing-slot-\d$/)).toHaveLength(1);

    setNumber('Slot price', '800');
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-01-05T18:00' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2026-01-05T20:00' } });
    fireEvent.click(screen.getByTestId('pricing-slot-0-days-preset-weekends'));
    fireEvent.click(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].slots).toEqual([{ start_time: '18:00', end_time: '20:00', price: 800, days_of_week: [0, 6] }]);
  });

  it('still asks for a slot after the owner removes the last one', async () => {
    const { onSubmit } = renderForm(toFormValues(makePricing({ model: 'PER_SLOT', base_rate: 0, slots: [{ start_time: '10:00', end_time: '12:00', price: 500, days_of_week: [3] }] })));
    fireEvent.click(screen.getByRole('button', { name: 'Remove slot 1' }));
    fireEvent.click(save());
    expect(await screen.findByText('Add at least one slot')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('needs at least one day for a slot', async () => {
    const { onSubmit } = renderForm(toFormValues(makePricing({ model: 'PER_SLOT', base_rate: 0, slots: [{ start_time: '10:00', end_time: '12:00', price: 500, days_of_week: [3] }] })));
    fireEvent.click(screen.getByTestId('pricing-slot-0-days-day-3'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Pick at least one day');
    fireEvent.click(save());
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('VenuePricingForm — price rules', () => {
  it('adds a weekday surcharge that needs its days, then removes it', async () => {
    const { onSubmit } = renderForm();
    expect(screen.getByText('No price rules. Every day uses the base price.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pricing-rule-add'));
    fireEvent.click(save());
    expect(await screen.findByText('Pick at least one day')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('pricing-rule-0-days-day-6'));
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: 'Weekend' } });
    setNumber('Change', '25');
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].price_rules).toEqual([
      { type: 'WEEKDAY_SURCHARGE', label: 'Weekend', mode: 'PERCENT', value: 25, days: [6], dates: [], from: '', to: '' },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Remove rule 1' }));
    expect(screen.queryByTestId('pricing-rule-0')).not.toBeInTheDocument();
  });

  it('collects a date override’s dates once each, and drops one on delete', async () => {
    const { onSubmit } = renderForm();
    fireEvent.click(screen.getByTestId('pricing-rule-add'));
    chooseOption(screen.getByRole('combobox', { name: 'Rule' }), 'Date override');
    chooseOption(screen.getByRole('combobox', { name: 'Change by' }), 'Amount (₹)');
    expect(screen.getByText('No dates picked yet.')).toBeInTheDocument();
    fireEvent.click(save());
    expect(await screen.findByText('Pick at least one date')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    const addDate = screen.getByLabelText('Add a date');
    fireEvent.change(addDate, { target: { value: '2026-12-31T00:00' } });
    fireEvent.change(addDate, { target: { value: '2026-12-25T00:00' } });
    fireEvent.change(addDate, { target: { value: '2026-12-25T00:00' } });
    fireEvent.change(addDate, { target: { value: 'not a date' } });
    expect(screen.getByText('25 Dec 2026')).toBeInTheDocument();
    expect(screen.getByText('31 Dec 2026')).toBeInTheDocument();

    const chip31 = screen.getByText('31 Dec 2026').closest('.MuiChip-root') as HTMLElement;
    fireEvent.click(within(chip31).getByTestId('CancelIcon'));
    fireEvent.click(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].price_rules[0]).toMatchObject({ type: 'DATE_OVERRIDE', mode: 'FLAT', dates: ['2026-12-25'] });
  });

  it('takes a date range from and to', async () => {
    const { onSubmit } = renderForm();
    fireEvent.click(screen.getByTestId('pricing-rule-add'));
    chooseOption(screen.getByRole('combobox', { name: 'Rule' }), 'Date range');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-12-31T00:00' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-12-20T00:00' } });
    fireEvent.click(save());
    expect(await screen.findByText('The end date must be on or after the start date')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2027-01-02T00:00' } });
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].price_rules[0]).toMatchObject({ type: 'DATE_RANGE', from: '2026-12-31', to: '2027-01-02' });
  });
});

describe('VenuePricingForm — fees', () => {
  it('saves the fees, deposit and GST choice', async () => {
    const { onSubmit } = renderForm();
    setNumber('Minimum spend', '5000');
    setNumber('Refundable deposit', '2000');
    setNumber('Cleaning fee', '500');
    setNumber('Pet fee', '300');
    fireEvent.click(screen.getByTestId('pricing-gst'));
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ min_spend: 5000, deposit: 2000, cleaning_fee: 500, pet_fee: 300, gst_enabled: true });
  });
});
