/**
 * `@duncit/forms/schemas` — the RHF + Zod contracts mWeb, the native app and
 * the partner console share.
 *
 * MUI-free on purpose: the package root renders `RhfTextField` and cannot reach
 * the native app, but the RULES can and must — mWeb and native had written each
 * of these twice and were already refusing different input with different
 * sentences (rules 27 and 40).
 *
 * Every export is a `make*Schema(t)` factory rather than a schema constant,
 * because the messages are localized copy and a Zod schema is built outside
 * React. A surface binds them once against its own bundled-English fallback:
 *
 * ```ts
 * import { makeLoginSchema } from '@duncit/forms/schemas';
 * import { fallbackT } from '../../i18n/fallback';
 * export const loginSchema = makeLoginSchema(fallbackT);
 * ```
 *
 * The `*Defaults` objects carry no copy, so they are plain constants.
 */
export type { Translate } from './translate';

export {
  makePasswordPairSchema,
  makePasswordWithOtpSchema,
  passwordPairDefaults,
  passwordWithOtpDefaults,
  type PasswordPairValues,
  type PasswordWithOtpValues,
} from './password-with-otp';

export {
  forgotPasswordDefaults,
  loginDefaults,
  LOGIN_CHANNELS,
  makeForgotPasswordSchema,
  makeLoginSchema,
  makeResetPasswordSchema,
  resetPasswordDefaults,
  type ForgotPasswordValues,
  type LoginChannel,
  type LoginFormValues,
  type ResetPasswordValues,
} from './auth';

export {
  currentPasswordDefaults,
  makeCurrentPasswordSchema,
  makeNewPasswordSchema,
  newPasswordDefaults,
  type CurrentPasswordValues,
  type NewPasswordValues,
} from './change-password';

export {
  deleteAccountDefaults,
  makeDeleteAccountSchema,
  type DeleteAccountValues,
} from './delete-account';

export {
  makeTwoFactorCodeSchema,
  twoFactorCodeDefaults,
  type TwoFactorCodeValues,
} from './two-factor';

export {
  cleanProfileLinks,
  makeProfileBioSchema,
  makeProfileLinksSchema,
  makeProfileNameSchemas,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_LINK_LABEL_MAX_LENGTH,
  PROFILE_LINKS_MAX,
  PROFILE_NAME_MAX_LENGTH,
} from './profile';

export {
  blankWithdrawValues,
  buildWithdrawInput,
  makeWithdrawSchema,
  WITHDRAW_METHODS,
  type WithdrawInput,
  type WithdrawMethod,
  type WithdrawValues,
} from './withdraw';

export {
  blankAddress,
  makeAddressSchema,
  type AddressValues,
} from './address';

export {
  makeShipToSchema,
  shipToValues,
  type ShipToSource,
  type ShipToValues,
} from './ship-to';

export {
  makeContactOtpSchema,
  makeContactValueSchema,
  type ContactOtpValues,
  type ContactValueValues,
} from './contact-change';

export {
  googleSignupDefaults,
  makeGoogleSignupSchema,
  makeSignupSchema,
  makeWhatsappNumberSchema,
  signupDefaults,
  whatsappNumberDefaults,
  WHATSAPP_NUMBER_NAMES,
  type GoogleSignupValues,
  type SignupFormValues,
  type WhatsappNumberValues,
} from './signup';

export {
  emptyTier,
  makeCancellationPolicySchema,
  toPolicyInput,
  toPolicyValues,
  type CancellationPolicyValues,
  type CancellationTierValues,
  type VenueCancellationChargeType,
  type VenueCancellationPolicy,
  type VenueCancellationTier,
} from './venue-cancellation';

export {
  makeVenueCancelPodSchema,
  venueCancelPodDefaults,
  type VenueCancelPodValues,
} from './venue-cancel-pod';

export { healthAppealDefaults, makeHealthAppealSchema, type HealthAppealValues } from './health-appeal';

export {
  POD_REQUEST_NOTE_MAX,
  POD_REQUEST_OVERRIDE_MAX,
  makePodRequestNoteSchema,
  makePodRequestOverrideSchema,
  type PodRequestNoteValues,
} from './pod-request';

export {
  forceMarkInitialValues,
  makeForceMarkSchema,
  type ForceCompanionValues,
  type ForceMarkValues,
} from './pod-attendance-force';
export { makePodShopReturnSchema, type PodShopReturnFormValues } from './pod-shop-return';
export { foodCheckoutDefaults, makeFoodCheckoutSchema, type FoodCheckoutValues } from './food-checkout';
export { makeYoutubeLinkSchema, youtubeLinkDefaults, type YoutubeLinkValues } from './video-link';
export { foodFeedbackDefaults, makeFoodFeedbackSchema, type FoodFeedbackValues } from './food-feedback';
export {
  FOOD_CANCEL_REASON_MAX,
  FOOD_CANCEL_REASON_MIN,
  foodOrderCancelDefaults,
  makeFoodOrderCancelSchema,
  type FoodOrderCancelValues,
} from './food-order-cancel';
export {
  FOOD_COUPON_DESCRIPTION_MAX,
  foodCouponToValues,
  makeFoodCouponSchema,
  toFoodCouponInput,
  type FoodCouponFormValues,
  type FoodCouponInput,
} from './food-coupon';
export {
  makeFoodGstinRule,
  makeFoodTaxDefaultsSchema,
  makeVenueFoodTaxRefinement,
  venueFoodTaxShape,
  type FoodTaxDefaultsOutput,
  type FoodTaxDefaultsValues,
  type VenueFoodTaxValues,
} from './food-tax';
export { makeRentalItemsSchema, type RentalItemsOutput } from './rental-items';
export { makeMarkRentalSchema, type MarkRentalOutput, type MarkRentalValues } from './mark-rental';
export { makeQuickAccessSchema, type QuickAccessValues } from './quick-access';
export { makeTutorialCommentSchema, type TutorialCommentValues } from './tutorial-comment';
export {
  FOOD_DISH_CATEGORY_MAX,
  FOOD_DISH_DESCRIPTION_MAX,
  FOOD_DISH_NAME_MAX,
  FOOD_LIQUOR_LICENCE_MAX,
  foodDishShape,
  foodLicencesShape,
  foodMenuLimitsOf,
  foodOrderingShape,
  makeFoodMenuSchema,
  makeVenueFoodRefinement,
  NO_FOOD_MENU_LIMITS,
  venueFoodShape,
  type FoodMenuLimits,
  type FoodMenuSchemaValues,
  type VenueFoodRuleOptions,
} from './food-menu';
export {
  blankPodCompleteValues,
  buildPodCompleteInput,
  makePodCompleteSchema,
  VENUE_USAGE_LIMITS,
  addVenueBillIssues,
  addVenueUsageIssues,
  venueExtraAmountOf,
  venueUsageInput,
  type PodCompleteInput,
  type PodCompleteValues,
  type VenueBillRuleLabels,
} from './pod-complete';
export {
  blankWalletStatementValues,
  buildWalletStatementVariables,
  makeWalletStatementSchema,
  WALLET_STATEMENT_IDLE,
  walletStatementDone,
  type WalletStatementFile,
  type WalletStatementOutcome,
  type WalletStatementValues,
  type WalletStatementVariables,
} from './wallet-statement';
export {
  EVENT_REQUEST_NOTE_MAX,
  eventRequestDefaults,
  makeEventRequestSchema,
  type EventRequestValues,
} from './event-request';
// Venue and dish videos: an uploaded clip or a YouTube link (reads @duncit/regex YOUTUBE_URL).
export {
  VENUE_VIDEO_FOLDER,
  venueVideoOf,
  venueVideosOf,
  youtubeVideoId,
  type FileVideo,
  type VenueVideo,
  type YoutubeVideo,
} from './venue-videos';
export {
  GIG_LIMITS,
  gigInterestDefaults,
  makeFreelancerProfileSchema,
  makeGigInterestSchema,
  makeGigJobSchema,
  type FreelancerProfileSchemaValues,
  type GigJobSchemaValues,
} from './gig-job';

export {
  BOOKING_OFFER_LIMITS,
  MIN_BUSINESS_MODELS,
  makeBookingOffersSchema,
  nextMinBusinessRow,
  toBookingOffersInput,
  toBookingOffersValues,
  type BookingOffersValues,
  type MinBusinessRowValues,
  type VenueOfferSettings,
} from './venue-offer-settings';

export { VENUE_CHAT_TEXT_MAX, makeVenueChatEditSchema, type VenueChatEditValues } from './venue-chat-line';

export {
  counterAsksMinGuests,
  makeVenueOfferAskSchema,
  makeVenueOfferCounterSchema,
  makeVenueOfferRejectSchema,
  offerNoteField,
  offeringsTextField,
  venueOfferAskDefaults,
  venueOfferCounterDefaults,
  venueOfferEditDefaults,
  venueOfferRejectDefaults,
  venueOfferCounterTermsOf,
  venueOfferTermsOf,
  VENUE_OFFER_COUNTER_MODELS,
  VENUE_OFFER_GUESTS_MAX,
  VENUE_OFFER_IMAGES_MAX,
  VENUE_OFFER_NOTE_MAX,
  VENUE_OFFER_RATE_MAX,
  type VenueOfferAskValues,
  type VenueOfferCounterSource,
  type VenueOfferCounterValues,
  type VenueOfferRejectValues,
  type VenueOfferTerms,
} from './venue-offer-counter';

export {
  addFreeJustificationIssues,
  freeJustificationDefaults,
  freeJustificationFields,
  type FreeJustificationValues,
} from './free-arrangement';

export {
  buildPhysicalGiftCardInput,
  formatPhysicalGiftCardNumber,
  formatPhysicalGiftCardPasscode,
  makePhysicalGiftCardSchema,
  physicalGiftCardDefaults,
  physicalGiftCardErrorKey,
  type PhysicalGiftCardErrorKey,
  type PhysicalGiftCardRefusal,
  type PhysicalGiftCardValues,
} from './physical-gift-card';
