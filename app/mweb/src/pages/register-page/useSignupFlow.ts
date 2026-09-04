import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { birthYearToDob } from '@duncit/datetime';
import { type SignupStep } from '@duncit/utils';
import type { WhatsappNumberValues } from '@duncit/forms/schemas';
import { ACCEPTANCE_SURFACE } from '../../components/policy-acceptance';
import type { RegisterFormValues } from '../../forms/register';
import { parseApiError } from '../../utils/parseApiError';
import { REGISTER, SIGNUP_GOOGLE } from './queries';

/** The number the code goes to, and what a proven one is written to. */
export interface VerifyingNumber {
  extension: string;
  number: string;
  /** The tick box: also write this to the account's phone, or leave it blank. */
  alsoMobile: boolean;
}

/** The Google credential, held unspent until the number has answered. */
interface PendingGoogle {
  idToken: string;
  policyIds: string[];
}

/** Split a single "Name" into first/last; surname may be empty. */
function splitName(name: string): { first_name: string; last_name?: string } {
  const [first, ...rest] = name.trim().split(/\s+/).filter(Boolean);
  return { first_name: first ?? '', last_name: rest.length ? rest.join(' ') : undefined };
}

/**
 * Joining Duncit, both doors, as one state machine.
 *
 * NOTHING is created until the WhatsApp code answers. The form's three steps
 * are held here, the Google credential is held here, and the account is made on
 * the last step with the proof of the number beside it — so leaving early, by
 * any means, leaves nothing behind rather than an account nobody can be
 * reached on. That is the whole reason the order is this way round: it used to
 * register first and ask afterwards, and every way of closing that screen was a
 * way past it.
 *
 * The two doors differ only in what they know by the time the number step
 * opens: the email form has already collected the number and the tick box, so
 * it goes straight to the code; Google hands back a credential with no form
 * attached, so the number is asked for first. From the code onwards it is one
 * path.
 *
 * RN twin: app/mobile-app/src/screens/SignupScreen/useSignupFlow.ts.
 */
export function useSignupFlow(linkedCode: string) {
  const navigate = useNavigate();
  const [registerMutation, { loading: registering }] = useMutation<any>(REGISTER);
  const [signupGoogle, { loading: creatingGoogle }] = useMutation<any>(SIGNUP_GOOGLE);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<SignupStep>('WHO');
  const [verifying, setVerifying] = useState<VerifyingNumber | null>(null);
  /** Google only: the number step, which nothing has asked for yet. */
  const [askingNumber, setAskingNumber] = useState(false);
  /** The form's answers, waiting on the code that turns them into an account. */
  const [pendingForm, setPendingForm] = useState<RegisterFormValues | null>(null);
  const [pendingGoogle, setPendingGoogle] = useState<PendingGoogle | null>(null);

  /** Where the finished account lands — the doors ask different questions. */
  const destination = pendingGoogle ? '/signup-referral' : '/signup-survey';

  const finish = (token: string) => {
    localStorage.setItem('token', token);
    navigate(destination, { state: { code: linkedCode } });
  };

  /** The form is filled in; the code step turns it into an account. */
  const submitForm = (values: RegisterFormValues) => {
    setError(null);
    setPendingForm(values);
    setStep('VERIFY');
    setVerifying({
      extension: values.phoneExtension,
      number: values.phoneNumber,
      alsoMobile: values.whatsappIsMobile,
    });
  };

  /*
    Google proves an address and nothing else, so its credential is held —
    unspent — while the number step and the code step run. There is no account
    to back out of until both have answered, which is what the acceptance
    dialog's Google wording promises.
  */
  const googleAccepted = (idToken: string, policyIds: string[]) => {
    setError(null);
    setPendingGoogle({ idToken, policyIds });
    setStep('VERIFY');
    setAskingNumber(true);
  };

  /** The number step's answer: from here the two doors run the same code step. */
  const submitNumber = (values: WhatsappNumberValues) => {
    setAskingNumber(false);
    setVerifying({
      extension: values.phoneExtension,
      number: values.phoneNumber,
      alsoMobile: values.whatsappIsMobile,
    });
  };

  const createFromForm = async (values: RegisterFormValues, whatsappToken: string) => {
    const { first_name, last_name } = splitName(values.name);
    const code = values.referralCode.trim().toUpperCase();
    const res = await registerMutation({
      variables: {
        input: {
          first_name,
          last_name,
          email: values.email,
          phone_number: values.phoneNumber,
          phone_extension: values.phoneExtension,
          whatsapp_is_mobile: values.whatsappIsMobile,
          whatsapp_token: whatsappToken,
          password: values.password,
          // A birth YEAR is stored as its January 1 — see `birthYearToDob`
          // for why that is the reading the server agrees with.
          dob: new Date(birthYearToDob(values.dobYear)).toISOString(),
          ...(code ? { referral_code: code } : {}),
          accepted_policy_ids: values.acceptedPolicyIds,
          accepted_policy_surface: ACCEPTANCE_SURFACE,
        },
      },
    });
    return res.data?.register?.token as string | undefined;
  };

  const createFromGoogle = async (
    google: PendingGoogle,
    number: VerifyingNumber,
    whatsappToken: string
  ) => {
    const res = await signupGoogle({
      variables: {
        input: {
          id_token: google.idToken,
          phone_number: number.number,
          phone_extension: number.extension,
          whatsapp_is_mobile: number.alsoMobile,
          whatsapp_token: whatsappToken,
          accepted_policy_ids: google.policyIds,
          accepted_policy_surface: ACCEPTANCE_SURFACE,
        },
      },
    });
    return res.data?.signupWithGoogle?.token as string | undefined;
  };

  /**
   * The code answered: spend its proof on the account it was asked for.
   *
   * Which door is being finished is read off what is being held, so the code
   * step itself knows nothing about either.
   */
  const createAccount = async (whatsappToken: string) => {
    setError(null);
    try {
      let token: string | undefined;
      if (pendingGoogle && verifying) {
        token = await createFromGoogle(pendingGoogle, verifying, whatsappToken);
      } else if (pendingForm) {
        token = await createFromForm(pendingForm, whatsappToken);
      }
      if (token) finish(token);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return {
    error,
    setError,
    creating: registering || creatingGoogle,
    step,
    setStep,
    verifying,
    askingNumber,
    /* Checked alongside the number before a code goes out, so "email already in
       use" is a correction on the form rather than a dead end after the code.
       Google has no form to have asked it — the credential carries it. */
    pendingEmail: pendingForm?.email,
    submitForm,
    googleAccepted,
    submitNumber,
    createAccount,
  };
}
