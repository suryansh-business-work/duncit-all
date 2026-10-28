import { screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import { LITE_REQUEST_SIGN_IN_CODE } from '../../../../../shared/graphql/documents';
import { ContactStep } from '../../../../components/auth/sign-in/ContactStep';
import { renderWithProviders } from '../../../test-utils';
import { emailRequestMock, phoneRequestMock, refusedMock } from './sign-in-mocks';

const renderStep = (options: { phoneSignIn?: boolean; mocks?: MockedResponse[] } = {}) => {
  const onSent = vi.fn();
  const view = renderWithProviders(<ContactStep onSent={onSent} />, {
    settings: { phone_sign_in: options.phoneSignIn ?? false, default_country_code: '91' },
    mocks: options.mocks ?? [],
  });
  return { ...view, onSent };
};

describe('ContactStep', () => {
  it('asks for an email, with no phone switch while phone sign-in is off', () => {
    renderStep();
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription('A code is sent to this address');
    expect(screen.getByRole('button', { name: 'Continue with email' })).toBeInTheDocument();
    expect(screen.queryByTestId('sign-in-switch')).not.toBeInTheDocument();
  });

  it('switches to a phone number and back when phone sign-in is on', async () => {
    const { user } = renderStep({ phoneSignIn: true });
    await user.click(screen.getByRole('button', { name: 'Use phone number' }));

    const phone = screen.getByRole('textbox', { name: 'Phone number' });
    expect(phone).toHaveAttribute('type', 'tel');
    expect(phone).toHaveAccessibleDescription('We text a code to this number. Without a country code, +91 is added');
    expect(screen.getByRole('button', { name: 'Continue with phone' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use email' }));
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('');
  });

  it('refuses a malformed email before any request', async () => {
    const request = emailRequestMock('asha');
    const { user, onSent } = renderStep({ mocks: [request.mock] });
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'asha');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'true');
    expect(request.result).not.toHaveBeenCalled();
    expect(onSent).not.toHaveBeenCalled();
  });

  it('sends the code to the normalised address and hands the answer to the next step', async () => {
    const request = emailRequestMock('asha@example.com', { via: 'LITE', expires_in_minutes: 10, resend_after_seconds: 45, test_code: '111111' });
    const { user, onSent } = renderStep({ mocks: [request.mock] });
    await user.type(screen.getByRole('textbox', { name: 'Email' }), '  Asha@Example.com ');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));

    await waitFor(() =>
      expect(onSent).toHaveBeenCalledWith({ channel: 'EMAIL', contact: 'asha@example.com', via: 'LITE', minutes: 10, resendAfter: 45, testCode: '111111' }),
    );
    expect(request.result).toHaveBeenCalledTimes(1);
  });

  it('sends an SMS code through the phone mutation', async () => {
    const email = emailRequestMock('+91 98765 43210');
    const phone = phoneRequestMock('+91 98765 43210', { resend_after_seconds: 30 });
    const { user, onSent } = renderStep({ phoneSignIn: true, mocks: [email.mock, phone.mock] });
    await user.click(screen.getByRole('button', { name: 'Use phone number' }));
    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '+91 98765 43210');
    await user.click(screen.getByRole('button', { name: 'Continue with phone' }));

    await waitFor(() => expect(onSent).toHaveBeenCalledWith(expect.objectContaining({ channel: 'PHONE', contact: '+91 98765 43210', via: 'SMS', resendAfter: 30 })));
    expect(email.result).not.toHaveBeenCalled();
  });

  it('says the code could not be sent when the API answers not ok', async () => {
    const request = emailRequestMock('asha@example.com', { ok: false });
    const { user, onSent } = renderStep({ mocks: [request.mock] });
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not send a code to that address.');
    expect(onSent).not.toHaveBeenCalled();
  });

  it('shows the API’s own reason when it refuses', async () => {
    const { user, onSent } = renderStep({ mocks: [refusedMock(LITE_REQUEST_SIGN_IN_CODE, { email: 'asha@example.com' }, 'Too many codes, wait a minute')] });
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many codes, wait a minute');
    expect(onSent).not.toHaveBeenCalled();
  });
});
