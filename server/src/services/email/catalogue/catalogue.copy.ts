/**
 * The translation keys the catalogue's rows share.
 *
 * Sixty emails naming "Date" would be sixty keys somebody has to translate,
 * sixty chances for one of them to read "Day" in Hindi and "Date" everywhere
 * else, and sixty rows in Admin > Localization for one word. A label that means
 * the same thing in every email is ONE key (rule 34/40); only a template's own
 * heading and paragraph are its own.
 *
 * Every key here exists in `EMAIL_FALLBACK` (rule 38) — the bundle is the
 * fallback a message renders from before the catalogue answers, and a key
 * missing from it ships raw braces to a reader.
 */

/** Label/value line captions, shared across every audience. */
export const FIELD = {
  pod: 'email.field.pod',
  podTitle: 'email.field.podTitle',
  date: 'email.field.date',
  time: 'email.field.time',
  venue: 'email.field.venue',
  host: 'email.field.host',
  hostContact: 'email.field.hostContact',
  venueContact: 'email.field.venueContact',
  clubAdmin: 'email.field.clubAdmin',
  club: 'email.field.club',
  amount: 'email.field.amount',
  reason: 'email.field.reason',
  refund: 'email.field.refund',
  refundDays: 'email.field.refundDays',
  brand: 'email.field.brand',
  product: 'email.field.product',
  quantity: 'email.field.quantity',
  available: 'email.field.available',
  paymentId: 'email.field.paymentId',
  invoiceNo: 'email.field.invoiceNo',
  items: 'email.field.items',
  recipient: 'email.field.recipient',
  category: 'email.field.category',
  subject: 'email.field.subject',
  ticketNo: 'email.field.ticketNo',
  meetingLink: 'email.field.meetingLink',
  email: 'email.field.email',
  spots: 'email.field.spots',
  hours: 'email.field.hours',
  device: 'email.field.device',
  place: 'email.field.place',
  when: 'email.field.when',
  orderNo: 'email.field.orderNo',
  notes: 'email.field.notes',
  campaign: 'email.field.campaign',
} as const;

/** The tinted callout's caption — what the strip beneath the heading names. */
export const LABEL = {
  pod: 'email.label.pod',
  venue: 'email.label.venue',
  brand: 'email.label.brand',
  product: 'email.label.product',
  account: 'email.label.account',
  payout: 'email.label.payout',
  meeting: 'email.label.meeting',
  ticket: 'email.label.ticket',
  application: 'email.label.application',
  category: 'email.label.category',
  ad: 'email.label.ad',
  refund: 'email.label.refund',
  order: 'email.label.order',
  giftCard: 'email.label.giftCard',
  signIn: 'email.label.signIn',
} as const;

/** Button captions. One per action, never one per template. */
export const CTA = {
  viewPod: 'email.cta.viewPod',
  openApp: 'email.cta.openApp',
  openPartners: 'email.cta.openPartners',
  giveFeedback: 'email.cta.giveFeedback',
  reviewRequest: 'email.cta.reviewRequest',
  openTicket: 'email.cta.openTicket',
  joinMeeting: 'email.cta.joinMeeting',
  viewPayout: 'email.cta.viewPayout',
  manageStock: 'email.cta.manageStock',
  viewOrder: 'email.cta.viewOrder',
  viewGiftCard: 'email.cta.viewGiftCard',
  retryPayment: 'email.cta.retryPayment',
  viewAd: 'email.cta.viewAd',
  completePod: 'email.cta.completePod',
  reviewSlot: 'email.cta.reviewSlot',
  secureAccount: 'email.cta.secureAccount',
  contactSupport: 'email.cta.contactSupport',
} as const;

/**
 * The "you're receiving this because…" line the fragment's footer renders.
 *
 * Grouped by the RELATIONSHIP that produced the email rather than by template,
 * because that is the sentence a reader needs: "you joined this pod" answers
 * the question for every one of the eight emails a booking can produce.
 */
export const FOOTER = {
  account: '{{t:email.footer.account}}',
  podJoined: '{{t:email.footer.podJoined}}',
  purchase: '{{t:email.footer.purchase}}',
  podHosted: '{{t:email.footer.podHosted}}',
  podVenue: '{{t:email.footer.podVenue}}',
  podClub: '{{t:email.footer.podClub}}',
  onboarding: '{{t:email.footer.onboarding}}',
  payout: '{{t:email.footer.payout}}',
  support: '{{t:email.footer.support}}',
  brand: '{{t:email.footer.brand}}',
  venue: '{{t:email.footer.venue}}',
  host: '{{t:email.footer.host}}',
  clubAdmin: '{{t:email.footer.clubAdmin}}',
  autoPod: '{{t:email.footer.autoPod}}',
  ads: '{{t:email.footer.ads}}',
  security: '{{t:email.footer.security}}',
} as const;

/** Closing sentences reused across several templates. */
export const HELP = {
  refundTiming: 'email.help.refundTiming',
  invoiceAttached: 'email.help.invoiceAttached',
  noAction: 'email.help.noAction',
  onboardingNext: 'email.help.onboardingNext',
  meetingMoved: 'email.help.meetingMoved',
  accountPaused: 'email.help.accountPaused',
  accountLive: 'email.help.accountLive',
  feedbackWhy: 'email.help.feedbackWhy',
  payoutTiming: 'email.help.payoutTiming',
  supportReply: 'email.help.supportReply',
  slotDecision: 'email.help.slotDecision',
  stockWhy: 'email.help.stockWhy',
} as const;
