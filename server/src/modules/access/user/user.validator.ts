import { z } from 'zod';
import {
  arr,
  date,
  email,
  filled,
  finite,
  gte,
  int,
  lte,
  matches,
  maxLen,
  minItems,
  minLen,
  notAfter,
  num,
  obj,
  shape,
  str,
  trim,
  url,
} from '@utils/zod-fields';
import { STATUSES } from './user.constants';

// Shared by the auth (signup) and profile (self-service edit) validators too —
// one definition so the three surfaces can never drift apart.
export const phoneRegex = /^\d{6,15}$/;
export const extRegex = /^\+?\d{1,5}$/;
// A human name: letters, spaces, apostrophes (straight or typographic) and
// periods, starting with a letter — digits, underscores and emoji are out.
// The mirror of PERSON_NAME in @duncit/regex, restated here because server/src
// imports no @duncit/* package. A client rule only shapes a form; signup runs
// this one, so a hand-rolled mutation cannot store a surname like "Doe_123".
export const personNameRegex = /^[A-Za-z][A-Za-z .'’]{0,79}$/;

/** The latest date of birth these forms accept — fixed when the server boots. */
const BOOTED_AT = new Date();

const optionalText = () => str(z.string().optional());
const roleList = () => z.array(str(z.string().check(filled()), { required: true }));
const zoneList = () => arr(z.array(str(z.string().optional())).optional());

export const createUserSchema = obj(
  shape({
    first_name: str(z.string().check(minLen(1), maxLen(60), filled()), { required: true }),
    last_name: str(z.string().check(minLen(1), maxLen(60), filled()), { required: true }),
    email: str(z.string().check(email()).optional()),
    phone_number: str(z.string().check(matches(phoneRegex), filled()), { required: true }),
    phone_extension: str(z.string().check(matches(extRegex), filled()), { required: true }),
    password: str(z.string().check(minLen(8), filled()), { required: true }),
    dob: date(z.date().check(notAfter(BOOTED_AT)), { required: true }),
    roles: arr(roleList().check(minItems(1)), { required: true }),
    city: optionalText(),
    zone: optionalText(),
    assigned_city: optionalText(),
    assigned_zones: zoneList(),
  })
);

/*
  An admin may CLEAR a contact field, so every one of them accepts '' as well
  as a well-formed value.

  A pattern is tested against the empty string unless it is told not to, and
  `email()` lets '' through. Without `excludeEmptyString` the admin form —
  which sends all three contact fields on every save — could not save ANY
  account that has no phone number: the blank it faithfully echoed back failed
  validation before the write was ever attempted.
*/
const optionalOrBlank = (pattern: RegExp) =>
  str(z.string().check(matches(pattern, { excludeEmptyString: true })).optional());

const percentage = () => num(finite().check(gte(0), lte(100)).optional());

export const updateUserSchema = obj(
  shape({
    first_name: str(z.string().check(minLen(1), maxLen(60)).optional()),
    last_name: str(z.string().check(minLen(1), maxLen(60)).optional()),
    email: str(z.string().check(email()).optional()),
    phone_number: optionalOrBlank(phoneRegex),
    phone_extension: optionalOrBlank(extRegex),
    whatsapp_number: optionalOrBlank(phoneRegex),
    whatsapp_extension: optionalOrBlank(extRegex),
    dob: date(z.date().check(notAfter(BOOTED_AT)).optional()),
    city: optionalText(),
    zone: optionalText(),
    bio: str(z.string().check(maxLen(500)).optional()),
    profile_photo: str(z.string().check(url()).optional()),
    status: str(z.enum(STATUSES).optional(), { oneOf: STATUSES }),
    roles: arr(roleList().optional()),
    assigned_city: optionalText(),
    assigned_zones: zoneList(),
    host_share_pct: percentage(),
    host_commission_pct: percentage(),
  })
);

const CONTACT_TYPES = ['CALL', 'EMAIL'] as const;

export const recordUserContactActionSchema = obj(
  shape({
    user_id: str(z.string().check(filled()), { required: true }),
    type: str(z.enum(CONTACT_TYPES), { oneOf: CONTACT_TYPES, required: true }),
    target: str(z.string().check(minLen(3), maxLen(254), filled()), { required: true, transforms: [trim] }),
    subject: str(z.string().check(maxLen(160)), { transforms: [trim], default: '' }),
    notes: str(z.string().check(maxLen(2000)), { transforms: [trim], default: '' }),
    status: str(z.string().check(maxLen(40)), { transforms: [trim], default: 'LOGGED' }),
    duration_seconds: num(finite().check(int(), gte(0)), { default: 0 }),
    recording_url: str(z.string().check(url(), maxLen(2048)), { transforms: [trim], default: '' }),
  })
);

export const startRecordedUserCallSchema = obj(
  shape({
    user_id: str(z.string().check(filled()), { required: true }),
    target: str(z.string().check(minLen(3), maxLen(64), filled()), { required: true, transforms: [trim] }),
    notes: str(z.string().check(maxLen(2000)), { transforms: [trim], default: '' }),
  })
);

export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
export type RecordUserContactActionDTO = z.infer<typeof recordUserContactActionSchema>;
export type StartRecordedUserCallDTO = z.infer<typeof startRecordedUserCallSchema>;
