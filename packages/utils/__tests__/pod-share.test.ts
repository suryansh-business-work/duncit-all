import { describe, expect, it } from 'vitest';
import {
  buildPodShareMessage,
  podMapLink,
  type PodShareInput,
  type PodShareVenue,
} from '../src/pod-share';

const MAPS = 'https://www.google.com/maps/search/?api=1&query=';
const URL = 'https://mweb.duncit.com/pod/abc123';
/** The map link for the default `venue()` fixture, spelled out once. */
const VENUE_MAP = `${MAPS}Blue%20Tokai%2C%20Koramangala%2C%20Bengaluru`;

/** A real-world venue with both halves of its address set. */
const venue = (over: Partial<PodShareVenue> = {}): PodShareVenue => ({
  place_label: 'Blue Tokai',
  place_detail: 'Koramangala, Bengaluru',
  ...over,
});

/** A fully-populated share input; tests blank out the part under test. */
const input = (over: Partial<PodShareInput> = {}): PodShareInput => ({
  title: 'Sunday Run Club',
  whenText: 'Sun, 24 Aug · 7:00 AM',
  venue: venue(),
  url: URL,
  ...over,
});

describe('podMapLink', () => {
  it('searches Google Maps for the label and detail, comma-joined and percent-encoded', () => {
    // The key-less cross-platform search URL: the whole venue text is one
    // query so Maps resolves the place rather than just the street.
    expect(podMapLink(venue())).toBe(`${MAPS}Blue%20Tokai%2C%20Koramangala%2C%20Bengaluru`);
  });

  it('searches on whichever half of the address the pod has', () => {
    expect(podMapLink(venue({ place_detail: null }))).toBe(`${MAPS}Blue%20Tokai`);
    expect(podMapLink(venue({ place_label: undefined }))).toBe(`${MAPS}Koramangala%2C%20Bengaluru`);
  });

  it('encodes characters that would otherwise break the query string', () => {
    expect(podMapLink({ place_label: 'Café & Bar', place_detail: '#12/3 MG Rd' })).toBe(
      `${MAPS}Caf%C3%A9%20%26%20Bar%2C%20%2312%2F3%20MG%20Rd`,
    );
  });

  // A virtual pod has no place: the caller drops the line rather than sharing
  // a link that searches for nothing.
  it('returns null for a pod with no place at all', () => {
    expect(podMapLink(null)).toBeNull();
    expect(podMapLink(undefined)).toBeNull();
    expect(podMapLink({})).toBeNull();
    expect(podMapLink({ place_label: null, place_detail: null })).toBeNull();
    expect(podMapLink({ place_label: '', place_detail: '' })).toBeNull();
  });

  it('treats a whitespace-only address as no place', () => {
    expect(podMapLink({ place_label: '   ', place_detail: null })).toBeNull();
  });
});

describe('buildPodShareMessage', () => {
  it('reads title, when, where, map link, then the pod link — one per line, in that order', () => {
    expect(buildPodShareMessage(input())).toBe(
      [
        'Sunday Run Club',
        'When: Sun, 24 Aug · 7:00 AM',
        'Where: Blue Tokai · Koramangala, Bengaluru',
        `Location: ${VENUE_MAP}`,
        `Join on Duncit: ${URL}`,
      ].join('\n'),
    );
  });

  it('always ends with the pod link, even when nothing else is known', () => {
    // The mWeb bug this replaces: the URL rode in a separate share field, so
    // apps that ignored it delivered a bare "When/Where" with no way to join.
    expect(buildPodShareMessage({ venue: null, url: URL })).toBe(`Join on Duncit: ${URL}`);
  });

  it('drops the title line when the pod has none, instead of a blank first line', () => {
    // Whole-message equality: the rest of the share must be untouched when the
    // title goes — no blank line, no shifted label.
    const untitled = [
      'When: Sun, 24 Aug · 7:00 AM',
      'Where: Blue Tokai · Koramangala, Bengaluru',
      `Location: ${VENUE_MAP}`,
      `Join on Duncit: ${URL}`,
    ].join('\n');
    for (const title of [null, undefined, '', '   ']) {
      expect(buildPodShareMessage(input({ title }))).toBe(untitled);
    }
  });

  it('drops the When line rather than leaving a dangling label', () => {
    const undated = [
      'Sunday Run Club',
      'Where: Blue Tokai · Koramangala, Bengaluru',
      `Location: ${VENUE_MAP}`,
      `Join on Duncit: ${URL}`,
    ].join('\n');
    for (const whenText of [null, undefined, '', '  ']) {
      expect(buildPodShareMessage(input({ whenText }))).toBe(undated);
    }
  });

  it('trims the caller-formatted title and date text', () => {
    const msg = buildPodShareMessage(input({ title: '  Sunday Run Club  ', whenText: ' 7:00 AM ' }));
    expect(msg.split('\n').slice(0, 2)).toEqual(['Sunday Run Club', 'When: 7:00 AM']);
  });

  it('drops both the Where and Location lines for a virtual pod', () => {
    for (const v of [null, undefined, {}, { place_label: '', place_detail: null }]) {
      const msg = buildPodShareMessage(input({ venue: v }));
      expect(msg).not.toContain('Where:');
      expect(msg).not.toContain('Location:');
      expect(msg.split('\n')).toEqual([
        'Sunday Run Club',
        'When: Sun, 24 Aug · 7:00 AM',
        `Join on Duncit: ${URL}`,
      ]);
    }
  });

  it('shows just the known half of the address, with a matching map link', () => {
    expect(buildPodShareMessage(input({ venue: venue({ place_detail: null }) }))).toBe(
      [
        'Sunday Run Club',
        'When: Sun, 24 Aug · 7:00 AM',
        'Where: Blue Tokai',
        `Location: ${MAPS}Blue%20Tokai`,
        `Join on Duncit: ${URL}`,
      ].join('\n'),
    );
    expect(buildPodShareMessage(input({ venue: venue({ place_label: '' }) }))).toBe(
      [
        'Sunday Run Club',
        'When: Sun, 24 Aug · 7:00 AM',
        'Where: Koramangala, Bengaluru',
        `Location: ${MAPS}Koramangala%2C%20Bengaluru`,
        `Join on Duncit: ${URL}`,
      ].join('\n'),
    );
  });

  // The readable line and the map query are built from the same two fields but
  // joined differently: a middle dot for the eye, a comma for Maps' search.
  it('separates label and detail with a middle dot in the Where line', () => {
    const msg = buildPodShareMessage(input());
    expect(msg).toContain('Where: Blue Tokai · Koramangala, Bengaluru');
    expect(msg).not.toContain('Where: Blue Tokai, Koramangala');
  });
});
