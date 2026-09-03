import { useState } from 'react';
import { birthYearToDob } from '@duncit/datetime';
import { type SignupStep } from '@duncit/utils';
import type { WhatsappNumberValues } from '@duncit/forms/schemas';

import { type SignupFormValues } from '@/forms/signup';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useTranslation } from '@/hooks/useTranslation';
import { register, signupWithGoogle } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { toErrorMessage } from '@/utils/errors';

/** The number the code goes to, and what a proven one is written to. */
export interface VerifyingNumber {
  extension: string;
  number: string;
  /** The tick box: also write this to the account's phone, or leave it blank. */
  alsoMobile: boolean;
}

/** The session a door handed back, spent once the number step is settled. */
interface PendingSession {
  token: string;
  surveyCompleted: boolean;
  /** Google only — its referral question has no form to have asked it. */
  referralPrompt: boolean;
}

/**
 * Joining Duncit, both doors, as one state machine.
 *
 * The two doors differ only in what they know by the time the number step
 * opens: the email form has already collected the number and the tick box, so
 * it goes straight to the code; Google hands back a finished account with no
 * form attached, so the number is asked for first. Everything after that — the
 * code, the skip, and the moment the session is finally opened — is one path.
 *
 * Neither door authenticates before the number is settled: flipping the auth
 * gate unmounts this screen, which would skip the step the person is halfway
 * through. Both `register` and `signupWithGoogle` store their token as they
 * return, which is what makes the WhatsApp mutations authorised meanwhile.
 */
export function useSignupFlow() {
  const { t } = useTranslation();
  const authenticate = useAuthStore((s) => s.authenticate);
  // Default true while the flags load, exactly as mWeb reads it, so the step is
  // never skipped by a request that has not answered yet.
  const whatsappStepEnabled = useFeatureFlag('whatsapp_signup_otp', true);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [step, setStep] = useState<SignupStep>('WHO');
  const [verifying, setVerifying] = useState<VerifyingNumber | null>(null);
  const [pending, setPending] = useState<PendingSession | null>(null);
  /** Google only: the number step, which nothing has asked for yet. */
  const [askingNumber, setAskingNumber] = useState(false);

  /** Open the gate. New accounts always land on the survey. */
  const finish = () => {
    if (pending) authenticate(pending.token, pending.surveyCompleted, pending.referralPrompt);
  };

  /** Both doors end here: either verify the number, or go straight through. */
  const afterAccount = (session: PendingSession, number: VerifyingNumber | null) => {
    setPending(session);
    if (!whatsappStepEnabled) {
      authenticate(session.token, session.surveyCompleted, session.referralPrompt);
      return;
    }
    setStep('VERIFY');
    if (number) setVerifying(number);
    else setAskingNumber(true);
  };

  const submitForm = async (values: SignupFormValues) => {
    setError(null);
    setLoading(true);
    try {
      const result = await register({
        name: values.name,
        // A birth YEAR is stored as its January 1 — see `birthYearToDob`.
        dob: birthYearToDob(values.dobYear),
        email: values.email,
        phoneNumber: values.phoneNumber,
        phoneExtension: values.phoneExtension,
        whatsappIsMobile: values.whatsappIsMobile,
        password: values.password,
        referralCode: values.referralCode,
        acceptedPolicyIds: values.acceptedPolicyIds,
      });
      afterAccount(
        { ...result, referralPrompt: false },
        {
          extension: values.phoneExtension,
          number: values.phoneNumber,
          alsoMobile: values.whatsappIsMobile,
        },
      );
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.auth.somethingWentWrong')));
    } finally {
      setLoading(false);
    }
  };

  /*
    Google's account arrives with no phone on it at all, so the number step is
    where its WhatsApp number and the "also my mobile" answer are collected —
    the same two things the email form asked for two steps earlier.
  */
  const submitGoogle = async (idToken: string, policyIds: string[]) => {
    setError(null);
    setGoogleBusy(true);
    try {
      const result = await signupWithGoogle(idToken, policyIds);
      afterAccount({ ...result, referralPrompt: true }, null);
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.auth.googleFailed')));
    } finally {
      setGoogleBusy(false);
    }
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

  return {
    error,
    setError,
    loading,
    googleBusy,
    step,
    setStep,
    verifying,
    askingNumber,
    finish,
    submitForm,
    submitGoogle,
    submitNumber,
  };
}
