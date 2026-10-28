import type { MockedResponse } from '@apollo/client/testing';
import { createTranslator } from '@duncit/i18n';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WEB_FALLBACK } from '../../../../../shared/i18n';
import { LITE_HOST_CHECK_IN_BY_CODE } from '../../../../graphql/manage';
import { CheckInForm, makeCheckInSchema } from '../../../../pages/manage/check-in';
import { registrationFixture, renderWithProviders } from '../../../test-utils';
import { apiRefusal } from '../manage-mocks';

const { t } = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK });

const checkInMock = (code: string, answer: MockedResponse['result']): MockedResponse => ({
  request: { query: LITE_HOST_CHECK_IN_BY_CODE, variables: { event_id: 'ev-1', code } },
  result: answer,
});

describe('makeCheckInSchema', () => {
  const schema = makeCheckInSchema(t);

  it('needs a code', () => {
    const result = schema.safeParse({ code: '   ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('This is required');
  });

  it('refuses a code longer than 20 characters', () => {
    const result = schema.safeParse({ code: 'A'.repeat(21) });
    expect(result.error?.issues[0]?.message).toBe('Keep this to 20 characters or fewer');
  });

  it('accepts a trimmed code', () => {
    expect(schema.parse({ code: '  abc123 ' })).toEqual({ code: 'abc123' });
  });
});

describe('CheckInForm', () => {
  it('asks for the code before calling the API', async () => {
    const onCheckedIn = vi.fn();
    const { user } = renderWithProviders(<CheckInForm eventId="ev-1" onCheckedIn={onCheckedIn} />);

    await user.click(screen.getByRole('button', { name: 'Check in' }));

    const field = screen.getByRole('textbox', { name: 'Check-in code' });
    expect(await screen.findByText('This is required')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(onCheckedIn).not.toHaveBeenCalled();
  });

  it('sends the code in capitals, reports the guest and clears the box for the next one', async () => {
    const onCheckedIn = vi.fn();
    const guest = registrationFixture({ checked_in_at: '2026-11-21T14:00:00.000Z' });
    const { user } = renderWithProviders(<CheckInForm eventId="ev-1" onCheckedIn={onCheckedIn} />, {
      mocks: [checkInMock('ABC123', { data: { liteHostCheckInByCode: guest } })],
    });

    const field = screen.getByRole('textbox', { name: 'Check-in code' });
    await user.type(field, 'abc123');
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    await vi.waitFor(() => expect(onCheckedIn).toHaveBeenCalledTimes(1));
    expect(onCheckedIn.mock.calls[0][0]).toMatchObject({ id: 'reg-1', code: 'ABC123' });
    // The form clears after it reports the guest, in a later render: wait for that render, not just the callback.
    await vi.waitFor(() => expect(field).toHaveValue(''));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says why a code was refused and keeps what was typed', async () => {
    const onCheckedIn = vi.fn();
    const { user } = renderWithProviders(<CheckInForm eventId="ev-1" onCheckedIn={onCheckedIn} />, {
      mocks: [checkInMock('ZZZ999', apiRefusal('That ticket was cancelled'))],
    });

    const field = screen.getByRole('textbox', { name: 'Check-in code' });
    await user.type(field, 'zzz999');
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That ticket was cancelled');
    expect(field).toHaveValue('zzz999');
    expect(onCheckedIn).not.toHaveBeenCalled();
  });

  it('falls back to its own message when the API gives none', async () => {
    const { user } = renderWithProviders(<CheckInForm eventId="ev-1" onCheckedIn={vi.fn()} />, {
      mocks: [{ request: { query: LITE_HOST_CHECK_IN_BY_CODE, variables: { event_id: 'ev-1', code: 'NOPE01' } }, error: new Error('') }],
    });

    await user.type(screen.getByRole('textbox', { name: 'Check-in code' }), 'nope01');
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No confirmed guest has that code.');
  });
});
