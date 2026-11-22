/**
 * The monthly Host Performance emails (Club Admin host management): the host's
 * own month, and the club admin's list of hosts who need a call.
 *
 * Both mirror a WhatsApp scenario (`waEvent`): the first `vars` are its params
 * in order, the rest email-only. `hosts_html` is drawn by the sender
 * (hostPerformance.notify) with every value escaped and its labels left as
 * `{{t:…}}` keys, so the reader's own language fills them. Kept in its own file
 * beside the offers emails rather than growing catalogue.partners further.
 * Seeded into Mongo and edited in the Communications portal like every other
 * catalogue row — there is no MJML file on disk.
 */
import { CALM, PAUSED, callout, closing, cta, detailRows, htmlBlock, intro, shell } from './mjml';
import { FOOTER, LABEL } from './catalogue.copy';
import { defineEmail, v, type EmailDef } from './catalogue.types';

const ADMIN_COPY = 'email.clubAdminHostPerformance';

/** The admin email: the counts, every host needing attention, the button and why calling helps. */
function adminBody(): string {
  return shell(
    `${ADMIN_COPY}.title`,
    [
      intro(`${ADMIN_COPY}.title`, `${ADMIN_COPY}.body`, 'name'),
      callout(PAUSED, LABEL.club, 'club'),
      detailRows([
        { labelKey: 'email.hostPerformance.month', valueVar: 'month' },
        { labelKey: 'email.hostPerformance.attention', valueVar: 'attention' },
        { labelKey: 'email.hostPerformance.inactive', valueVar: 'inactive' },
        { labelKey: 'email.hostPerformance.belowTarget', valueVar: 'below_target' },
        { labelKey: 'email.hostPerformance.target', valueVar: 'target' },
      ]),
      htmlBlock('hosts_html'),
      cta(`${ADMIN_COPY}.cta`, 'hosts_url'),
      closing(`${ADMIN_COPY}.help`),
    ].join('\n'),
    `${ADMIN_COPY}.body`
  );
}

export const HOST_PERFORMANCE_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'host-monthly-performance',
    name: 'Host: Monthly Performance',
    description:
      'Each host, once a month per club they host: the monthly pod target from Pod Settings, the pods they completed, their Host Performance Score and what to do next.',
    audience: 'HOST',
    category: 'notification',
    fires: 'Monthly, per club: the host’s pod target, completed pods and performance score for the month before',
    waEvent: 'HOST_MONTHLY_PERFORMANCE',
    subject: 'Your {{month}} pod summary for {{club}}',
    footerNote: FOOTER.host,
    vars: [
      v('name', 'The host’s first name.', 'Meera'),
      v('club', 'The club the summary is for.', 'Noida Badminton Club'),
      v('month', 'The month it covers.', 'October 2026'),
      v('target', 'Pod Settings’ monthly pod target.', '8'),
      v('completed', 'Pods the host completed in the club that month.', '5'),
      v('score', 'The Host Performance Score, with its percent sign.', '63%'),
      v('guidance', 'One line of guidance, in the host’s language.', 'Run 3 more pods next month to reach your target.'),
      v('create_pod_url', 'Create Pod on mobile web.', 'https://mweb.duncit.com/create-pod'),
    ],
    body: {
      copyKey: 'email.hostMonthlyPerformance',
      nameVar: 'name',
      tone: CALM,
      calloutLabelKey: LABEL.club,
      calloutVar: 'club',
      rows: [
        { labelKey: 'email.hostPerformance.month', valueVar: 'month' },
        { labelKey: 'email.hostPerformance.target', valueVar: 'target' },
        { labelKey: 'email.hostPerformance.completed', valueVar: 'completed' },
        { labelKey: 'email.hostPerformance.score', valueVar: 'score' },
        { labelKey: 'email.hostPerformance.nextStep', valueVar: 'guidance' },
      ],
      ctaKey: 'email.hostMonthlyPerformance.cta',
      ctaVar: 'create_pod_url',
      helpKey: 'email.hostMonthlyPerformance.help',
    },
  }),
  {
    slug: 'club-admin-host-performance-alert',
    name: 'Club Admin: Host Performance Alert',
    description:
      'Every admin of a club, once a month, when at least one of its hosts is inactive (no completed pod within Pod Settings’ inactivity days) or below the underperformance threshold — each such host with contact details, score and a suggested next step.',
    audience: 'CLUB_ADMIN',
    category: 'notification',
    fires: 'Monthly, per club: hosts who are inactive or below the monthly pod target',
    waEvent: 'CLUB_ADMIN_HOST_PERFORMANCE_ALERT',
    subject: '{{attention}} hosts in {{club}} need your attention',
    footerNote: FOOTER.clubAdmin,
    vars: [
      v('name', 'The club admin’s first name.', 'Rohit'),
      v('club', 'The club.', 'Noida Badminton Club'),
      v('month', 'The month it covers.', 'October 2026'),
      v('attention', 'Hosts needing attention (inactive or below target).', '3'),
      v('inactive', 'Hosts with no completed pod within the inactivity window.', '2'),
      v('below_target', 'Hosts below the underperformance threshold.', '3'),
      v('hosts_url', 'The club’s Hosts page in the Partners console.', 'https://partners-app.duncit.com/club-admin/clubs/66f1/hosts'),
      v('target', 'Pod Settings’ monthly pod target.', '8'),
      v('hosts_html', 'Each host needing attention — name, score, last pod, contacts, suggested action — drawn and escaped by the sender.', '<p><strong>Meera Nair</strong>…</p>'),
    ],
    mjml: adminBody(),
  },
];

/** Their English copy (rule 38) — spread into EMAIL_FALLBACK with the rest of the catalogue's. */
export const HOST_PERFORMANCE_EMAIL_FALLBACK: Record<string, string> = {
  'email.hostMonthlyPerformance.title': 'Your monthly pod summary',
  'email.hostMonthlyPerformance.body':
    'Here is how your month went. Your score is the share of the monthly pod target you completed, up to 100%.',
  'email.hostMonthlyPerformance.cta': 'Plan your next pod',
  'email.hostMonthlyPerformance.help':
    'Your Club Admin may get in touch to hear what is getting in the way and help you run more pods. You can reach out to them too.',
  'email.hostMonthlyPerformance.guidanceMet': 'You reached your target — great work. Keep the momentum going next month.',
  'email.hostMonthlyPerformance.guidanceBelow': 'Run {{count}} more pods next month to reach your target.',
  'email.clubAdminHostPerformance.title': 'Some of your hosts need a hand',
  'email.clubAdminHostPerformance.body':
    'These hosts have not run a pod recently or fell short of the monthly pod target last month.',
  'email.clubAdminHostPerformance.cta': 'Open the Hosts page',
  'email.clubAdminHostPerformance.help':
    'You may contact these hosts to understand their challenges — a venue, a time slot, getting the word out — and help them conduct more pods. Record how it went with their engagement status on the Hosts page.',
  'email.hostPerformance.month': 'Month',
  'email.hostPerformance.target': 'Monthly target',
  'email.hostPerformance.completed': 'Pods completed',
  'email.hostPerformance.score': 'Performance score',
  'email.hostPerformance.nextStep': 'Next step',
  'email.hostPerformance.attention': 'Hosts needing attention',
  'email.hostPerformance.inactive': 'Inactive hosts',
  'email.hostPerformance.belowTarget': 'Below target',
  'email.hostPerformance.lastPod': 'Last pod',
  'email.hostPerformance.noPodYet': 'No completed pod yet',
  'email.hostPerformance.contact': 'Contact',
  'email.hostPerformance.actionInactive': 'Suggested: call them to find out what is stopping them and help plan their next pod.',
  'email.hostPerformance.actionBelow': 'Suggested: check in and help them find venues and slots to run more pods.',
  'email.hostPerformance.moreHosts': 'More hosts needing attention on the Hosts page:',
};
