import {
  LIVE,
  PAUSED,
  STOPPED,
  callout,
  closing,
  cta,
  detailRows,
  htmlBlock,
  intro,
  introBlock,
  paragraph,
  shell,
  text,
  type Tone,
} from './mjml';
import { v, type EmailDef, type EmailVar } from './catalogue.types';

/**
 * Tech → App Builds → Releases telling people a release needs them.
 *
 * `store-release-rejected` goes out the moment a store's rejection is seen
 * (Apple's API, or an operator logging Google's), `store-release-approved`
 * when Apple has approved a version that is waiting for us to release it, and
 * `store-release-reminder` again and again while either stays open. Every
 * one carries OpenAI's advice as its own HTML block, drawn by the server into
 * `{{advice_html}}`. All are seeded into Tech > Email Templates, where the
 * MJML is edited (rule 28).
 */

const FOOTER_NOTE = '{{t:email.storeRelease.footer}}';

const COMMON_VARS: readonly EmailVar[] = [
  v('recipient_name', 'Who the mail is for — the address from the release settings.', 'admin@duncit.com'),
  v('store_label', 'Which store.', 'App Store'),
  v('version', 'The version the store shows.', '1.80.3'),
  v('build_number', 'The build number (CFBundleVersion / version code).', '210'),
  v('state_label', 'The store’s own state, readable.', 'Metadata rejected'),
  v('meaning', 'What that state means, in a sentence.', 'App Review refused the listing text or screenshots; the binary itself was not the problem.'),
  v('reviewer_message', 'What the reviewer wrote, when someone has pasted it.', 'Guideline 2.3.3 — Your screenshots do not show the app in use.'),
  v('detected_label', 'When the issue was first seen, in the app’s time zone.', '20 Sep 2026 10:14 am'),
  v('advice_summary', 'OpenAI’s suggestion in one paragraph.', 'Replace the iPhone screenshots with captures of the pod list and a booking.'),
  v('advice_html', 'The full advice — summary, likely causes, steps, next time — as HTML.', '<p>Replace the screenshots…</p>'),
  v('releases_url', 'Tech → App Builds → Releases.', 'https://tech.duncit.com/app-builds/releases'),
];

const REMINDER_VARS: readonly EmailVar[] = [
  ...COMMON_VARS,
  v('hours_open', 'How many hours the issue has been open.', '26'),
];

/** The advice, drawn by the server as plain HTML — this row only places it. */
const ADVICE_BLOCK = [
  paragraph('<strong>{{t:email.storeRelease.adviceLabel}}</strong>'),
  htmlBlock('advice_html'),
].join('\n');

const DETAIL_ROWS = detailRows([
  { labelKey: 'email.storeRelease.storeLabel', valueVar: 'store_label' },
  { labelKey: 'email.storeRelease.versionLabel', valueVar: 'version' },
  { labelKey: 'email.storeRelease.buildLabel', valueVar: 'build_number' },
  { labelKey: 'email.storeRelease.detectedLabel', valueVar: 'detected_label' },
  { labelKey: 'email.storeRelease.reviewerLabel', valueVar: 'reviewer_message' },
]);

/** The one body shape all three share: heading, the state in a tinted strip, the facts, the advice, the link. */
const body = (copyKey: string, tone: Tone) =>
  shell(
    `${copyKey}.title`,
    [
      intro(`${copyKey}.title`, `${copyKey}.body`, 'recipient_name'),
      callout(tone, 'email.storeRelease.stateLabel', 'state_label'),
      DETAIL_ROWS,
      ADVICE_BLOCK,
      cta('email.storeRelease.openReleases', 'releases_url'),
      closing('email.storeRelease.help'),
    ].join('\n'),
    `${copyKey}.body`
  );

/**
 * A new Android build for the testers, from `sendAppReleaseEmail`.
 *
 * The changelog and the commit list are drawn by the server (`appRelease.email`)
 * as escaped HTML, because their length is the build's; everything around them
 * is this body, so the copy is translatable and the layout is editable in
 * Communications > Emails > Templates like every other email.
 */
const RELEASE_BODY = shell(
  'email.appRelease.title',
  [
    introBlock({
      eyebrow: '{{t:email.appRelease.eyebrow}}',
      title: '{{t:email.appRelease.title}}',
      body: '{{t:email.appRelease.body}}',
    }),
    cta('email.appRelease.download', 'apk_url'),
    text('email.appRelease.installNote'),
    paragraph('<strong>{{t:email.appRelease.whatsNew}}</strong>'),
    htmlBlock('changelog_html'),
    paragraph('<strong>{{t:email.appRelease.commitsTitle}}</strong>'),
    htmlBlock('commits_html'),
    detailRows([
      { labelKey: 'email.appRelease.filesChanged', valueVar: 'files_changed' },
      { labelKey: 'email.appRelease.insertions', valueVar: 'insertions' },
      { labelKey: 'email.appRelease.deletions', valueVar: 'deletions' },
      { labelKey: 'email.appRelease.range', valueVar: 'range_label' },
    ]),
    closing('email.appRelease.builtOn'),
  ].join('\n'),
  'email.appRelease.body'
);

export const APP_BUILD_EMAILS: readonly EmailDef[] = [
  {
    slug: 'store-release-rejected',
    name: 'Store Release Rejected',
    description: 'Tells the release contacts that the App Store or Google Play rejected a version, with what the store said and OpenAI’s advice on fixing it.',
    audience: 'ADMIN',
    category: 'internal',
    fires: 'App Store Connect shows a version as rejected, or an operator logs a Google Play rejection on Tech > App Builds > Releases',
    subject: '{{store_label}} rejected version {{version}}',
    footerNote: FOOTER_NOTE,
    vars: COMMON_VARS,
    mjml: body('email.storeReleaseRejected', STOPPED),
  },
  {
    slug: 'store-release-approved',
    name: 'Store Release Approved',
    description: 'Tells the release contacts that Apple approved a version and is waiting for us to release it.',
    audience: 'ADMIN',
    category: 'internal',
    fires: 'App Store Connect shows a version as Pending Developer Release',
    subject: '{{store_label}} approved version {{version}} — release it',
    footerNote: FOOTER_NOTE,
    vars: COMMON_VARS,
    mjml: body('email.storeReleaseApproved', LIVE),
  },
  {
    slug: 'store-release-reminder',
    name: 'Store Release Reminder',
    description: 'Raises a rejection or an approved-but-unreleased version again while it stays open past the reminder window.',
    audience: 'ADMIN',
    category: 'internal',
    fires: 'An issue on Tech > App Builds > Releases is still open after the reminder hours set on App Builds > Settings',
    subject: 'Still open: {{store_label}} version {{version}}',
    footerNote: FOOTER_NOTE,
    vars: REMINDER_VARS,
    mjml: body('email.storeReleaseReminder', PAUSED),
  },
  {
    slug: 'app-release-build',
    name: 'App Release Build',
    description: 'Tells the release list a new Android build is ready to install, with its changelog, its commits and a download link.',
    audience: 'ADMIN',
    category: 'internal',
    fires: 'A Tech admin sends a build’s release email from App Builds, or the build pipeline does',
    subject: '{{app_name}} v{{version}} — new build ready to test',
    footerNote: '{{t:email.appRelease.footer}}',
    vars: [
      v('version', 'The version being released.', '1.80.3'),
      v('build_name', 'The build’s own name.', 'duncit-18-july-2026-build-1 V1.80.3'),
      v('apk_size', 'The APK’s size, already formatted.', '63.4 MB'),
      v('apk_url', 'The direct install link.', 'https://ik.imagekit.io/x/app-builds/duncit.apk'),
      v('changelog_html', 'The grouped changelog, drawn by the server as HTML.', '<p>12 changes since v1.80.2</p>'),
      v('commits_count', 'How many commits the build carries.', '12'),
      v('commits_html', 'The commit list, drawn by the server as HTML.', '<table>…</table>'),
      v('files_changed', 'Files changed in the range. A dash when unknown.', '42'),
      v('insertions', 'Lines added. A dash when unknown.', '+340'),
      v('deletions', 'Lines removed. A dash when unknown.', '-88'),
      v('range_label', 'The commit range. A dash when unknown.', 'since v1.80.2'),
      v('built_on', 'When the build was made.', 'Sat, 18 Jul 2026 10:00:00 GMT'),
    ],
    mjml: RELEASE_BODY,
  },
];
