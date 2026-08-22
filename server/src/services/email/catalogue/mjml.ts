/**
 * The MJML pieces every code-seeded email body is assembled from.
 *
 * One set of builders, not one blob per template. Sixty templates written out
 * by hand would be sixty places to fix a padding value, and the reason the
 * account-status emails already shared a `statusTemplate` helper before this
 * file existed — these are the same builders, lifted out of
 * `emailTemplate.defaults.ts` so the catalogue and the older hand-written
 * defaults draw from ONE source (rule 34).
 *
 * The header and the footer are deliberately NOT here: the category's fragment
 * injects those inside `<mj-body>` at render time, and a body that drew its own
 * would double the logo. Every visible string is a `{{t:…}}` key (rule 38).
 */

/** The tint of the one callout a body carries. */
export interface Tone {
  bg: string;
  border: string;
  label: string;
  value: string;
}

/** Something is on, live, approved, paid. */
export const LIVE: Tone = { bg: '#ecfdf5', border: '#10b981', label: '#047857', value: '#065f46' };
/** Something is paused, waiting, or needs a decision. */
export const PAUSED: Tone = { bg: '#fffbeb', border: '#f59e0b', label: '#b45309', value: '#92400e' };
/** Something failed, was cancelled, or was declined. */
export const STOPPED: Tone = { bg: '#fef2f2', border: '#ef4444', label: '#b91c1c', value: '#991b1b' };
/** Neutral — a record, a reminder, a receipt. */
export const CALM: Tone = { bg: '#eff6ff', border: '#3b82f6', label: '#1d4ed8', value: '#1e40af' };

const HEAD_ATTRS = `    <mj-attributes>
      <mj-all font-family="Inter, Helvetica, Arial, sans-serif" />
      <mj-text color="#222222" font-size="14px" line-height="22px" />
      <mj-button background-color="#F82C2E" color="#ffffff" border-radius="8px" font-weight="700" />
    </mj-attributes>`;

/**
 * The document around a body. The header and footer are NOT here — the
 * category's fragment injects those inside `<mj-body>` at render time, and a
 * body that drew its own would double the logo.
 */
export function shell(titleKey: string, body: string): string {
  return `<mjml>
  <mj-head>
    <mj-title>{{t:${titleKey}}}</mj-title>
${HEAD_ATTRS}
  </mj-head>
  <mj-body background-color="#f4f4f4">
${body}
  </mj-body>
</mjml>
`;
}

/** The white card every body opens with: heading, greeting, one paragraph. */
export function intro(titleKey: string, bodyKey: string, nameVar: string): string {
  return `    <mj-section background-color="#ffffff" padding="24px 20px 8px 20px">
      <mj-column>
        <mj-text font-size="22px" font-weight="bold" color="#222222">{{t:${titleKey}}}</mj-text>
        <mj-text color="#555555">{{t:email.common.greeting}} {{${nameVar}}},</mj-text>
        <mj-text color="#555555">{{t:${bodyKey}}}</mj-text>
      </mj-column>
    </mj-section>`;
}

/** The tinted strip naming the thing this email is about. */
export function callout(tone: Tone, labelKey: string, valueVar: string): string {
  return `    <mj-section background-color="${tone.bg}" padding="16px 20px" border-left="4px solid ${tone.border}">
      <mj-column>
        <mj-text font-size="12px" font-weight="bold" color="${tone.label}" text-transform="uppercase" letter-spacing="0.5px">{{t:${labelKey}}}</mj-text>
        <mj-text font-size="18px" font-weight="bold" color="${tone.value}">{{${valueVar}}}</mj-text>
      </mj-column>
    </mj-section>`;
}

/** The quiet closing line under the callout. */
export function note(helpKey: string): string {
  return `    <mj-section background-color="#ffffff" padding="12px 20px 24px 20px">
      <mj-column>
        <mj-text font-size="13px" color="#888888">{{t:${helpKey}}}</mj-text>
      </mj-column>
    </mj-section>`;
}

/** One label/value line inside {@link detailRows}. */
export interface DetailRow {
  labelKey: string;
  valueVar: string;
}

/** The record's own details under the callout, as label/value lines. */
export function detailRows(rows: readonly DetailRow[]): string {
  const lines = rows
    .map(
      (row) =>
        `        <mj-text color="#555555"><span style="color:#888888">{{t:${row.labelKey}}}</span> <strong>{{${row.valueVar}}}</strong></mj-text>`
    )
    .join('\n');
  return `    <mj-section background-color="#ffffff" padding="8px 20px">
      <mj-column>
${lines}
      </mj-column>
    </mj-section>`;
}

/**
 * The call to action, and the same URL in plain text beneath it.
 *
 * The bare URL is not decoration: a corporate mail client that strips buttons
 * leaves an email with nowhere to go, and the people these are written for —
 * venue owners, brand owners — are the most likely to be reading in one.
 */
export function cta(labelKey: string, urlVar: string): string {
  return `    <mj-section background-color="#ffffff" padding="8px 20px 24px 20px">
      <mj-column>
        <mj-button href="{{${urlVar}}}">{{t:${labelKey}}}</mj-button>
        <mj-text font-size="12px" color="#9ca3af" align="center">{{${urlVar}}}</mj-text>
      </mj-column>
    </mj-section>`;
}

/** A closing paragraph with no CTA under it — used when the body ends on rows. */
export function closing(helpKey: string): string {
  return `    <mj-section background-color="#ffffff" padding="8px 20px 24px 20px">
      <mj-column>
        <mj-text font-size="13px" color="#888888">{{t:${helpKey}}}</mj-text>
      </mj-column>
    </mj-section>`;
}
