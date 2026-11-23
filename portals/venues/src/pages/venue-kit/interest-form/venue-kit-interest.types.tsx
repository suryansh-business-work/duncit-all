import { z } from 'zod';
import { EMAIL, OTP_6, PHONE_NUMBER_IN, toDigits } from '@duncit/regex';
import type { useTranslation } from '@duncit/shell';

export type Translate = ReturnType<typeof useTranslation>['t'];

/** The +91 the SMS code reaches; the Venue Kit is sold in India. */
export const VENUE_KIT_DIAL_CODE = '+91';

/** What the venue tells us; the codes are checked step by step, not with the submit. */
export const venueKitInterestSchema = (t: Translate) =>
  z.object({
    name: z.string().trim().min(2, t('venueKit.form.nameRequired')).max(80, t('venueKit.form.nameRequired')),
    email: z.string().trim().toLowerCase().regex(EMAIL, t('venueKit.form.emailInvalid')),
    phone_number: z
      .string()
      .transform((value) => toDigits(value))
      .pipe(z.string().regex(PHONE_NUMBER_IN, t('venueKit.form.phoneInvalid'))),
    email_code: z.string(),
    phone_code: z.string(),
    verify_phone: z.boolean(),
  });

/** One typed code: six digits, whatever spaces were typed around them. */
export const venueKitCodeSchema = (t: Translate) =>
  z.string().transform((value) => toDigits(value)).pipe(z.string().regex(OTP_6, t('venueKit.form.codeInvalid')));

export type VenueKitInterestValues = z.input<ReturnType<typeof venueKitInterestSchema>>;
export type VenueKitInterestOutput = z.output<ReturnType<typeof venueKitInterestSchema>>;

export const venueKitInterestDefaults: VenueKitInterestValues = {
  name: '',
  email: '',
  phone_number: '',
  email_code: '',
  phone_code: '',
  verify_phone: false,
};

/** Which server call is in flight, so only its button spins. */
export type VenueKitBusy = 'sendEmail' | 'verifyEmail' | 'sendPhone' | 'verifyPhone' | 'submit' | null;

/** Where the two proofs stand. A note is what the last code request said; a token is a proof. */
export interface VenueKitOtpState {
  emailNote: string | null;
  emailToken: string | null;
  phoneNote: string | null;
  phoneToken: string | null;
  busy: VenueKitBusy;
}

/** Each resolves true when the step succeeded; failures are reported by the hook itself. */
export interface VenueKitOtpActions {
  sendEmail: (name: string, email: string) => Promise<boolean>;
  verifyEmail: (email: string, code: string) => Promise<boolean>;
  sendPhone: (phone: string) => Promise<boolean>;
  verifyPhone: (phone: string, code: string) => Promise<boolean>;
  submit: (values: Pick<VenueKitInterestOutput, 'name' | 'phone_number'>) => Promise<boolean>;
  reset: () => void;
}

export interface VenueKitInterestFormProps {
  state: VenueKitOtpState;
  actions: VenueKitOtpActions;
}
