import { useReducer, useState, type Reducer } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
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
import { ACCEPTANCE_SURFACE } from '../../components/policy-acceptance';
import type { RegisterFormValues } from '../../forms/register';
import { parseApiError } from '../../utils/parseApiError';
import { REGISTER, SIGNUP_GOOGLE } from './queries';

/*
  The machine itself is `@duncit/utils`' — it was written twice, identically,
  because there is only one right answer to what signup is holding at each step
  (rule 40). The cast is what binds its type parameter to THIS surface's form
  values, whose schema lives in a package @duncit/utils cannot import.
*/
type FlowReducer = Reducer<
  SignupFlowState<RegisterFormValues>,
  SignupFlowAction<RegisterFormValues>
>;

/** Split a single "Name" into first/last; surname may be empty. */
function splitName(name: string): { first_name: string; last_name?: string } {
  const [first, ...rest] = name.trim().split(/\s+/).filter(Boolean);
  return { first_name: first ?? '', last_name: rest.length ? rest.join(' ') : undefined };
}

/**
 * Joining Duncit, both doors — the side effects. What signup is HOLDING is the
 * shared reducer's; what it DOES is this file's.
 *
 * NOTHING is created until the WhatsApp code answers. The account is made on
 * the last step with the proof of the number beside it, so leaving early, by
 * any means, leaves nothing behind rather than an account nobody can be reached
 * on. That is the whole reason the order is this way round: it used to register
 * first and ask afterwards, and every way of closing that screen was a way past
 * it.
 *
 * RN twin: app/mobile-app/src/screens/SignupScreen/useSignupFlow.ts — the same
 * effects against the native services, over the same machine.
 */
export function useSignupFlow(linkedCode: string) {
  const navigate = useNavigate();
  const [registerMutation, { loading: registering }] = useMutation<any>(REGISTER);
  const [signupGoogle, { loading: creatingGoogle }] = useMutation<any>(SIGNUP_GOOGLE);
  const [error, setError] = useState<string | null>(null);
  const [flow, dispatch] = useReducer(
    signupFlowReducer as FlowReducer,
    initialSignupFlowState<RegisterFormValues>(),
  );

  /** Where the finished account lands — the doors ask different questions. */
  const destination = flow.pendingGoogle ? '/signup-referral' : '/signup-survey';

  const finish = (token: string) => {
    localStorage.setItem('token', token);
    navigate(destination, { state: { code: linkedCode } });
  };

  const setStep = (step: SignupStep) => dispatch({ type: 'STEP', step });

  /** The form is filled in; the code step turns it into an account. */
  const submitForm = (values: RegisterFormValues) => {
    setError(null);
    dispatch({ type: 'FORM_FILLED', values });
  };

  /*
    Google proves an address and nothing else, so its credential is held —
    unspent — while the number step and the code step run. There is no account
    to back out of until both have answered, which is what the acceptance
    dialog's Google wording promises.
  */
  const googleAccepted = (idToken: string, policyIds: string[]) => {
    setError(null);
    dispatch({ type: 'GOOGLE_ACCEPTED', credential: { idToken, policyIds } });
  };

  /** The number step's answer: from here the two doors run the same code step. */
  const submitNumber = (values: WhatsappNumberValues) =>
    dispatch({ type: 'NUMBER_GIVEN', values });

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
    google: SignupGoogleCredential,
    number: SignupNumber,
    whatsappToken: string,
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
      if (flow.pendingGoogle && flow.verifying) {
        token = await createFromGoogle(flow.pendingGoogle, flow.verifying, whatsappToken);
      } else if (flow.pendingForm) {
        token = await createFromForm(flow.pendingForm, whatsappToken);
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
