import { EMAIL_COLOR as C, EMAIL_SPACE as S, EMAIL_TINT as T, EMAIL_TYPE as F } from './tokens';

/**
 * The MJML pieces every code-seeded email body is assembled from.
 *
 * One set of builders, not one blob per template. A hundred and sixty templates
 * written out by hand would be a hundred and sixty places to fix a padding
 * value, so the catalogue, the account-status defaults and the hand-shaped
 * bodies all draw from ONE source (rule 34) — and every value they write comes
 * from `./tokens` (rule 81).
 *
 * The layout is a single white card on the canvas. `shell` opens the card; each
 * builder below is one `<mj-section>` inside it, so the pieces stack in any
 * order and always share the same gutter. The header and the footer are NOT
 * here: the category's fragment injects those inside `<mj-body>`, above and
 * below the card, and a body that drew its own would double the logo. Every
 * visible string is a `{{t:…}}` key (rule 38).
 */

/** The tint of one callout or notice. */
export interface Tone {
  bg: string;
  border: string;
  label: string;
  value: string;
}

/** Something is on, live, approved, paid. */
export const LIVE: Tone = { bg: T.success, border: T.successEdge, label: C.success, value: C.ink };
/** Something is paused, waiting, or needs a decision. */
export const PAUSED: Tone = { bg: T.warning, border: T.warningEdge, label: C.warning, value: C.ink };
/** Something failed, was cancelled, or was declined. */
export const STOPPED: Tone = { bg: T.error, border: T.errorEdge, label: C.error, value: C.ink };
/** Neutral — a record, a reminder, a receipt. */
export const CALM: Tone = { bg: T.info, border: T.infoEdge, label: C.info, value: C.ink };

const GUTTER = S.gutter;
const caption = `font-size="${F.caption.size}" line-height="${F.caption.line}"`;
const small = `font-size="${F.small.size}" line-height="${F.small.line}"`;
const eyebrow = `${caption} font-weight="700" text-transform="uppercase" letter-spacing="0.6px"`;

const HEAD_ATTRS = `    <mj-attributes>
      <mj-all font-family="${F.family}" />
      <mj-text color="${C.body}" font-size="${F.body.size}" line-height="${F.body.line}" padding="0" />
      <mj-button background-color="${C.primary}" color="${C.onPrimary}" border-radius="${S.buttonRadius}" font-size="${F.body.size}" font-weight="600" inner-padding="14px 28px" padding="0" />
    </mj-attributes>
    <mj-style>
      a { color: ${C.primary}; }
      h1 { margin: 0; }
    </mj-style>`;

/**
 * The document around a body: the canvas, and the card the body sits in.
 *
 * `previewKey` is the line an inbox shows beside the subject. Without it a
 * client reads the first text it finds — the logo's alt text — so every
 * standard body passes its own paragraph.
 */
export function shell(titleKey: string, body: string, previewKey?: string): string {
  const preview = previewKey ? `\n    <mj-preview>{{t:${previewKey}}}</mj-preview>` : '';
  return `<mjml>
  <mj-head>
    <mj-title>{{t:${titleKey}}}</mj-title>${preview}
${HEAD_ATTRS}
  </mj-head>
  <mj-body background-color="${C.canvas}" width="${S.bodyWidth}">
    <mj-wrapper background-color="${C.surface}" border-radius="${S.cardRadius}" border="1px solid ${C.border}" border-top="4px solid ${C.brand}" padding="12px 0 20px 0">
${body}
    </mj-wrapper>
  </mj-body>
</mjml>
`;
}

interface SectionOptions {
  top?: string;
  bottom?: string;
  /** Extra attributes for the column — the frame a panel draws. */
  column?: string;
}

/** One section of the card, at the shared gutter. */
function section(content: string, { top = '0', bottom = '16px', column = '' }: SectionOptions = {}): string {
  const attrs = column ? ` ${column}` : '';
  return `      <mj-section padding="${top} ${GUTTER} ${bottom} ${GUTTER}">
        <mj-column${attrs}>
${content}
        </mj-column>
      </mj-section>`;
}

/** The rounded, tinted frame a panel's column is drawn with. */
const frame = (tone: Tone, style = 'solid'): string =>
  `border="1px ${style} ${tone.border}" border-radius="${S.panelRadius}" background-color="${tone.bg}"`;

/** The page heading, as a real `<h1>` so a screen reader can land on it. */
function headingText(title: string): string {
  return `          <mj-text color="${C.ink}" font-size="${F.display.size}" line-height="${F.display.line}" font-weight="700" padding="0 0 16px 0"><h1 style="margin:0;font-size:${F.display.size};line-height:${F.display.line};font-weight:700;color:${C.ink}">${title}</h1></mj-text>`;
}

/**
 * The heading, the greeting and the opening paragraph, from raw markup.
 *
 * The lower-level form of {@link intro}, for the bodies whose heading or
 * paragraph is a variable of its own or carries one inline.
 */
export function introBlock(parts: {
  title: string;
  nameVar?: string;
  body?: string;
  /** A short caption above the heading, naming what kind of email this is. */
  eyebrow?: string;
}): string {
  const lines = [headingText(parts.title)];
  if (parts.eyebrow) {
    lines.unshift(`          <mj-text ${eyebrow} color="${C.primary}" padding="0 0 8px 0">${parts.eyebrow}</mj-text>`);
  }
  if (parts.nameVar) {
    lines.push(
      `          <mj-text color="${C.ink}" font-weight="600" padding="0 0 8px 0">{{t:email.common.greeting}} {{${parts.nameVar}}},</mj-text>`
    );
  }
  if (parts.body) lines.push(`          <mj-text padding="0">${parts.body}</mj-text>`);
  return section(lines.join('\n'), { top: '24px', bottom: '20px' });
}

/** The heading, the greeting and one paragraph. No greeting without a name. */
export function intro(titleKey: string, bodyKey: string, nameVar?: string): string {
  return introBlock({ title: `{{t:${titleKey}}}`, nameVar, body: `{{t:${bodyKey}}}` });
}

/** A tinted panel with a caption over a value, from raw markup. */
export function panel(tone: Tone, label: string, value: string): string {
  return section(
    `          <mj-text ${eyebrow} color="${tone.label}" padding="16px 20px 4px 20px">${label}</mj-text>
          <mj-text color="${tone.value}" font-size="${F.value.size}" line-height="${F.value.line}" font-weight="700" padding="0 20px 16px 20px">${value}</mj-text>`,
    { column: frame(tone) }
  );
}

/** The tinted panel naming the thing this email is about. */
export function callout(tone: Tone, labelKey: string, valueVar: string): string {
  return panel(tone, `{{t:${labelKey}}}`, `{{${valueVar}}}`);
}

/** A tinted panel that explains rather than names — a heading and a sentence. */
export function notice(tone: Tone, titleKey: string, body: string): string {
  return section(
    `          <mj-text color="${tone.label}" font-weight="700" padding="16px 20px 4px 20px">{{t:${titleKey}}}</mj-text>
          <mj-text color="${C.body}" ${small} padding="0 20px 16px 20px">${body}</mj-text>`,
    { column: frame(tone) }
  );
}

/** A paragraph of body copy, from raw markup. */
export function paragraph(markup: string): string {
  return section(`          <mj-text padding="0">${markup}</mj-text>`);
}

/** A paragraph of body copy, by key. */
export const text = (key: string): string => paragraph(`{{t:${key}}}`);

/** Server-drawn HTML (a report, a changelog), placed full width in the card. */
export function htmlBlock(varName: string): string {
  return section(`          <mj-text padding="0">{{${varName}}}</mj-text>`);
}

/** What somebody wrote, set apart from our own words as a quotation. */
export function quote(labelKey: string, valueVar: string): string {
  return section(
    `          <mj-text ${eyebrow} color="${C.muted}" padding="0 0 8px 0">{{t:${labelKey}}}</mj-text>
          <mj-text color="${C.ink}" padding="12px 16px" container-background-color="${C.panel}"><div style="border-left:3px solid ${C.border};padding-left:12px;white-space:pre-line">{{${valueVar}}}</div></mj-text>`
  );
}

/** One label/value line inside {@link detailRows}: a caption key, or a var holding it. */
export type DetailRow = { valueVar: string; total?: boolean } & (
  | { labelKey: string; labelVar?: never }
  | { labelVar: string; labelKey?: never }
);

function rowCells(row: DetailRow, last: boolean): string {
  const label = row.labelKey ? `{{t:${row.labelKey}}}` : `{{${row.labelVar}}}`;
  const edge = last ? 'none' : `1px solid ${C.border}`;
  const top = row.total ? `border-top:2px solid ${C.ink};` : '';
  const weight = row.total ? '700' : '600';
  const size = row.total ? F.value.size : F.body.size;
  return `            <tr>
              <th scope="row" align="left" style="${top}padding:12px 12px 12px 0;border-bottom:${edge};color:${C.muted};font-size:${F.small.size};line-height:${F.small.line};font-weight:400;text-align:left;vertical-align:top;width:42%">${label}</th>
              <td align="right" style="${top}padding:12px 0;border-bottom:${edge};color:${C.ink};font-size:${size};line-height:${F.body.line};font-weight:${weight};text-align:right;vertical-align:top;word-break:break-word">{{${row.valueVar}}}</td>
            </tr>`;
}

/** The record's own details, as a two-column table a screen reader can walk. */
export function detailRows(rows: readonly DetailRow[]): string {
  const lines = rows.map((row, index) => rowCells(row, index === rows.length - 1)).join('\n');
  return section(`          <mj-table cellpadding="0" cellspacing="0" width="100%" padding="0">
${lines}
          </mj-table>`);
}

/**
 * The call to action, and the same URL in plain text beneath it.
 *
 * The bare URL is not decoration: a corporate mail client that strips buttons
 * leaves an email with nowhere to go, and the people these are written for —
 * venue owners, brand owners — are the most likely to be reading in one.
 */
export function cta(labelKey: string, urlVar: string): string {
  return section(
    `          <mj-button href="{{${urlVar}}}" align="left">{{t:${labelKey}}}</mj-button>
          <mj-text ${caption} color="${C.muted}" padding="12px 0 0 0">{{t:email.common.linkFallback}} <a href="{{${urlVar}}}" style="color:${C.primary};word-break:break-all">{{${urlVar}}}</a></mj-text>`,
    { top: '4px', bottom: '20px' }
  );
}

/** Two decisions side by side — the primary one filled, the other outlined. */
export function buttonPair(
  primary: { labelKey: string; urlVar: string },
  secondary: { labelKey: string; urlVar: string }
): string {
  return `      <mj-section padding="4px ${GUTTER} 20px ${GUTTER}">
        <mj-column width="50%" padding="0 6px 8px 0">
          <mj-button href="{{${primary.urlVar}}}" background-color="${C.success}" width="100%">{{t:${primary.labelKey}}}</mj-button>
        </mj-column>
        <mj-column width="50%" padding="0 0 8px 6px">
          <mj-button href="{{${secondary.urlVar}}}" background-color="${C.surface}" color="${C.error}" border="1px solid ${C.error}" width="100%">{{t:${secondary.labelKey}}}</mj-button>
        </mj-column>
      </mj-section>`;
}

/**
 * A one-time code, large, monospaced and set apart, with its expiry under it.
 *
 * Letter-spaced so a reader copying it by eye does not lose a digit, and in a
 * dashed frame so it reads as the thing to copy rather than as more prose.
 */
export function codeBlock(codeVar: string, expiry: string, tone: Tone = CALM): string {
  return section(
    `          <mj-text align="center" ${eyebrow} color="${tone.label}" padding="20px 16px 6px 16px">{{t:email.otp.codeLabel}}</mj-text>
          <mj-text align="center" color="${C.ink}" font-family="${F.mono}" font-size="${F.code.size}" line-height="${F.code.line}" font-weight="700" letter-spacing="8px" padding="0 16px">{{${codeVar}}}</mj-text>
          <mj-text align="center" ${small} color="${C.muted}" padding="8px 16px 20px 16px">${expiry}</mj-text>`,
    { column: frame(tone, 'dashed') }
  );
}

/** A plain-text link on its own line, for the secondary way out of an email. */
export function textLink(labelKey: string, urlVar: string): string {
  return section(
    `          <mj-text ${small} padding="0"><a href="{{${urlVar}}}" style="color:${C.primary};font-weight:600;text-decoration:none">{{t:${labelKey}}}</a></mj-text>`
  );
}

/** The quiet closing line, from raw markup, under a hairline. */
export function closingText(markup: string): string {
  return section(
    `          <mj-divider border-color="${C.border}" border-width="1px" padding="0 0 16px 0" />
          <mj-text ${small} color="${C.muted}" padding="0">${markup}</mj-text>`,
    { top: '4px', bottom: '8px' }
  );
}

/** The quiet closing line, by key. */
export const closing = (helpKey: string): string => closingText(`{{t:${helpKey}}}`);

/** The closing line under a callout. The same piece as {@link closing}. */
export const note = closing;
