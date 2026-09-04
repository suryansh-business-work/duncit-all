/**
 * Joining Duncit as a state machine — the half mWeb and the native app share.
 *
 * Signup is the same four steps on both surfaces and the same two doors through
 * them, and NOTHING is created until the WhatsApp code answers: the form's
 * answers are held, the Google credential is held, and the account is made on
 * the last step with the proof of the number beside it. That "held" is the
 * whole state machine, and it had been written twice — byte-identical, because
 * there is only one right answer to it (rule 40: the pair shares LOGIC, never
 * UI).
 *
 * What is NOT here is every side effect: sending the code, proving it, calling
 * `register` or `signupWithGoogle`, storing a token, navigating or flipping an
 * auth gate. Those differ per surface and stay in each hook. This package is
 * zero-dependency and takes no React — a reducer is a function, and both hooks
 * drive it with `useReducer`.
 *
 * The form values are a type parameter for the same reason: their schema lives
 * in `@duncit/forms`, which this package cannot import. All the machine needs
 * to know about them is the three number boxes below, which both surfaces spell
 * identically because they come from one shared schema.
 */
import { type SignupStep } from './signup-steps';

/** The number a code goes to, and what a proven one is written to. */
export interface SignupNumber {
  extension: string;
  number: string;
  /** The tick box: also write this to the account's phone, or leave it blank. */
  alsoMobile: boolean;
}

/** The three boxes a number arrives in, from either door's form. */
export interface SignupNumberFields {
  phoneExtension: string;
  phoneNumber: string;
  whatsappIsMobile: boolean;
}

/** Google's credential and the policies ticked beside it, both unspent. */
export interface SignupGoogleCredential {
  idToken: string;
  policyIds: readonly string[];
}

/**
 * Everything signup is holding, and nothing it is doing.
 *
 * `pendingForm` and `pendingGoogle` are how the last step knows WHICH door it
 * is finishing — exactly one of them is ever set — so the code step itself
 * knows about neither.
 */
export interface SignupFlowState<TForm extends SignupNumberFields> {
  step: SignupStep;
  /** The Google door's number step, which no form has asked for yet. */
  askingNumber: boolean;
  /** The number the code is going to, once one is settled. */
  verifying: SignupNumber | null;
  pendingForm: TForm | null;
  pendingGoogle: SignupGoogleCredential | null;
}

export type SignupFlowAction<TForm extends SignupNumberFields> =
  | { type: 'STEP'; step: SignupStep }
  /** Steps one to three are answered; the code step turns them into an account. */
  | { type: 'FORM_FILLED'; values: TForm }
  /** Google came back and its policies were accepted. No account yet. */
  | { type: 'GOOGLE_ACCEPTED'; credential: SignupGoogleCredential }
  /** The Google door's number step answered. Both doors meet here. */
  | { type: 'NUMBER_GIVEN'; values: SignupNumberFields };

/** Where both doors start: the first question, holding nothing. */
export function initialSignupFlowState<
  TForm extends SignupNumberFields,
>(): SignupFlowState<TForm> {
  return {
    step: 'WHO',
    askingNumber: false,
    verifying: null,
    pendingForm: null,
    pendingGoogle: null,
  };
}

/** The three number boxes, as the thing a code is addressed to. */
export const signupNumberOf = (values: Readonly<SignupNumberFields>): SignupNumber => ({
  extension: values.phoneExtension,
  number: values.phoneNumber,
  alsoMobile: values.whatsappIsMobile,
});

/**
 * The only four things that move signup along.
 *
 * The email door already collected the number two steps earlier, so
 * FORM_FILLED lands straight on the code. Google arrives with a credential and
 * no form at all, so GOOGLE_ACCEPTED opens the number step first and
 * NUMBER_GIVEN closes it — from there the two doors run the same last step.
 */
export function signupFlowReducer<TForm extends SignupNumberFields>(
  state: Readonly<SignupFlowState<TForm>>,
  action: Readonly<SignupFlowAction<TForm>>,
): SignupFlowState<TForm> {
  switch (action.type) {
    case 'STEP':
      return { ...state, step: action.step };
    case 'FORM_FILLED':
      return {
        ...state,
        step: 'VERIFY',
        pendingForm: action.values,
        verifying: signupNumberOf(action.values),
      };
    case 'GOOGLE_ACCEPTED':
      return {
        ...state,
        step: 'VERIFY',
        askingNumber: true,
        pendingGoogle: action.credential,
      };
    case 'NUMBER_GIVEN':
      return { ...state, askingNumber: false, verifying: signupNumberOf(action.values) };
    default:
      return state;
  }
}
