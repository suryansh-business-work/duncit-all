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
  makeSecurityExceptionSchema,
  securityExceptionDefaults,
  SECURITY_EXCEPTION_REASON_MAX,
  SECURITY_EXCEPTION_REASON_MIN,
  type SecurityExceptionValues,
} from './security-exception';

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
export { makeRentalProofSchema, type RentalProofFormValues, type RentalProofOutput } from './rental-proof';
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

export {
  GIFT_CARD_TEXT_LIMITS,
  canOrderPhysical,
  giftCardPurchaseDefaults,
  giftCardPurchaseRecipient,
  giftCardPurchaseTotals,
  makeGiftCardPurchaseSchema,
  maxQuantityFor,
  type GiftCardDeliveryMode,
  type GiftCardPurchasePolicy,
  type GiftCardPurchaseTotals,
  type GiftCardPurchaseValues,
} from './gift-card-purchase';

export {
  BANNER_KIT_LIMITS,
  isBrandColorEntry,
  isInstagramHandleEntry,
  makeBannerKitSchema,
  normalizeInstagramHandle,
  type BannerKitValues,
} from './banner-kit';

export {
  makePaymentClaimSchema,
  PAYMENT_EVIDENCE_FOLDER,
  PAYMENT_EVIDENCE_HINT_KEYS,
  PAYMENT_EVIDENCE_LABEL_KEYS,
  PAYMENT_EVIDENCE_MAX_FILES,
  PAYMENT_EVIDENCE_MIME_TYPES,
  PAYMENT_EVIDENCE_TYPES,
  paymentClaimDefaults,
  paymentClaimInput,
  paymentEvidenceAccepts,
  type PaymentClaimInput,
  type PaymentClaimValues,
  type PaymentEvidenceFileType,
  type PaymentEvidenceType,
} from './payment-claim';
export {
  askDuncitHandoverDefaults,
  makeAskDuncitHandoverSchema,
  type AskDuncitHandoverValues,
} from './ask-duncit-handover';
// The CRM lead forms (CRM portal + Duncit CRM Android app).
export {
  contactSchema,
  contactsSchemaFor,
  DUPLICATE_CHECK_DEBOUNCE_MS,
  duplicateCheckKey,
  emptyCrmContact,
  isWebUrl,
  makeCommunityLeadSchema,
  makeCreatorLeadSchema,
  makeEcommLeadSchema,
  makeHostLeadSchema,
  makeVenueLeadSchema,
  numeric,
  phone,
  serviceOfferedSchema,
  SOCIAL_LINK_MAX,
  SOCIAL_NAME_MAX,
  socialLinksSchema,
  urlish,
  withSocialLinks,
  type CrmContactValues,
  type DuplicateCheckValues,
} from './crm-leads';
// Console sign-in (every portal's login card + the Duncit CRM app).
export {
  consoleLoginDefaults,
  makeConsoleLoginSchema,
  type ConsoleLoginValues,
} from './console-login';
// A WhatsApp user lead added or edited by hand (CRM portal + Duncit CRM app).
export {
  makeUserLeadSchema,
  USER_LEAD_NAME_MAX,
  userLeadDefaults,
  type UserLeadValues,
} from './user-lead';
// One address to check now (CRM portal + Duncit CRM app Email Verifier).
export { emailVerifyDefaults, makeEmailVerifySchema, type EmailVerifyValues } from './email-verify';
// CRM Lead Research › Discover leads (CRM portal + Duncit CRM app).
export {
  DISCOVERY_LEAD_TYPES,
  DISCOVERY_LIMITS,
  DISCOVERY_SOURCES,
  leadDiscoveryDefaults,
  makeLeadDiscoverySchema,
  toLeadDiscoveryInput,
  type LeadDiscoveryInput,
  type LeadDiscoveryValues,
} from './lead-discovery';
// CRM › Data › Venues: Amenities and Event Suitability entries (CRM portal + Duncit CRM app).
export {
  makeManagedOptionSchema,
  managedOptionDefaults,
  toManagedOptionInput,
  type ManagedOptionValues,
} from './managed-option';
// CRM › AI Call Prompts › Static Content (CRM portal + Duncit CRM app).
export {
  CALL_PROMPT_LANGUAGES,
  CALL_PROMPT_LIMITS,
  callPromptDefaults,
  makeCallPromptSchema,
  type CallPromptValues,
} from './call-prompt';
// CRM › Leads › Nearby leads search (CRM portal + Duncit CRM app).
export {
  NEARBY_RADIUS,
  makeNearbyLeadsSchema,
  nearbyLeadsDefaults,
  type NearbyLeadsValues,
} from './nearby-leads';
// CRM lead Quality tab: record evidence for a criterion (CRM portal + Duncit CRM app).
export {
  LEAD_EVIDENCE_MIN,
  LEAD_EVIDENCE_STATUSES,
  LEAD_EVIDENCE_TEXT_MAX,
  LEAD_EVIDENCE_URL_MAX,
  leadEvidenceDecision,
  leadEvidenceDefaults,
  makeLeadEvidenceSchema,
  type LeadEvidenceDecision,
  type LeadEvidenceStatus,
  type LeadEvidenceValues,
  type RecordedLeadEvidence,
} from './lead-evidence';
// CRM › Settings › Lead Quality Score editor, bound to a client's generated rules copy.
export {
  leadQualityEditor,
  leadQualityNumber,
  type LeadQualityBandValues,
  type LeadQualityBody,
  type LeadQualityConfigInput,
  type LeadQualityCriterionValues,
  type LeadQualityEditor,
  type LeadQualityFormValues,
  type LeadQualityMode,
  type LeadQualityRules,
  type LeadQualityStoredConfig,
  type LeadQualitySubCriterionValues,
} from './lead-quality-config';
export {
  isLeadQualityLeaf,
  leadQualityFailure,
  leadQualityFieldName,
  leadQualityFormPath,
  leadQualityHasIssueWithin,
  leadQualityIssueMessage,
  leadQualityIssuesAt,
  type LeadQualityFailure,
  type LeadQualityIssueLike,
} from './lead-quality-issues';
// CRM › Settings › Dynamic Fields (CRM portal + Duncit CRM app).
export {
  DYNAMIC_FIELD_APPLIES,
  DYNAMIC_FIELD_KIND_KEY,
  DYNAMIC_FIELD_KINDS,
  deriveDynamicFieldName,
  dynamicFieldDefaults,
  dynamicFieldValuesFromRow,
  makeDynamicFieldSchema,
  moveDynamicFieldRow,
  toDynamicFieldInput,
  type DynamicFieldInput,
  type DynamicFieldKind,
  type DynamicFieldOption,
  type DynamicFieldRow,
  type DynamicFieldValues,
} from './dynamic-field';
// CRM › Tools › WhatsApp Lead Generator: the gateway URL + API key step (CRM portal + Duncit CRM app).
export { makeWaGatewaySchema, WA_API_KEY_MAX, type WaGatewayValues } from './wa-gateway';
// CRM: naming an uploaded image or file (lead Logos & Images, Email Templates library).
export { makeMediaNameSchema, MEDIA_NAME_MAX, type MediaNameValues } from './media-name';
// CRM › Email Templates: theme, prompt injection, new template, test send, AI writer
// (CRM portal + Duncit CRM app).
export {
  EMAIL_THEME_COLOR_GROUPS,
  EMAIL_THEME_DARK_COLOR_FIELDS,
  EMAIL_THEME_FIELD_COPY,
  EMAIL_THEME_LIGHT_COLOR_FIELDS,
  EMAIL_THEME_RANGES,
  emailThemeToValues,
  makeEmailThemeSchema,
  type EmailThemeColorField,
  type EmailThemeRangeField,
  type EmailThemeSource,
  type EmailThemeValues,
} from './email-theme';
export {
  EMAIL_PROMPT_MAX,
  emailPromptPlaceholders,
  makeEmailPromptSchema,
  type EmailPromptValues,
} from './email-prompt';
export {
  EMAIL_TEMPLATE_TARGETS,
  emailAiRequestDefaults,
  emailTemplateCreateDefaults,
  emailTestSendDefaults,
  makeEmailAiRequestSchema,
  makeEmailTemplateCreateSchema,
  makeEmailTestSendSchema,
  toEmailTemplateCreateInput,
  type EmailAiRequestValues,
  type EmailTemplateCreateValues,
  type EmailTemplateTarget,
  type EmailTestSendValues,
} from './email-template';
export {
  HR_CONTACT_LIMITS,
  hrContactDefaults,
  hrContactValuesFrom,
  makeHrContactSchema,
  makeHrContactShape,
  refineHrEmergency,
  toHrContactOutput,
  type HrContactOutput,
  type HrContactValues,
} from './hr-contact';
export {
  leaveRequestDefaults,
  leaveSpanDays,
  leaveTypeDefaults,
  makeHolidaySchema,
  makeHrNoteSchema,
  makeLeaveAdjustmentSchema,
  makeLeaveRequestSchema,
  makeLeaveSettingsSchema,
  makeLeaveTypeSchema,
  toLeaveRequestInput,
  type HolidayValues,
  type HrNoteValues,
  type LeaveAdjustmentValues,
  type LeaveRequestOutput,
  type LeaveRequestValues,
  type LeaveSettingsValues,
  type LeaveTypeValues,
} from './hr-leave';
export {
  bankChangeDefaults,
  makeBankChangeSchema,
  toBankChangeInput,
  type BankChangeOutput,
  type BankChangeValues,
} from './hr-bank-change';
export {
  makePayrollAdjustmentSchema,
  makePayrollMonthSchema,
  makePayrollReleaseSchema,
  makePayrollSettingsSchema,
  payrollAdjustmentDefaults,
  type PayrollAdjustmentValues,
  type PayrollMonthValues,
  type PayrollReleaseValues,
  type PayrollSettingsValues,
} from './hr-payroll';
