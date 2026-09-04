import { useState } from 'react';
import { birthYearToDob } from '@duncit/datetime';
import { type SignupStep } from '@duncit/utils';
import type { WhatsappNumberValues } from '@duncit/forms/schemas';

import { type SignupFormValues } from '@/forms/signup';
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

/** The Google credential, held unspent until the number has answered. */
interface PendingGoogle {
  idToken: string;
  policyIds: string[];
}

/**
 * Joining Duncit, both doors, as one state machine.
 *
 * NOTHING is created until the WhatsApp code answers. The form's three steps
 * are held here, the Google credential is held here, and the account is made on
 * the last step with the proof of the number beside it — so force-closing the
 * app mid-signup leaves nothing behind rather than an account nobody can be
 * reached on. That is the whole reason the order is this way round: it used to
 * register first and ask afterwards, and every way of leaving that screen was a
 * way past it.
 *
 * The two doors differ only in what they know by the time the number step
 * opens: the email form has already collected the number and the tick box, so
 * it goes straight to the code; Google hands back a credential with no form
 * attached, so the number is asked for first. From the code onwards it is one
 * path — and it ends by opening the session, which is the only moment there is
 * one to open.
 *
 * mWeb twin: app/mweb/src/pages/register-page/useSignupFlow.ts.
 */
export function useSignupFlow() {
  const { t } = useTranslation();
  const authenticate = useAuthStore((s) => s.authenticate);

  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<SignupStep>('WHO');
  const [verifying, setVerifying] = useState<VerifyingNumber | null>(null);
  /** Google only: the number step, which nothing has asked for yet. */
  const [askingNumber, setAskingNumber] = useState(false);
  /** The form's answers, waiting on the code that turns them into an account. */
  const [pendingForm, setPendingForm] = useState<SignupFormValues | null>(null);
  const [pendingGoogle, setPendingGoogle] = useState<PendingGoogle | null>(null);

  /** The form is filled in; the code step turns it into an account. */
  const submitForm = (values: SignupFormValues) => {
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
    sheet's Google wording promises.
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

  const createFromForm = (values: SignupFormValues, whatsappToken: string) =>
    register(
      {
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
      },
      whatsappToken,
    );

  const createFromGoogle = (
    google: PendingGoogle,
    number: VerifyingNumber,
    whatsappToken: string,
  ) =>
    signupWithGoogle(google.idToken, google.policyIds, {
      extension: number.extension,
      number: number.number,
      alsoMobile: number.alsoMobile,
      whatsappToken,
    });

  /**
   * The code answered: spend its proof on the account it was asked for, then
   * open the session.
   *
   * Which door is being finished is read off what is being held, so the code
   * step itself knows nothing about either. Google's referral question has no
   * form to have asked it, hence the extra prompt on that door alone.
   */
  const createAccount = async (whatsappToken: string) => {
    setError(null);
    setCreating(true);
    try {
      if (pendingGoogle && verifying) {
        const result = await createFromGoogle(pendingGoogle, verifying, whatsappToken);
        authenticate(result.token, result.surveyCompleted, true);
        return;
      }
      if (pendingForm) {
        const result = await createFromForm(pendingForm, whatsappToken);
        authenticate(result.token, result.surveyCompleted, false);
      }
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.auth.somethingWentWrong')));
    } finally {
      setCreating(false);
    }
  };

  return {
    error,
    setError,
    creating,
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
