/// <reference types="cypress" />
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS } from '@duncit/datetime';

/**
 * The date-of-birth box signup and Edit profile share (`DobDateField`).
 *
 * MUI X renders it as one contenteditable `role="spinbutton"` per part, named
 * Day / Month / Year. Parts are addressed by NAME, never by position: their
 * order and separators come from the admin's date format.
 */

export type DobPart = 'Day' | 'Month' | 'Year';
export type Dob = Readonly<Record<DobPart, string>>;

const DOB_PARTS: readonly DobPart[] = ['Day', 'Month', 'Year'];

/** Decades clear of any joining age. No leading zeros, so each part completes on its last digit. */
export const ADULT_DOB: Dob = { Day: '15', Month: '8', Year: '1995' };

const MIN_AGE_QUERY = `query E2eMinSignupAge {
  publicAppSettings { min_signup_age }
}`;

export const dobPart = (part: DobPart) =>
  cy.contains('label', 'Date of birth').parent().find(`[role="spinbutton"][aria-label="${part}"]`);

/** Type every part, checking each one landed. */
export function typeDob(dob: Dob): void {
  DOB_PARTS.forEach((part) => {
    dobPart(part).type(dob[part]).should('have.attr', 'aria-valuenow', dob[part]);
  });
}

export function expectDob(dob: Dob): void {
  DOB_PARTS.forEach((part) => {
    dobPart(part).should('have.attr', 'aria-valuenow', dob[part]);
  });
}

/** January 1st of the year that leaves the person one year short of the joining age. */
export function underAgeDob(minAge: number): Dob {
  return { Day: '1', Month: '1', Year: String(new Date().getFullYear() - minAge + 1) };
}

/** The joining age the admin set (Admin > Settings), read the way the app reads it. */
export const minSignupAge = () =>
  cy
    .gql<{ publicAppSettings: { min_signup_age: number | null } | null }>(MIN_AGE_QUERY, {}, { token: null })
    .then((data) => data.publicAppSettings?.min_signup_age ?? DEFAULT_MIN_ACCOUNT_AGE_YEARS);
