import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REFERRAL_MESSAGE,
  REFERRAL_MESSAGE_TOKENS,
  REFERRAL_PARAM,
  readReferralCode,
  referralLink,
  renderReferralMessage,
} from '../src/referral';

const BASE = 'https://mweb.duncit.com';

/** The values a share message is rendered with, overridable per test. */
const vars = (
  over: Partial<{ code: string; link: string; coins: number }> = {},
): { code: string; link: string; coins: number } => ({
  code: 'ASHA42',
  link: `${BASE}/register?ref=ASHA42`,
  coins: 50,
  ...over,
});

describe('REFERRAL_PARAM', () => {
  // Links already shared in the wild carry this name; renaming it would
  // silently orphan every one of them, so the wire contract is pinned.
  it('is the `ref` query parameter the link writers and the signup reader agree on', () => {
    expect(REFERRAL_PARAM).toBe('ref');
  });
});

describe('referralLink', () => {
  it('lands on mWeb sign-up with the code in the ref parameter', () => {
    expect(referralLink('ASHA42', BASE)).toBe('https://mweb.duncit.com/register?ref=ASHA42');
  });

  // The same code shared from staging or a local build must point back at THAT
  // mWeb, not at production — the host is whatever the caller hands in.
  it('points at whichever mWeb it is given, not a hard-coded production host', () => {
    expect(referralLink('ASHA42', 'https://staging.mweb.duncit.com')).toBe(
      'https://staging.mweb.duncit.com/register?ref=ASHA42',
    );
    expect(referralLink('ASHA42', 'http://localhost:3000')).toBe('http://localhost:3000/register?ref=ASHA42');
  });

  it('strips trailing slashes so the path never doubles up', () => {
    // A non-default base, so "stripped the slash" cannot be confused with
    // "ignored the base and used the default".
    expect(referralLink('ASHA42', 'http://localhost:3000/')).toBe('http://localhost:3000/register?ref=ASHA42');
    expect(referralLink('ASHA42', `${BASE}///`)).toBe('https://mweb.duncit.com/register?ref=ASHA42');
  });

  it('trims whitespace around the code', () => {
    expect(referralLink('  ASHA42  ', BASE)).toBe('https://mweb.duncit.com/register?ref=ASHA42');
  });

  it('percent-encodes the code so it survives the query string', () => {
    expect(referralLink('A B&C', BASE)).toBe('https://mweb.duncit.com/register?ref=A%20B%26C');
  });

  it('builds a link the signup reader hands straight back as the same code', () => {
    expect(readReferralCode(new URL(referralLink('ASHA42', BASE)).search)).toBe('ASHA42');
    // Writer percent-encodes, reader decodes: a code with reserved characters
    // survives the query string unchanged.
    expect(readReferralCode(new URL(referralLink('A B&C', `${BASE}/`)).search)).toBe('A B&C');
  });
});

describe('readReferralCode', () => {
  it('reads the code out of a query string, leading ? included', () => {
    expect(readReferralCode('?ref=ASHA42&utm_source=whatsapp')).toBe('ASHA42');
  });

  it('also reads a bare query string without the leading ?', () => {
    expect(readReferralCode('ref=ASHA42')).toBe('ASHA42');
  });

  // Codes are stored and compared upper-case; a link lower-cased by a chat app
  // or typed by hand must still match the account that owns it.
  it('upper-cases a code that arrived lower-cased', () => {
    expect(readReferralCode('?ref=asha42')).toBe('ASHA42');
  });

  it('trims whitespace that a hand-typed link picked up', () => {
    expect(readReferralCode('?ref=%20asha42%20')).toBe('ASHA42');
  });

  it('decodes percent-encoded characters', () => {
    expect(readReferralCode('?ref=A%26B')).toBe('A&B');
  });

  it('takes the first ref when a link carries the parameter twice', () => {
    expect(readReferralCode('?ref=first&ref=second')).toBe('FIRST');
  });

  it('is null when the parameter is absent', () => {
    expect(readReferralCode('?utm_source=whatsapp')).toBeNull();
    expect(readReferralCode('')).toBeNull();
  });

  it('is null when the parameter is present but blank', () => {
    expect(readReferralCode('?ref=')).toBeNull();
    expect(readReferralCode('?ref=%20%20')).toBeNull();
  });

  // The URL parser is lenient about bad percent-escapes, so the only thing
  // that can make it throw is a value that is not a string at all — which the
  // signup page must survive with "no code" rather than a crash.
  it('answers null instead of throwing when the value cannot be parsed as a query', () => {
    const unparsable = [[REFERRAL_PARAM]] as unknown as string;
    expect(readReferralCode(unparsable)).toBeNull();
  });
});

describe('REFERRAL_MESSAGE_TOKENS', () => {
  it('names the three placeholders Finance may write into a message', () => {
    expect(REFERRAL_MESSAGE_TOKENS).toEqual(['{code}', '{link}', '{coins}']);
  });

  // The list is what the admin text box documents; a token it names that the
  // renderer does not fill would ship to every user as literal braces.
  it('lists only tokens the renderer actually fills in', () => {
    const v = vars();
    const filled = { '{code}': v.code, '{link}': v.link, '{coins}': String(v.coins) };
    for (const token of REFERRAL_MESSAGE_TOKENS) {
      expect(renderReferralMessage(token, v)).toBe(filled[token]);
    }
  });
});

describe('DEFAULT_REFERRAL_MESSAGE', () => {
  it('makes the offer — both sides earn — rather than asking a favour', () => {
    expect(DEFAULT_REFERRAL_MESSAGE).toBe(
      'Join me on Duncit! We both earn {coins} Duncit Coins. Use my code {code} or sign up here: {link}',
    );
  });

  // The reward is a placeholder, never a number, so the default can never
  // promise coins the platform's current rate does not pay.
  it('uses every placeholder and hard-codes no amount', () => {
    for (const token of REFERRAL_MESSAGE_TOKENS) {
      expect(DEFAULT_REFERRAL_MESSAGE).toContain(token);
    }
    expect(DEFAULT_REFERRAL_MESSAGE).not.toMatch(/\d/);
  });
});

describe('renderReferralMessage', () => {
  it('fills every placeholder with its value', () => {
    expect(renderReferralMessage('Code {code}, link {link}, coins {coins}.', vars())).toBe(
      'Code ASHA42, link https://mweb.duncit.com/register?ref=ASHA42, coins 50.',
    );
  });

  // Named rather than positional: Finance can move a token anywhere in the
  // sentence and it still reads as the right value.
  it('fills the placeholders wherever they sit in the sentence', () => {
    expect(renderReferralMessage('{coins} coins via {link} ({code})', vars())).toBe(
      '50 coins via https://mweb.duncit.com/register?ref=ASHA42 (ASHA42)',
    );
  });

  it('replaces every occurrence of a token, not only the first', () => {
    expect(renderReferralMessage('{code} and again {code}', vars())).toBe('ASHA42 and again ASHA42');
  });

  it('falls back to the shipped default when the template is blank', () => {
    const expected = renderReferralMessage(DEFAULT_REFERRAL_MESSAGE, vars());
    expect(renderReferralMessage('', vars())).toBe(expected);
    expect(renderReferralMessage('   ', vars())).toBe(expected);
    expect(expected).toBe(
      'Join me on Duncit! We both earn 50 Duncit Coins. Use my code ASHA42 or sign up here: https://mweb.duncit.com/register?ref=ASHA42',
    );
  });

  it("trims the template but otherwise keeps Finance's sentence verbatim", () => {
    expect(renderReferralMessage('  Join with {code}!  ', vars())).toBe('Join with ASHA42!');
  });

  // Finance wrote the sentence and gets to keep it; a zero rate is the thing to
  // fix, not something the renderer rewrites around.
  it('leaves a literal 0 when the template pays nothing', () => {
    expect(renderReferralMessage('Earn {coins} coins', vars({ coins: 0 }))).toBe('Earn 0 coins');
    expect(renderReferralMessage('', vars({ coins: 0 }))).toContain('We both earn 0 Duncit Coins.');
  });

  it('treats braces that are not a named token as ordinary text', () => {
    expect(renderReferralMessage('Hi {name}, use {code}', vars())).toBe('Hi {name}, use ASHA42');
  });
});
