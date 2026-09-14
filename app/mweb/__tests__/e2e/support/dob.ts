/// <reference types="cypress" />
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS, muiDateFormats } from '@duncit/datetime';
import { format, isValid, parse } from 'date-fns';

/**
 * The date-of-birth box signup and Edit profile share (`DobDateField`).
 *
 * MUI X draws the box as one contenteditable part per Day / Month / Year, and
 * none of those parts can carry a test id. Beside them sits the field's hidden
 * `<input>` — `field-dob-input` — which is what browser autofill writes to: MUI
 * parses whatever lands there in the field's own pattern. The specs hand the
 * whole date to that input, written in the pattern the app derives from the
 * admin's date format (`muiDateFormats(...).keyboardDate`, the same call the
 * app's `DuncitLocalizationProvider` makes).
 */

export type DobPart = 'Day' | 'Month' | 'Year';
export type Dob = Readonly<Record<DobPart, string>>;

/** Decades clear of any joining age. */
export const ADULT_DOB: Dob = { Day: '15', Month: '8', Year: '1995' };

const DATE_SETTINGS_QUERY = `query E2eDateSettings {
  publicAppSettings { date_format time_format min_signup_age }
}`;

type DateSettings = {
  publicAppSettings: {
    date_format: string | null;
    time_format: string | null;
    min_signup_age: number | null;
  } | null;
};

const dateSettings = () => cy.gql<DateSettings>(DATE_SETTINGS_QUERY, {}, { token: null });

/** The pattern the date box types and parses in. */
const dobPattern = () =>
  dateSettings().then(
    (data) => muiDateFormats(data.publicAppSettings?.date_format, data.publicAppSettings?.time_format).keyboardDate,
  );

const toDate = (dob: Dob): Date => new Date(Number(dob.Year), Number(dob.Month) - 1, Number(dob.Day));

/** Write the whole date into the field, as autofill would, and let MUI parse it. */
export function typeDob(dob: Dob): void {
  dobPattern().then((pattern) => {
    cy.byTestId('field-dob-input').then(($input) => {
      const input = $input[0] as HTMLInputElement;
      const win = input.ownerDocument.defaultView as Window & typeof globalThis;
      // The prototype's setter, not `input.value =`: React tracks the instance
      // property, and only a value it did not see set counts as a change.
      const setValue = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')?.set;
      setValue?.call(input, format(toDate(dob), pattern));
      input.dispatchEvent(new win.Event('input', { bubbles: true }));
    });
  });
  expectDob(dob);
}

/** The field holds this date, read back in its own pattern. */
export function expectDob(dob: Dob): void {
  const expected = format(toDate(dob), 'yyyy-MM-dd');
  dobPattern().then((pattern) => {
    cy.byTestId('field-dob-input').should(($input) => {
      const held = parse(String($input.val()), pattern, new Date());
      expect(isValid(held) ? format(held, 'yyyy-MM-dd') : String($input.val()), 'date of birth').to.equal(expected);
    });
  });
}

/** January 1st of the year that leaves the person one year short of the joining age. */
export function underAgeDob(minAge: number): Dob {
  return { Day: '1', Month: '1', Year: String(new Date().getFullYear() - minAge + 1) };
}

/** The joining age the admin set (Admin > Settings), read the way the app reads it. */
export const minSignupAge = () =>
  dateSettings().then((data) => data.publicAppSettings?.min_signup_age ?? DEFAULT_MIN_ACCOUNT_AGE_YEARS);
