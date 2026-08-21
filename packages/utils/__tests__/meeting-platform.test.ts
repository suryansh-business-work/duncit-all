import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MEETING_PLATFORM_VALUES,
  isMeetingPlatform,
  meetingPlatformName,
  meetingPlatformOptions,
} from '../src/meeting-platform';

/** What each picker code must read as — the product names the doc comment pins. */
const PICKER_NAMES: Record<string, string> = {
  GOOGLE_MEET: 'Google Meet',
  ZOOM: 'Zoom',
  TEAMS: 'Microsoft Teams',
};

/** Rows written before the list existed still hold these; they must stay readable. */
const LEGACY_NAMES: Record<string, string> = {
  MICROSOFT_TEAMS: 'Microsoft Teams',
  SKYPE: 'Skype',
  WEBEX: 'Webex',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MEETING_PLATFORM_VALUES', () => {
  it('lists the codes in the order a host scans the dropdown, with the manual-link escape hatch last', () => {
    expect(MEETING_PLATFORM_VALUES).toEqual(['GOOGLE_MEET', 'ZOOM', 'TEAMS', 'OTHER']);
  });
});

describe('meetingPlatformName', () => {
  it('decodes every picker code to its product name', () => {
    for (const [code, name] of Object.entries(PICKER_NAMES)) {
      expect(meetingPlatformName(code)).toBe(name);
    }
  });

  // These are not in the picker any more, but a live pod written before the
  // list existed still carries them. For these three codes the title-case
  // fallback happens to spell the same names, so what this pins is the name a
  // live pod shows — the guarantee the doc comment makes — not the lookup path.
  it('keeps the legacy codes readable as their product names', () => {
    for (const [code, name] of Object.entries(LEGACY_NAMES)) {
      expect(meetingPlatformName(code)).toBe(name);
    }
  });

  // The product-name lookup is keyed on the stored code exactly as written.
  // `teams` is not a code, so it is treated as free text and title-cased: it
  // reads "Teams", not the "Microsoft Teams" that `TEAMS` decodes to — the one
  // input that proves a name comes from the lookup rather than from title-casing.
  it('looks names up by the exact stored code — lower-case "teams" is free text and reads "Teams", not "Microsoft Teams"', () => {
    expect(meetingPlatformName('TEAMS')).toBe('Microsoft Teams');
    expect(meetingPlatformName('teams')).toBe('Teams');
  });

  it('title-cases an unknown SCREAMING_SNAKE code word by word rather than echoing it raw', () => {
    expect(meetingPlatformName('JITSI_MEET')).toBe('Jitsi Meet');
    expect(meetingPlatformName('WHEREBY')).toBe('Whereby');
  });

  // OTHER is copy, not a product: callers pass their localized label to
  // meetingPlatformOptions. Asked directly, the decoder still gives a readable
  // English stand-in instead of the raw code.
  it('falls back to "Other" for the OTHER code because its real label is localized copy', () => {
    expect(meetingPlatformName('OTHER')).toBe('Other');
  });

  // The drift bug this module exists to end: free text typed into the old write
  // side is lower-cased wholesale, so "Google Meet" reads back as "Google meet".
  it('lower-cases free text and capitalises only the first letter — the reason platforms must be stored as codes', () => {
    expect(meetingPlatformName('Google Meet')).toBe('Google meet');
  });

  // An empty segment (the whole value, or the gap before a stray underscore)
  // contributes an empty word: "" stays "", and "_ZOOM" keeps the separator
  // but nothing else in front of "Zoom" — never the text "undefined".
  it('contributes nothing for an empty segment — "" stays "" and "_ZOOM" reads " Zoom", never "undefined"', () => {
    expect(meetingPlatformName('')).toBe('');
    expect(meetingPlatformName('_ZOOM')).toBe(' Zoom');
  });

  // The native app compiles with noUncheckedIndexedAccess, so `word[0]` is
  // typed string | undefined and the source guards the upper-casing with `?? ''`.
  // No real string can reach that guard (a non-empty word always has a first
  // character), so the only way to prove what it does is to make upper-casing
  // answer nothing: the letter is dropped, and "undefined" never reaches a pod page.
  it('drops the first letter rather than printing "undefined" when upper-casing yields nothing', () => {
    vi.spyOn(String.prototype, 'toUpperCase').mockReturnValueOnce(undefined as unknown as string);
    const name = meetingPlatformName('JITSI');
    expect(name).not.toContain('undefined');
    expect(name).toBe('itsi');
  });
});

describe('meetingPlatformOptions', () => {
  const otherLabel = 'Other (paste link manually)';

  it('builds one option per code, in picker order, naming products and using the caller copy for OTHER', () => {
    expect(meetingPlatformOptions(otherLabel)).toEqual([
      { value: 'GOOGLE_MEET', label: 'Google Meet' },
      { value: 'ZOOM', label: 'Zoom' },
      { value: 'TEAMS', label: 'Microsoft Teams' },
      { value: 'OTHER', label: otherLabel },
    ]);
  });

  // Product names are the same in every language; only the OTHER entry is copy,
  // so it is the only label that changes with the caller's locale.
  it('passes the localized OTHER label through verbatim and leaves product names untouched', () => {
    const hindi = 'अन्य (लिंक स्वयं चिपकाएँ)';
    const options = meetingPlatformOptions(hindi);
    expect(options.find((o) => o.value === 'OTHER')?.label).toBe(hindi);
    expect(options.filter((o) => o.value !== 'OTHER').map((o) => o.label)).toEqual([
      'Google Meet',
      'Zoom',
      'Microsoft Teams',
    ]);
  });

  it('offers exactly the values a stored platform is checked against', () => {
    const values = meetingPlatformOptions(otherLabel).map((o) => o.value);
    expect(values).toEqual([...MEETING_PLATFORM_VALUES]);
    for (const value of values) {
      expect(isMeetingPlatform(value)).toBe(true);
    }
  });
});

describe('isMeetingPlatform', () => {
  // The guard matches the stored code byte for byte: a form pre-filled from a
  // row holding `zoom` must fall back rather than light up the ZOOM entry.
  it('accepts each picker code exactly as stored, and rejects the same code in lower case', () => {
    for (const value of MEETING_PLATFORM_VALUES) {
      expect(isMeetingPlatform(value)).toBe(true);
      expect(isMeetingPlatform(value.toLowerCase())).toBe(false);
    }
  });

  // Decodable for display, but a host cannot pick them any more — a form
  // pre-filled from such a row must fall back rather than select a ghost entry.
  // TEAMS and MICROSOFT_TEAMS both read "Microsoft Teams"; only TEAMS is pickable.
  it('rejects the read-only legacy codes even though they still decode to a name', () => {
    for (const [code, name] of Object.entries(LEGACY_NAMES)) {
      expect(meetingPlatformName(code)).toBe(name);
      expect(isMeetingPlatform(code)).toBe(false);
    }
    expect(meetingPlatformName('TEAMS')).toBe(meetingPlatformName('MICROSOFT_TEAMS'));
    expect(isMeetingPlatform('TEAMS')).toBe(true);
    expect(isMeetingPlatform('MICROSOFT_TEAMS')).toBe(false);
  });

  // The guard takes stored codes, never the display names a user sees or types.
  it('rejects a product name typed as free text, a display name and the empty string', () => {
    expect(isMeetingPlatform('Google Meet')).toBe(false);
    expect(isMeetingPlatform('Zoom')).toBe(false);
    expect(isMeetingPlatform('')).toBe(false);
  });

  it('rejects anything that is not a string', () => {
    expect(isMeetingPlatform(null)).toBe(false);
    expect(isMeetingPlatform(undefined)).toBe(false);
    expect(isMeetingPlatform(0)).toBe(false);
    expect(isMeetingPlatform(['ZOOM'])).toBe(false);
    expect(isMeetingPlatform({ value: 'ZOOM' })).toBe(false);
  });
});
