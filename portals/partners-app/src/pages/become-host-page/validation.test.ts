import { describe, expect, it } from 'vitest';
import { validateHostStep } from './validation';
import { blankHostStep1, blankHostStep2, blankHostStep3 } from './types';

const step1 = { full_name: 'Asha Rao', email: 'asha@duncit.com', phone: '9876543210', dob: '1990-05-10' };
const step2 = { aadhar_number: '123412341234', pan_number: 'abcde1234f', passport_photo_url: 'https://cdn.duncit.com/me.jpg' };
const step3 = { police_verification_url: 'https://cdn.duncit.com/p.pdf', full_address: '12 Main Street, Pune' };

const check = (step: number, over: Partial<{ s1: object; s2: object; s3: object }> = {}) =>
  validateHostStep(
    step,
    { ...step1, ...over.s1 },
    { ...step2, ...over.s2 },
    { ...step3, ...over.s3 },
  );

describe('validateHostStep', () => {
  it('passes every step of a complete application', async () => {
    expect(await check(0)).toBeNull();
    expect(await check(1)).toBeNull();
    expect(await check(2)).toBeNull();
  });

  it('has nothing to check on the final step', async () => {
    expect(await validateHostStep(3, blankHostStep1, blankHostStep2, blankHostStep3)).toBeNull();
  });

  it('accepts a missing date of birth', async () => {
    expect(await check(0, { s1: { dob: '' } })).toBeNull();
  });

  it('refuses a host under 18 with the age range message', async () => {
    const underage = new Date();
    underage.setFullYear(underage.getFullYear() - 10);
    expect(await check(0, { s1: { dob: underage.toISOString().slice(0, 10) } })).toBe(
      'Host age must be between 18 and 100 years',
    );
  });

  it('names the first thing wrong on step one', async () => {
    expect(await validateHostStep(0, blankHostStep1, blankHostStep2, blankHostStep3)).toEqual(expect.any(String));
    expect(await check(0, { s1: { full_name: '' } })).toMatch(/name/i);
  });

  it('refuses an Aadhar that is not 12 digits and a PAN that is not in the PAN format', async () => {
    expect(await check(1, { s2: { aadhar_number: '1234' } })).toBe('Aadhar must be 12 digits');
    expect(await check(1, { s2: { pan_number: 'nope' } })).toBe('PAN must follow format ABCDE1234F');
  });

  it('upper-cases a PAN typed in lower case instead of refusing it', async () => {
    expect(await check(1, { s2: { pan_number: 'abcde1234f' } })).toBeNull();
  });

  it('asks for the passport photo, treating a blank one like a missing one', async () => {
    expect(await check(1, { s2: { passport_photo_url: '' } })).toBe('Passport-size photo is required');
    expect(await check(1, { s2: { passport_photo_url: '   ' } })).toBe('Passport-size photo is required');
    expect(await check(1, { s2: { passport_photo_url: undefined } })).toBe('Passport-size photo is required');
  });

  it('asks for the police certificate and a full address', async () => {
    expect(await check(2, { s3: { police_verification_url: '' } })).toBe('Police verification is required');
    expect(await check(2, { s3: { full_address: 'x' } })).toEqual(expect.any(String));
  });
});
