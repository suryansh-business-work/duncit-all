import { describe, expect, it } from 'vitest';
import type { FieldErrors } from 'react-hook-form';
import { BRAND_WIZARD_STEPS, brandStepStates, type BrandWizardStepKey } from '@duncit/utils';
import { blankBrand, makeBrandSchema, type BrandFormValues } from '../schema';
import { stepProblems, toFacts } from './wizard-steps';

const MISSING = 'Required details are missing.';
const indexOf = (key: BrandWizardStepKey) => BRAND_WIZARD_STEPS.findIndex((step) => step.key === key);
const statesOf = (values: Partial<BrandFormValues>) => brandStepStates(toFacts({ ...blankBrand, ...values }, {}));
const error = (message: string) => ({ type: 'custom', message });

describe('stepProblems', () => {
  it("lists every message on a step's own fields, in field order, and nothing on the others", () => {
    const errors: FieldErrors<BrandFormValues> = {
      postal_code: error('Enter a valid 6-digit PIN code.'),
      address_line1: error('Enter the full address.'),
      contact_phone: error('Enter a valid 10-digit mobile number.'),
    };
    const problems = stepProblems(errors, statesOf({}), 0, MISSING);

    expect(problems.address).toEqual(['Enter the full address.', 'Enter a valid 6-digit PIN code.']);
    expect(problems.details).toEqual(['Enter a valid 10-digit mobile number.']);
    expect(problems.business).toEqual([]);
    expect(Object.keys(problems).sort()).toEqual(BRAND_WIZARD_STEPS.map((step) => step.key).sort());
  });

  it('says once what two fields both say', () => {
    const errors: FieldErrors<BrandFormValues> = {
      website_url: error('Enter a valid link.'),
      instagram_url: error('Enter a valid link.'),
    };
    expect(stepProblems(errors, statesOf({}), 0, MISSING).details).toEqual(['Enter a valid link.']);
  });

  it('marks a required step the partner moved past while it is still incomplete', () => {
    const problems = stepProblems({}, statesOf({}), indexOf('address'), MISSING);
    // Details and Business are behind the open step and unfinished.
    expect(problems.details).toEqual([MISSING]);
    expect(problems.business).toEqual([MISSING]);
    // The open step, and the ones not reached yet, are not nagged about what is simply not typed.
    expect(problems.address).toEqual([]);
    expect(problems.categories).toEqual([]);
  });

  it('leaves a finished step, and an optional one, unmarked however far the partner has gone', () => {
    const done = statesOf({ brand_name: 'Chai Point', description: 'Small-batch masala chai kits.', contact_email: 'a@b.in' });
    const problems = stepProblems({}, done, BRAND_WIZARD_STEPS.length - 1, MISSING);
    expect(problems.details).toEqual([]);
    // Payout is optional — skipping it is not a problem.
    expect(problems.payout).toEqual([]);
    // Consent has no form fields of its own; its own step explains what it is waiting for.
    expect(problems.consent).toEqual([]);
  });

  it('ignores an error entry that carries no message', () => {
    const errors: FieldErrors<BrandFormValues> = { brand_name: { type: 'custom' } };
    expect(stepProblems(errors, statesOf({}), 0, MISSING).details).toEqual([]);
  });
});

describe('makeBrandSchema — the address and phone ShipRocket is handed', () => {
  const schema = makeBrandSchema((key) => key);
  const messagesFor = (values: Partial<BrandFormValues>) => {
    const result = schema.safeParse({ ...blankBrand, ...values });
    return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  };

  it('lets a draft stay blank', () => {
    expect(messagesFor({})).toEqual([]);
  });

  it('accepts a full Indian address and mobile, however the number is written', () => {
    expect(
      messagesFor({ address_line1: '12 MG Road, Indiranagar', postal_code: '560001', contact_phone: '+91 98765 43210' }),
    ).toEqual([]);
  });

  it('refuses a street line under ten characters, and takes exactly ten', () => {
    expect(messagesFor({ address_line1: 'Sector 5' })).toEqual(['address_line1: partners.brandWizard.validation.addressMin']);
    expect(messagesFor({ address_line1: '12 MG Road' })).toEqual([]);
  });

  it('refuses a PIN that is not six digits or starts with zero', () => {
    const pin = 'postal_code: partners.brandWizard.validation.pincode';
    expect(messagesFor({ postal_code: '5600' })).toEqual([pin]);
    expect(messagesFor({ postal_code: '56000A' })).toEqual([pin]);
    expect(messagesFor({ postal_code: '060001' })).toEqual([pin]);
  });

  it('refuses a phone that is not a ten-digit Indian mobile', () => {
    const phone = 'contact_phone: partners.brandWizard.validation.phone';
    expect(messagesFor({ contact_phone: '98765' })).toEqual([phone]);
    expect(messagesFor({ contact_phone: '1234567890' })).toEqual([phone]);
  });
});
