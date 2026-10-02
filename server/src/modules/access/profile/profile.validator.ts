import { z } from 'zod';
import { phoneRegex, extRegex, personNameRegex } from '@modules/access/user/user.validator';
import { GENDERS } from '@modules/access/user/user.constants';
import {
  arr,
  bool,
  filled,
  finite,
  gte,
  lte,
  matches,
  maxItems,
  maxLen,
  minItems,
  minLen,
  num,
  obj,
  shape,
  str,
  trim,
  url,
} from '@utils/zod-fields';

const profileLinkSchema = obj(
  shape({
    label: str(z.string().check(minLen(1), maxLen(40), filled()), { required: true, transforms: [trim] }),
    url: str(z.string().check(url(), maxLen(2048), filled()), { required: true, transforms: [trim] }),
  })
);

const trimmedUpTo = (max: number) => str(z.string().check(maxLen(max)).optional(), { transforms: [trim] });
const upTo = (max: number) => str(z.string().check(maxLen(max)).optional());
const blankOr = (pattern: RegExp, message: string) =>
  str(z.string().check(matches(pattern, { message, excludeEmptyString: true })).optional());
const nullableUpTo = (max: number) => str(z.string().check(maxLen(max)).nullable().optional());

const postalAddressShape = shape({
  line1: trimmedUpTo(200),
  line2: trimmedUpTo(200),
  landmark: trimmedUpTo(160),
  city: trimmedUpTo(120),
  state: trimmedUpTo(120),
  pincode: trimmedUpTo(12),
  country: trimmedUpTo(80),
});

// Structured main postal address — reused by the profile update. Every part is
// optional (users fill it gradually); lengths guard the DB fields.
export const postalAddressSchema = obj(postalAddressShape);

export const updateMyProfileSchema = obj(
  shape({
    // Shape-checked like signup's names: the portals' profile page has no
    // client-side rule, so this is the only place a "Riya2" is refused there.
    first_name: str(
      z.string().check(minLen(1), maxLen(60), matches(personNameRegex, 'Invalid first name')).optional()
    ),
    // A surname is optional: '' clears it (the service stores a blank as null).
    last_name: str(
      z
        .string()
        .check(maxLen(60), matches(personNameRegex, { message: 'Invalid last name', excludeEmptyString: true }))
        .optional()
    ),
    bio: upTo(500),
    gender: str(z.enum(GENDERS).optional(), { oneOf: GENDERS }),
    is_pet_owner: bool(z.boolean().optional()),
    // null is "Remove photo" — the service writes it through as a cleared field.
    profile_photo: str(z.string().check(url()).nullable().optional()),
    profile_links: arr(z.array(profileLinkSchema).check(maxItems(5)).optional()),
    // Location + DOB are accepted by the GraphQL input and mapped in the service;
    // they must be declared here or `validate()` drops them as unknown keys.
    city: upTo(80),
    state: upTo(80),
    zone: upTo(80),
    country: upTo(80),
    dob: blankOr(/^$|^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD'),
    // Contact + WhatsApp numbers: previously undeclared, so edits were silently
    // dropped before reaching the service (the numbers-not-saving bug).
    phone_number: blankOr(phoneRegex, 'Invalid phone'),
    phone_extension: blankOr(extRegex, 'Invalid extension'),
    whatsapp_number: blankOr(phoneRegex, 'Invalid WhatsApp number'),
    whatsapp_extension: blankOr(extRegex, 'Invalid WhatsApp extension'),
    // The saved main postal address; every part optional so partial edits are ok.
    // Never absent: an address nobody sent arrives as {} (all parts unset).
    address: obj(postalAddressShape),
  })
);

export const petProfileSchema = obj(
  shape({
    name: nullableUpTo(60),
    species: nullableUpTo(40),
    breed: nullableUpTo(60),
    age: num(finite().check(gte(0), lte(100)).nullable().optional()),
    photo_url: str(z.string().check(url()).nullable().optional()),
    bio: nullableUpTo(500),
  })
);

export const interestCategoryIdsSchema = arr(
  z
    .array(str(z.string().check(filled()), { required: true }))
    .check(minItems(1, 'Select at least one interest'), maxItems(60, 'Select fewer interests')),
  { required: true }
);

export type UpdateMyProfileDTO = z.infer<typeof updateMyProfileSchema>;
export type PetProfileDTO = z.infer<typeof petProfileSchema>;
