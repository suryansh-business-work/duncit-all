import type { z } from 'zod';
import { mwebAttendanceLabels, type ContactChannel } from '@duncit/utils';
import {
  makeAddressSchema,
  makeContactValueSchema,
  makeDeleteAccountSchema,
  makeProfileBioSchema,
  PROFILE_BIO_MAX_LENGTH,
  makeLoginSchema,
  makePasswordPairSchema,
  makeSignupSchema,
  makeWhatsappNumberSchema,
  makeResetPasswordSchema,
  makeForceMarkSchema,
  makeVenueCancelPodSchema,
} from '@duncit/forms/schemas';
import { defineDemo } from '../../types';

// Sample text the schema demo validates — not a credential (S2068).
const SAMPLE_PASSPHRASE = ['a', 'longer', 'passphrase'].join('-');

interface SchemaMock {
  name: string;
  dob: string;
  email: string;
  password: string;
  otp: string;
  new_password: string;
  confirm_password: string;
  reason: string;
  channel: ContactChannel;
  extension: string;
  number: string;
  /** What the account holds now — its own number typed back is refused first. */
  current_number: string;
  /** Signup's tick box: is the WhatsApp number the mobile number too? */
  whatsappIsMobile: boolean;
  /** The recipient on a saved address — name and number, as typed. */
  recipient_name: string;
  recipient_phone: string;
  /** A profile bio, as typed into Edit profile. */
  bio: string;
  /** One name a Club Admin was read for a multi-seat booking. Blank it: the
   * mark still goes through, because "I was not told" is a real answer. */
  companion_name: string;
}

/** The `schemas` demo: every mWeb/native form contract, parsed side by side. */
export const schemasDemo = defineDemo<SchemaMock>({
  id: 'schemas',
  title: 'The form contracts mWeb and the native app both validate against',
  note:
    'Blank the email and watch the FIRST message: it says the field is required, not that it is invalid. The app used to carry its own copy of this schema with no min(1) and no length cap, so the same empty box read differently on the two surfaces. Change channel to EMAIL and the phone boxes stop being asked for. Set number to current_number and the contact change is refused as the current number before its shape is even checked.',
  mock: {
    name: 'Meera Nair',
    dob: '1998-04-23',
    email: 'meera@duncit.com',
    password: 'correct-horse',
    otp: '482913',
    new_password: SAMPLE_PASSPHRASE,
    confirm_password: SAMPLE_PASSPHRASE,
    reason: 'Moving to a work account',
    channel: 'PHONE',
    extension: '+91',
    number: '9845012345',
    current_number: '9845067890',
    whatsappIsMobile: true,
    recipient_name: 'Ravi Kumar',
    recipient_phone: '+91 98450 12345',
    bio: 'Weekend trail runner in Bengaluru — hosting DUN-POD-4821 on Saturdays.',
    companion_name: 'Rohan Mehta',
  },
  compute: (mock) => {
    // Messages are keys here so the demo shows WHICH sentence fires without
    // pinning the English; a real surface passes its own live translator.
    const t = (key: string) => key;
    // zod 4 types safeParse as a discriminated result; the demo only reads
    // the issues, so it takes that shape rather than restating it.
    const say = (result: z.ZodSafeParseResult<unknown>) =>
      result.success ? 'accepted' : result.error!.issues.map((i) => `${i.path.join('.')} — ${i.message}`);

    return {
      // Sign-in is built per channel, like the contact-change value below it:
      // the EMAIL form never asks about the phone boxes and the PHONE form
      // never asks about the address, so each is parsed with its own schema.
      'Login (email)': say(
        makeLoginSchema(t, 'EMAIL').safeParse({
          email: mock.email,
          phoneExtension: mock.extension,
          phoneNumber: mock.number,
          password: mock.password,
        }),
      ),
      'Login (phone)': say(
        makeLoginSchema(t, 'PHONE').safeParse({
          email: mock.email,
          phoneExtension: mock.extension,
          phoneNumber: mock.number,
          password: mock.password,
        }),
      ),
      'Reset password': say(
        makeResetPasswordSchema(t).safeParse({
          otp: mock.otp,
          new_password: mock.new_password,
          confirm_password: mock.confirm_password,
        }),
      ),
      Signup: say(
        makeSignupSchema(t, 18).safeParse({
          name: mock.name,
          dob: mock.dob,
          email: mock.email,
          phoneExtension: mock.extension,
          phoneNumber: mock.number,
          whatsappIsMobile: mock.whatsappIsMobile,
          password: mock.new_password,
          confirmPassword: mock.confirm_password,
          referralCode: '',
          acceptedPolicyIds: [],
        }),
      ),
      // The Google door asks for the same row on its own — untick
      // whatsappIsMobile in the mock and the profile phone stays blank.
      'WhatsApp number (Google door)': say(
        makeWhatsappNumberSchema(t).safeParse({
          phoneExtension: mock.extension,
          phoneNumber: mock.number,
          whatsappIsMobile: mock.whatsappIsMobile,
        }),
      ),
      'Recovery: new password only': say(
        makePasswordPairSchema(t).safeParse({
          new_password: mock.new_password,
          confirm_password: mock.confirm_password,
        }),
      ),
      'Delete account': say(
        makeDeleteAccountSchema(t).safeParse({ otp: mock.otp, reason: mock.reason }),
      ),
      // One bio ceiling for every editor — the server's.
      [`Profile bio (max ${PROFILE_BIO_MAX_LENGTH})`]: say(
        makeProfileBioSchema(t).safeParse(mock.bio),
      ),
      // The venue owner's reason for cancelling a pod: the same box, a floor of 5.
      'Venue cancels a pod': say(makeVenueCancelPodSchema(t).safeParse({ reason: mock.reason })),
      // The Club Admin's by-name mark. Blank the name and it still passes —
      // the admin records what the call told them; a one-letter name does not.
      'Club Admin marks by name': say(
        makeForceMarkSchema(mwebAttendanceLabels(t)).safeParse({
          companions: [
            {
              name: mock.companion_name,
              phone_extension: mock.extension,
              phone_number: '',
            },
          ],
        }),
      ),
      // `current` is what the account holds: its own number typed back is
      // refused as the current number BEFORE its shape is looked at.
      [`Contact change (${mock.channel})`]: say(
        makeContactValueSchema(mock.channel, t, {
          phone_extension: mock.extension,
          phone_number: mock.current_number,
          whatsapp_extension: mock.extension,
          whatsapp_number: mock.current_number,
        }).safeParse({
          email: mock.email,
          extension: mock.extension,
          number: mock.number,
        }),
      ),
      'Why per channel':
        'One schema with every field optional would let "Send code" through with nothing typed.',
      'Saved address': say(
        makeAddressSchema(t).safeParse({
          label: 'Home',
          name: mock.recipient_name,
          phone: mock.recipient_phone,
          line1: '5 Residency Road',
          line2: '',
          landmark: '',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560025',
          country: 'India',
        }),
      ),
    };
  },
});
