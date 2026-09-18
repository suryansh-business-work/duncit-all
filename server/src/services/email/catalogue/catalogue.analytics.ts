import { CALM, LIVE, callout, closing, cta, intro, shell } from './mjml';
import { defineEmail, v, type EmailDef, type EmailVar } from './catalogue.types';

/**
 * The Analytics console's mails (Analytics > Settings > Analytics Mails).
 *
 * `analytics-report` is the report itself: every tile of the dashboards a
 * subscriber follows, drawn by the server into `{{analytics_html}}`, with the
 * same report attached as a PDF and a button back to the live console.
 * `analytics-subscribed` tells somebody they were added, before the first
 * report arrives. Both are seeded into Tech > Email Templates, where the MJML
 * is edited (rule 28).
 */

const FOOTER_NOTE = '{{t:email.analyticsReport.footer}}';

const URL_VAR: EmailVar = v(
  'analytics_url',
  'The Analytics console, in this environment.',
  'https://analytics.duncit.com/'
);

/** The report's tiles, drawn by the server as plain HTML — this row only places them. */
const REPORT_TILES = `    <mj-section background-color="#ffffff" padding="16px 20px 8px 20px">
      <mj-column>
        <mj-text>{{analytics_html}}</mj-text>
      </mj-column>
    </mj-section>`;

const REPORT_BODY = shell(
  'email.analyticsReport.title',
  [
    intro('email.analyticsReport.title', 'email.analyticsReport.body', 'name'),
    callout(CALM, 'email.analyticsReport.periodLabel', 'period_label'),
    REPORT_TILES,
    cta('email.analyticsReport.openAnalytics', 'analytics_url'),
    closing('email.analyticsReport.pdfNote'),
  ].join('\n')
);

export const ANALYTICS_EMAILS: readonly EmailDef[] = [
  {
    slug: 'analytics-report',
    name: 'Analytics Report',
    description:
      'A subscriber’s analytics report: every tile of the dashboards they follow, the PDF of the full report attached, and a link to the live console.',
    audience: 'ADMIN',
    category: 'internal',
    fires: 'A subscriber’s daily or weekly slot passes, or an Analytics manager presses Send now',
    subject: '{{report_title}} — {{period_label}}',
    footerNote: FOOTER_NOTE,
    vars: [
      v('name', 'Who the report is for.', 'Aarav Sharma'),
      v('report_title', 'Daily or weekly, in the reader’s language.', 'Weekly analytics report'),
      v('period_label', 'The period the numbers cover.', 'Last 7 days · 11 Sep 2026 – 18 Sep 2026'),
      v('dashboards_count', 'How many dashboards the report covers.', '6'),
      v(
        'analytics_html',
        'Every dashboard’s tiles with how each moved, drawn by the server as HTML.',
        '<p><strong>Pods analytics</strong></p>'
      ),
      URL_VAR,
    ],
    mjml: REPORT_BODY,
  },
  defineEmail({
    slug: 'analytics-subscribed',
    name: 'Analytics Report Subscription',
    description: 'Tells somebody they were added to the analytics reports: when, which dashboards and for what period.',
    audience: 'ADMIN',
    category: 'internal',
    fires: 'An Analytics manager adds a subscriber in Analytics > Settings > Analytics Mails',
    subject: 'You’re subscribed to Duncit analytics reports',
    footerNote: FOOTER_NOTE,
    vars: [
      v('name', 'Who was subscribed.', 'Aarav Sharma'),
      v('schedule_label', 'When the reports arrive.', 'Every Monday at 09:00 (Asia/Kolkata)'),
      v('dashboards_label', 'The dashboards each report covers.', 'Users analytics, Pods analytics'),
      v('period_label', 'The period each report covers.', 'The last 7 days'),
      URL_VAR,
    ],
    body: {
      copyKey: 'email.analyticsSubscribed',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: 'email.analyticsSubscribed.scheduleLabel',
      calloutVar: 'schedule_label',
      rows: [
        { labelKey: 'email.analyticsSubscribed.dashboardsLabel', valueVar: 'dashboards_label' },
        { labelKey: 'email.analyticsSubscribed.periodLabel', valueVar: 'period_label' },
      ],
      ctaKey: 'email.analyticsReport.openAnalytics',
      ctaVar: 'analytics_url',
      helpKey: 'email.analyticsSubscribed.help',
    },
  }),
];
