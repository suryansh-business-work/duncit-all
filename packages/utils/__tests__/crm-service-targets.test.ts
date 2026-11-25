import { describe, expect, it } from 'vitest';
import {
  CRM_SERVICE_TARGETS,
  crmAllServiceTargets,
  crmDefaultServiceTargets,
  crmHasAnyServiceTarget,
  crmNormalizeServiceTitles,
  crmPickServiceTargets,
  crmServiceTargetFlag,
  crmServiceTargetLabelKeys,
  type CrmServiceTargetKind,
} from '../src/crm-service-targets';

/** CRM › Data › Services Offered: the lead kinds a service shows on, and the titles it is saved with. */

const noneOn = {
  applies_to_venue: false,
  applies_to_host: false,
  applies_to_ecomm: false,
  applies_to_creator: false,
  applies_to_community: false,
};
const allOn = {
  applies_to_venue: true,
  applies_to_host: true,
  applies_to_ecomm: true,
  applies_to_creator: true,
  applies_to_community: true,
};

describe('CRM_SERVICE_TARGETS', () => {
  it('lists the five lead kinds once each, with the flag the server stores and the label key', () => {
    expect(CRM_SERVICE_TARGETS.map((t) => [t.kind, t.flag, t.labelKey])).toEqual([
      ['VENUE', 'applies_to_venue', 'crm.common.venue'],
      ['HOST', 'applies_to_host', 'crm.common.host'],
      ['ECOMM', 'applies_to_ecomm', 'crm.common.ecomm'],
      ['CREATOR', 'applies_to_creator', 'crm.common.creator'],
      ['COMMUNITY', 'applies_to_community', 'crm.common.community'],
    ]);
  });
});

describe('crmDefaultServiceTargets', () => {
  it('turns on venue and host, the kinds that predate the flags, and leaves the rest off', () => {
    expect(crmDefaultServiceTargets()).toEqual({ ...noneOn, applies_to_venue: true, applies_to_host: true });
  });

  it('returns a fresh object each time', () => {
    const first = crmDefaultServiceTargets();
    first.applies_to_ecomm = true;
    expect(crmDefaultServiceTargets().applies_to_ecomm).toBe(false);
  });
});

describe('crmAllServiceTargets', () => {
  it('turns every kind on, or every kind off', () => {
    expect(crmAllServiceTargets(true)).toEqual(allOn);
    expect(crmAllServiceTargets(false)).toEqual(noneOn);
  });
});

describe('crmPickServiceTargets', () => {
  it('keeps only the five flags from a row that carries other fields', () => {
    const row = { id: 's1', title: 'Catering', ...noneOn, applies_to_ecomm: true, applies_to_community: true };
    expect(crmPickServiceTargets(row)).toEqual({ ...noneOn, applies_to_ecomm: true, applies_to_community: true });
  });

  it('treats a missing or non-true flag as off', () => {
    expect(crmPickServiceTargets({ applies_to_venue: true })).toEqual({ ...noneOn, applies_to_venue: true });
    expect(crmPickServiceTargets({})).toEqual(noneOn);
  });
});

describe('crmHasAnyServiceTarget', () => {
  it('is false only when every kind is off', () => {
    expect(crmHasAnyServiceTarget(noneOn)).toBe(false);
    for (const target of CRM_SERVICE_TARGETS) {
      expect(crmHasAnyServiceTarget({ ...noneOn, [target.flag]: true })).toBe(true);
    }
  });
});

describe('crmServiceTargetFlag', () => {
  it('maps every lead kind to its catalogue flag', () => {
    expect(crmServiceTargetFlag('VENUE')).toBe('applies_to_venue');
    expect(crmServiceTargetFlag('HOST')).toBe('applies_to_host');
    expect(crmServiceTargetFlag('ECOMM')).toBe('applies_to_ecomm');
    expect(crmServiceTargetFlag('CREATOR')).toBe('applies_to_creator');
    expect(crmServiceTargetFlag('COMMUNITY')).toBe('applies_to_community');
  });

  it('falls back to the venue flag for a kind it does not know (an older client)', () => {
    expect(crmServiceTargetFlag('PARTNER' as CrmServiceTargetKind)).toBe('applies_to_venue');
  });
});

describe('crmServiceTargetLabelKeys', () => {
  it('names the kinds that are on, in list order', () => {
    expect(crmServiceTargetLabelKeys({ ...noneOn, applies_to_creator: true, applies_to_venue: true })).toEqual([
      'crm.common.venue',
      'crm.common.creator',
    ]);
  });

  it('collapses every kind on into "All lead types"', () => {
    expect(crmServiceTargetLabelKeys(allOn)).toEqual(['crm.data.allLeadTypes']);
  });

  it('is empty when no kind is on or the flags are missing', () => {
    expect(crmServiceTargetLabelKeys(noneOn)).toEqual([]);
    expect(crmServiceTargetLabelKeys({})).toEqual([]);
  });
});

describe('crmNormalizeServiceTitles', () => {
  it('trims each title, drops blanks and keeps the first of a repeated title', () => {
    expect(crmNormalizeServiceTitles(['Catering', '  Decor  ', '', '   ', 'Catering', 'Decor'])).toEqual([
      'Catering',
      'Decor',
    ]);
  });

  it('keeps titles that differ only in case, as the portal does (the server checks those)', () => {
    expect(crmNormalizeServiceTitles(['Sound', 'sound'])).toEqual(['Sound', 'sound']);
  });

  it('returns an empty list for no titles', () => {
    expect(crmNormalizeServiceTitles([])).toEqual([]);
  });
});
