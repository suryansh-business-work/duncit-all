import type { MockedResponse } from '@apollo/client/testing';
import { createTranslator } from '@duncit/i18n';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WEB_FALLBACK } from '../../../../../shared/i18n';
import { LITE_UPDATE_PROFILE } from '../../../../graphql/profile';
import { PaymentForm, makePaymentSchema, paymentDefaults } from '../../../../pages/settings/payment-form';
import { captureNotifications, meFixture, renderWithProviders } from '../../../test-utils';

const { t } = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK });
const UPI_RULE = 'Enter a valid UPI ID, like name@bank';

const saveMock = (input: { upi_id: string; upi_name: string }, result: MockedResponse['result']): MockedResponse => ({ request: { query: LITE_UPDATE_PROFILE, variables: { input } }, result });

describe('payment schema', () => {
  const schema = makePaymentSchema(t);

  it('starts blank for an account with no UPI details, and from the account otherwise', () => {
    expect(paymentDefaults(meFixture())).toEqual({ upi_id: '', upi_name: '' });
    expect(paymentDefaults(meFixture({ upi_id: 'asha@okaxis', upi_name: 'Asha Rao' }))).toEqual({ upi_id: 'asha@okaxis', upi_name: 'Asha Rao' });
  });

  it('lets both boxes stay blank', () => {
    expect(schema.parse({ upi_id: '  ', upi_name: '' })).toEqual({ upi_id: '', upi_name: '' });
  });

  it('reads a UPI ID in lower case', () => {
    expect(schema.parse({ upi_id: ' Asha@OKAXIS ', upi_name: 'Asha Rao' })).toEqual({ upi_id: 'asha@okaxis', upi_name: 'Asha Rao' });
  });

  it.each(['asha', 'asha@', '@okaxis', 'asha@ok', 'asha@1bank'])('refuses %s as a UPI ID', (upi) => {
    expect(schema.safeParse({ upi_id: upi, upi_name: '' }).error?.issues[0]?.message).toBe(UPI_RULE);
  });

  it('keeps the payee name to 80 characters', () => {
    expect(schema.safeParse({ upi_id: '', upi_name: 'n'.repeat(81) }).error?.issues[0]?.message).toBe('Keep this to 80 characters or fewer');
  });
});

describe('PaymentForm', () => {
  let toasts: ReturnType<typeof captureNotifications>;

  beforeEach(() => {
    toasts = captureNotifications();
  });

  afterEach(() => {
    toasts.stop();
  });

  it('explains what the details are for and fills them in', () => {
    const me = meFixture({ upi_id: 'asha@okaxis', upi_name: 'Asha Rao' });
    renderWithProviders(<PaymentForm me={me} />, { me });

    expect(screen.getByText('Guests pay you here for paid tickets. New paid events start with these details.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'UPI ID' })).toHaveValue('asha@okaxis');
    expect(screen.getByRole('textbox', { name: 'UPI ID' })).toHaveAccessibleDescription('Like name@bank');
    expect(screen.getByRole('textbox', { name: 'Payee name' })).toHaveValue('Asha Rao');
  });

  it('refuses a malformed UPI ID before saving', async () => {
    const me = meFixture();
    const { user } = renderWithProviders(<PaymentForm me={me} />, { me });

    await user.type(screen.getByRole('textbox', { name: 'UPI ID' }), 'asha-at-bank');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText(UPI_RULE)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'UPI ID' })).toHaveAttribute('aria-invalid', 'true');
    expect(toasts.seen).toEqual([]);
  });

  it('saves the details in the form the API keeps, then shows what was saved', async () => {
    const me = meFixture();
    const saved = meFixture({ upi_id: 'asha@okaxis', upi_name: 'Asha Rao' });
    const { user } = renderWithProviders(<PaymentForm me={me} />, {
      me,
      mocks: [saveMock({ upi_id: 'asha@okaxis', upi_name: 'Asha Rao' }, { data: { liteUpdateProfile: saved } })],
    });

    await user.type(screen.getByRole('textbox', { name: 'UPI ID' }), 'Asha@OKAXIS');
    await user.type(screen.getByRole('textbox', { name: 'Payee name' }), 'Asha Rao');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'Profile saved.', severity: 'success' }]));
    expect(screen.getByRole('textbox', { name: 'UPI ID' })).toHaveValue('asha@okaxis');
  });

  it('keeps the typed details and shows the refusal when saving fails', async () => {
    const me = meFixture();
    const { user } = renderWithProviders(<PaymentForm me={me} />, {
      me,
      mocks: [saveMock({ upi_id: 'asha@okaxis', upi_name: '' }, { errors: [{ message: 'Your account is blocked' }] })],
    });

    await user.type(screen.getByRole('textbox', { name: 'UPI ID' }), 'asha@okaxis');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'Your account is blocked', severity: 'error' }]));
    expect(screen.getByRole('textbox', { name: 'UPI ID' })).toHaveValue('asha@okaxis');
  });
});
