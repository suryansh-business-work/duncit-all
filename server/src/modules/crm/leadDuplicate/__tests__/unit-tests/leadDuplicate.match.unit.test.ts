import {
  duplicatePhoneKey,
  keyOf,
  phonePattern,
  probeFilter,
  probesFor,
  probesHeldBy,
  websiteKey,
  websitePattern,
} from '../../leadDuplicate.match';

/**
 * The rules two CRM leads collide by. Each one decides what an operator sees
 * as "already in the CRM", so a false match blocks a real lead and a missed
 * one lets the same business be worked twice.
 */

describe('duplicatePhoneKey', () => {
  it.each([
    ['+91 98765 43210', '9876543210'],
    ['098765-43210', '9876543210'],
    ['9876543210', '9876543210'],
    ['1234567', '1234567'],
  ])('keys %s by its last ten digits', (raw, key) => {
    expect(duplicatePhoneKey(raw)).toBe(key);
  });

  it.each(['12345', '', '   ', null, undefined, 'call me'])('ignores %p, which cannot identify a lead', (raw) => {
    expect(duplicatePhoneKey(raw)).toBe('');
  });
});

describe('websiteKey', () => {
  it.each([
    ['https://www.Cafe.in/', 'cafe.in'],
    ['cafe.in', 'cafe.in'],
    ['http://cafe.in/Menu/?utm_source=x#top', 'cafe.in/menu'],
    ['  www.cafe.in//  ', 'cafe.in'],
  ])('keys %s as %s', (raw, key) => {
    expect(websiteKey(raw)).toBe(key);
  });

  it('keeps the path, so two profiles on one social host stay different', () => {
    expect(websiteKey('instagram.com/smash')).not.toBe(websiteKey('instagram.com/arena'));
  });

  it.each(['', 'not a site', 'ftp://cafe.in', null])('ignores %p', (raw) => {
    expect(websiteKey(raw)).toBe('');
  });
});

describe('keyOf', () => {
  it('lowercases an email and drops one that is not an address', () => {
    expect(keyOf('EMAIL', ' Asha@Example.com ')).toBe('asha@example.com');
    expect(keyOf('EMAIL', 'asha-at-example')).toBe('');
  });
});

describe('probesFor', () => {
  it('lists each distinct phone, email and website once, keeping the typed value', () => {
    const probes = probesFor({
      contacts: [
        { mobile_number: '+91 98765 43210', email: 'Asha@example.com' },
        { mobile_number: '9876543210', email: 'asha@example.com' },
        null,
        { mobile_number: '123', email: '' },
      ],
      website: 'https://cafe.in/',
    });

    expect(probes).toEqual([
      { field: 'PHONE', value: '+91 98765 43210', key: '9876543210' },
      { field: 'EMAIL', value: 'Asha@example.com', key: 'asha@example.com' },
      { field: 'WEBSITE', value: 'https://cafe.in/', key: 'cafe.in' },
    ]);
  });

  it('gives nothing for a lead with no usable contact values', () => {
    expect(probesFor({})).toEqual([]);
    expect(probesFor({ contacts: null, website: null })).toEqual([]);
  });
});

describe('phonePattern', () => {
  const pattern = phonePattern('9876543210');

  it.each(['9876543210', '+91 98765 43210', '+91-98765-43210', '098765 43210'])('matches the stored %s', (stored) => {
    expect(pattern.test(stored)).toBe(true);
  });

  it.each(['9876543211', '98765432100', '+91 98765'])('does not match %s', (stored) => {
    expect(pattern.test(stored)).toBe(false);
  });
});

describe('websitePattern', () => {
  const pattern = websitePattern('cafe.in/menu');

  it.each(['cafe.in/menu', 'https://www.cafe.in/menu/', 'HTTP://CAFE.IN/MENU?x=1', 'cafe.in/menu#top'])(
    'matches the stored %s',
    (stored) => {
      expect(pattern.test(stored)).toBe(true);
    }
  );

  it.each(['cafe.in', 'cafe.in/menus', 'mycafe.in/menu', 'cafeXin/menu'])('does not match %s', (stored) => {
    expect(pattern.test(stored)).toBe(false);
  });
});

describe('probeFilter', () => {
  it('ORs one clause per field that has something to look for', () => {
    const filter = probeFilter(probesFor({ contacts: [{ mobile_number: '9876543210', email: 'a@b.co' }], website: 'cafe.in' }));
    expect(filter).toEqual({
      $or: [
        { 'contacts.mobile_number': { $in: [phonePattern('9876543210')] } },
        { 'contacts.email': { $in: ['a@b.co'] } },
        { website: { $in: [websitePattern('cafe.in')] } },
      ],
    });
  });

  it('is null when there is nothing to look for', () => {
    expect(probeFilter([])).toBeNull();
  });
});

describe('probesHeldBy', () => {
  const probes = probesFor({ contacts: [{ mobile_number: '1234567', email: 'a@b.co' }], website: 'cafe.in' });

  it('keeps only the probes the stored lead really holds', () => {
    const stored = { contacts: [{ mobile_number: '+91 99912 34567', email: 'A@B.co' }], website: 'https://cafe.in/' };
    // The phone pattern matches a longer number ending the same way; the exact key does not.
    expect(phonePattern('1234567').test('+91 99912 34567')).toBe(true);
    expect(probesHeldBy(stored, probes).map((p) => p.field)).toEqual(['EMAIL', 'WEBSITE']);
  });

  it('is empty for a lead that shares nothing', () => {
    expect(probesHeldBy({ contacts: [{ mobile_number: '9999999999' }], website: 'other.in' }, probes)).toEqual([]);
  });
});
