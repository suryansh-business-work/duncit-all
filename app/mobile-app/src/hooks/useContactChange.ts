import { useCallback, useState } from 'react';
import {
  contactDraftValue,
  isPhoneChannel,
  parseApiError,
  type ContactChangeStep,
  type ContactChannel,
  type ContactDraft,
} from '@duncit/utils';

import {
  MobileConfirmContactPhoneChangeDocument,
  MobileConfirmEmailChangeDocument,
  MobileRequestContactPhoneChangeOtpDocument,
  MobileRequestEmailChangeOtpDocument,
} from '@/graphql/account';
import { ContactPhoneField } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';

/** What the sheet needs to render, however the change is going. */
export interface ContactChangeState {
  step: ContactChangeStep;
  /** The value the live code was sent to, for the "we sent a code to …" line. */
  sentTo: string;
  /** Echoed back only while no transport is wired for this channel. */
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

/** The GraphQL enum member for a channel the server treats as a phone number. */
const phoneField = (channel: ContactChannel) =>
  channel === 'WHATSAPP' ? ContactPhoneField.Whatsapp : ContactPhoneField.Phone;

/**
 * The two-step contact change. RN twin of mWeb's `useContactChange`.
 *
 * The step is held here rather than derived from "do we have a challenge",
 * because the person can walk back from the code box to fix a typo in the
 * number — and the code already sent to the wrong number must not then be the
 * one the next screen accepts. Going back forgets it.
 */
export function useContactChange(channel: ContactChannel, onSaved: () => void) {
  const [state, setState] = useState<ContactChangeState>(INITIAL);

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
          const res = await graphqlRequest(
            MobileRequestContactPhoneChangeOtpDocument,
            { field: phoneField(channel), ext: draft.extension, num: draft.number },
            { auth: true },
          );
          setState({
            ...INITIAL,
            step: 'CODE',
            sentTo: `${draft.extension} ${draft.number}`.trim(),
            testCode: res.requestContactPhoneChangeOtp?.test_code ?? null,
          });
          return;
        }
        const email = contactDraftValue(draft, channel);
        const res = await graphqlRequest(
          MobileRequestEmailChangeOtpDocument,
          { email },
          { auth: true },
        );
        setState({
          ...INITIAL,
          step: 'CODE',
          sentTo: email,
          testCode: res.requestEmailChangeOtp?.dev_otp ?? null,
        });
      } catch (e) {
        setState((p) => ({ ...p, sending: false, error: parseApiError(e) }));
      }
    },
    [channel],
  );

  const verify = useCallback(
    async (draft: ContactDraft, otp: string) => {
      setState((p) => ({ ...p, verifying: true, error: null }));
      try {
        if (isPhoneChannel(channel)) {
          await graphqlRequest(
            MobileConfirmContactPhoneChangeDocument,
            { field: phoneField(channel), ext: draft.extension, num: draft.number, otp },
            { auth: true },
          );
        } else {
          await graphqlRequest(
            MobileConfirmEmailChangeDocument,
            { email: contactDraftValue(draft, channel), otp },
            { auth: true },
          );
        }
        setState(INITIAL);
        onSaved();
      } catch (e) {
        setState((p) => ({ ...p, verifying: false, error: parseApiError(e) }));
      }
    },
    [channel, onSaved],
  );

  return { state, sendCode, verify, editValue, reset, setError };
}
