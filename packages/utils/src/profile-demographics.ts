/**
 * Gender and Pet Owner on Edit profile — the part mWeb and the native app share.
 *
 * Rule 27 says the two screens must be identical; rule 40 says they share LOGIC,
 * never UI. The option lists, the Yes/No ↔ boolean mapping and the copy live
 * here; the MUI select and the Tamagui sheet stay in their apps.
 *
 * GENDERS restates the server's `GENDERS` (user.constants.ts) and the GraphQL
 * `Gender` enum — the server imports no @duncit/* package. Keep the three in sync.
 */

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export type Gender = (typeof GENDERS)[number];

/** How a boolean answer is carried by a single-select: a string value per option. */
export const PET_OWNER_CHOICES = ['YES', 'NO'] as const;
export type PetOwnerChoice = (typeof PET_OWNER_CHOICES)[number];

/** A form holds '' until the member picks; the options are the only other values. */
export type GenderValue = Gender | '';
export type PetOwnerValue = PetOwnerChoice | '';

const GENDER_SET: ReadonlySet<string> = new Set(GENDERS);

const isGender = (value: string): value is Gender => GENDER_SET.has(value);

/** The stored gender as the select's value — '' while unanswered. */
export const toGenderValue = (gender: string | null | undefined): GenderValue =>
  gender && isGender(gender) ? gender : '';

/** The stored answer as the select's value — '' while unanswered. */
export function toPetOwnerValue(isPetOwner: boolean | null | undefined): PetOwnerValue {
  if (isPetOwner === true) return 'YES';
  if (isPetOwner === false) return 'NO';
  return '';
}

/**
 * The select's value as the mutation input. An unanswered field is OMITTED
 * (undefined), so a save never clears an answer the member has not touched.
 */
export function fromPetOwnerValue(value: PetOwnerValue): boolean | undefined {
  if (value === '') return undefined;
  return value === 'YES';
}

export type DemographicsTranslate = (key: string) => string;

export interface DemographicOption<T extends string> {
  value: T;
  label: string;
}

export interface ProfileDemographicsLabels {
  genderLabel: string;
  genderPlaceholder: string;
  genderOptions: DemographicOption<Gender>[];
  petOwnerLabel: string;
  petOwnerPlaceholder: string;
  petOwnerOptions: DemographicOption<PetOwnerChoice>[];
}

/**
 * Every key written out as a literal `t('…')`, because
 * `scripts/verify-translation-keys.mjs` greps source for the literal string.
 */
export function buildProfileDemographicsLabels(
  t: DemographicsTranslate,
): ProfileDemographicsLabels {
  const gender: Record<Gender, string> = {
    MALE: t('mweb.accountEdit.gender.male'),
    FEMALE: t('mweb.accountEdit.gender.female'),
    OTHER: t('mweb.accountEdit.gender.other'),
  };
  const petOwner: Record<PetOwnerChoice, string> = {
    YES: t('mweb.accountEdit.petOwner.yes'),
    NO: t('mweb.accountEdit.petOwner.no'),
  };
  return {
    genderLabel: t('mweb.accountEdit.gender.label'),
    genderPlaceholder: t('mweb.accountEdit.gender.placeholder'),
    genderOptions: GENDERS.map((value) => ({ value, label: gender[value] })),
    petOwnerLabel: t('mweb.accountEdit.petOwner.label'),
    petOwnerPlaceholder: t('mweb.accountEdit.petOwner.placeholder'),
    petOwnerOptions: PET_OWNER_CHOICES.map((value) => ({ value, label: petOwner[value] })),
  };
}
