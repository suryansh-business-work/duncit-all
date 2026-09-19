import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  CancellationTriggerForm,
  DEFAULT_TRIGGER_HOURS,
  toTriggerValues,
  type SubmitCancellationTrigger,
} from '.';

const ladder = {
  trigger_hours: 12,
  refund_tiers: [
    { hours_before: 48, refund_pct: 100 },
    { hours_before: 24, refund_pct: 50 },
  ],
};

const renderForm = (trigger?: Parameters<typeof toTriggerValues>[0]) => {
  const onSubmit = vi.fn<SubmitCancellationTrigger>().mockResolvedValue(undefined);
  render(<CancellationTriggerForm trigger={trigger} saving={false} onSubmit={onSubmit} />);
  return onSubmit;
};

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save cancellation trigger' }));
const hoursInputs = () => screen.getAllByLabelText('Hours before start');
const refundInputs = () => screen.getAllByLabelText('Refund');

describe('toTriggerValues', () => {
  it('edits the defaults for a venue with no trigger yet', () => {
    expect(toTriggerValues(undefined)).toEqual({
      trigger_hours: String(DEFAULT_TRIGGER_HOURS),
      refund_tiers: [],
    });
  });

  it('turns the stored ladder into text-field values', () => {
    expect(toTriggerValues(ladder)).toEqual({
      trigger_hours: '12',
      refund_tiers: [
        { hours_before: '48', refund_pct: '100' },
        { hours_before: '24', refund_pct: '50' },
      ],
    });
  });
});

describe('CancellationTriggerForm', () => {
  it('starts a new venue on the default window, refunding everyone in full', () => {
    renderForm();
    expect(screen.getByLabelText('Cancellation trigger')).toHaveValue(DEFAULT_TRIGGER_HOURS);
    expect(screen.getByText('No bands — everyone enrolled is refunded in full.')).toBeInTheDocument();
    expect(screen.getByText(/^At 6 hours, a pod starting/)).toBeInTheDocument();
  });

  it('reads each stored band back as the promise it makes', () => {
    renderForm(ladder);
    expect(hoursInputs()).toHaveLength(2);
    expect(
      screen.getByText('100% refund if the pod is cancelled more than 48 hours before the start time.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('50% refund if the pod is cancelled more than 24 hours before the start time.'),
    ).toBeInTheDocument();
  });

  it('adds and removes bands, and saves the ladder as numbers', async () => {
    const onSubmit = renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Add refund band' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add refund band' }));
    expect(hoursInputs()).toHaveLength(2);

    fireEvent.change(hoursInputs()[1], { target: { value: '6' } });
    fireEvent.change(refundInputs()[1], { target: { value: '25' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove refund band' })[0]);
    expect(hoursInputs()).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('Cancellation trigger'), { target: { value: '8' } });
    save();
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        trigger_hours: 8,
        refund_tiers: [{ hours_before: 6, refund_pct: 25 }],
      }),
    );
  });

  // Two bands with the same window cannot both apply — the server refuses the pair.
  it('flags a second band on the same window instead of saving', async () => {
    const onSubmit = renderForm(ladder);
    fireEvent.change(hoursInputs()[1], { target: { value: '48' } });
    save();
    expect(await screen.findByText('Another band already uses this window.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses hours and refunds outside what the server takes', async () => {
    const onSubmit = renderForm(ladder);
    fireEvent.change(screen.getByLabelText('Cancellation trigger'), { target: { value: '1.5' } });
    fireEvent.change(hoursInputs()[0], { target: { value: '-1' } });
    fireEvent.change(hoursInputs()[1], { target: { value: '9000' } });
    fireEvent.change(refundInputs()[0], { target: { value: '150' } });
    fireEvent.change(refundInputs()[1], { target: { value: '-5' } });
    save();

    expect(await screen.findByText('Use whole hours.')).toBeInTheDocument();
    expect(screen.getByText('Hours cannot be negative.')).toBeInTheDocument();
    expect(screen.getByText('Use 8760 hours (a year) or fewer.')).toBeInTheDocument();
    expect(screen.getByText('A refund cannot exceed 100%.')).toBeInTheDocument();
    expect(screen.getByText('A refund cannot be negative.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // An emptied trigger field still reads as a sentence — at zero hours.
  it('writes the worked example at zero while the trigger is cleared', () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('Cancellation trigger'), { target: { value: '' } });
    // The default matcher collapses the doubled space the empty value leaves.
    expect(screen.getByText(/^At hours, a pod starting/)).toBeInTheDocument();
  });
});
