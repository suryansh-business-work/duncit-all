import type { EmailCategory } from '../email.provider';
import type { EMAIL_ICON_TONE } from './tokens';

/**
 * The small set of icons an email is drawn with.
 *
 * An email cannot use an icon font or an inline SVG (Gmail strips both), and
 * rule 22 rules out Unicode symbols, so each icon is a transparent PNG drawn
 * from the `@mui/icons-material` glyph of the same name by
 * `scripts/generate-email-icons.ts`, committed under `services/_assets/email-
 * icons`, and served by the API at `{{email_assets_url}}/<name>.png`. Every
 * image is decorative (`alt=""`): the label beside it says the same thing, so a
 * client that blocks images loses nothing a reader needs.
 */
export const EMAIL_ICONS = {
  calendar: { glyph: 'CalendarMonthOutlined', tone: 'brand' },
  clock: { glyph: 'ScheduleOutlined', tone: 'brand' },
  group: { glyph: 'GroupsOutlined', tone: 'brand' },
  person: { glyph: 'PersonOutlined', tone: 'brand' },
  place: { glyph: 'PlaceOutlined', tone: 'brand' },
  payments: { glyph: 'PaymentsOutlined', tone: 'brand' },
  receipt: { glyph: 'ReceiptLongOutlined', tone: 'brand' },
  ticket: { glyph: 'ConfirmationNumberOutlined', tone: 'brand' },
  mail: { glyph: 'MailOutlineOutlined', tone: 'brand' },
  phone: { glyph: 'PhoneOutlined', tone: 'brand' },
  storefront: { glyph: 'StorefrontOutlined', tone: 'brand' },
  inventory: { glyph: 'Inventory2Outlined', tone: 'brand' },
  shipping: { glyph: 'LocalShippingOutlined', tone: 'brand' },
  repeat: { glyph: 'AutorenewOutlined', tone: 'brand' },
  notes: { glyph: 'ChatBubbleOutlineOutlined', tone: 'brand' },
  video: { glyph: 'VideocamOutlined', tone: 'brand' },
  category: { glyph: 'CategoryOutlined', tone: 'brand' },
  device: { glyph: 'SmartphoneOutlined', tone: 'brand' },
  code: { glyph: 'CodeOutlined', tone: 'brand' },
  chart: { glyph: 'InsightsOutlined', tone: 'brand' },
  key: { glyph: 'KeyOutlined', tone: 'brand' },
  lock: { glyph: 'LockOutlined', tone: 'brand' },
  bell: { glyph: 'NotificationsNoneOutlined', tone: 'brand' },
  campaign: { glyph: 'CampaignOutlined', tone: 'brand' },
  check: { glyph: 'TaskAltOutlined', tone: 'brand' },
  support: { glyph: 'SupportAgentOutlined', tone: 'brand' },
  gavel: { glyph: 'GavelOutlined', tone: 'brand' },
  badge: { glyph: 'BadgeOutlined', tone: 'brand' },
  gift: { glyph: 'CardGiftcardOutlined', tone: 'brand' },
  flag: { glyph: 'FlagOutlined', tone: 'brand' },
  coins: { glyph: 'TollOutlined', tone: 'brand' },
  assignment: { glyph: 'AssignmentOutlined', tone: 'brand' },
  trophy: { glyph: 'EmojiEventsOutlined', tone: 'brand' },
  label: { glyph: 'LabelOutlined', tone: 'brand' },
  /** The notices, one per tone — drawn in the tone's own colour. */
  noteInfo: { glyph: 'InfoOutlined', tone: 'info' },
  noteSuccess: { glyph: 'CheckCircleOutlineOutlined', tone: 'success' },
  noteWarning: { glyph: 'WarningAmberOutlined', tone: 'warning' },
  noteError: { glyph: 'ErrorOutlineOutlined', tone: 'brand' },
} as const satisfies Record<string, { glyph: string; tone: keyof typeof EMAIL_ICON_TONE }>;

export type EmailIcon = keyof typeof EMAIL_ICONS;

/** Where the API serves the icon PNGs; `email_assets_url` is the server URL plus this. */
export const EMAIL_ASSETS_PATH = '/email-assets';

/** The `src` of one icon. `email_assets_url` is supplied on every send. */
export const iconSrc = (icon: EmailIcon): string => `{{email_assets_url}}/${icon}.png`;

/** The badge in each category's header, beside its label. */
export const CATEGORY_ICON: Record<EmailCategory, EmailIcon> = {
  transactional: 'check',
  authentication: 'lock',
  marketing: 'campaign',
  service: 'mail',
  notification: 'bell',
  support: 'support',
  billing: 'receipt',
  legal: 'gavel',
  internal: 'badge',
};

/**
 * Which icon a label reads as, by the words in its key.
 *
 * Detail rows and callouts are labelled by copy keys (`email.field.date`,
 * `email.podCancellationRisk.venueCost`), and those keys already say what the
 * row holds — so the icon follows from the key rather than being one more
 * argument to every one of the hundred-odd call sites. ORDER MATTERS: the first
 * match wins, so the narrow words (`hostContact` is a phone, `venueCost` is
 * money, `trackingNo` is a parcel) come before the broad ones they contain.
 */
const BY_WORD: ReadonlyArray<readonly [RegExp, EmailIcon]> = [
  [/contact|phone/, 'phone'],
  [/email/, 'mail'],
  [/password|otp|signin/, 'key'],
  [/meeting/, 'video'],
  [/challenge/, 'trophy'],
  [/courier|tracking|delivery/, 'shipping'],
  [/autoship|every/, 'repeat'],
  [/reason|resolution|notes|details|subject|message|comment/, 'notes'],
  [/coins/, 'coins'],
  [/venuecost|venuebill|amount|refund(?!days)|payout|price|total|fee|gst|shortfall|collected|yourpart/, 'payments'],
  [/time|hours|slot|window|deadline|refunddays/, 'clock'],
  [/date|when|deleteon|expireson|scheduled|detected|requested|period/, 'calendar'],
  [/ticket/, 'ticket'],
  [/(id|no|number)$|reference|invoice|receipt|order/, 'receipt'],
  [/venue|place|address|location|locality|city/, 'place'],
  [/brand|store|business|shop/, 'storefront'],
  [/product|item|quantity|available|stock/, 'inventory'],
  [/admin|host|recipient|friend|applicant|reviewer|cancelledby|owner|account/, 'person'],
  [/pod|guest|spot|seat|admit|booking|club|member/, 'group'],
  [/device|version|platform/, 'device'],
  [/build|range|insertion|deletion|files/, 'code'],
  [/dashboard|tile|rule|change/, 'chart'],
  [/application/, 'assignment'],
  [/category|type/, 'category'],
  [/campaign|^ad$/, 'campaign'],
  [/grievance/, 'gavel'],
  [/gift/, 'gift'],
  [/report/, 'flag'],
  [/alert/, 'bell'],
];

/** The icon for a label key; the plain tag when its words name nothing known. */
export function iconForKey(key: string): EmailIcon {
  const word = (key.split('.').pop() ?? '').toLowerCase().replace(/label$/, '');
  return BY_WORD.find(([pattern]) => pattern.test(word))?.[1] ?? 'label';
}
