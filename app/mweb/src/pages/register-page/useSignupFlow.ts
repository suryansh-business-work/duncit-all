import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { birthYearToDob } from '@duncit/datetime';
import { type SignupStep } from '@duncit/utils';
import type { WhatsappNumberValues } from '@duncit/forms/schemas';
import { ACCEPTANCE_SURFACE } from '../../components/policy-acceptance';
import type { RegisterFormValues } from '../../forms/register';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { parseApiError } from '../../utils/parseApiError';
import { REGISTER } from './queries';

/** The number the code goes to, and what a proven one is written to. */
export interface VerifyingNumber {
  extension: string;
  number: string;
  /** The tick box: also write this to the account's phone, or leave it blank. */
  alsoMobile: boolean;
}

/** Split a single "Name" into first/last; surname may be empty. */
function splitName(name: string): { first_name: string; last_name?: string } {
  const [first, ...rest] = name.trim().split(/\s+/).filter(Boolean);
  return { first_name: first ?? '', last_name: rest.length ? rest.join(' ') : undefined };
}

/**
 * Joining Duncit, both doors, as one state machine.
 *
 * The two doors differ only in what they know by the time the number step
 * opens: the email form has already collected the number and the tick box, so
 * it goes straight to the code; Google hands back a finished account with no
 * form attached, so the number is asked for first. Everything after that — the
 * code, the skip, and where the person is finally sent — is one path.
 *
 * Neither door navigates before the number is settled: leaving the page would
 * skip the step the person is halfway through. Both doors store their token as
 * it arrives, which is what makes the WhatsApp mutations authorised meanwhile.
 *
 * RN twin: app/mobile-app/src/screens/SignupScreen/useSignupFlow.ts.
 */
export function useSignupFlow(linkedCode: string) {
  const navigate = useNavigate();
  const [registerMutation, { loading }] = useMutation<any>(REGISTER);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<SignupStep>('WHO');
  const [verifying, setVerifying] = useState<VerifyingNumber | null>(null);
  /** Google only: the number step, which nothing has asked for yet. */
  const [askingNumber, setAskingNumber] = useState(false);
  /** Where the person goes once the number is settled — the doors differ. */
  const [destination, setDestination] = useState('/signup-survey');

  const whatsappStepEnabled = useFeatureFlag('whatsapp_signup_otp', true);

  const finish = () => navigate(destination, { state: { code: linkedCode } });

  /** Both doors end here: either verify the number, or go straight through. */
  const afterAccount = (next: string, number: VerifyingNumber | null) => {
    setDestination(next);
    if (!whatsappStepEnabled) {
      navigate(next, { state: { code: linkedCode } });
      return;
    }
    setStep('VERIFY');
    if (number) setVerifying(number);
    else setAskingNumber(true);
  };

  const submitForm = async (values: RegisterFormValues) => {
    setError(null);
    try {
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
      const token = res.data?.register?.token;
      if (!token) return;
      /*
        Stored, but NOT navigated on: the last step's mutations read this token
        out of storage, and leaving the page now would skip the verification the
        person is halfway through.
      */
      localStorage.setItem('token', token);
      afterAccount('/signup-survey', {
        extension: values.phoneExtension,
        number: values.phoneNumber,
        alsoMobile: values.whatsappIsMobile,
      });
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  /*
    Google's account arrives with no phone on it at all, so the number step is
    where its WhatsApp number and the "also my mobile" answer are collected —
    the same two things the email form asked for two steps earlier. Its referral
    question has no form to have asked it either, hence the different landing.
  */
  const googleCreated = () => afterAccount('/signup-referral', null);

  /** The number step's answer: from here the two doors run the same code step. */
  const submitNumber = (values: WhatsappNumberValues) => {
    setAskingNumber(false);
    setVerifying({
      extension: values.phoneExtension,
      number: values.phoneNumber,
      alsoMobile: values.whatsappIsMobile,
    });
  };

  return {
    error,
    setError,
    loading,
    step,
    setStep,
    verifying,
    askingNumber,
    finish,
    submitForm,
    googleCreated,
    submitNumber,
  };
}
