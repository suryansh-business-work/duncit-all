import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import CancellationPolicyForm from '../cancellation-policy.form';
import type { CancellationPolicyValues } from '../cancellation-policy.types';

const policy = (over: Partial<CancellationPolicyValues> = {}): CancellationPolicyValues => ({
  reschedule_only: false,
  tiers: [{ hours_before: '24', charge_type: 'PERCENT', value: '50' }],
  ...over,
});

function renderForm(initialValues: CancellationPolicyValues, over: Partial<Parameters<typeof CancellationPolicyForm>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const view = render(
    <CancellationPolicyForm initialValues={initialValues} saving={false} error={null} onSubmit={onSubmit} {...over} />,
  );
  return { onSubmit, ...view };
}

const field = (testId: string) => within(screen.getByTestId(testId)).getByRole('spinbutton');
const setField = (testId: string, value: string) => fireEvent.change(field(testId), { target: { value } });

describe('CancellationPolicyForm', () => {
  it('submits the edited bands as typed', async () => {
    const { onSubmit } = renderForm(policy());
    setField('cancellation-tier-0-hours', '12');
    setField('cancellation-tier-0-value', '75');
    fireEvent.click(screen.getByTestId('venue-settings-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      reschedule_only: false,
      tiers: [{ hours_before: 12, charge_type: 'PERCENT', value: 75 }],
    });
  });

  it('says cancelling is free when there are no bands, and appends the default band on add', async () => {
    renderForm(policy({ tiers: [] }));
    expect(screen.getByTestId('venue-settings-no-bands')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('venue-settings-add-band'));
    expect(await screen.findByTestId('cancellation-tier-0')).toBeInTheDocument();
    expect(field('cancellation-tier-0-hours')).toHaveValue(24);
    expect(field('cancellation-tier-0-value')).toHaveValue(50);
    expect(screen.queryByTestId('venue-settings-no-bands')).not.toBeInTheDocument();
  });

  it('removes a band', async () => {
    const { onSubmit } = renderForm(
      policy({
        tiers: [
          { hours_before: '24', charge_type: 'PERCENT', value: '50' },
          { hours_before: '2', charge_type: 'AMOUNT', value: '200' },
        ],
      }),
    );
    fireEvent.click(screen.getByTestId('cancellation-tier-0-remove'));
    await waitFor(() => expect(screen.queryByTestId('cancellation-tier-1')).not.toBeInTheDocument());
    fireEvent.click(screen.getByTestId('venue-settings-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0].tiers).toEqual([{ hours_before: 2, charge_type: 'AMOUNT', value: 200 }]);
  });

  it('refuses a percentage above 100 and does not submit', async () => {
    const { onSubmit } = renderForm(policy());
    setField('cancellation-tier-0-value', '150');
    fireEvent.click(screen.getByTestId('venue-settings-save'));
    expect(await screen.findByText(/100/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses two bands that cover the same window', async () => {
    const { onSubmit } = renderForm(
      policy({
        tiers: [
          { hours_before: '24', charge_type: 'PERCENT', value: '50' },
          { hours_before: '24', charge_type: 'PERCENT', value: '100' },
        ],
      }),
    );
    fireEvent.click(screen.getByTestId('venue-settings-save'));
    await waitFor(() => expect(within(screen.getByTestId('cancellation-tier-1-hours')).getByRole('spinbutton')).toBeInvalid());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a fractional or empty window', async () => {
    const { onSubmit } = renderForm(policy());
    setField('cancellation-tier-0-hours', '1.5');
    fireEvent.click(screen.getByTestId('venue-settings-save'));
    await waitFor(() => expect(field('cancellation-tier-0-hours')).toBeInvalid());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('greys the bands out while cancelling is replaced by reschedule only, and keeps them', async () => {
    const { onSubmit } = renderForm(policy());
    fireEvent.click(screen.getByTestId('venue-settings-reschedule-only'));
    expect(await screen.findByTestId('venue-settings-policy-disabled')).toBeInTheDocument();
    expect(field('cancellation-tier-0-hours')).toBeDisabled();
    expect(screen.getByTestId('venue-settings-add-band')).toBeDisabled();
    fireEvent.click(screen.getByTestId('venue-settings-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ reschedule_only: true, tiers: [{ hours_before: 24 }] });
  });

  it('shows the save error, locks the button while saving, and resets when new values arrive', async () => {
    const { rerender } = renderForm(policy(), { error: 'Could not save the policy' });
    expect(screen.getByTestId('venue-settings-error')).toHaveTextContent('Could not save the policy');

    rerender(
      <CancellationPolicyForm
        initialValues={policy({ tiers: [{ hours_before: '6', charge_type: 'AMOUNT', value: '99' }] })}
        saving
        error={null}
        onSubmit={vi.fn()}
      />,
    );
    await waitFor(() => expect(field('cancellation-tier-0-hours')).toHaveValue(6));
    expect(screen.getByTestId('venue-settings-save')).toBeDisabled();
    expect(screen.queryByTestId('venue-settings-error')).not.toBeInTheDocument();
  });
});
