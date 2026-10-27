import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LITE_HOST_CHECK_IN_BY_CODE } from '../../../../graphql/manage';
import { CheckInTab } from '../../../../pages/manage/check-in';
import { registrationFixture, renderWithProviders, statsFixture } from '../../../test-utils';
import { hostedEvent, registrationsMock } from '../manage-mocks';

describe('CheckInTab', () => {
  it('shows how many of the confirmed guests are in, and both ways to check someone in', async () => {
    const event = hostedEvent({ stats: statsFixture({ going: 12, checked_in: 5 }) });
    renderWithProviders(<CheckInTab event={event} onChanged={vi.fn()} />, { mocks: [registrationsMock({ status: 'CONFIRMED' }, [])] });

    expect(screen.getByText('5 of 12 checked in')).toBeInTheDocument();
    expect(screen.getByText('Check in by code')).toBeInTheDocument();
    expect(screen.getByText('Find a guest by name')).toBeInTheDocument();
    expect(screen.getByTestId('check-in-form')).toBeInTheDocument();
    expect(await screen.findByText('No confirmed guests match.')).toBeInTheDocument();
    expect(screen.queryByTestId('check-in-result')).not.toBeInTheDocument();
  });

  it('announces the guest just checked in, with the time in the console zone, and tells the page', async () => {
    const onChanged = vi.fn();
    const guest = registrationFixture({ quantity: 2, checked_in_at: '2026-11-21T14:00:00.000Z' });
    const { user } = renderWithProviders(<CheckInTab event={hostedEvent()} onChanged={onChanged} />, {
      mocks: [
        registrationsMock({ status: 'CONFIRMED' }, []),
        { request: { query: LITE_HOST_CHECK_IN_BY_CODE, variables: { event_id: 'ev-1', code: 'ABC123' } }, result: { data: { liteHostCheckInByCode: guest } } },
      ],
    });

    await user.type(screen.getByRole('textbox', { name: 'Check-in code' }), 'abc123');
    await user.click(within(screen.getByTestId('check-in-form')).getByRole('button', { name: 'Check in' }));

    const result = await screen.findByTestId('check-in-result');
    expect(within(result).getByText('Ravi Kumar')).toBeInTheDocument();
    expect(result).toHaveTextContent('General × 2 · ABC123');
    expect(result).toHaveTextContent('Checked in at 21 Nov 2026 · 07:30 PM');
    expect(result.closest('[aria-live="polite"]')).not.toBeNull();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('leaves out the time when the answer carries none', async () => {
    const guest = registrationFixture({ checked_in_at: null });
    const { user } = renderWithProviders(<CheckInTab event={hostedEvent()} onChanged={vi.fn()} />, {
      mocks: [
        registrationsMock({ status: 'CONFIRMED' }, []),
        { request: { query: LITE_HOST_CHECK_IN_BY_CODE, variables: { event_id: 'ev-1', code: 'ABC123' } }, result: { data: { liteHostCheckInByCode: guest } } },
      ],
    });

    await user.type(screen.getByRole('textbox', { name: 'Check-in code' }), 'ABC123');
    await user.click(within(screen.getByTestId('check-in-form')).getByRole('button', { name: 'Check in' }));

    const result = await screen.findByTestId('check-in-result');
    expect(result).not.toHaveTextContent('Checked in at');
  });
});
