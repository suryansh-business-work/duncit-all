import type { MockedResponse } from '@apollo/client/testing';
import { createTranslator } from '@duncit/i18n';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WEB_FALLBACK } from '../../../../../../shared/i18n';
import { LITE_ADD_CO_HOST } from '../../../../../graphql/manage';
import { CoHostForm, makeCoHostSchema } from '../../../../../pages/manage/settings/co-host-form';
import { captureNotifications, hostFixture, renderWithProviders } from '../../../../test-utils';
import { apiRefusal, hostedEvent } from '../../manage-mocks';

const { t } = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK });

const addMock = (email: string, result: MockedResponse['result']): MockedResponse => ({ request: { query: LITE_ADD_CO_HOST, variables: { event_id: 'ev-1', email } }, result });

describe('makeCoHostSchema', () => {
  const schema = makeCoHostSchema(t);

  it('lower-cases and trims the email', () => {
    expect(schema.parse({ email: '  Kabir@Example.COM ' })).toEqual({ email: 'kabir@example.com' });
  });

  it('needs an email and refuses one that is not an address', () => {
    expect(schema.safeParse({ email: '' }).error?.issues[0]?.message).toBe('This is required');
    expect(schema.safeParse({ email: 'kabir@' }).error?.issues[0]?.message).toBe('Enter a valid email address');
  });
});

describe('CoHostForm', () => {
  let toasts: ReturnType<typeof captureNotifications>;

  beforeEach(() => {
    toasts = captureNotifications();
  });

  afterEach(() => {
    toasts.stop();
  });

  it('refuses an invalid email before the round trip', async () => {
    const onAdded = vi.fn();
    const { user } = renderWithProviders(<CoHostForm eventId="ev-1" onAdded={onAdded} />);

    const field = screen.getByRole('textbox', { name: 'Co-host email' });
    expect(field).toHaveAccessibleDescription('They must have signed in to Duncit Lite once');
    await user.type(field, 'kabir');
    await user.click(screen.getByRole('button', { name: 'Add co-host' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(onAdded).not.toHaveBeenCalled();
  });

  it('adds the co-host, says so and clears the box', async () => {
    const onAdded = vi.fn();
    const answer = hostedEvent({ hosts: [hostFixture(), hostFixture({ user_id: 'u-9', name: 'Kabir Das', handle: 'kabir', role: 'CO_HOST' })] });
    const { user } = renderWithProviders(<CoHostForm eventId="ev-1" onAdded={onAdded} />, { mocks: [addMock('kabir@example.com', { data: { liteAddCoHost: answer } })] });

    const field = screen.getByRole('textbox', { name: 'Co-host email' });
    await user.type(field, 'Kabir@Example.com');
    await user.click(screen.getByRole('button', { name: 'Add co-host' }));

    await vi.waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
    expect(toasts.seen).toEqual([{ message: 'Co-host added.', severity: 'success' }]);
    expect(field).toHaveValue('');
  });

  it('keeps the email and shows the refusal when the API says no', async () => {
    const onAdded = vi.fn();
    const { user } = renderWithProviders(<CoHostForm eventId="ev-1" onAdded={onAdded} />, {
      mocks: [addMock('nobody@example.com', apiRefusal('No Duncit Lite account uses that email'))],
    });

    const field = screen.getByRole('textbox', { name: 'Co-host email' });
    await user.type(field, 'nobody@example.com');
    await user.click(screen.getByRole('button', { name: 'Add co-host' }));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'No Duncit Lite account uses that email', severity: 'error' }]));
    expect(field).toHaveValue('nobody@example.com');
    expect(onAdded).not.toHaveBeenCalled();
  });
});
