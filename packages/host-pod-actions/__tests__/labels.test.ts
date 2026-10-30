import { describe, expect, it, vi } from 'vitest';

import {
  buildHostPodActionLabels,
  mwebHostPodLabels,
  shellHostPodLabels,
  type HostPodActionLabels,
} from '../src/labels';

/** Echoes the key (and any vars) back, so a test can read what was asked for. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key;

const strings = (labels: HostPodActionLabels) =>
  Object.entries(labels).filter((entry): entry is [string, string] => typeof entry[1] === 'string');

const builders = (labels: HostPodActionLabels) =>
  Object.entries(labels).filter((entry): entry is [string, (...args: never[]) => string] =>
    typeof entry[1] === 'function'
  );

describe('the two namespaces', () => {
  it('reads mWeb copy from mweb.* — the namespace the native app shares with it', () => {
    for (const [field, value] of strings(mwebHostPodLabels(t))) {
      expect(value, field).toMatch(/^mweb\./);
    }
  });

  it('reads portal copy from shell.*', () => {
    for (const [field, value] of strings(shellHostPodLabels(t))) {
      expect(value, field).toMatch(/^shell\./);
    }
  });

  it('offers the same fields on both surfaces, so neither can drift a label the other has', () => {
    expect(Object.keys(mwebHostPodLabels(t)).sort()).toEqual(Object.keys(shellHostPodLabels(t)).sort());
  });

  it('names the SAME key suffix on both, differing only in the namespace', () => {
    const suffix = (labels: HostPodActionLabels) =>
      strings(labels).map(([field, value]) => `${field}=${value.split('.').slice(1).join('.')}`);

    expect(suffix(mwebHostPodLabels(t))).toEqual(suffix(shellHostPodLabels(t)));
  });

  // The venue-bill words are @duncit/utils' own block, nested rather than flat
  // — so the string checks above never see them.
  it('reads the venue-bill block from the same namespace as the rest of the surface', () => {
    const mweb = mwebHostPodLabels(t).venueBill;
    const shell = shellHostPodLabels(t).venueBill;

    expect(mweb.billTotal).toBe('mweb.venueBill.billTotal');
    expect(mweb.billUploadRequired).toBe('mweb.venueBill.billUploadRequired');
    expect(mweb.extra).toBe('mweb.venueBill.extra');
    expect(mweb.attendeesValue(8, 10)).toBe('mweb.venueBill.attendeesValue({"attended":8,"booked":10})');
    expect(mweb.paidGuestsValue(9, 8)).toBe('mweb.venueBill.paidGuestsValue({"count":9,"min":8})');
    expect(shell.billTotal).toBe('shell.venueBill.billTotal');
    expect(shell.extraCharges).toBe('shell.venueBill.extraCharges');
    expect(shell.sentToFinance).toBe('shell.venueBill.sentToFinance');
    expect(Object.keys(shell).sort()).toEqual(Object.keys(mweb).sort());
  });

  // The Smart Incentive editor is @duncit/utils' own block too, nested two deep
  // (its errors and its explainer), so the flat string checks above miss it.
  it('reads the Smart Incentive block from the same namespace as the rest of the surface', () => {
    const mweb = mwebHostPodLabels(t).smartIncentive;
    const shell = shellHostPodLabels(t).smartIncentive;

    expect(mweb.title).toBe('mweb.smartIncentive.title');
    expect(mweb.pricePreview('₹424.15')).toBe('mweb.smartIncentive.pricePreview({"price":"₹424.15"})');
    expect(mweb.errors.PCT_MAX(20)).toBe('mweb.smartIncentive.errorPctMax({"max":20})');
    expect(mweb.info.what(15)).toBe('mweb.smartIncentive.infoWhat({"seconds":15})');
    expect(shell.title).toBe('shell.smartIncentive.title');
    expect(shell.errors.REQUIRED(20)).toBe('shell.smartIncentive.errorRequired');
    expect(shell.info.gotIt).toBe('shell.smartIncentive.gotIt');
    expect(Object.keys(shell).sort()).toEqual(Object.keys(mweb).sort());
    expect(Object.keys(shell.info).sort()).toEqual(Object.keys(mweb.info).sort());
  });

  // The agreed terms are the venue booking's own words, which every surface
  // ships under availability.* — so both builders read the same keys.
  it('reads the agreed terms from availability.* on both surfaces', () => {
    for (const labels of [mwebHostPodLabels(t), shellHostPodLabels(t)]) {
      expect(labels.agreedTerms.title).toBe('availability.offers.agreedTerms');
      expect(labels.agreedTerms.value('PER_GUEST', '₹300.00')).toBe(
        'availability.offers.termsLine({"model":"availability.offers.model.perGuest","rate":"availability.offers.rate.perGuest({\\"rate\\":\\"₹300.00\\"})"})',
      );
    }
  });

  it('states just the amount for a pricing option this client does not know', () => {
    expect(mwebHostPodLabels(t).agreedTerms.value('PER_MOON', '₹300.00')).toBe('₹300.00');
  });

  it('ships no English of its own — every string came from the translator', () => {
    const seen: string[] = [];
    const labels = mwebHostPodLabels((key) => {
      seen.push(key);
      return 'translated';
    });

    expect(seen.length).toBeGreaterThan(0);
    expect(new Set(strings(labels).map(([, value]) => value))).toEqual(new Set(['translated']));
  });
});

describe('buildHostPodActionLabels', () => {
  it('picks the namespace the calling surface ships', () => {
    expect(strings(buildHostPodActionLabels(t, 'mweb'))).toEqual(strings(mwebHostPodLabels(t)));
    expect(strings(buildHostPodActionLabels(t, 'shell'))).toEqual(strings(shellHostPodLabels(t)));
  });
});

describe('the interpolated labels', () => {
  it('passes its arguments through as translation vars rather than concatenating copy', () => {
    const labels = mwebHostPodLabels(t);

    expect(labels.shareMessage('Sunday Badminton')).toContain('Sunday Badminton');
    expect(labels.companionsBody(4, 2)).toContain('4');
    expect(labels.companionsBody(4, 2)).toContain('2');
    expect(labels.attendanceMarkedOne('Asha')).toContain('Asha');
    expect(labels.attendanceMarkedGroup('Asha', 3)).toContain('Asha');
    expect(labels.attendanceMarkedGroup('Asha', 3)).toContain('3');
    expect(labels.companionsHeading(2)).toContain('2');
  });

  it('calls the translator for every builder on both surfaces', () => {
    for (const namespace of ['mweb', 'shell'] as const) {
      const translate = vi.fn((key: string) => key);
      const labels = buildHostPodActionLabels(translate, namespace);
      translate.mockClear();

      for (const [field, build] of builders(labels)) {
        // Every builder takes (string) or (number) or (string, number); the
        // arguments are irrelevant, that it defers to the translator is not.
        expect(typeof (build as (...a: unknown[]) => string)('Asha', 2), field).toBe('string');
      }

      expect(translate).toHaveBeenCalled();
      for (const [key] of translate.mock.calls) expect(key).toMatch(new RegExp(`^${namespace}\\.`));
    }
  });
});
