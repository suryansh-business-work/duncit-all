import { describe, expect, it } from 'vitest';

import {
  initialSignupFlowState,
  signupFlowReducer,
  signupNumberOf,
  type SignupFlowAction,
  type SignupFlowState,
} from '../src/signup-flow';

/** The email form's answers, as far as the machine cares about them. */
interface Form {
  phoneExtension: string;
  phoneNumber: string;
  whatsappIsMobile: boolean;
  email: string;
}

const FORM: Form = {
  phoneExtension: '+91',
  phoneNumber: '9845012345',
  whatsappIsMobile: true,
  email: 'riya@duncit.com',
};

const CREDENTIAL = { idToken: 'google-id-token', policyIds: ['terms', 'privacy'] };

const start = () => initialSignupFlowState<Form>();
const move = (state: SignupFlowState<Form>, action: SignupFlowAction<Form>) =>
  signupFlowReducer(state, action);

describe('what signup starts out holding', () => {
  it('opens on the first question with nothing held', () => {
    expect(start()).toEqual({
      step: 'WHO',
      askingNumber: false,
      verifying: null,
      pendingForm: null,
      pendingGoogle: null,
    });
  });
});

describe('the number a code is addressed to', () => {
  it('reads the three boxes off a form', () => {
    expect(signupNumberOf(FORM)).toEqual({
      extension: '+91',
      number: '9845012345',
      alsoMobile: true,
    });
  });

  it('carries an unticked tick box through', () => {
    expect(signupNumberOf({ ...FORM, whatsappIsMobile: false }).alsoMobile).toBe(false);
  });
});

describe('the email door', () => {
  it('goes straight to the code, holding the answers and the number', () => {
    const state = move(start(), { type: 'FORM_FILLED', values: FORM });

    expect(state.step).toBe('VERIFY');
    // The form asked for the number two steps earlier, so this door never
    // needs the Google door's extra half-step.
    expect(state.askingNumber).toBe(false);
    expect(state.verifying).toEqual({
      extension: '+91',
      number: '9845012345',
      alsoMobile: true,
    });
    expect(state.pendingForm).toEqual(FORM);
    expect(state.pendingGoogle).toBeNull();
  });
});

describe('the Google door', () => {
  it('holds the credential and asks for a number first', () => {
    const state = move(start(), { type: 'GOOGLE_ACCEPTED', credential: CREDENTIAL });

    expect(state.step).toBe('VERIFY');
    expect(state.askingNumber).toBe(true);
    // Google proved an address and nothing else — there is no number to send
    // a code to yet, and no account either.
    expect(state.verifying).toBeNull();
    expect(state.pendingGoogle).toEqual(CREDENTIAL);
    expect(state.pendingForm).toBeNull();
  });

  it('meets the other door at the code step once the number is given', () => {
    const asked = move(start(), { type: 'GOOGLE_ACCEPTED', credential: CREDENTIAL });
    const state = move(asked, {
      type: 'NUMBER_GIVEN',
      values: { phoneExtension: '+44', phoneNumber: '7700900123', whatsappIsMobile: false },
    });

    expect(state.askingNumber).toBe(false);
    expect(state.verifying).toEqual({
      extension: '+44',
      number: '7700900123',
      alsoMobile: false,
    });
    // Still held: the credential is spent by the LAST step, not this one.
    expect(state.pendingGoogle).toEqual(CREDENTIAL);
  });
});

describe('moving between the first three steps', () => {
  it('changes the step and holds everything else still', () => {
    const state = move(start(), { type: 'STEP', step: 'SECURITY' });

    expect(state.step).toBe('SECURITY');
    expect(state.pendingForm).toBeNull();
    expect(state.pendingGoogle).toBeNull();
  });

  it('leaves the state alone for an action it does not know', () => {
    const before = move(start(), { type: 'FORM_FILLED', values: FORM });
    const after = move(before, { type: 'NOPE' } as unknown as SignupFlowAction<Form>);

    expect(after).toBe(before);
  });
});
