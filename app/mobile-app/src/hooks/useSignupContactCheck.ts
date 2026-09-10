import { useEffect, useState } from 'react';
import { useWatch, type Control, type FieldValues, type Path } from 'react-hook-form';
import { DIAL_CODE, EMAIL, PHONE_INTL } from '@duncit/regex';
import { logs } from '@duncit/logs';
import {
  IDLE_SIGNUP_CONTACT_CHECK,
  scheduleSignupContactCheck,
  signupContactStatus,
  signupEmailCandidate,
  signupPhoneCandidate,
  type SignupContactStatus,
  type SignupPhoneShapes,
} from '@duncit/utils';

import { SignupContactAvailabilityDocument } from '@/graphql/auth';
import { graphqlRequest } from '@/services/graphql.client';

/** The same two patterns the signup schema runs, so the box asks about
 * exactly what the form would accept. */
const PHONE_SHAPES: SignupPhoneShapes = { extension: DIAL_CODE, number: PHONE_INTL };

/** A half the server did not answer is a failed ask, never a verdict. */
function verdict(value: boolean | null | undefined): boolean {
  if (value === null || value === undefined) throw new Error('NO_AVAILABILITY_ANSWER');
  return value;
}

/**
 * Watch the email box and ask the server whether it is free to join with,
 * once the typing stops — the box's status, for the component to render.
 *
 * The debounce, the stale-reply rule and what each answer means are
 * `@duncit/utils`' — mWeb runs the same logic (rule 40). What is left here is
 * the transport, and the watch: the hook reads the form itself so the
 * component only draws. mWeb twin: `forms/register/useSignupContactCheck.ts`.
 */
export function useSignupEmailCheck<T extends FieldValues>(
  control: Control<T>,
  name: Path<T>,
): SignupContactStatus {
  const [check, setCheck] = useState(IDLE_SIGNUP_CONTACT_CHECK);
  const email = String(useWatch({ control, name }) ?? '');
  const candidate = signupEmailCandidate(email, EMAIL);

  useEffect(
    () =>
      scheduleSignupContactCheck({
        candidate,
        ask: (mailbox) =>
          graphqlRequest(SignupContactAvailabilityDocument, { email: mailbox }).then((data) =>
            verdict(data.signupContactAvailability.email_available),
          ),
        onState: setCheck,
        onError: (error, value) =>
          logs.mobileApp.error('useSignupEmailCheck', 'availability', {
            error,
            candidate: value,
          }),
      }),
    [candidate],
  );

  return signupContactStatus(candidate, check);
}

/** The WhatsApp row's twin of `useSignupEmailCheck`: both boxes, one ask. */
export function useSignupPhoneCheck<T extends FieldValues>(
  control: Control<T>,
  names: { extension: Path<T>; number: Path<T> },
): SignupContactStatus {
  const [check, setCheck] = useState(IDLE_SIGNUP_CONTACT_CHECK);
  const extension = String(useWatch({ control, name: names.extension }) ?? '');
  const number = String(useWatch({ control, name: names.number }) ?? '');
  const candidate = signupPhoneCandidate(extension, number, PHONE_SHAPES);

  useEffect(
    () =>
      scheduleSignupContactCheck({
        candidate,
        ask: () =>
          graphqlRequest(SignupContactAvailabilityDocument, {
            ext: extension.trim(),
            num: number.trim(),
          }).then((data) => verdict(data.signupContactAvailability.phone_available)),
        onState: setCheck,
        onError: (error, value) =>
          logs.mobileApp.error('useSignupPhoneCheck', 'availability', {
            error,
            candidate: value,
          }),
      }),
    [candidate, extension, number],
  );

  return signupContactStatus(candidate, check);
}
