// @duncit/regex — shared regex patterns + validators. Keep in sync with regex.mjs/regex.cjs.

/** Exactly 10 digits — an Indian mobile number WITHOUT the country/dial code. */
export const PHONE_NUMBER: RegExp;
/** Stricter Indian mobile: 10 digits starting 6–9. */
export const PHONE_NUMBER_IN: RegExp;
/** Country/dial code such as `+91` (optional `+`, 1–4 digits). */
export const DIAL_CODE: RegExp;
/** Indian 6-digit PIN code (first digit 1–9). */
export const PINCODE: RegExp;
/** 6-digit numeric OTP. */
export const OTP_6: RegExp;
/** Pragmatic email pattern (no spaces, one `@`, a dotted domain). */
export const EMAIL: RegExp;
/** One or more digits, nothing else. */
export const DIGITS: RegExp;

/**
 * Keep only the digits in a string.
 *
 * The rule behind every number-only box: a phone field is typed into, pasted
 * into and autofilled, and the last two are how letters get in. Applied on
 * change, it makes "digits only" a property of the input rather than a message
 * shown after the fact.
 */
export function toDigits(value: unknown): string;

/** Phone digits only, 6–15 long — the ITU E.164 range without a dial code. */
export const PHONE_INTL: RegExp;
/** {@link PHONE_INTL} tolerating a leading `+` for a pasted full number. */
export const PHONE_INTL_PLUS: RegExp;
/** Postal code, 4–10 digits — non-Indian addresses included. */
export const PINCODE_LOOSE: RegExp;

/** Indian bank IFSC: 4 letters, a literal `0`, then 6 alphanumerics. */
export const IFSC: RegExp;
/** UPI VPA such as `name@bank`. */
export const UPI_ID: RegExp;
/** Bank account number: 6–18 digits. */
export const BANK_ACCOUNT_NUMBER: RegExp;
/**
 * GSTIN — 15 characters, with the literal `Z` in position 14. The only correct
 * pattern; mWeb checkout's 14-character variant rejects every valid GSTIN.
 */
export const GSTIN: RegExp;
/** FSSAI licence / registration number — exactly 14 digits. */
export const FSSAI_NUMBER: RegExp;
/**
 * A YouTube video link (watch, shorts, embed, live or youtu.be). Group 1 is
 * the 11-character video id.
 */
export const YOUTUBE_URL: RegExp;
/**
 * A human name: letters, spaces, apostrophes (straight or typographic) and
 * periods, starting with a letter. Rejects digits, underscores and emoji.
 */
export const PERSON_NAME: RegExp;
/** A Duncit referral code — `DUN-` and six uppercase hex characters. */
export const REFERRAL_CODE: RegExp;
/**
 * A coupon code as it is stored: 3–30 characters of `A-Z`, `0-9`, `-` and `_`,
 * starting on a letter or digit. Case-sensitive — upper-case the input first.
 */
export const COUPON_CODE: RegExp;
/**
 * A printed gift card's number — 9 digits, the first one 1–9. Applied to the
 * digits-only value: strip spaces and dashes with {@link toDigits} first.
 */
export const PHYSICAL_GIFT_CARD_NUMBER: RegExp;
/**
 * The passcode under a printed card's scratch panel — 16 digits, printed as
 * `XXXX-XXXX-XXXX-XXXX`. Applied to the digits-only value.
 */
export const PHYSICAL_GIFT_CARD_PASSCODE: RegExp;
/** A GA4 measurement id — `G-` and the stream's alphanumeric suffix (G-XXXXXXXXXX). */
export const GA_MEASUREMENT_ID: RegExp;
/** One DNS label: letters, digits and inner hyphens, 1–63 characters, no leading or trailing hyphen. */
export const HOSTNAME_LABEL: RegExp;

export function isPhoneNumber(value: string): boolean;
export function isPincode(value: string): boolean;
export function isEmail(value: string): boolean;
export function isOtp(value: string): boolean;
export function isPhoneIntl(value: string): boolean;
export function isPincodeLoose(value: string): boolean;
export function isIfsc(value: string): boolean;
export function isUpiId(value: string): boolean;
export function isBankAccountNumber(value: string): boolean;
/** Strict GSTIN check — see the {@link GSTIN} note before using it at checkout. */
export function isGstin(value: string): boolean;
/** FSSAI number shape check — 14 digits. */
export function isFssaiNumber(value: string): boolean;
/** True for a YouTube video link the players can embed. */
export function isYoutubeUrl(value: string): boolean;
/** Person-name shape check — letters, spaces, apostrophes and periods only. */
export function isPersonName(value: string): boolean;
/** Referral-code shape check. Case-sensitive: upper-case before calling it. */
export function isReferralCode(value: string): boolean;
/** Coupon-code shape check. Case-sensitive: upper-case before calling it. */
export function isCouponCode(value: string): boolean;
/** Printed gift card number check. Every non-digit is dropped first ({@link toDigits}). */
export function isPhysicalGiftCardNumber(value: string): boolean;
/** Printed gift card passcode check. Every non-digit is dropped first ({@link toDigits}). */
export function isPhysicalGiftCardPasscode(value: string): boolean;
/**
 * A Duncit @handle: lowercase letters, digits and single hyphens, 3–30
 * characters, starting and ending on an alphanumeric. It goes into
 * `duncit.com/u/<username>`, so anything needing percent-encoding is rejected.
 */
export const USERNAME: RegExp;
/** Handle shape check. Lower-case before calling it — the pattern is strict. */
export function isUsername(value: string): boolean;
/**
 * A URL slug such as `summer-meetups-2026`: lowercase letters, digits and
 * single inner hyphens, any length.
 */
export const URL_SLUG: RegExp;
/** Slug shape check. Lower-case before calling it — the pattern is strict. */
export function isUrlSlug(value: string): boolean;
/**
 * A social-network handle such as `duncit.events`, stored without the `@` or
 * the site's address: letters, digits, `.`, `_` and `-`, 1–100 characters.
 */
export const SOCIAL_HANDLE: RegExp;
/** Social handle shape check. Strip a leading `@` first. */
export function isSocialHandle(value: string): boolean;
/**
 * A handle of lowercase letters, digits and inner underscores, 3–30 characters,
 * starting and ending with a letter or digit — `run_club`.
 */
export const UNDERSCORE_HANDLE: RegExp;
/** Underscore handle shape check. Lower-case before calling it. */
export function isUnderscoreHandle(value: string): boolean;
/**
 * A website page path: `/` alone, or slug-shaped segments joined by single
 * slashes — `/about`, `/safety/tools`. No trailing slash, query or `..`.
 */
export const SITE_PATH: RegExp;
/** Page-path shape check. */
export function isSitePath(value: string): boolean;
/** A design token's name: a CSS custom property like `--color-primary`. */
export const CSS_VARIABLE: RegExp;
/** Design-token name shape check. */
export function isCssVariable(value: string): boolean;
/** A font family name like `Plus Jakarta Sans`: letters, digits, spaces and hyphens, 80 max. */
export const FONT_FAMILY: RegExp;
/** Font-family name shape check. */
export function isFontFamily(value: string): boolean;
/** An HTML `<meta>` name or property like `og:locale`: a letter, then letters, digits, `_ : . -`, 80 max. */
export const META_NAME: RegExp;
/** Meta name/property shape check. */
export function isMetaName(value: string): boolean;
/**
 * A fully-qualified hostname such as `ns1.example.com`: at least two labels,
 * each a {@link HOSTNAME_LABEL}, 253 characters at most. A trailing dot (the
 * root) is accepted. Case-insensitive, as DNS is.
 */
export function isHostname(value: string): boolean;
