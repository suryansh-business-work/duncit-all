/**
 * MIRROR of `@duncit/communication` `src/wa-events.ts` — change one, change
 * the other.
 *
 * `server/src` imports zero `@duncit/*` packages by design (project rule 40):
 * the server ships a self-contained Docker image running compiled `dist` on
 * plain Node, so a workspace package cannot resolve here. Same arrangement as
 * `aisensy.transport.ts` and `email-i18n.ts`.
 *
 * This is the catalogue of every WhatsApp message Duncit sends on its own: the
 * scenario, the AiSensy campaign behind it, and one label per placeholder, in
 * order. The template BODY is never here — bodies, arity and approval state
 * come live from AiSensy's Project API (`aisensy.project.ts`). What this pins
 * is which campaign a domain event points at, and how many values it fills.
 */

/** Who the message is written for. */
export type WaAudience = 'USER' | 'HOST' | 'VENUE' | 'ECOMM' | 'CLUB_ADMIN' | 'SUPPORT';

/**
 * What kind of message it is, for consent — NOT Meta's template category.
 *
 * Meta calls 66 of our 71 templates UTILITY, which says how they are priced, not
 * whether a person may switch them off. A feedback request is UTILITY at Meta
 * and plainly optional to a human.
 */
export type WaCategory =
  | 'transactional'
  | 'billing'
  | 'account'
  | 'notification'
  | 'reminder'
  | 'feedback'
  | 'marketing'
  | 'support';

/**
 * Categories a person cannot switch off: their ticket, their money, and being
 * told their account changed. Mirrors the same split
 * `mailPreference.categories.ts` already makes for email.
 */
export const WA_REQUIRED_CATEGORIES: readonly WaCategory[] = ['transactional', 'billing', 'account'];

/** The ones a person can silence. */
export const WA_OPTIONAL_CATEGORIES: readonly WaCategory[] = [
  'notification',
  'reminder',
  'feedback',
  'marketing',
  'support',
];

export const isRequiredWaCategory = (category: string): boolean =>
  (WA_REQUIRED_CATEGORIES as readonly string[]).includes(category);

export interface WaEvent {
  /** Stable id. Stored on every log row and every admin toggle, so renaming a
   * campaign at AiSensy never orphans the history. */
  readonly key: string;
  /** The AiSensy campaign name the send transport posts. */
  readonly campaign: string;
  readonly audience: WaAudience;
  readonly category: WaCategory;
  /** What makes it fire, in a sentence — the admin table's description column. */
  readonly fires: string;
  /** One label per {{n}}, in order, transcribed from the approved body. */
  readonly params: readonly string[];
}

export const WA_EVENTS: readonly WaEvent[] = [
  {
    key: 'USER_WELCOME',
    campaign: 'welcome_to_duncit',
    audience: 'USER',
    category: 'account',
    fires: 'A new account is created',
    params: ['Recipient name'],
  },
  {
    key: 'USER_POD_CANCELLED_BY_HOST',
    campaign: 'cancel_host',
    audience: 'USER',
    category: 'billing',
    fires: 'The host cancels a pod',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Refund Amount', 'Pod Link', 'Refund working days'],
  },
  {
    key: 'USER_POD_CANCELLED_BY_VENUE',
    campaign: 'cancel_venue',
    audience: 'USER',
    category: 'billing',
    fires: 'The venue cancels a pod',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Refund Amount', 'Pod Link', 'Refund working days'],
  },
  {
    key: 'USER_POD_CANCELLED_BY_DUNCIT',
    campaign: 'cancel_duncit',
    audience: 'USER',
    category: 'billing',
    fires: 'Duncit or a club admin cancels a pod',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Refund Amount', 'Pod Link', 'Refund working days'],
  },
  {
    key: 'USER_POD_REMINDER',
    campaign: 'pod_reminder_user',
    audience: 'USER',
    category: 'reminder',
    fires: 'A joined pod starts soon',
    params: ['Recipient name', 'Hours until pod', 'Pod', 'Date', 'Time', 'Pod Link', 'Host'],
  },
  {
    key: 'USER_BOOKING_SUCCESSFUL',
    campaign: 'pod_booking_successful',
    audience: 'USER',
    category: 'transactional',
    fires: 'A pod payment succeeds',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Pod Link', 'Host'],
  },
  {
    key: 'USER_PAYMENT_FAILED',
    campaign: 'podpayment_fail',
    audience: 'USER',
    category: 'transactional',
    fires: 'A pod payment fails',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Pod Link', 'Host', 'PaymentID'],
  },
  {
    key: 'USER_REPLACEMENT_FOUND',
    campaign: 'user_replacement_found',
    audience: 'USER',
    category: 'billing',
    fires: 'A backed-out spot is filled and the refund starts',
    params: ['Recipient name', 'Pod', 'Date', 'Time', 'Refund Amount', 'Pod Link', 'Refund working days'],
  },
  {
    key: 'USER_REPLACEMENT_NOT_FOUND',
    campaign: 'user_replacement_fail',
    audience: 'USER',
    category: 'notification',
    fires: 'A backed-out spot is never filled',
    params: ['Recipient name', 'Pod', 'Date', 'Time', 'Pod Link'],
  },
  {
    key: 'USER_POD_FEEDBACK',
    campaign: 'feedback_user',
    audience: 'USER',
    category: 'feedback',
    fires: 'A pod the user attended has finished',
    params: ['Recipient name', 'Pod', 'Date', 'Time', 'Feedback'],
  },
  {
    key: 'USER_ACCOUNT_SUSPENDED',
    campaign: 'user_accountsuspended',
    audience: 'USER',
    category: 'account',
    fires: 'An account is suspended',
    params: ['Recipient name'],
  },
  {
    key: 'USER_ACCOUNT_REACTIVATED',
    campaign: 'user_accountreactivated',
    audience: 'USER',
    category: 'account',
    fires: 'A suspended account is restored',
    params: ['Recipient name'],
  },
  {
    key: 'USER_POD_ATTENDANCE',
    campaign: 'pod_attendance',
    audience: 'USER',
    category: 'notification',
    fires: 'Attendance is marked at the pod',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Venue', 'App link'],
  },
  {
    key: 'HOST_ONBOARDING_BOOKED',
    campaign: 'host_onboarding_booked',
    audience: 'HOST',
    category: 'account',
    fires: 'A host books an onboarding interview',
    params: ['Recipient name', 'Date', 'Time'],
  },
  {
    key: 'HOST_ONBOARDING_INTERVIEW',
    campaign: 'host_onboarding_interview',
    audience: 'HOST',
    category: 'account',
    fires: 'The host interview is scheduled',
    params: ['Recipient name', 'Date', 'Time', 'Meet'],
  },
  {
    key: 'HOST_ONBOARDING_APPROVED',
    campaign: 'host_onboarding_approved',
    audience: 'HOST',
    category: 'account',
    fires: 'A host application is approved',
    params: ['Recipient name', 'Email'],
  },
  {
    key: 'HOST_ONBOARDING_REJECTED',
    campaign: 'host_onboarding_rejection',
    audience: 'HOST',
    category: 'account',
    fires: 'A host application is rejected',
    params: ['Recipient name', 'Reason'],
  },
  {
    key: 'HOST_ACCOUNT_SUSPENDED',
    campaign: 'host_accountsuspend',
    audience: 'HOST',
    category: 'account',
    fires: 'A host is deactivated',
    params: ['Recipient name'],
  },
  {
    key: 'HOST_ACCOUNT_REACTIVATED',
    campaign: 'host_accountreactivate',
    audience: 'HOST',
    category: 'account',
    fires: 'A host is reactivated',
    params: ['Recipient name'],
  },
  {
    key: 'HOST_CATEGORY_REQUESTED',
    campaign: 'host_newcategory_request',
    audience: 'HOST',
    category: 'notification',
    fires: 'A new hosting category is granted',
    params: ['Recipient name', 'New Category Added'],
  },
  {
    key: 'HOST_SLOT_APPROVED',
    campaign: 'host_venue_slotapproved',
    audience: 'HOST',
    category: 'notification',
    fires: 'The venue approves the pod slot',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Venue', 'Pod title'],
  },
  {
    key: 'HOST_SLOT_REJECTED',
    campaign: 'host_venue_slotrejected',
    audience: 'HOST',
    category: 'notification',
    fires: 'The venue rejects the pod slot',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Venue', 'Pod title'],
  },
  {
    key: 'HOST_POD_PUBLISHED',
    campaign: 'venue_pod_details',
    audience: 'HOST',
    category: 'notification',
    fires: 'The pod goes live and a club admin is assigned',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Venue', 'Host', 'Club Admin'],
  },
  {
    key: 'HOST_POD_FULL',
    campaign: 'host_pod_full',
    audience: 'HOST',
    category: 'notification',
    fires: 'The pod sells its last spot',
    params: ['Recipient name', 'Pod', 'Date', 'Time', 'Pod Link', 'Club Admin'],
  },
  {
    key: 'HOST_POD_CANCELLATION_REQUESTED',
    campaign: 'host_pod_cancellation',
    audience: 'HOST',
    category: 'notification',
    fires: 'The host asks to cancel a pod',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Venue', 'Booked Spots'],
  },
  {
    key: 'HOST_COMPLETE_POD_REMINDER',
    campaign: 'host_complete_pod_reminder',
    audience: 'HOST',
    category: 'reminder',
    fires: 'A finished pod is still not completed',
    params: ['Recipient name', 'Pod', 'Date', 'Time'],
  },
  {
    key: 'HOST_PAYMENT_SENT',
    campaign: 'host_payment',
    audience: 'HOST',
    category: 'billing',
    fires: 'A host payout is approved',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Amount'],
  },
  {
    key: 'HOST_POD_FEEDBACK',
    campaign: 'feedback_host',
    audience: 'HOST',
    category: 'feedback',
    fires: 'A pod the host ran has finished',
    params: ['Recipient name', 'Pod', 'Date', 'Time', 'Feedback'],
  },
  {
    key: 'VENUE_ONBOARDING_BOOKED',
    campaign: 'venue_onboarding_scheduled',
    audience: 'VENUE',
    category: 'account',
    fires: 'A venue books an onboarding interview',
    params: ['Recipient name', 'Date', 'Time'],
  },
  {
    key: 'VENUE_ONBOARDING_INTERVIEW',
    campaign: 'venue_interview',
    audience: 'VENUE',
    category: 'account',
    fires: 'The venue interview is scheduled',
    params: ['Recipient name', 'Date', 'Time', 'Meet'],
  },
  {
    key: 'VENUE_ONBOARDING_APPROVED',
    campaign: 'venue_onboarding_approved',
    audience: 'VENUE',
    category: 'account',
    fires: 'A venue application is approved',
    params: ['Recipient name', 'Email'],
  },
  {
    key: 'VENUE_ONBOARDING_REJECTED',
    campaign: 'venue_rejected_onboarding',
    audience: 'VENUE',
    category: 'account',
    fires: 'A venue application is rejected',
    params: ['Recipient name', 'Reason'],
  },
  {
    key: 'VENUE_ACCOUNT_SUSPENDED',
    campaign: 'venue_account_suspend',
    audience: 'VENUE',
    category: 'account',
    fires: 'A venue is deactivated',
    params: ['Recipient name'],
  },
  {
    key: 'VENUE_ACCOUNT_REACTIVATED',
    campaign: 'venue_account_reactivate',
    audience: 'VENUE',
    category: 'account',
    fires: 'A venue is reactivated',
    params: ['Recipient name'],
  },
  {
    key: 'VENUE_NEW_REQUESTED',
    campaign: 'venue_new_request',
    audience: 'VENUE',
    category: 'notification',
    fires: 'A new venue is added',
    params: ['Recipient name', 'Venue Name', 'Category'],
  },
  {
    key: 'VENUE_SLOT_REQUESTED',
    campaign: 'venue_new_slot',
    audience: 'VENUE',
    category: 'notification',
    fires: 'A host requests a slot at the venue',
    params: ['Recipient name', 'Pod', 'Date', 'Time', 'Host Name', 'Venue Studio Link'],
  },
  {
    key: 'VENUE_SLOT_PENDING_REMINDER',
    campaign: 'venue_slot_approval_pending',
    audience: 'VENUE',
    category: 'reminder',
    fires: 'A slot request is still unanswered',
    params: ['Recipient name', 'Hours until pod', 'Pod', 'Date', 'Time', 'Host'],
  },
  {
    key: 'VENUE_SLOT_APPROVED',
    campaign: 'venue_slot_approved',
    audience: 'VENUE',
    category: 'notification',
    fires: 'The venue approves a slot request',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Host', 'Venue Studio Link'],
  },
  {
    key: 'VENUE_SLOT_REJECTED',
    campaign: 'venue_slotapproval_reject',
    audience: 'VENUE',
    category: 'notification',
    fires: 'The venue rejects a slot request',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Host'],
  },
  {
    key: 'VENUE_POD_PUBLISHED',
    campaign: 'venue_pod_details',
    audience: 'VENUE',
    category: 'notification',
    fires: 'The pod goes live at the venue',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Venue', 'Host', 'Club Admin'],
  },
  {
    key: 'VENUE_PAYMENT_SENT',
    campaign: 'venue_payment',
    audience: 'VENUE',
    category: 'billing',
    fires: 'A venue payout is approved',
    params: ['Recipient name', 'Pod title', 'Pod', 'Date', 'Time', 'Amount'],
  },
  {
    key: 'VENUE_POD_FEEDBACK',
    campaign: 'venue_feedback',
    audience: 'VENUE',
    category: 'feedback',
    fires: 'A pod at the venue has finished',
    params: ['Recipient name', 'Pod', 'Date', 'Time', 'Feedback'],
  },
  {
    key: 'ECOMM_ONBOARDING_BOOKED',
    campaign: 'ecomm_onboarding_scheduled',
    audience: 'ECOMM',
    category: 'account',
    fires: 'A brand books an onboarding interview',
    params: ['Recipient name', 'Date', 'Time'],
  },
  {
    key: 'ECOMM_ONBOARDING_INTERVIEW',
    campaign: 'ecomm_interview_scheduled',
    audience: 'ECOMM',
    category: 'account',
    fires: 'The brand interview is scheduled',
    params: ['Recipient name', 'Date', 'Time', 'Meet'],
  },
  {
    key: 'ECOMM_ONBOARDING_APPROVED',
    campaign: 'ecomm_approve',
    audience: 'ECOMM',
    category: 'account',
    fires: 'A brand application is approved',
    params: ['Recipient name', 'Email'],
  },
  {
    key: 'ECOMM_ONBOARDING_REJECTED',
    campaign: 'ecomm_rejected',
    audience: 'ECOMM',
    category: 'account',
    fires: 'A brand application is rejected',
    params: ['Recipient name', 'Reason'],
  },
  {
    key: 'ECOMM_ACCOUNT_SUSPENDED',
    campaign: 'ecomm_accountsuspended',
    audience: 'ECOMM',
    category: 'account',
    fires: 'A brand is deactivated',
    params: ['Recipient name'],
  },
  {
    key: 'ECOMM_ACCOUNT_REACTIVATED',
    campaign: 'ecomm_accountreactivated',
    audience: 'ECOMM',
    category: 'account',
    fires: 'A brand is reactivated',
    params: ['Recipient name'],
  },
  {
    key: 'ECOMM_BRAND_ADDED',
    campaign: 'ecomm_newbrand_request',
    audience: 'ECOMM',
    category: 'notification',
    fires: 'A new brand is added',
    params: ['Recipient name', 'Brand', 'Category'],
  },
  {
    key: 'ECOMM_PRODUCT_ADDED',
    campaign: 'ecomm_newproduct_add',
    audience: 'ECOMM',
    category: 'notification',
    fires: 'A product is added',
    params: ['Recipient name', 'Product', 'Brand', 'Quantity Added'],
  },
  {
    key: 'ECOMM_STOCK_LOW',
    campaign: 'ecomm_low_inventory',
    audience: 'ECOMM',
    category: 'notification',
    fires: 'A product drops to its low-stock mark',
    params: ['Recipient name', 'Product', 'Brand', 'Available Quantity'],
  },
  {
    key: 'ECOMM_STOCK_OUT',
    campaign: 'ecomm_zero_inventory',
    audience: 'ECOMM',
    category: 'notification',
    fires: 'A product runs out of stock',
    params: ['Recipient name', 'Product', 'Brand', 'Available Quantity'],
  },
  {
    key: 'ECOMM_PAYMENT_SENT',
    campaign: 'ecomm_payment',
    audience: 'ECOMM',
    category: 'billing',
    fires: 'A brand payout is approved',
    params: ['Recipient name', 'Product', 'Payment ID', 'Date', 'Amount'],
  },
  {
    key: 'ECOMM_FEEDBACK',
    campaign: 'feedback_ecommerce_brand',
    audience: 'ECOMM',
    category: 'feedback',
    fires: 'A pod carrying the brand product has finished',
    params: ['Recipient name', 'Product', 'Feedback Link'],
  },
  {
    key: 'CLUB_ADMIN_ONBOARDING_BOOKED',
    campaign: 'clubadmin_onboarding_book',
    audience: 'CLUB_ADMIN',
    category: 'account',
    fires: 'A club admin books an onboarding interview',
    params: ['Recipient name', 'Date', 'Time'],
  },
  {
    key: 'CLUB_ADMIN_ONBOARDING_INTERVIEW',
    campaign: 'clubadmin_interview_scheduled',
    audience: 'CLUB_ADMIN',
    category: 'account',
    fires: 'The club-admin interview is scheduled',
    params: ['Recipient name', 'Date', 'Time', 'Meet'],
  },
  {
    key: 'CLUB_ADMIN_ONBOARDING_APPROVED',
    campaign: 'clubadmin_approved',
    audience: 'CLUB_ADMIN',
    category: 'account',
    fires: 'A club-admin application is approved',
    params: ['Recipient name', 'Email'],
  },
  {
    key: 'CLUB_ADMIN_ONBOARDING_REJECTED',
    campaign: 'clubadmin_rejected',
    audience: 'CLUB_ADMIN',
    category: 'account',
    fires: 'A club-admin application is rejected',
    params: ['Recipient name', 'Reason'],
  },
  {
    key: 'CLUB_ADMIN_HOST_HELP',
    campaign: 'clubadmin_host_request',
    audience: 'CLUB_ADMIN',
    category: 'notification',
    fires: 'A host asks the club admin for help',
    params: ['Recipient name', 'Pod', 'Date', 'Time', 'Host', 'Host Contact'],
  },
  {
    key: 'CLUB_ADMIN_VENUE_HELP',
    campaign: 'clubadmin_venue_request',
    audience: 'CLUB_ADMIN',
    category: 'notification',
    fires: 'A venue asks the club admin for help',
    params: ['Recipient name', 'Pod', 'Date', 'Time', 'Venue', 'Venue Contact'],
  },
  {
    key: 'CLUB_ADMIN_FEEDBACK',
    campaign: 'feedback_club_admin',
    audience: 'CLUB_ADMIN',
    category: 'feedback',
    fires: 'A pod the club admin managed has finished',
    params: ['Recipient name', 'Pod', 'Date', 'Time', 'Feedback'],
  },
  {
    key: 'CLUB_ADMIN_ACCOUNT_SUSPENDED',
    campaign: 'clubadmin_accountsuspended',
    audience: 'CLUB_ADMIN',
    category: 'account',
    fires: 'A club admin is deactivated',
    params: ['Recipient name'],
  },
  {
    key: 'CLUB_ADMIN_ACCOUNT_REACTIVATED',
    campaign: 'clubadmin_accountreactivated',
    audience: 'CLUB_ADMIN',
    category: 'account',
    fires: 'A club admin is reactivated',
    params: ['Recipient name'],
  },
  {
    key: 'CLUB_ADMIN_PAYMENT_SENT',
    campaign: 'clubadmin_payment',
    audience: 'CLUB_ADMIN',
    category: 'billing',
    fires: 'A club-admin payout is approved',
    params: ['Recipient name', 'Pod title', 'Club', 'Pod', 'Payment ID', 'Date', 'Amount'],
  },
  {
    key: 'VENUE_CHANGE_REQUEST_OFFER',
    campaign: 'venue_change_request_offer',
    audience: 'VENUE',
    category: 'notification',
    fires: 'Duncit offers a venue a pod whose current venue asked to be changed',
    params: ['Recipient name', 'Pod', 'Date', 'Time', 'Club', 'Venue Studio Link'],
  },
  {
    key: 'HOST_CHANGE_REQUEST_OFFER',
    campaign: 'host_change_request_offer',
    audience: 'HOST',
    category: 'notification',
    fires: 'Duncit offers a host a pod whose current host asked to be changed',
    params: ['Recipient name', 'Pod', 'Date', 'Time', 'Venue', 'Host Studio Link'],
  },
  {
    key: 'CLUB_ADMIN_CHANGE_REQUEST_OFFER',
    campaign: 'club_admin_change_request_offer',
    audience: 'CLUB_ADMIN',
    category: 'notification',
    fires: 'Duncit offers a club admin a pod whose current club admin asked to be changed',
    params: ['Recipient name', 'Pod', 'Date', 'Time', 'Club', 'Club Studio Link'],
  },
  {
    key: 'SUPPORT_TICKET_CREATED',
    campaign: 'support_ticket_created',
    audience: 'SUPPORT',
    category: 'support',
    fires: 'A support ticket is raised',
    params: ['Recipient name', 'Ticket ID', 'Subject'],
  },
  {
    key: 'SUPPORT_TICKET_IN_PROGRESS',
    campaign: 'support_ticket_acknowledged',
    audience: 'SUPPORT',
    category: 'support',
    fires: 'A support ticket is picked up',
    params: ['Recipient name', 'Ticket ID', 'Subject'],
  },
  {
    key: 'SUPPORT_TICKET_UPDATED',
    campaign: 'support_ticket_seen',
    audience: 'SUPPORT',
    category: 'support',
    fires: 'A support ticket is updated',
    params: ['Recipient name', 'Ticket ID', 'Subject'],
  },
];

/** Lookup by event key. */
export const WA_EVENT_BY_KEY: ReadonlyMap<string, WaEvent> = new Map(
  WA_EVENTS.map((event) => [event.key, event])
);

/** How many {{n}} a scenario must fill. AiSensy renders a missing one as the
 * literal `{{7}}` and bills for the message, so this is asserted before send. */
export const waEventArity = (key: string): number => WA_EVENT_BY_KEY.get(key)?.params.length ?? 0;
