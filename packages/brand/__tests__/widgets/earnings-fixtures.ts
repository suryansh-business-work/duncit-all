import type { EarnConfig, EarnCopy } from '../../src/widgets/earnings-calculator-types';

export const earnConfig: EarnConfig = {
  currency: '₹',
  roles: [
    {
      key: 'host',
      label: 'Host',
      name: 'Pod host',
      field: 'host_receives',
      takeHomeLabel: 'Host take-home',
      rateField: 'host_commission_amount',
      rows: ['gross', 'gst', 'platform', 'venue', 'hostCommission', 'perPod'],
      dutiesTitle: 'Host duties',
      duties: ['Greet guests', 'Run the pod'],
    },
    {
      key: 'club_admin',
      label: 'Club admin',
      name: 'Club admin',
      field: 'club_admin_amount',
      takeHomeLabel: 'Club admin take-home',
      multiplier: 'pods',
      rows: ['gross', 'clubAdmin', 'pods'],
      dutiesTitle: 'Club duties',
      duties: ['Oversee hosts'],
    },
  ],
  fields: [
    { name: 'ticket', label: 'Ticket price', prefix: '₹' },
    { name: 'spots', label: 'Spots' },
    { name: 'venue', label: 'Venue cost', prefix: '₹' },
    { name: 'pods', label: 'Pods per month', roles: ['club_admin'] },
  ],
  rowLabels: {
    gross: 'Ticket revenue',
    gst: 'GST',
    platform: 'Platform fee',
    venue: 'Venue',
    clubAdmin: 'Club admin share',
    hostCommission: 'Host commission',
    perPod: 'Per pod',
    pods: 'Pods',
  },
};

export const earnCopy: EarnCopy = {
  note: 'Standard note',
  shortfallNote: 'Shortfall note',
  noShareNote: 'No share note',
  loadError: 'Could not load',
  disclaimer: 'Estimates only',
  pdf: {
    title: 'Earnings estimate',
    inputsTitle: 'Inputs',
    breakdownTitle: 'Breakdown',
    footer: 'Printed on',
    preparing: 'Preparing…',
    error: 'PDF failed',
    fileName: 'estimate.pdf',
  },
};

export const waterfall = {
  amount: 1000,
  gst_amount: 180,
  platform_fee_amount: 100,
  venue_amount: 300,
  club_admin_pct: 10,
  club_admin_amount: 50,
  host_commission_amount: 120,
  host_receives: 250.5,
};

/** The calculator section's markup; `extras` toggles optional parts. */
export function earnMarkup(opts: { pdfButton?: boolean; panel?: boolean; logo?: boolean } = {}): string {
  const { pdfButton = true, panel = true, logo = true } = opts;
  return `
  <section id="r" data-graphql-url="https://api.test/gql" ${logo ? 'data-print-logo="https://cdn.test/logo.png"' : ''}
    data-config='${JSON.stringify(earnConfig)}' data-copy='${JSON.stringify(earnCopy)}'>
    <button data-role-tab="host" aria-selected="true">Host</button>
    <button data-role-tab="club_admin" aria-selected="false">Club</button>
    <form data-earn-form>
      <label data-field><input type="range" name="ticket" min="0" max="5000" value="500" data-prefix="₹"/></label>
      <label data-field><input type="range" name="spots" min="1" max="50" value="10"/></label>
      <label data-field><input type="range" name="venue" min="0" max="5000" value="0" data-prefix="₹"/></label>
      <label data-field data-field-roles="club_admin"><input type="range" name="pods" min="1" max="20" value="4"/></label>
      <label data-field data-field-roles=""><input type="text" name="free"/></label>
    </form>
    <span data-out="ticket"></span><span data-out="spots"></span><span data-out="venue"></span>
    <span data-out="pods"></span>
    ${
      panel
        ? `<p data-earn-label></p><p data-earn-takehome></p><dl data-earn-rows></dl><p data-earn-note></p>
    <h3 data-duties-title></h3><ul data-duties></ul>`
        : ''
    }
    ${pdfButton ? '<button data-print-estimate><i>PDF</i></button>' : ''}
  </section>`;
}
