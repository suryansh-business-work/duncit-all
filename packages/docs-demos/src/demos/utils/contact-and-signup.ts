import {
  buildContactChangeLabels,
  contactChangeNeedsOtp,
  contactSubmitAction,
  contactValueStepView,
  contactDetailsComplete,
  contactDraftFrom,
  contactDraftIsUnchanged,
  contactDraftValue,
  currentContactValue,
  SIGNUP_STEPS,
  SIGNUP_STEP_COUNT,
  SIGNUP_STEP_FIELDS,
  buildSignupStepperLabels,
  canLeaveSignupStep,
  nextSignupStep,
  previousSignupStep,
  initialSignupFlowState,
  signupFlowReducer,
  signupNumberOf,
  signupStepIndex,
  stepSubmitsAccount,
  type ContactSnapshot,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';
import type { ContactChangeMock, SignupStepMock, SignupFlowMock } from './mocks';

export const contactAndSignupDemos: PackageDemo[] = [
  defineDemo<ContactChangeMock>({
    id: 'contact-change',
    title: 'Changing a contact detail, and the code it costs',
    note:
      'Edit `draftNumber` to a number the account does not have and `Is a change` flips to ' +
      'true. Change only `draftExtension` — same digits, different country — and it is still ' +
      'a change, because +1 9845012345 is not the same number as +91 9845012345. Move ' +
      '`channel` to EMAIL and `Sends a code` flips to true: while `phoneOtp` is off the ' +
      'contact number is stored as typed, the other two are proved first. Turn `phoneOtp` on ' +
      'and the PHONE row sends a code too, with the button and the hint saying so. Blank the ' +
      "account's whatsapp_number and its row falls back to the empty line rather than " +
      'showing a lone +91 — and `Edit profile can save` flips to false, because all three ' +
      'contact details are required before the profile form will save. Set `numberStatus` ' +
      'to AVAILABLE and `Button disabled` flips to false: TAKEN or CHECKING keep it shut, ' +
      "with the refusal under the box. Type the account's own phone_number into " +
      '`draftNumber` and the button shuts again whatever `numberStatus` says, and with ' +
      '`edited` on, `Under the box` says it is the current number.',
    mock: {
      email: 'ravi@duncit.com',
      phone_extension: '+91',
      phone_number: '9845012345',
      whatsapp_extension: '+91',
      whatsapp_number: '',
      channel: 'PHONE',
      draftExtension: '+91',
      draftNumber: '9845099999',
      numberStatus: 'TAKEN',
      phoneOtp: false,
      edited: true,
    },
    compute: (mock) => {
      const account: ContactSnapshot = {
        email: mock.email,
        phone_extension: mock.phone_extension,
        phone_number: mock.phone_number,
        whatsapp_extension: mock.whatsapp_extension,
        whatsapp_number: mock.whatsapp_number,
      };
      const draft = {
        email: mock.email,
        extension: mock.draftExtension,
        number: mock.draftNumber,
      };
      const nothingYet = '(nothing yet)';
      const view = contactValueStepView(mock.channel, buildContactChangeLabels((key) => key), {
        busy: false,
        blocked: false,
        isValid: true,
        numberStatus: mock.numberStatus,
        phoneOtp: mock.phoneOtp,
        snapshot: account,
        draft,
        edited: mock.edited,
      });
      return {
        'Email row': currentContactValue(account, 'EMAIL') || nothingYet,
        'Phone row': currentContactValue(account, 'PHONE') || nothingYet,
        'WhatsApp row': currentContactValue(account, 'WHATSAPP') || nothingYet,
        'Dialog opens on': JSON.stringify(contactDraftFrom(account, mock.channel)),
        'Value stored': contactDraftValue(draft, mock.channel),
        'Is a change': String(!contactDraftIsUnchanged(account, mock.channel, draft)),
        'Sends a code': String(contactChangeNeedsOtp(mock.channel, mock.phoneOtp)),
        'Next step': contactSubmitAction(account, mock.channel, draft, mock.phoneOtp),
        Hint: view.hint,
        'Edit profile can save': String(contactDetailsComplete(account)),
        Button: view.buttonLabel,
        'Button disabled': String(view.disabled),
        'Under the box': view.numberLines.error ?? view.numberLines.hint,
      };
    },
  }),
  defineDemo<SignupStepMock>({
    id: 'signup-steps',
    title: 'Joining Duncit, one question at a time',
    note:
      "Move `step` through the four and watch what each one owns. SECURITY is the last step with " +
      "boxes, and VERIFY is the one that creates the account — it has no way back, because a code is " +
      'already on its way to the number that was typed.',
    mock: { step: 'CONTACT' },
    compute: (mock) => {
      // Keys rather than English, so the demo shows WHICH sentence each label
      // resolves to without pinning a translation.
      const t = (key: string) => key;
      const labels = buildSignupStepperLabels(t);
      return {
        'Step': `${signupStepIndex(mock.step)} of ${SIGNUP_STEP_COUNT}`,
        'Boxes this step validates':
          SIGNUP_STEP_FIELDS[mock.step].join(', ') || '(none — the server checks the code)',
        'Continue goes to': nextSignupStep(mock.step) ?? '(nowhere — this is the last)',
        'Back goes to': canLeaveSignupStep(mock.step)
          ? (previousSignupStep(mock.step) ?? '')
          : '(no Back on this step)',
        'Submits the form': String(stepSubmitsAccount(mock.step)),
        'The four steps': SIGNUP_STEPS.join(' -> '),
        // The Google door has no form to have asked these, so it asks them
        // inside VERIFY — same builder, so both doors word the box identically.
        "Google's own half-step": labels.detailsTitle,
        'The tick box': labels.sameAsMobile,
      };
    },
  }),
  defineDemo<SignupFlowMock>({
    id: 'signup-flow',
    title: 'What signup is holding at each step',
    note:
      "Switch `door` and watch what the machine ends up holding. Nothing is created until the " +
      'WhatsApp code answers, so exactly one of pendingForm/pendingGoogle is ever set — that is ' +
      'how the last step knows which door it is finishing. Google is the one that needs the ' +
      'number step, because its credential proves an address and nothing else.',
    mock: {
      door: 'GOOGLE',
      values: {
        phoneExtension: '+91',
        phoneNumber: '9845012345',
        whatsappIsMobile: true,
        dob: '1998-04-23',
      },
    },
    compute: (mock) => {
      // The email form's answers, as far as the machine cares about them.
      const form = { ...mock.values, email: 'riya@duncit.com' };
      type Form = typeof form;
      let state = initialSignupFlowState<Form>();
      const opened = state.step;
      if (mock.door === 'GOOGLE') {
        state = signupFlowReducer<Form>(state, {
          type: 'GOOGLE_ACCEPTED',
          credential: { idToken: 'google-id-token', policyIds: ['terms', 'privacy'] },
        });
      } else {
        state = signupFlowReducer<Form>(state, { type: 'FORM_FILLED', values: form });
      }
      const askedForNumber = state.askingNumber;
      if (askedForNumber) {
        state = signupFlowReducer<Form>(state, { type: 'DETAILS_GIVEN', values: mock.values });
      }
      return {
        'Opens on': opened,
        'After the door answers': state.step,
        'Needed a number step': String(askedForNumber),
        'Code goes to': state.verifying
          ? `${state.verifying.extension} ${state.verifying.number}`
          : '(no number settled yet)',
        'Writes the profile phone too': String(state.verifying?.alsoMobile ?? false),
        'Holding the form': String(state.pendingForm !== null),
        'Holding a Google credential': String(state.pendingGoogle !== null),
        'signupNumberOf': JSON.stringify(signupNumberOf(mock.values)),
      };
    },
  }),
];
