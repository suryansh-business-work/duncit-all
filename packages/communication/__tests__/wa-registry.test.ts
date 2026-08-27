/**
 * The data half of the WhatsApp channel: the scenario registry (wa-events) and
 * the template reader (wa-template). Pure functions only — the send transport
 * has its own suite in transport.test.ts.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  WA_EVENTS,
  WA_EVENT_BY_KEY,
  WA_OPTIONAL_CATEGORIES,
  WA_REQUIRED_CATEGORIES,
  isRequiredWaCategory,
  renderTemplateBody,
  templateParamCount,
  templateParamError,
  templateSegments,
  waEventArity,
} from '../src/index';

describe('isRequiredWaCategory', () => {
  it('locks every category a person cannot switch off', () => {
    expect(WA_REQUIRED_CATEGORIES.map(isRequiredWaCategory)).toEqual([true, true, true]);
  });

  it('leaves every optional category switchable', () => {
    expect(WA_OPTIONAL_CATEGORIES.map(isRequiredWaCategory)).toEqual([false, false, false, false, false]);
  });

  it('treats an unknown category string as optional, never required', () => {
    expect(isRequiredWaCategory('promo')).toBe(false);
  });
});

describe('waEventArity', () => {
  it('answers the exact {{n}} count the approved body expects', () => {
    expect(waEventArity('USER_WELCOME')).toBe(1);
    expect(waEventArity('USER_POD_REMINDER')).toBe(7);
    expect(waEventArity('USER_POD_CANCELLED_BY_HOST')).toBe(8);
  });

  it('answers 0 for a key that is not in the registry', () => {
    expect(waEventArity('NOT_A_SCENARIO')).toBe(0);
  });

  it('agrees with the registry row for every event', () => {
    for (const event of WA_EVENTS) {
      expect(waEventArity(event.key)).toBe(event.params.length);
      expect(WA_EVENT_BY_KEY.get(event.key)).toBe(event);
    }
  });
});

describe('templateParamCount', () => {
  it('reads the HIGHEST {{n}}, not how many placeholders appear', () => {
    // One placeholder written once, but it is {{3}} — a positional array must
    // still be 3 long, or AiSensy renders the literal braces and bills anyway.
    expect(templateParamCount('Your payout of {{3}} is on its way.')).toBe(3);
  });

  it('keeps a gap as a slot that must still be sent', () => {
    expect(templateParamCount('Hi {{1}}, pay ₹299 for DUN-POD-4821 before {{3}}.')).toBe(3);
  });

  it('counts a repeated placeholder once', () => {
    expect(templateParamCount('Seat {{2}} is held. Seat {{2}} releases in {{1}} hours.')).toBe(2);
  });

  it('answers 0 for a body with no placeholders, and for no body at all', () => {
    expect(templateParamCount('Welcome to Duncit!')).toBe(0);
    expect(templateParamCount(null as unknown as string)).toBe(0);
  });
});

describe('templateSegments', () => {
  it('splits literal text and placeholders in order', () => {
    expect(templateSegments('Hi {{1}}, your Pod starts in {{2}} hours.')).toEqual([
      { text: 'Hi ', placeholder: 0 },
      { text: '{{1}}', placeholder: 1 },
      { text: ', your Pod starts in ', placeholder: 0 },
      { text: '{{2}}', placeholder: 2 },
      { text: ' hours.', placeholder: 0 },
    ]);
  });

  it('emits no empty text piece when the body starts or ends on a placeholder', () => {
    expect(templateSegments('{{1}} paid ₹{{2}}')).toEqual([
      { text: '{{1}}', placeholder: 1 },
      { text: ' paid ₹', placeholder: 0 },
      { text: '{{2}}', placeholder: 2 },
    ]);
  });

  it('answers an empty list for no body at all', () => {
    expect(templateSegments(undefined as unknown as string)).toEqual([]);
  });

  it('anchors a match that carries no index at the start of the body', () => {
    // Native matchAll always stamps `index`; the parser still guards against a
    // match object without one by treating it as position 0. Hand it exactly
    // that shape, for this one body only, to pin the guard's behavior.
    const SENTINEL = '{{1}} joined DUN-POD-4821';
    const realMatchAll = String.prototype.matchAll;
    const spy = vi.spyOn(String.prototype, 'matchAll').mockImplementation(function (
      this: string,
      pattern: RegExp,
    ) {
      if (this === SENTINEL) {
        const indexless = Object.assign(['{{1}}', '1'], { input: this }) as unknown as RegExpExecArray;
        return [indexless][Symbol.iterator]();
      }
      return realMatchAll.call(this, pattern);
    } as typeof String.prototype.matchAll);

    try {
      expect(templateSegments(SENTINEL)).toEqual([
        { text: '{{1}}', placeholder: 1 },
        { text: ' joined DUN-POD-4821', placeholder: 0 },
      ]);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('renderTemplateBody', () => {
  it('fills the placeholders positionally — what the recipient will read', () => {
    expect(
      renderTemplateBody('Hi {{1}}, your Pod {{2}} starts at {{3}}.', ['Suryansh', 'DUN-POD-4821', '7:30 PM']),
    ).toBe('Hi Suryansh, your Pod DUN-POD-4821 starts at 7:30 PM.');
  });

  it('keeps the literal {{n}} when its value is missing — the failure a preview must show', () => {
    expect(renderTemplateBody('Refund of {{1}} lands in {{2}} working days.', ['₹299'])).toBe(
      'Refund of ₹299 lands in {{2}} working days.',
    );
  });
});

describe('templateParamError', () => {
  it('rejects the wrong number of values', () => {
    expect(templateParamError(['Suryansh'], 2)).toBe('This template takes 2 value(s); 1 were given.');
  });

  it('rejects a blank value by its 1-based position', () => {
    expect(templateParamError(['Suryansh', '   '], 2)).toBe('Value 2 is empty — WhatsApp renders a blank there.');
  });

  it('treats a null value as blank rather than sending "null" to a phone', () => {
    expect(templateParamError([null as unknown as string], 1)).toBe(
      'Value 1 is empty — WhatsApp renders a blank there.',
    );
  });

  it('answers null when every slot is filled', () => {
    expect(templateParamError(['Suryansh', '₹299'], 2)).toBeNull();
  });
});
