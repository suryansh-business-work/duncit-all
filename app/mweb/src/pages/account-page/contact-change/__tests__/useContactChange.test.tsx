import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { emailDraft, phoneDraft, refusal, wrap } from './kit';

import { useContactChange } from '../useContactChange';
import {
  CONFIRM_EMAIL_CHANGE,
  CONFIRM_PHONE_CHANGE,
  REQUEST_EMAIL_CHANGE_OTP,
  REQUEST_PHONE_CHANGE_OTP,
  SET_CONTACT_PHONE_NUMBER,
} from '../queries';

describe('useContactChange', () => {
  it('sends an email code, remembers where it went and the dev code, then saves on verify', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useContactChange('EMAIL', onSaved), {
      wrapper: wrap([
        {
          request: { query: REQUEST_EMAIL_CHANGE_OTP, variables: { email: emailDraft.email } },
          result: { data: { requestEmailChangeOtp: { ok: true, dev_otp: '424242' } } },
        },
        {
          request: { query: CONFIRM_EMAIL_CHANGE, variables: { email: emailDraft.email, otp: '424242' } },
          result: { data: { confirmEmailChange: { user_id: 'u1', email: emailDraft.email, is_email_verified: true } } },
        },
      ]),
    });
    expect(result.current.state.step).toBe('ENTER');

    await act(async () => {
      await result.current.sendCode(emailDraft);
    });
    expect(result.current.state).toMatchObject({
      step: 'CODE',
      sentTo: emailDraft.email,
      testCode: '424242',
      sending: false,
      error: null,
    });

    await act(async () => {
      await result.current.verify(emailDraft, '424242');
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(result.current.state.step).toBe('ENTER');
    expect(result.current.state.testCode).toBeNull();
  });

  it('sends a WhatsApp code for the typed number and confirms it with the field name', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useContactChange('WHATSAPP', onSaved), {
      wrapper: wrap([
        {
          request: {
            query: REQUEST_PHONE_CHANGE_OTP,
            variables: { field: 'WHATSAPP', ext: '+91', num: phoneDraft.number },
          },
          result: {
            data: { requestContactPhoneChangeOtp: { challenge_id: 'c1', resend_after_seconds: 30, test_code: null } },
          },
        },
        {
          request: {
            query: CONFIRM_PHONE_CHANGE,
            variables: { field: 'WHATSAPP', ext: '+91', num: phoneDraft.number, otp: '123456' },
          },
          result: {
            data: {
              confirmContactPhoneChange: {
                user_id: 'u1',
                phone_number: null,
                phone_extension: null,
                is_phone_verified: false,
                whatsapp_number: phoneDraft.number,
                whatsapp_extension: '+91',
              },
            },
          },
        },
      ]),
    });

    await act(async () => {
      await result.current.sendCode(phoneDraft);
    });
    expect(result.current.state.step).toBe('CODE');
    expect(result.current.state.sentTo).toBe('+91 9000000001');
    expect(result.current.state.testCode).toBeNull();

    await act(async () => {
      await result.current.verify(phoneDraft, '123456');
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('keeps the person on step one with the server refusal when the code cannot be sent', async () => {
    const { result } = renderHook(() => useContactChange('EMAIL', vi.fn()), {
      wrapper: wrap([
        {
          request: { query: REQUEST_EMAIL_CHANGE_OTP, variables: { email: emailDraft.email } },
          result: refusal('That address already belongs to another account'),
        },
      ]),
    });
    await act(async () => {
      await result.current.sendCode(emailDraft);
    });
    expect(result.current.state.step).toBe('ENTER');
    expect(result.current.state.sending).toBe(false);
    expect(result.current.state.error).toContain('already belongs to another account');
  });

  it('shows the refusal and does not save when the code is wrong or expired', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useContactChange('PHONE', onSaved), {
      wrapper: wrap([
        {
          request: {
            query: CONFIRM_PHONE_CHANGE,
            variables: { field: 'PHONE', ext: '+91', num: phoneDraft.number, otp: '000000' },
          },
          result: refusal('The code is wrong or has expired'),
        },
      ]),
    });
    await act(async () => {
      await result.current.verify(phoneDraft, '000000');
    });
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.state.verifying).toBe(false);
    expect(result.current.state.error).toContain('wrong or has expired');
  });

  it('stores the contact number without a code and reports whether it landed', async () => {
    const { result } = renderHook(() => useContactChange('PHONE', vi.fn()), {
      wrapper: wrap([
        {
          request: { query: SET_CONTACT_PHONE_NUMBER, variables: { ext: '+91', num: phoneDraft.number } },
          result: {
            data: {
              setContactPhoneNumber: {
                user_id: 'u1',
                phone_number: phoneDraft.number,
                phone_extension: '+91',
                is_phone_verified: false,
              },
            },
          },
        },
        {
          request: { query: SET_CONTACT_PHONE_NUMBER, variables: { ext: '+91', num: '9000000002' } },
          result: refusal('Number is in use'),
        },
      ]),
    });
    let ok = false;
    await act(async () => {
      ok = await result.current.saveWithoutCode(phoneDraft);
    });
    expect(ok).toBe(true);
    expect(result.current.state.error).toBeNull();

    await act(async () => {
      ok = await result.current.saveWithoutCode({ ...phoneDraft, number: '9000000002' });
    });
    expect(ok).toBe(false);
    await waitFor(() => expect(result.current.state.error).toContain('Number is in use'));
  });

  it('forgets the sent code when going back to edit, and drops a refusal on the next edit', async () => {
    const { result } = renderHook(() => useContactChange('EMAIL', vi.fn()), {
      wrapper: wrap([
        {
          request: { query: REQUEST_EMAIL_CHANGE_OTP, variables: { email: emailDraft.email } },
          result: { data: { requestEmailChangeOtp: { ok: true, dev_otp: '111111' } } },
        },
      ]),
    });
    await act(async () => {
      await result.current.sendCode(emailDraft);
    });
    act(() => result.current.setError('Something is off'));
    expect(result.current.state.error).toBe('Something is off');

    act(() => result.current.editValue());
    expect(result.current.state).toMatchObject({ step: 'ENTER', testCode: null, error: null });

    act(() => result.current.setError('Refused value'));
    act(() => result.current.noteEdit());
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.edited).toBe(true);

    act(() => result.current.reset());
    expect(result.current.state.edited).toBe(false);
    expect(result.current.state.sentTo).toBe('');
  });
});
