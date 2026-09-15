import { describe, expect, it } from 'vitest';
import {
  buildProfileDemographicsLabels,
  fromPetOwnerValue,
  toGenderValue,
  toPetOwnerValue,
} from '../src/profile-demographics';

describe('toGenderValue', () => {
  it('passes a stored gender through as the select value', () => {
    expect(toGenderValue('FEMALE')).toBe('FEMALE');
  });

  it('reads unanswered or unknown values as empty', () => {
    expect(toGenderValue(null)).toBe('');
    expect(toGenderValue(undefined)).toBe('');
    expect(toGenderValue('UNKNOWN')).toBe('');
  });
});

describe('pet owner mapping', () => {
  it('maps the stored boolean onto Yes / No / unanswered', () => {
    expect(toPetOwnerValue(true)).toBe('YES');
    expect(toPetOwnerValue(false)).toBe('NO');
    expect(toPetOwnerValue(null)).toBe('');
  });

  it('maps the select back, omitting an unanswered field so a save never clears it', () => {
    expect(fromPetOwnerValue('YES')).toBe(true);
    expect(fromPetOwnerValue('NO')).toBe(false);
    expect(fromPetOwnerValue('')).toBeUndefined();
  });
});

describe('buildProfileDemographicsLabels', () => {
  it('builds both option lists in order from the translator', () => {
    const labels = buildProfileDemographicsLabels((key) => `[${key}]`);
    expect(labels.genderLabel).toBe('[mweb.accountEdit.gender.label]');
    expect(labels.genderPlaceholder).toBe('[mweb.accountEdit.gender.placeholder]');
    expect(labels.genderOptions.map((o) => o.value)).toEqual(['MALE', 'FEMALE', 'OTHER']);
    expect(labels.genderOptions[2].label).toBe('[mweb.accountEdit.gender.other]');
    expect(labels.petOwnerLabel).toBe('[mweb.accountEdit.petOwner.label]');
    expect(labels.petOwnerPlaceholder).toBe('[mweb.accountEdit.petOwner.placeholder]');
    expect(labels.petOwnerOptions).toEqual([
      { value: 'YES', label: '[mweb.accountEdit.petOwner.yes]' },
      { value: 'NO', label: '[mweb.accountEdit.petOwner.no]' },
    ]);
  });
});
