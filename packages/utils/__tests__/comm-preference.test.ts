import { describe, expect, it } from 'vitest';
import {
  COMM_CHANNELS,
  authMessageCardState,
  buildCommPreferenceLabels,
  commChannelSummary,
  commRowState,
  findCommChannel,
  type CommChannel,
  type CommChannelState,
  type CommTranslate,
} from '../src/comm-preference';

type Vars = Record<string, string | number> | undefined;

/** Records every call and answers `t:<key>`, so a test can tell a translated
 * label from a key the package hard-coded. */
const recorder = () => {
  const calls: { key: string; vars: Vars }[] = [];
  const t: CommTranslate = (key, options) => {
    calls.push({ key, vars: options?.vars });
    return `t:${key}`;
  };
  return { t, calls };
};

const labels = () => buildCommPreferenceLabels(recorder().t);

const row = (over: Partial<CommChannelState> = {}): CommChannelState => ({
  channel: 'EMAIL',
  reachable: true,
  destination: 'ravi@duncit.com',
  otp_enabled: true,
  otp_can_disable: true,
  ...over,
});

describe('buildCommPreferenceLabels', () => {
  it('resolves every static label through the translator, under the mweb namespace', () => {
    const { t } = recorder();
    const built = buildCommPreferenceLabels(t);

    expect(built.title).toBe('t:mweb.commPreference.title');
    expect(built.blurb).toBe('t:mweb.commPreference.blurb');
    expect(built.entryHint).toBe('t:mweb.commPreference.entryHint');
    expect(built.authTitle).toBe('t:mweb.commPreference.authTitle');
    expect(built.authBody).toBe('t:mweb.commPreference.authBody');
    expect(built.authLocked).toBe('t:mweb.commPreference.authLocked');
    expect(built.authOn).toBe('t:mweb.commPreference.authOn');
    expect(built.authOff).toBe('t:mweb.commPreference.authOff');
    expect(built.saved).toBe('t:mweb.commPreference.saved');
    expect(built.saveFailed).toBe('t:mweb.commPreference.saveFailed');
    expect(built.loadFailed).toBe('t:mweb.commPreference.loadFailed');
  });

  it('names all three channels, each with its own hint and missing line', () => {
    const built = labels();
    const expected: Record<CommChannel, string> = { EMAIL: 'email', WHATSAPP: 'whatsapp', SMS: 'sms' };

    for (const channel of COMM_CHANNELS) {
      expect(built.channel(channel)).toEqual({
        name: `t:mweb.commPreference.${expected[channel]}`,
        hint: `t:mweb.commPreference.${expected[channel]}Hint`,
        missing: `t:mweb.commPreference.${expected[channel]}Missing`,
      });
    }
  });

  it('passes the destination through as a named var, so the bundle placeholder fills', () => {
    const { t, calls } = recorder();
    const built = buildCommPreferenceLabels(t);
    calls.length = 0;

    expect(built.authSentTo('ravi@duncit.com')).toBe('t:mweb.commPreference.authSentTo');
    expect(calls).toEqual([
      { key: 'mweb.commPreference.authSentTo', vars: { destination: 'ravi@duncit.com' } },
    ]);
  });

  it('resolves the static labels with no vars at all', () => {
    const { t, calls } = recorder();
    buildCommPreferenceLabels(t);

    expect(calls.every((call) => call.vars === undefined)).toBe(true);
  });
});

describe('commRowState', () => {
  it('lets an ordinary channel be switched either way', () => {
    expect(commRowState(row({ otp_enabled: true, otp_can_disable: true }))).toEqual({
      canToggle: true,
      locked: false,
      unreachable: false,
    });
    expect(commRowState(row({ otp_enabled: false, otp_can_disable: false }))).toEqual({
      canToggle: true,
      locked: false,
      unreachable: false,
    });
  });

  it('locks the last reachable channel on, because the server refuses to take the last one away', () => {
    expect(commRowState(row({ otp_enabled: true, otp_can_disable: false }))).toEqual({
      canToggle: false,
      locked: true,
      unreachable: false,
    });
  });

  it('offers no switch at all when there is nothing to send to', () => {
    expect(commRowState(row({ reachable: false }))).toEqual({
      canToggle: false,
      locked: false,
      unreachable: true,
    });
  });
});

describe('commChannelSummary', () => {
  it('answers both hub questions at once — where it goes, and whether codes come here', () => {
    const built = labels();

    expect(commChannelSummary(row({ otp_enabled: true }), built)).toBe(
      'ravi@duncit.com · t:mweb.commPreference.authOn',
    );
    expect(commChannelSummary(row({ otp_enabled: false }), built)).toBe(
      'ravi@duncit.com · t:mweb.commPreference.authOff',
    );
  });

  it('says what is missing instead — "off" and "there is no number" are not the same answer', () => {
    expect(commChannelSummary(row({ channel: 'SMS', reachable: false }), labels())).toBe(
      't:mweb.commPreference.smsMissing',
    );
  });
});

describe('authMessageCardState', () => {
  it('names where the codes land on an ordinary channel', () => {
    const built = labels();

    expect(authMessageCardState(row({ destination: '+91 9876543210', channel: 'SMS' }), built)).toEqual({
      title: 't:mweb.commPreference.authTitle',
      body: 't:mweb.commPreference.authBody',
      note: 't:mweb.commPreference.authSentTo',
      showSwitch: true,
      canToggle: true,
      checked: true,
    });
  });

  it('explains why the last reachable channel will not move, rather than reading as a bug', () => {
    const state = authMessageCardState(row({ otp_can_disable: false }), labels());

    expect(state.note).toBe('t:mweb.commPreference.authLocked');
    expect(state.showSwitch).toBe(true);
    expect(state.canToggle).toBe(false);
    expect(state.checked).toBe(true);
  });

  it('offers no switch, and says what is missing, when there is no address', () => {
    const state = authMessageCardState(row({ channel: 'WHATSAPP', reachable: false }), labels());

    expect(state).toEqual({
      title: 't:mweb.commPreference.authTitle',
      body: 't:mweb.commPreference.authBody',
      note: 't:mweb.commPreference.whatsappMissing',
      showSwitch: false,
      canToggle: false,
      checked: false,
    });
  });

  it('shows the switch off for a reachable channel whose codes are turned off', () => {
    const state = authMessageCardState(row({ otp_enabled: false }), labels());

    expect(state.checked).toBe(false);
    expect(state.canToggle).toBe(true);
  });
});

describe('findCommChannel', () => {
  const sheet = [row({ channel: 'EMAIL' }), row({ channel: 'SMS', destination: '+91 9876543210' })];

  it('picks the channel out of a loaded sheet', () => {
    expect(findCommChannel(sheet, 'SMS')?.destination).toBe('+91 9876543210');
  });

  it('is null for a channel the sheet does not carry, and while nothing is loaded', () => {
    expect(findCommChannel(sheet, 'WHATSAPP')).toBeNull();
    expect(findCommChannel(null, 'EMAIL')).toBeNull();
    expect(findCommChannel(undefined, 'EMAIL')).toBeNull();
    expect(findCommChannel([], 'EMAIL')).toBeNull();
  });
});
