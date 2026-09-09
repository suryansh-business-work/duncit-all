import { useEffect, useState } from 'react';
import { useWatch, type Control, type FieldValues, type Path } from 'react-hook-form';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
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

/** Codes, not sentences — the box owns the copy (rule 38). */
interface SignupContactAvailability {
  email_available: boolean | null;
  phone_available: boolean | null;
}

interface Data {
  signupContactAvailability: SignupContactAvailability;
}

interface Vars {
  email?: string;
  ext?: string;
  num?: string;
}

/**
 * Fired from a debounced box, so the selection is deliberately the two
 * booleans: a keystroke must not drag anything else with it.
 */
export const SIGNUP_CONTACT_AVAILABILITY: TypedDocumentNode<Data, Vars> = gql`
  query SignupContactAvailability($email: String, $ext: String, $num: String) {
    signupContactAvailability(email: $email, phone_extension: $ext, phone_number: $num) {
      email_available
      phone_available
    }
  }
`;

type Client = ReturnType<typeof useApolloClient>;

/** The same two patterns the signup schema runs, so the box asks about
 * exactly what the form would accept. */
const PHONE_SHAPES: SignupPhoneShapes = { extension: DIAL_CODE, number: PHONE_INTL };

/** Apollo, and the one place that answers `network-only`, because a cached
 * "available" is exactly the answer that goes stale. */
const askServer = (client: Client, variables: Vars) =>
  client
    .query({
      query: SIGNUP_CONTACT_AVAILABILITY,
      variables,
      fetchPolicy: 'network-only',
    })
    .then((result) => {
      const answer = result.data?.signupContactAvailability;
      if (!answer) throw new Error('NO_AVAILABILITY_ANSWER');
      return answer;
    });

/** A half the server did not answer is a failed ask, never a verdict. */
function verdict(value: boolean | null): boolean {
  if (value === null) throw new Error('NO_AVAILABILITY_ANSWER');
  return value;
}

/**
 * Watch the email box and ask the server whether it is free to join with,
 * once the typing stops — the box's status, for the component to render.
 *
 * The debounce, the stale-reply rule and what each answer means are
 * `@duncit/utils`' — the native app runs the same logic (rule 40). What is
 * left here is the transport, and the watch: the hook reads the form itself
 * so the component only draws. RN twin: `@/hooks/useSignupContactCheck`.
 */
export function useSignupEmailCheck<T extends FieldValues>(
  control: Control<T>,
  name: Path<T>,
): SignupContactStatus {
  const client = useApolloClient();
  const [check, setCheck] = useState(IDLE_SIGNUP_CONTACT_CHECK);
  const email = String(useWatch({ control, name }) ?? '');
  const candidate = signupEmailCandidate(email, EMAIL);

  useEffect(
    () =>
      scheduleSignupContactCheck({
        candidate,
        ask: (mailbox) =>
          askServer(client, { email: mailbox }).then((a) => verdict(a.email_available)),
        onState: setCheck,
        onError: (error, value) =>
          logs.mWeb.error('useSignupEmailCheck', 'availability', { error, candidate: value }),
      }),
    [client, candidate],
  );

  return signupContactStatus(candidate, check);
}

/** The WhatsApp row's twin of `useSignupEmailCheck`: both boxes, one ask. */
export function useSignupPhoneCheck<T extends FieldValues>(
  control: Control<T>,
  names: { extension: Path<T>; number: Path<T> },
): SignupContactStatus {
  const client = useApolloClient();
  const [check, setCheck] = useState(IDLE_SIGNUP_CONTACT_CHECK);
  const extension = String(useWatch({ control, name: names.extension }) ?? '');
  const number = String(useWatch({ control, name: names.number }) ?? '');
  const candidate = signupPhoneCandidate(extension, number, PHONE_SHAPES);

  useEffect(
    () =>
      scheduleSignupContactCheck({
        candidate,
        ask: () =>
          askServer(client, { ext: extension.trim(), num: number.trim() }).then((a) =>
            verdict(a.phone_available),
          ),
        onState: setCheck,
        onError: (error, value) =>
          logs.mWeb.error('useSignupPhoneCheck', 'availability', { error, candidate: value }),
      }),
    [client, candidate, extension, number],
  );

  return signupContactStatus(candidate, check);
}
