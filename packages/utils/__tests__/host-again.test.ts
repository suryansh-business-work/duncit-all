import { describe, expect, it } from 'vitest';
import { HOST_AGAIN_NOTICE_KEYS, HOST_AGAIN_PARAM, hostAgainNoticeKeys } from '../src/host-again';

describe('hostAgainNoticeKeys', () => {
  it('words every code the server sends, in the order it sent them', () => {
    expect(hostAgainNoticeKeys(['VENUE_UNAVAILABLE', 'CLUB_UNAVAILABLE', 'PRODUCTS_UNAVAILABLE'])).toEqual([
      'mweb.createPod.hostAgain.venueUnavailable',
      'mweb.createPod.hostAgain.clubUnavailable',
      'mweb.createPod.hostAgain.productsUnavailable',
    ]);
  });

  it('covers the location and category codes too', () => {
    expect(hostAgainNoticeKeys(['LOCATION_MISSING', 'CATEGORY_MISSING'])).toEqual([
      'mweb.createPod.hostAgain.locationMissing',
      'mweb.createPod.hostAgain.categoryMissing',
    ]);
  });

  it('skips a code this build does not know instead of showing a raw key', () => {
    expect(hostAgainNoticeKeys(['VENUE_GONE_TO_MARS', 'LOCATION_MISSING'])).toEqual([
      'mweb.createPod.hostAgain.locationMissing',
    ]);
  });

  it('does not mistake an inherited object property for a code', () => {
    expect(hostAgainNoticeKeys(['toString', 'constructor', '__proto__'])).toEqual([]);
  });

  it('says nothing when everything carried over', () => {
    expect(hostAgainNoticeKeys([])).toEqual([]);
  });

  it('keeps every key under the Host again copy namespace', () => {
    for (const key of Object.values(HOST_AGAIN_NOTICE_KEYS)) {
      expect(key.startsWith('mweb.createPod.hostAgain.')).toBe(true);
    }
  });

  it('names the search param the Create Pod route reads', () => {
    expect(HOST_AGAIN_PARAM).toBe('host_again');
  });
});
