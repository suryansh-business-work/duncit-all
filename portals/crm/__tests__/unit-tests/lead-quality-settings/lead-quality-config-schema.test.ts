import { describe, expect, it } from 'vitest';
import { CombinedGraphQLErrors } from '@apollo/client';
import { leadQualityConfigSchema, formFieldName, isLeafPath, issueMessage, valuesFromConfig, type LeadQualityConfigFormValues } from '@/forms/lead-quality-config';
import { readFailure } from '@/pages/lead-quality-settings/readFailure';
import { englishT } from '../helpers/englishT';
import { configFixture, publishedFixture } from './fixtures';

type Edit = (values: LeadQualityConfigFormValues) => void;

/** The schema's issues for the fixture after `edit`, as `path → message`. */
function issues(mode: 'DRAFT' | 'PUBLISH', edit: Edit) {
  const values = valuesFromConfig(configFixture());
  edit(values);
  const result = leadQualityConfigSchema(englishT(), mode).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

describe('leadQualityConfigSchema (the generated server rules, mapped onto the form)', () => {
  it('accepts the publishable fixture in both modes, new rows without keys included', () => {
    const add: Edit = (v) => {
      v.criteria[2].weightage = '20';
      v.criteria.push({ ...v.criteria[2], key: '', name: 'Google Maps', weightage: '10', auto_check: 'GOOGLE_MAPS_LISTING' });
    };
    expect(issues('DRAFT', add)).toEqual([]);
    expect(issues('PUBLISH', add)).toEqual([]);
  });

  it('lets a draft stay under 100% but refuses it at publish, on the criteria list', () => {
    const under: Edit = (v) => {
      v.criteria[0].weightage = '15';
    };
    expect(issues('DRAFT', under)).toEqual([]);
    expect(issues('PUBLISH', under)).toEqual([{ path: 'criteria.root', message: 'Allocate the remaining 5% before publishing.' }]);
  });

  it('refuses more than 100% even in a draft', () => {
    const over: Edit = (v) => {
      v.criteria[0].weightage = '25';
    };
    expect(issues('DRAFT', over)).toEqual([{ path: 'criteria.root', message: 'Weightage cannot exceed 100%.' }]);
  });

  it('refuses sub-criteria short of their criterion only at publish', () => {
    const short: Edit = (v) => {
      v.criteria[1].sub_criteria[1].points = '15';
    };
    expect(issues('DRAFT', short)).toEqual([]);
    expect(issues('PUBLISH', short)).toEqual([{ path: 'criteria.1.sub_criteria.root', message: 'Give out the remaining 5 points before publishing.' }]);
  });

  it('puts each rule on the field it names: decimals, sub-criteria totals, thresholds, band starts', () => {
    expect(
      issues('DRAFT', (v) => {
        v.criteria[2].weightage = '30.555';
        v.criteria[1].sub_criteria[0].points = '35';
        v.criteria[1].sub_criteria[0].threshold = '12.5';
        v.bands[2].min = '40';
      }),
    ).toEqual([
      { path: 'criteria.1.sub_criteria.0.threshold', message: 'Enter a whole number from 1 to 10000000.' },
      { path: 'criteria.1.sub_criteria.root', message: "Sub-criteria points are 5 over this criterion's weightage." },
      { path: 'criteria.2.weightage', message: 'Use at most two decimals.' },
      { path: 'bands.2.min', message: 'Another band already starts at this score.' },
      { path: 'bands.root', message: 'One band must start at 0 so every score has a classification.' },
    ]);
  });

  it('asks for a number instead of reading blank, negative or out-of-range values as something else', () => {
    expect(
      issues('DRAFT', (v) => {
        v.criteria[0].weightage = '';
        v.criteria[1].sub_criteria[0].points = '-5';
        v.qualify_on_gates = false;
        v.min_qualification_score = '101';
      }),
    ).toEqual([
      { path: 'criteria.0.weightage', message: 'Enter a number.' },
      { path: 'criteria.1.sub_criteria.0.points', message: 'Enter a value from 0 to 100.' },
      { path: 'min_qualification_score', message: 'Enter a value from 0 to 100.' },
    ]);
  });

  it('refuses a check on a criterion that has sub-criteria, and a duplicate stored key on the row name', () => {
    expect(
      issues('DRAFT', (v) => {
        v.criteria[1].auto_check = 'WEBSITE_REACHABLE';
        v.criteria[2].key = 'uniqueness';
        v.criteria[0].name = '   ';
      }),
    ).toEqual([
      { path: 'criteria.0.name', message: 'Enter a name.' },
      { path: 'criteria.1.auto_check', message: 'A criterion with sub-criteria is checked through them. Choose "Verified by a person" here and set the check on a sub-criterion.' },
      { path: 'criteria.2.name', message: 'Another row has the same stored key. Delete one of them and add it again.' },
    ]);
  });
});

describe('issue mapping', () => {
  it('sends key problems to the name (a band label) and list problems to the list root', () => {
    expect(formFieldName('criteria.3.key')).toBe('criteria.3.name');
    expect(formFieldName('criteria.0.sub_criteria.2.key')).toBe('criteria.0.sub_criteria.2.name');
    expect(formFieldName('bands.1.key')).toBe('bands.1.label');
    expect(formFieldName('criteria')).toBe('criteria.root');
    expect(formFieldName('criteria.2.sub_criteria')).toBe('criteria.2.sub_criteria.root');
    expect(formFieldName('min_qualification_score')).toBe('min_qualification_score');
    expect(isLeafPath('criteria.0.weightage')).toBe(true);
    expect(isLeafPath('criteria.root')).toBe(false);
  });

  it('translates by code with the amount, and keeps the server sentence for a code this build does not know', () => {
    const t = englishT();
    expect(issueMessage(t, { path: 'criteria', code: 'TOO_MANY', message: 'x', amount: 30 })).toBe('Too many rows here: the limit is 30.');
    expect(issueMessage(t, { path: 'criteria.0.name', code: 'NEW_RULE', message: 'A rule from a newer server.' })).toBe('A rule from a newer server.');
  });

  it('loads a published version with a fresh change note and a null minimum as "gates only"', () => {
    const values = valuesFromConfig(publishedFixture({ min_qualification_score: null }));
    expect(values.change_note).toBe('');
    expect(values.qualify_on_gates).toBe(true);
    expect(values.min_qualification_score).toBe('');
    expect(valuesFromConfig(configFixture()).change_note).toBe('Tuned weights');
  });
});

describe('readFailure', () => {
  const refusal = (extensions: Record<string, unknown>, message = 'Refused') =>
    new CombinedGraphQLErrors({ errors: [{ message, extensions }] });

  it('reads a CONFLICT as "reload"', () => {
    expect(readFailure(refusal({ code: 'CONFLICT' }, 'Someone else saved'))).toEqual({ conflict: true, issues: [], message: 'Someone else saved' });
  });

  it('keeps only well-formed issues from a BAD_USER_INPUT refusal', () => {
    const issue = { path: 'criteria.0.name', code: 'NAME_REQUIRED', message: 'Enter a name.', amount: null };
    const read = readFailure(refusal({ code: 'BAD_USER_INPUT', issues: [issue, { path: 3 }, null] }));
    expect(read).toEqual({ conflict: false, issues: [issue], message: 'Refused' });
  });

  it('ignores issues on any other code', () => {
    expect(readFailure(refusal({ code: 'FORBIDDEN', issues: [{ path: 'a', code: 'b', message: 'c' }] }, 'Not allowed'))).toEqual({
      conflict: false,
      issues: [],
      message: 'Not allowed',
    });
  });
});
