import { describe, expect, it } from 'vitest';
import { POD_VIABILITY_REASONS } from '@duncit/utils';
import {
  ECONOMICS_FIELDS,
  POD_FORM_VIABILITY_KEYS,
  economicsJudged,
  economicsTouched,
} from '../../src/finance/economicsGate';
import { PODFORM_FALLBACK_FLAT } from '../../src/i18n/useTranslation';

/** A paid physical pod as an edit loads it. */
const loaded = {
  pod_amount: 500,
  no_of_spots: 10,
  pod_type: 'PAID',
  pod_hosts_id: ['u1'],
  pod_mode: 'PHYSICAL',
  venue_id: 'v1',
  venue_slot_id: 's1',
  venue_offer_model: '',
  venue_offer_rate: '',
};

describe('economicsTouched', () => {
  it('is false while every money field is as loaded — an amount typed back as text included', () => {
    expect(economicsTouched(loaded, { ...loaded })).toBe(false);
    expect(economicsTouched(loaded, { ...loaded, pod_amount: '500', no_of_spots: '10' })).toBe(false);
  });

  it.each([
    ['pod_amount', 600],
    ['no_of_spots', 12],
    ['pod_type', 'FREE'],
    ['pod_hosts_id', ['u2']],
    ['pod_mode', 'VIRTUAL'],
    ['venue_id', 'v2'],
    ['venue_slot_id', 's2'],
    ['venue_offer_model', 'FLAT'],
    ['venue_offer_rate', '4000'],
  ])('notices a changed %s', (field, value) => {
    expect(economicsTouched(loaded, { ...loaded, [field]: value })).toBe(true);
  });

  it('judges every field the server guard reads, and nothing else', () => {
    expect([...ECONOMICS_FIELDS].sort()).toEqual(Object.keys(loaded).sort());
    // A title, a description or the media are not money.
    expect(economicsTouched(loaded, { ...loaded, pod_title: 'A new title' } as typeof loaded)).toBe(false);
  });

  it('reads the host list in order, and a cleared field as one never set', () => {
    expect(economicsTouched({ ...loaded, pod_hosts_id: ['u1', 'u2'] }, { ...loaded, pod_hosts_id: ['u2', 'u1'] })).toBe(true);
    expect(economicsTouched({ ...loaded, venue_slot_id: undefined }, { ...loaded, venue_slot_id: null })).toBe(false);
  });

  it('treats a form with nothing loaded as changed wherever it holds money', () => {
    expect(economicsTouched(undefined, loaded)).toBe(true);
    expect(economicsTouched(undefined, {})).toBe(false);
  });
});

describe('economicsJudged', () => {
  const base = { enabled: true, isFree: false, podAmount: 500, editing: false, podClosed: false, touched: false };

  it('judges every paid pod being created', () => {
    expect(economicsJudged(base)).toBe(true);
  });

  it('judges an edit only when it changed the money', () => {
    expect(economicsJudged({ ...base, editing: true, touched: false })).toBe(false);
    expect(economicsJudged({ ...base, editing: true, touched: true })).toBe(true);
  });

  it('never judges a completed or cancelled pod, whatever changed', () => {
    expect(economicsJudged({ ...base, editing: true, touched: true, podClosed: true })).toBe(false);
  });

  it('never judges a free pod, a pod with no price yet, or a form that draws no projection', () => {
    expect(economicsJudged({ ...base, isFree: true })).toBe(false);
    expect(economicsJudged({ ...base, podAmount: 0 })).toBe(false);
    expect(economicsJudged({ ...base, enabled: false })).toBe(false);
  });
});

describe('POD_FORM_VIABILITY_KEYS', () => {
  it('words every reason from copy the pod form ships', () => {
    for (const reason of POD_VIABILITY_REASONS) {
      for (const key of [
        POD_FORM_VIABILITY_KEYS.title[reason],
        POD_FORM_VIABILITY_KEYS.withPrice[reason],
        POD_FORM_VIABILITY_KEYS.withoutPrice[reason],
      ]) {
        expect(PODFORM_FALLBACK_FLAT[key], key).toEqual(expect.any(String));
      }
    }
    expect(PODFORM_FALLBACK_FLAT[POD_FORM_VIABILITY_KEYS.withPrice.BELOW_MIN_BUSINESS]).toContain('{minimum}');
    expect(PODFORM_FALLBACK_FLAT[POD_FORM_VIABILITY_KEYS.withPrice.BELOW_MIN_BUSINESS]).toContain('{price}');
  });
});
