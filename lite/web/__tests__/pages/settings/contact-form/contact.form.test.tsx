import type { MockedResponse } from '@apollo/client/testing';
import { createTranslator } from '@duncit/i18n';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WEB_FALLBACK } from '../../../../../shared/i18n';
import { LITE_REQUEST_CONTACT_CODE, LITE_VERIFY_CONTACT, type LiteContactKind } from '../../../../graphql/profile';
import { ContactForm, makeContactCodeSchema, makeContactValueSchema } from '../../../../pages/settings/contact-form';
import { captureNotifications, meFixture, renderWithProviders, typed } from '../../../test-utils';

const { t } = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK });
const me = meFixture();

const requestMock = (kind: LiteContactKind, value: string, result: MockedResponse['result']): MockedResponse => ({
  request: { query: LITE_REQUEST_CONTACT_CODE, variables: { kind, value } },
  result,
});
const codeSent = (testCode: string | null) => ({
  data: { liteRequestContactCode: typed('LiteSignInRequest', { ok: true, via: 'LITE', expires_in_minutes: 10, resend_after_seconds: 30, test_code: testCode }) },
});
const verifyMock = (kind: LiteContactKind, value: string, code: string, result: MockedResponse['result']): MockedResponse => ({
  request: { query: LITE_VERIFY_CONTACT, variables: { kind, value, code } },
  result,
});

describe('contact schemas', () => {
  it('reads an email in lower case and refuses one that is not an address', () => {
    const schema = makeContactValueSchema(t, 'EMAIL');
    expect(schema.parse({ value: ' New@Example.COM ' })).toEqual({ value: 'new@example.com' });
    expect(schema.safeParse({ value: 'new@example' }).error?.issues[0]?.message).toBe('Enter a valid email address');
  });

  it('takes a phone with or without its country code, spaces and dashes allowed', () => {
    const schema = makeContactValueSchema(t, 'PHONE');
    expect(schema.safeParse({ value: '98765 43210' }).success).toBe(true);
    expect(schema.safeParse({ value: '+91 98765-43210' }).success).toBe(true);
    expect(schema.safeParse({ value: '(022) 2345 6789' }).success).toBe(true);
  });

  it('refuses a phone that is too short or has letters', () => {
    const schema = makeContactValueSchema(t, 'PHONE');
    expect(schema.safeParse({ value: '1234567' }).error?.issues[0]?.message).toBe('Enter a valid phone number');
    expect(schema.safeParse({ value: '98765abcde' }).error?.issues[0]?.message).toBe('Enter a valid phone number');
  });

  it('needs exactly six digits for the code', () => {
    const schema = makeContactCodeSchema(t);
    expect(schema.parse({ code: ' 123456 ' })).toEqual({ code: '123456' });
    expect(schema.safeParse({ code: '12345' }).error?.issues[0]?.message).toBe('Enter the 6-digit code');
    expect(schema.safeParse({ code: '12345a' }).success).toBe(false);
  });
});

describe('ContactForm', () => {
  let toasts: ReturnType<typeof captureNotifications>;

  beforeEach(() => {
    toasts = captureNotifications();
  });

  afterEach(() => {
    toasts.stop();
  });

  const renderForm = (kind: LiteContactKind, mocks: MockedResponse[] = [], onClose = vi.fn()) => ({
    ...renderWithProviders(<ContactForm kind={kind} open onClose={onClose} />, { me, mocks }),
    onClose,
  });

  const sendTo = async (user: ReturnType<typeof renderWithProviders>['user'], label: string, value: string) => {
    await user.type(screen.getByRole('textbox', { name: label }), value);
    await user.click(screen.getByRole('button', { name: 'Send code' }));
  };

  it('is a dialog named for what is being changed', () => {
    renderForm('EMAIL');

    expect(screen.getByRole('dialog', { name: 'Email address' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('autocomplete', 'email');
  });

  it('refuses an invalid email before sending a code', async () => {
    const { user } = renderForm('EMAIL');

    await sendTo(user, 'Email', 'not-an-email');

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByTestId('contact-value-form')).toBeInTheDocument();
  });

  it('sends a code to the new email and asks for it, showing a test code when there is no mailbox', async () => {
    const { user } = renderForm('EMAIL', [requestMock('EMAIL', 'new@example.com', codeSent('123456'))]);

    await sendTo(user, 'Email', 'New@Example.com');

    const form = await screen.findByTestId('contact-code-form');
    expect(within(form).getByText('We sent a code to new@example.com.')).toBeInTheDocument();
    expect(within(form).getByText('No mailbox is configured yet, so use this code: 123456')).toBeInTheDocument();
    expect(within(form).getByRole('textbox', { name: '6-digit code' })).toHaveAttribute('autocomplete', 'one-time-code');
  });

  it('shows no test code when a real message went out', async () => {
    const { user } = renderForm('EMAIL', [requestMock('EMAIL', 'new@example.com', codeSent(null))]);

    await sendTo(user, 'Email', 'new@example.com');

    await screen.findByTestId('contact-code-form');
    expect(screen.queryByText(/use this code/)).not.toBeInTheDocument();
  });

  it('stays on the first step and announces why a code could not be sent', async () => {
    const { user } = renderForm('EMAIL', [requestMock('EMAIL', 'taken@example.com', { errors: [{ message: 'That email belongs to another account' }] })]);

    await sendTo(user, 'Email', 'taken@example.com');

    const problem = await screen.findByText('That email belongs to another account');
    expect(problem.closest('[aria-live="assertive"]')).not.toBeNull();
    expect(screen.getByTestId('contact-value-form')).toBeInTheDocument();
  });

  it('checks the code shape before verifying', async () => {
    const { user } = renderForm('EMAIL', [requestMock('EMAIL', 'new@example.com', codeSent(null))]);
    await sendTo(user, 'Email', 'new@example.com');

    await user.type(await screen.findByRole('textbox', { name: '6-digit code' }), '12');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('Enter the 6-digit code')).toBeInTheDocument();
  });

  it('verifies the code, refreshes the account, says so and closes', async () => {
    const { user, onClose } = renderForm('EMAIL', [
      requestMock('EMAIL', 'new@example.com', codeSent('123456')),
      verifyMock('EMAIL', 'new@example.com', '123456', { data: { liteVerifyContact: meFixture({ email: 'new@example.com' }) } }),
    ]);
    await sendTo(user, 'Email', 'new@example.com');

    await user.type(await screen.findByRole('textbox', { name: '6-digit code' }), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(toasts.seen).toEqual([{ message: 'Saved to your account.', severity: 'success' }]);
  });

  it('keeps the code step open and says why a wrong code was refused', async () => {
    const { user, onClose } = renderForm('EMAIL', [
      requestMock('EMAIL', 'new@example.com', codeSent(null)),
      verifyMock('EMAIL', 'new@example.com', '000000', { errors: [{ message: 'That code is not right' }] }),
    ]);
    await sendTo(user, 'Email', 'new@example.com');

    await user.type(await screen.findByRole('textbox', { name: '6-digit code' }), '000000');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('That code is not right')).toBeInTheDocument();
    expect(screen.getByTestId('contact-code-form')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(toasts.seen).toEqual([]);
  });

  it('takes a phone number for the phone kind and sends the code to it', async () => {
    const { user } = renderForm('PHONE', [requestMock('PHONE', '98765 43210', codeSent(null))]);

    expect(screen.getByRole('dialog', { name: 'Phone number' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveAttribute('inputmode', 'tel');

    await sendTo(user, 'Phone number', '98765 43210');

    expect(await screen.findByText('We sent a code to 98765 43210.')).toBeInTheDocument();
  });

  it('refuses a malformed phone number', async () => {
    const { user } = renderForm('PHONE');

    await sendTo(user, 'Phone number', '12345');

    expect(await screen.findByText('Enter a valid phone number')).toBeInTheDocument();
  });

  it('starts over when the dialog is dismissed mid-way', async () => {
    const { user, onClose } = renderForm('EMAIL', [requestMock('EMAIL', 'new@example.com', codeSent('123456'))]);
    await sendTo(user, 'Email', 'new@example.com');
    await screen.findByTestId('contact-code-form');

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('contact-value-form')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('');
  });
});
