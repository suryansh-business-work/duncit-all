import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  contactDraftValue,
  isPhoneChannel,
  parseApiError,
  type ContactChangeStep,
  type ContactChannel,
  type ContactDraft,
} from '@duncit/utils';
import {
  CONFIRM_EMAIL_CHANGE,
  CONFIRM_PHONE_CHANGE,
  REQUEST_EMAIL_CHANGE_OTP,
  REQUEST_PHONE_CHANGE_OTP,
} from './queries';

/** What the dialog needs to render, however the change is going. */
export interface ContactChangeState {
  step: ContactChangeStep;
  /** The value the live code was sent to, for the "we sent a code to …" line. */
  sentTo: string;
  /** Echoed back only while no SMS/WhatsApp transport is wired. */
  testCode: string | null;
  error: string | null;
  sending: boolean;
  verifying: boolean;
}

const INITIAL: ContactChangeState = {
  step: 'ENTER',
  sentTo: '',
  testCode: null,
  error: null,
  sending: false,
  verifying: false,
};

/**
 * The two-step contact change, as one hook both the dialog and its tests drive.
 *
 * The step is held here rather than derived from "do we have a challenge",
 * because the person can walk back from the code box to fix a typo in the
 * number — and the code already sent to the wrong number must not then be the
 * one the next screen accepts. Going back forgets it.
 */
export function useContactChange(channel: ContactChannel, onSaved: () => void) {
  const [state, setState] = useState<ContactChangeState>(INITIAL);
  const [requestPhone] = useMutation(REQUEST_PHONE_CHANGE_OTP);
  const [confirmPhone] = useMutation(CONFIRM_PHONE_CHANGE);
  const [requestEmail] = useMutation(REQUEST_EMAIL_CHANGE_OTP);
  const [confirmEmail] = useMutation(CONFIRM_EMAIL_CHANGE);

  const reset = useCallback(() => setState(INITIAL), []);

  const setError = useCallback(
    (message: string | null) => setState((p) => ({ ...p, error: message })),
    [],
  );

  /** Back to the value box, with the code already sent forgotten. */
  const editValue = useCallback(
    () => setState((p) => ({ ...p, step: 'ENTER', testCode: null, error: null })),
    [],
  );

  const sendCode = useCallback(
    async (draft: ContactDraft) => {
      setState((p) => ({ ...p, sending: true, error: null }));
      try {
        if (isPhoneChannel(channel)) {
          const res = await requestPhone({
            variables: { field: channel, ext: draft.extension, num: draft.number },
          });
          setState({
            ...INITIAL,
            step: 'CODE',
            sentTo: `${draft.extension} ${draft.number}`.trim(),
            testCode: res.data?.requestContactPhoneChangeOtp?.test_code ?? null,
          });
          return;
        }
        const email = contactDraftValue(draft, channel);
        const res = await requestEmail({ variables: { email } });
        setState({
          ...INITIAL,
          step: 'CODE',
          sentTo: email,
          testCode: res.data?.requestEmailChangeOtp?.dev_otp ?? null,
        });
      } catch (e) {
        setState((p) => ({ ...p, sending: false, error: parseApiError(e) }));
      }
    },
    [channel, requestEmail, requestPhone],
  );

  const verify = useCallback(
    async (draft: ContactDraft, otp: string) => {
      setState((p) => ({ ...p, verifying: true, error: null }));
      try {
        if (isPhoneChannel(channel)) {
          await confirmPhone({
            variables: { field: channel, ext: draft.extension, num: draft.number, otp },
          });
        } else {
          await confirmEmail({
            variables: { email: contactDraftValue(draft, channel), otp },
          });
        }
        setState(INITIAL);
        onSaved();
      } catch (e) {
        setState((p) => ({ ...p, verifying: false, error: parseApiError(e) }));
      }
    },
    [channel, confirmEmail, confirmPhone, onSaved],
  );

  return { state, sendCode, verify, editValue, reset, setError };
}
