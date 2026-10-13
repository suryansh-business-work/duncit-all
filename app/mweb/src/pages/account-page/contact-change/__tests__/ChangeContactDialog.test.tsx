import { describe, expect, it, vi } from 'vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';

import ChangeContactDialog from '../ChangeContactDialog';
import {
  CONFIRM_EMAIL_CHANGE,
  REQUEST_EMAIL_CHANGE_OTP,
  REQUEST_PHONE_CHANGE_OTP,
  SET_CONTACT_PHONE_NUMBER,
} from '../queries';
import { flagLink } from './kit';
import { fallbackT } from '../../../../i18n/fallback';

// The as-you-type availability ask is its own hook with its own debounce; here
// the number is simply free, so the dialog's own behaviour is what is measured.
vi.mock('../../../../forms/register/useSignupContactCheck', () => ({
  useSignupPhoneCheck: () => 'IDLE',
}));

const snapshot = {
  email: 'old.person@example.test',
  phone_extension: '+91',
  phone_number: '9000000001',
  whatsapp_extension: '+91',
  whatsapp_number: '9000000003',
};

function renderDialog(
  channel: 'EMAIL' | 'PHONE' | 'WHATSAPP' | null,
  mocks: MockedResponse[],
  phoneOtp = false,
) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  // The flag query is matched by operation name so the test need not import the
  // hook's private document.
  const link = flagLink(phoneOtp, mocks);
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} link={link}>
      <ChangeContactDialog channel={channel} snapshot={snapshot} onClose={onClose} onSaved={onSaved} />
    </MockedProvider>,
  );
  return { onClose, onSaved };
}

// The last textbox of the step: the number (after the country code) or the only box.
const box = () => {
  const boxes = screen.getAllByRole('textbox');
  return boxes[boxes.length - 1] as HTMLInputElement;
};
const typeInto = (value: string) => fireEvent.change(box(), { target: { value } });

describe('ChangeContactDialog', () => {
  it('renders nothing while no channel is being changed', async () => {
    renderDialog(null, []);
    await act(async () => {});
    expect(screen.queryByTestId('change-contact-sheet')).not.toBeInTheDocument();
  });

  it('proves a new email with a code: send, show where it went, verify, then report it verified', async () => {
    const { onSaved, onClose } = renderDialog('EMAIL', [
      {
        request: { query: REQUEST_EMAIL_CHANGE_OTP, variables: { email: 'new.person@example.test' } },
        result: { data: { requestEmailChangeOtp: { ok: true, dev_otp: '654321' } } },
      },
      {
        request: { query: CONFIRM_EMAIL_CHANGE, variables: { email: 'new.person@example.test', otp: '654321' } },
        result: { data: { confirmEmailChange: { user_id: 'u1', email: 'new.person@example.test', is_email_verified: true } } },
      },
    ]);

    typeInto('new.person@example.test');
    await waitFor(() => expect(screen.getByTestId('contact-change-send')).toBeEnabled());
    fireEvent.click(screen.getByTestId('contact-change-send'));

    expect(await screen.findByTestId('contact-otp-step')).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.contactChange.codeSentTo', { vars: { destination: 'new.person@example.test' } }))).toBeInTheDocument();
    expect(screen.getByTestId('contact-change-test-code')).toHaveTextContent('654321');

    typeInto('654321');
    await waitFor(() => expect(screen.getByTestId('contact-change-verify')).toBeEnabled());
    fireEvent.click(screen.getByTestId('contact-change-verify'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledWith(
      'EMAIL',
      expect.objectContaining({ email: 'new.person@example.test' }),
      true,
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('refuses an unchanged email before the server is asked', async () => {
    const { onSaved } = renderDialog('EMAIL', []);
    await waitFor(() => expect(screen.getByTestId('contact-change-send')).toBeEnabled());
    fireEvent.click(screen.getByTestId('contact-change-send'));
    expect(await screen.findByTestId('contact-change-error')).toHaveTextContent(
      fallbackT('mweb.contactChange.unchanged'),
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows the server refusal and stays on step one when the address is taken', async () => {
    renderDialog('EMAIL', [
      {
        request: { query: REQUEST_EMAIL_CHANGE_OTP, variables: { email: 'taken@example.test' } },
        result: { errors: [new GraphQLError('That email is already in use')] },
      },
    ]);
    typeInto('taken@example.test');
    await waitFor(() => expect(screen.getByTestId('contact-change-send')).toBeEnabled());
    fireEvent.click(screen.getByTestId('contact-change-send'));
    expect(await screen.findByTestId('contact-change-error')).toHaveTextContent('already in use');
    expect(screen.getByTestId('contact-value-step')).toBeInTheDocument();
    // Resending the very value that was refused stays shut until it is edited.
    expect(screen.getByTestId('contact-change-send')).toBeDisabled();
  });

  it('goes back from the code box to fix the value, without keeping the code already sent', async () => {
    renderDialog('WHATSAPP', [
      {
        request: {
          query: REQUEST_PHONE_CHANGE_OTP,
          variables: { field: 'WHATSAPP', ext: '+91', num: '9000000009' },
        },
        result: {
          data: { requestContactPhoneChangeOtp: { challenge_id: 'c', resend_after_seconds: 30, test_code: '111222' } },
        },
      },
    ]);
    typeInto('9000000009');
    await waitFor(() => expect(screen.getByTestId('contact-change-send')).toBeEnabled());
    fireEvent.click(screen.getByTestId('contact-change-send'));
    expect(await screen.findByTestId('contact-change-test-code')).toHaveTextContent('111222');

    fireEvent.click(screen.getByTestId('contact-change-edit'));
    expect(await screen.findByTestId('contact-value-step')).toBeInTheDocument();
    expect(screen.queryByTestId('contact-change-test-code')).not.toBeInTheDocument();
    // The number they typed is still in the box, ready to be corrected.
    expect(box()).toHaveValue('9000000009');
  });

  it('stores the contact number straight away while the SMS-code flag is off', async () => {
    const { onSaved, onClose } = renderDialog('PHONE', [
      {
        request: { query: SET_CONTACT_PHONE_NUMBER, variables: { ext: '+91', num: '9000000007' } },
        result: {
          data: {
            setContactPhoneNumber: {
              user_id: 'u1',
              phone_number: '9000000007',
              phone_extension: '+91',
              is_phone_verified: false,
            },
          },
        },
      },
    ]);
    expect(screen.queryByTestId('change-contact-hint')).not.toBeInTheDocument();
    typeInto('9000000007');
    await waitFor(() => expect(screen.getByTestId('contact-change-send')).toBeEnabled());
    expect(screen.getByTestId('contact-change-send')).toHaveTextContent(fallbackT('mweb.contactChange.saveNumber'));
    fireEvent.click(screen.getByTestId('contact-change-send'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledWith(
      'PHONE',
      expect.objectContaining({ number: '9000000007' }),
      false,
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('asks for a code on the contact number once the flag is on', async () => {
    renderDialog(
      'PHONE',
      [
        {
          request: {
            query: REQUEST_PHONE_CHANGE_OTP,
            variables: { field: 'PHONE', ext: '+91', num: '9000000008' },
          },
          result: {
            data: { requestContactPhoneChangeOtp: { challenge_id: 'c', resend_after_seconds: 30, test_code: null } },
          },
        },
      ],
      true,
    );
    expect(await screen.findByTestId('change-contact-hint')).toBeInTheDocument();
    typeInto('9000000008');
    await waitFor(() => expect(screen.getByTestId('contact-change-send')).toBeEnabled());
    expect(screen.getByTestId('contact-change-send')).toHaveTextContent(fallbackT('mweb.contactChange.sendCode'));
    fireEvent.click(screen.getByTestId('contact-change-send'));
    expect(await screen.findByTestId('contact-otp-step')).toBeInTheDocument();
    expect(screen.queryByTestId('contact-change-test-code')).not.toBeInTheDocument();
  });
});
