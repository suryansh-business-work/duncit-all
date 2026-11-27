import {
  hasSavedToken,
  pickTwilioEntry,
  twilioConfigPairs,
  twilioFormValues,
  type TwilioEntry,
} from '../twilioConfig';

const entry = (over: Partial<TwilioEntry> = {}): TwilioEntry => ({
  id: 'e1',
  name: 'Twilio',
  is_default: false,
  is_active: true,
  config: [
    { key: 'account_sid', value: 'AC123' },
    { key: 'auth_token', value: 'secret' },
    { key: 'phone_number', value: '+14155552671' },
  ],
  secrets: [{ key: 'has_auth_token', present: true }],
  ...over,
});

describe('pickTwilioEntry', () => {
  it('prefers the default, then an active entry, then the first, and is null when there is none', () => {
    const inactive = entry({ id: 'a', is_active: false });
    const active = entry({ id: 'b' });
    const def = entry({ id: 'c', is_default: true, is_active: false });
    expect(pickTwilioEntry([inactive, active, def])?.id).toBe('c');
    expect(pickTwilioEntry([inactive, active])?.id).toBe('b');
    expect(pickTwilioEntry([inactive])?.id).toBe('a');
    expect(pickTwilioEntry([])).toBeNull();
    expect(pickTwilioEntry(undefined)).toBeNull();
  });
});

describe('twilioFormValues', () => {
  it('fills the form from the entry but never puts the token back in it', () => {
    expect(twilioFormValues(entry())).toEqual({
      account_sid: 'AC123',
      auth_token: '',
      phone_number: '+14155552671',
      agent_phone_number: '',
    });
  });

  it('starts blank without an entry', () => {
    expect(twilioFormValues(null)).toEqual({
      account_sid: '',
      auth_token: '',
      phone_number: '',
      agent_phone_number: '',
    });
  });
});

describe('hasSavedToken', () => {
  it('reads the secret flag, whichever way the key is named', () => {
    expect(hasSavedToken(entry())).toBe(true);
    expect(hasSavedToken(entry({ secrets: [{ key: 'auth_token', present: true }] }))).toBe(true);
    expect(hasSavedToken(entry({ secrets: [{ key: 'has_auth_token', present: false }] }))).toBe(
      false,
    );
    expect(hasSavedToken(null)).toBe(false);
  });
});

describe('twilioConfigPairs', () => {
  it('sends every field trimmed, and leaves a blank token out so the stored one stays', () => {
    expect(
      twilioConfigPairs({
        account_sid: ' AC1 ',
        auth_token: '',
        phone_number: '+14155552671',
        agent_phone_number: '',
      }),
    ).toEqual([
      { key: 'account_sid', value: 'AC1' },
      { key: 'phone_number', value: '+14155552671' },
      // An emptied optional number is sent, so clearing it clears it.
      { key: 'agent_phone_number', value: '' },
    ]);
  });

  it('sends a newly typed token', () => {
    const pairs = twilioConfigPairs({
      account_sid: 'AC1',
      auth_token: ' new-token ',
      phone_number: '+14155552671',
      agent_phone_number: '+919811000001',
    });
    expect(pairs).toContainEqual({ key: 'auth_token', value: 'new-token' });
    expect(pairs).toContainEqual({ key: 'agent_phone_number', value: '+919811000001' });
  });
});
