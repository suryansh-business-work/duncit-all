import { useReducer, useState, type Reducer } from 'react';
import { birthYearToDob } from '@duncit/datetime';
import {
  initialSignupFlowState,
  signupFlowReducer,
  type SignupFlowAction,
  type SignupFlowState,
  type SignupGoogleCredential,
  type SignupNumber,
  type SignupStep,
} from '@duncit/utils';
import type { WhatsappNumberValues } from '@duncit/forms/schemas';

import { type SignupFormValues } from '@/forms/signup';
import { useTranslation } from '@/hooks/useTranslation';
import { register, signupWithGoogle } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { toErrorMessage } from '@/utils/errors';

/*
  The machine itself is `@duncit/utils`' — it was written twice, identically,
  because there is only one right answer to what signup is holding at each step
  (rule 40). The cast is what binds its type parameter to THIS surface's form
  values, whose schema lives in a package @duncit/utils cannot import.
*/
type FlowReducer = Reducer<SignupFlowState<SignupFormValues>, SignupFlowAction<SignupFormValues>>;

/**
 * Joining Duncit, both doors — the side effects. What signup is HOLDING is the
 * shared reducer's; what it DOES is this file's.
 *
 * NOTHING is created until the WhatsApp code answers. The account is made on
 * the last step with the proof of the number beside it, so force-closing the
 * app mid-signup leaves nothing behind rather than an account nobody can be
 * reached on. That is the whole reason the order is this way round: it used to
 * register first and ask afterwards, and every way of leaving that screen was a
 * way past it. It ends by opening the session, which is the only moment there
 * is one to open.
 *
 * mWeb twin: app/mweb/src/pages/register-page/useSignupFlow.ts — the same
 * effects against Apollo, over the same machine.
 */
export function useSignupFlow() {
  const { t } = useTranslation();
  const authenticate = useAuthStore((s) => s.authenticate);

  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [flow, dispatch] = useReducer(
    signupFlowReducer as FlowReducer,
    initialSignupFlowState<SignupFormValues>(),
  );

  const setStep = (step: SignupStep) => dispatch({ type: 'STEP', step });

  /** The form is filled in; the code step turns it into an account. */
  const submitForm = (values: SignupFormValues) => {
    setError(null);
    dispatch({ type: 'FORM_FILLED', values });
  };

  /*
    Google proves an address and nothing else, so its credential is held —
    unspent — while the number step and the code step run. There is no account
    to back out of until both have answered, which is what the acceptance
    sheet's Google wording promises.
  */
  const googleAccepted = (idToken: string, policyIds: string[]) => {
    setError(null);
    dispatch({ type: 'GOOGLE_ACCEPTED', credential: { idToken, policyIds } });
  };

  /** The number step's answer: from here the two doors run the same code step. */
  const submitNumber = (values: WhatsappNumberValues) => dispatch({ type: 'NUMBER_GIVEN', values });

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
    google: SignupGoogleCredential,
    number: SignupNumber,
    whatsappToken: string,
  ) =>
    signupWithGoogle(google.idToken, [...google.policyIds], {
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
      if (flow.pendingGoogle && flow.verifying) {
        const result = await createFromGoogle(flow.pendingGoogle, flow.verifying, whatsappToken);
        authenticate(result.token, result.surveyCompleted, true);
        return;
      }
      if (flow.pendingForm) {
        const result = await createFromForm(flow.pendingForm, whatsappToken);
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
    step: flow.step,
    setStep,
    verifying: flow.verifying,
    askingNumber: flow.askingNumber,
    /* Checked alongside the number before a code goes out, so "email already in
       use" is a correction on the form rather than a dead end after the code.
       Google has no form to have asked it — the credential carries it. */
    pendingEmail: flow.pendingForm?.email,
    submitForm,
    googleAccepted,
    submitNumber,
    createAccount,
  };
}
