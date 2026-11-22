import { z } from 'zod';
import { isIndianMobile } from '@utils/phone';
import {
  email,
  filled,
  gte,
  int,
  lowercase,
  lte,
  matches,
  maxLen,
  minLen,
  num,
  obj,
  shape,
  str,
  trim,
} from '@utils/zod-fields';
import { VENUE_KIT_INTEREST_STATUSES } from './venueKit.model';

/** The only dial code the Venue Kit's SMS code reaches — the kit is sold in India. */
export const VENUE_KIT_DIAL_CODE = '+91';

/** Six digits, the shape of every Duncit code box (`OTP_6` in @duncit/regex). */
const OTP_CODE = /^\d{6}$/;

const nameField = () =>
  str(z.string().check(filled('Enter your name'), minLen(2, 'Enter your name'), maxLen(80, 'Keep the name under 80 characters')), {
    required: 'Enter your name',
    transforms: [trim],
  });

const emailField = () =>
  str(z.string().check(filled('Enter your email address'), email('Enter a valid email address'), maxLen(254)), {
    required: 'Enter your email address',
    transforms: [trim, lowercase],
  });

const dialCodeField = () =>
  str(z.string(), {
    required: 'Country code is required',
    oneOf: [VENUE_KIT_DIAL_CODE],
    transforms: [trim],
  });

const mobileField = () =>
  str(
    z.string().check(
      filled('Enter your mobile number'),
      z.refine((value: string) => isIndianMobile(value), { error: 'Enter a valid 10-digit Indian mobile number' })
    ),
    { required: 'Enter your mobile number', transforms: [trim] }
  );

const codeField = () =>
  str(z.string().check(matches(OTP_CODE, 'Enter the 6-digit code')), { required: 'Enter the 6-digit code', transforms: [trim] });

const tokenField = (message: string) =>
  str(z.string().check(filled(message), maxLen(200, message)), { required: message, transforms: [trim] });

/** Step one: who is asking, and the mailbox the code goes to. The captcha rides alongside. */
export const emailOtpRequestSchema = obj(shape({ name: nameField(), email: emailField() }));
export type EmailOtpRequestInput = z.infer<typeof emailOtpRequestSchema>;

export const emailOtpVerifySchema = obj(shape({ email: emailField(), code: codeField() }));

/** The optional phone code: only after the email is proved, and only to a +91 mobile. */
export const phoneOtpRequestSchema = obj(
  shape({
    email_token: tokenField('Verify your email first'),
    phone_extension: dialCodeField(),
    phone_number: mobileField(),
  })
);

export const phoneOtpVerifySchema = obj(
  shape({ phone_extension: dialCodeField(), phone_number: mobileField(), code: codeField() })
);

export const submitInterestSchema = obj(
  shape({
    name: nameField(),
    email_token: tokenField('Verify your email first'),
    phone_extension: dialCodeField(),
    phone_number: mobileField(),
    phone_token: str(z.string().check(maxLen(200)).optional(), { transforms: [trim] }),
  })
);
export type SubmitInterestInput = z.infer<typeof submitInterestSchema>;

export const interestStatusSchema = obj(
  shape({
    id: str(z.string().check(filled('Choose a venue')), { required: 'Choose a venue', transforms: [trim] }),
    status: str(z.string(), { required: 'Choose a status', oneOf: [...VENUE_KIT_INTEREST_STATUSES] }),
    note: str(z.string().check(maxLen(1000, 'Keep the note under 1000 characters')).optional(), { transforms: [trim] }),
  })
);

/** A whole number of paise or units, inside a sane ceiling so a typo cannot publish ₹99 crore. */
const amount = (label: string, max: number) =>
  num(z.number().check(int(`${label} must be a whole number`), gte(0, `${label} cannot be negative`), lte(max, `${label} is too large`)), {
    required: `${label} is required`,
    typeError: `${label} must be a number`,
  });

const percent = (label: string) =>
  num(z.number().check(gte(0, `${label} cannot be negative`), lte(100, `${label} cannot exceed 100`)), {
    required: `${label} is required`,
    typeError: `${label} must be a number`,
  });

export const offerSchema = obj(
  shape({
    annual_price_paise: amount('Annual price', 100_000_000),
    included_table_labels: amount('Included table labels', 1000),
    extra_label_price_paise: amount('Extra label price', 1_000_000),
    pos_activation_months: amount('POS activation months', 60),
    gift_card_count: amount('Gift card count', 1000),
    gift_card_value_paise: amount('Gift card value', 1_000_000),
    collab_gift_card_discount_pct: percent('Collaboration gift card discount'),
    order_benefit_pct: percent('Order benefit'),
  })
);
export type VenueKitOfferInput = z.infer<typeof offerSchema>;
