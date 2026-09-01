import { describe, expect, it } from 'vitest';
import {
  CONTACT_CHANNELS,
  buildContactChangeLabels,
  contactDetailsComplete,
  contactDraftFrom,
  contactDraftIsUnchanged,
  contactDraftValue,
  currentContactValue,
  emptyContactDraft,
  formatPhoneLine,
  isPhoneChannel,
  type ContactChannel,
  type ContactSnapshot,
  type ContactTranslate,
} from '../src/contact-change';

type Vars = Record<string, string | number> | undefined;

/** Records every call and answers `t:<key>`, so a test can tell a translated
 * label from a key the package hard-coded. */
const recorder = () => {
  const calls: { key: string; vars: Vars }[] = [];
  const t: ContactTranslate = (key, options) => {
    calls.push({ key, vars: options?.vars });
    return `t:${key}`;
  };
  return { t, calls };
};

const snapshot: ContactSnapshot = {
  email: 'Ravi@Duncit.com',
  phone_extension: '+91',
  phone_number: '9876543210',
  whatsapp_extension: '+1',
  whatsapp_number: '4155551234',
};

describe('isPhoneChannel', () => {
  it('is true for the two channels that are a number with a country code', () => {
    expect(isPhoneChannel('PHONE')).toBe(true);
    expect(isPhoneChannel('WHATSAPP')).toBe(true);
    expect(isPhoneChannel('EMAIL')).toBe(false);
  });
});

describe('emptyContactDraft', () => {
  it('opens on the India dial code by default', () => {
    expect(emptyContactDraft()).toEqual({ email: '', extension: '+91', number: '' });
  });

  it('opens on whatever dial code the surface configured', () => {
    expect(emptyContactDraft('+1')).toEqual({ email: '', extension: '+1', number: '' });
  });
});

describe('formatPhoneLine', () => {
  it('reads a number back with its country code', () => {
    expect(formatPhoneLine('+91', '9876543210')).toBe('+91 9876543210');
  });

  it('never renders a lone country code, so an account with no number reads empty', () => {
    expect(formatPhoneLine('+91', '')).toBe('');
    expect(formatPhoneLine('+91', null)).toBe('');
    expect(formatPhoneLine(null, null)).toBe('');
    expect(formatPhoneLine()).toBe('');
  });

  it('renders the digits alone when no country code was stored', () => {
    expect(formatPhoneLine(null, '9876543210')).toBe('9876543210');
  });
});

describe('contactDetailsComplete', () => {
  it('is true only when the account holds all three details', () => {
    expect(contactDetailsComplete(snapshot)).toBe(true);
  });

  it('is false while any one of them is missing, so Edit profile cannot save', () => {
    expect(contactDetailsComplete({ ...snapshot, email: '' })).toBe(false);
    expect(contactDetailsComplete({ ...snapshot, phone_number: null })).toBe(false);
    expect(contactDetailsComplete({ ...snapshot, whatsapp_number: undefined })).toBe(false);
    expect(contactDetailsComplete({})).toBe(false);
  });

  it('does not count a country code with no number behind it', () => {
    expect(contactDetailsComplete({ ...snapshot, phone_number: '', phone_extension: '+91' })).toBe(
      false,
    );
  });
});

describe('currentContactValue', () => {
  it('reads each channel off the account', () => {
    expect(currentContactValue(snapshot, 'EMAIL')).toBe('Ravi@Duncit.com');
    expect(currentContactValue(snapshot, 'PHONE')).toBe('+91 9876543210');
    expect(currentContactValue(snapshot, 'WHATSAPP')).toBe('+1 4155551234');
  });

  it('reads an unset channel as an empty string, not null', () => {
    expect(currentContactValue({}, 'EMAIL')).toBe('');
    expect(currentContactValue({}, 'PHONE')).toBe('');
    expect(currentContactValue({}, 'WHATSAPP')).toBe('');
    expect(currentContactValue({ email: null }, 'EMAIL')).toBe('');
  });
});

describe('contactDraftFrom', () => {
  it('opens the email dialog on the address already on the account', () => {
    expect(contactDraftFrom(snapshot, 'EMAIL')).toEqual({
      email: 'Ravi@Duncit.com',
      extension: '+91',
      number: '',
    });
  });

  it('opens each phone dialog on that own channel code and number', () => {
    expect(contactDraftFrom(snapshot, 'PHONE')).toEqual({
      email: '',
      extension: '+91',
      number: '9876543210',
    });
    expect(contactDraftFrom(snapshot, 'WHATSAPP')).toEqual({
      email: '',
      extension: '+1',
      number: '4155551234',
    });
  });

  it('falls back to the configured dial code when the account has none stored', () => {
    expect(contactDraftFrom({}, 'PHONE', '+44')).toEqual({ email: '', extension: '+44', number: '' });
    expect(contactDraftFrom({ phone_extension: '' }, 'PHONE')).toEqual({
      email: '',
      extension: '+91',
      number: '',
    });
    expect(contactDraftFrom({}, 'EMAIL', '+44').extension).toBe('+44');
  });
});

describe('contactDraftValue', () => {
  it('normalises an email to lower case, which is how the server stores it', () => {
    expect(
      contactDraftValue({ email: '  Ravi@Duncit.com ', extension: '+91', number: '' }, 'EMAIL'),
    ).toBe('ravi@duncit.com');
  });

  it('sends the number without its surrounding whitespace', () => {
    expect(contactDraftValue({ email: '', extension: '+91', number: ' 9876543210 ' }, 'PHONE')).toBe(
      '9876543210',
    );
  });
});

describe('contactDraftIsUnchanged', () => {
  it('refuses to send a code for the address the account already holds, whatever the casing', () => {
    expect(
      contactDraftIsUnchanged(snapshot, 'EMAIL', {
        email: ' ravi@duncit.com ',
        extension: '+91',
        number: '',
      }),
    ).toBe(true);
  });

  it('lets a genuinely new address through', () => {
    expect(
      contactDraftIsUnchanged(snapshot, 'EMAIL', {
        email: 'asha@duncit.com',
        extension: '+91',
        number: '',
      }),
    ).toBe(false);
  });

  it('counts the country code, so +1 9876543210 is a different number from +91 9876543210', () => {
    expect(
      contactDraftIsUnchanged(snapshot, 'PHONE', { email: '', extension: '+91', number: '9876543210' }),
    ).toBe(true);
    expect(
      contactDraftIsUnchanged(snapshot, 'PHONE', { email: '', extension: '+1', number: '9876543210' }),
    ).toBe(false);
  });

  it('compares WhatsApp against the WhatsApp columns, not the phone ones', () => {
    expect(
      contactDraftIsUnchanged(snapshot, 'WHATSAPP', {
        email: '',
        extension: '+1',
        number: '4155551234',
      }),
    ).toBe(true);
    expect(
      contactDraftIsUnchanged(snapshot, 'WHATSAPP', {
        email: '',
        extension: '+91',
        number: '9876543210',
      }),
    ).toBe(false);
  });

  it('treats adding a first value on an empty account as a change', () => {
    expect(
      contactDraftIsUnchanged({}, 'PHONE', { email: '', extension: '+91', number: '9876543210' }),
    ).toBe(false);
    expect(
      contactDraftIsUnchanged({}, 'EMAIL', { email: 'ravi@duncit.com', extension: '+91', number: '' }),
    ).toBe(false);
    expect(contactDraftIsUnchanged({}, 'EMAIL', { email: '', extension: '+91', number: '' })).toBe(true);
  });
});

describe('buildContactChangeLabels', () => {
  it('resolves every static label through the translator, under the mweb namespace', () => {
    const { t } = recorder();
    const built = buildContactChangeLabels(t);

    expect(built.changeAction).toBe('t:mweb.contactChange.change');
    expect(built.addAction).toBe('t:mweb.contactChange.add');
    expect(built.sendCode).toBe('t:mweb.contactChange.sendCode');
    expect(built.sending).toBe('t:mweb.contactChange.sending');
    expect(built.codeLabel).toBe('t:mweb.contactChange.codeLabel');
    expect(built.verifyAndSave).toBe('t:mweb.contactChange.verifyAndSave');
    expect(built.verifying).toBe('t:mweb.contactChange.verifying');
    expect(built.resend).toBe('t:mweb.contactChange.resend');
    expect(built.editValue).toBe('t:mweb.contactChange.editValue');
    expect(built.cancel).toBe('t:mweb.contactChange.cancel');
    expect(built.unchanged).toBe('t:mweb.contactChange.unchanged');
    expect(built.whyOtp).toBe('t:mweb.contactChange.whyOtp');
    expect(built.allRequired).toBe('t:mweb.contactChange.allRequired');
  });

  it('names all three channels, each with its own field, empty line, title and hint', () => {
    const built = buildContactChangeLabels(recorder().t);
    const prefix: Record<ContactChannel, string> = {
      EMAIL: 'email',
      PHONE: 'phone',
      WHATSAPP: 'whatsapp',
    };

    for (const channel of CONTACT_CHANNELS) {
      expect(built.channel(channel)).toEqual({
        name: `t:mweb.contactChange.${prefix[channel]}Name`,
        fieldLabel: `t:mweb.contactChange.${prefix[channel]}Field`,
        emptyValue: `t:mweb.contactChange.${prefix[channel]}Empty`,
        changeTitle: `t:mweb.contactChange.${prefix[channel]}Title`,
        changeHint: `t:mweb.contactChange.${prefix[channel]}Hint`,
      });
    }
  });

  it('passes each sentence its arguments as named vars, matching the bundle placeholders', () => {
    const { t, calls } = recorder();
    const built = buildContactChangeLabels(t);
    calls.length = 0;

    expect(built.codeSentTo('ravi@duncit.com')).toBe('t:mweb.contactChange.codeSentTo');
    expect(built.resendIn(30)).toBe('t:mweb.contactChange.resendIn');
    expect(built.testCode('123456')).toBe('t:mweb.contactChange.testCode');
    expect(built.saved('WhatsApp number')).toBe('t:mweb.contactChange.saved');

    expect(calls).toEqual([
      { key: 'mweb.contactChange.codeSentTo', vars: { destination: 'ravi@duncit.com' } },
      { key: 'mweb.contactChange.resendIn', vars: { seconds: 30 } },
      { key: 'mweb.contactChange.testCode', vars: { code: '123456' } },
      { key: 'mweb.contactChange.saved', vars: { channelName: 'WhatsApp number' } },
    ]);
  });

  it('resolves the static labels with no vars at all', () => {
    const { t, calls } = recorder();
    buildContactChangeLabels(t);

    expect(calls.every((call) => call.vars === undefined)).toBe(true);
  });
});
