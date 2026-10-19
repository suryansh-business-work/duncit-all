import { EMAIL_COLOR as C, EMAIL_SPACE as S, EMAIL_TINT as T, EMAIL_TYPE as F } from './tokens';
import { HEAD } from './mjml.head';
import { iconForKey, iconSrc, type EmailIcon } from './icons';

/**
 * The MJML pieces every code-seeded email body is assembled from.
 *
 * One set of builders, not one blob per template. A hundred and sixty templates
 * written out by hand would be a hundred and sixty places to fix a padding
 * value, so the catalogue, the account-status defaults and the hand-shaped
 * bodies all draw from ONE source (rule 34) — and every value they write comes
 * from `./tokens` (rule 81).
 *
 * The layout is ONE card on the canvas, drawn in three parts: the category's
 * header fragment opens it (brand stripe, logo, the kind of email), `shell`
 * draws its middle, and the footer fragment closes it. Each builder below is
 * one `<mj-section>` of that middle, so the pieces stack in any order and share
 * the same gutter. A body never draws its own logo or footer — the fragment
 * injects those inside `<mj-body>` — and every visible string is a `{{t:…}}`
 * key (rule 38). Dark mode needs nothing from a builder: see `./mjml.head`.
 */

/** The tint of one callout or notice, and the icon its notice carries. */
export interface Tone {
  bg: string;
  border: string;
  label: string;
  value: string;
  note: EmailIcon;
}

/** Something is on, live, approved, paid. */
export const LIVE: Tone = { bg: T.success, border: T.successEdge, label: C.success, value: C.ink, note: 'noteSuccess' };
/** Something is paused, waiting, or needs a decision. */
export const PAUSED: Tone = { bg: T.warning, border: T.warningEdge, label: C.warning, value: C.ink, note: 'noteWarning' };
/** Something failed, was cancelled, or was declined. */
export const STOPPED: Tone = { bg: T.error, border: T.errorEdge, label: C.error, value: C.ink, note: 'noteError' };
/** Neutral — a record, a reminder, a receipt. Drawn in the brand's own tint. */
export const CALM: Tone = { bg: T.brand, border: T.brandEdge, label: C.primary, value: C.ink, note: 'noteInfo' };
/** Good to know, nothing to do — the blue note at the foot of an email. */
export const INFO: Tone = { bg: T.info, border: T.infoEdge, label: C.info, value: C.ink, note: 'noteInfo' };

const GUTTER = S.gutter;
const caption = `font-size="${F.caption.size}" line-height="${F.caption.line}"`;
const small = `font-size="${F.small.size}" line-height="${F.small.line}"`;
const eyebrow = `${caption} font-weight="700" text-transform="uppercase" letter-spacing="1px"`;
const eyebrowStyle = `font-size:${F.caption.size};line-height:${F.caption.line};font-weight:700;letter-spacing:1px;text-transform:uppercase`;
const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';
/** A token's pixel count, for the `width`/`height` attributes Outlook reads. */
const px = (size: string): number => Number.parseInt(size, 10);

/**
 * The document around a body: the canvas, and the middle of the card.
 *
 * `previewKey` is the line an inbox shows beside the subject. Without it a
 * client reads the first text it finds — the logo's alt text — so every
 * standard body passes its own paragraph. The card's top and bottom edges are
 * the fragments'; this wrapper draws only its sides.
 */
export function shell(titleKey: string, body: string, previewKey?: string): string {
  const preview = previewKey ? `\n    <mj-preview>{{t:${previewKey}}}</mj-preview>` : '';
  return `<mjml>
  <mj-head>
    <mj-title>{{t:${titleKey}}}</mj-title>${preview}
${HEAD}
  </mj-head>
  <mj-body background-color="${C.canvas}" width="${S.bodyWidth}">
    <mj-wrapper background-color="${C.surface}" border-left="1px solid ${C.border}" border-right="1px solid ${C.border}" padding="4px 0 16px 0">
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

/** One section of the card, at the shared gutter (narrower on a phone). */
function section(content: string, { top = '0', bottom = '16px', column = '' }: SectionOptions = {}): string {
  const attrs = column ? ` ${column}` : '';
  return `      <mj-section css-class="gutter" padding="${top} ${GUTTER} ${bottom} ${GUTTER}">
        <mj-column${attrs}>
${content}
        </mj-column>
      </mj-section>`;
}

/** The rounded, tinted frame a panel's column is drawn with. */
const frame = (tone: Pick<Tone, 'bg' | 'border'>, style = 'solid'): string =>
  `border="1px ${style} ${tone.border}" border-radius="${S.panelRadius}" background-color="${tone.bg}"`;

/** A decorative icon — the words beside it carry the meaning, so `alt` is empty. */
const icon = (name: EmailIcon, size: string): string =>
  `<img src="${iconSrc(name)}" width="${px(size)}" height="${px(size)}" alt="" style="display:block;margin:0 auto;border:0;width:${size};height:${size}" />`;

/** An icon on a round tinted badge, as a table cell so Outlook keeps its size. */
export function badge(name: EmailIcon, size: string = S.badge, glyph: string = S.icon): string {
  return `<table ${TABLE}><tr><td width="${px(size)}" height="${px(size)}" align="center" valign="middle" style="width:${size};height:${size};border-radius:50%;background:${T.brand};background-color:${T.brand}">${icon(name, glyph)}</td></tr></table>`;
}

/** The page heading, as a real `<h1>` so a screen reader can land on it. */
function headingText(title: string): string {
  const style = `margin:0;font-size:${F.hero.size};line-height:${F.hero.line};font-weight:800;letter-spacing:-0.5px;color:${C.ink}`;
  return `          <mj-text css-class="hero" color="${C.ink}" padding="0 0 20px 0"><h1 style="${style}">${title}</h1></mj-text>`;
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
    lines.unshift(`          <mj-text ${eyebrow} color="${C.primary}" padding="0 0 10px 0">${parts.eyebrow}</mj-text>`);
  }
  if (parts.nameVar) {
    lines.push(
      `          <mj-text color="${C.ink}" font-size="17px" line-height="26px" font-weight="700" padding="0 0 6px 0">{{t:email.common.greeting}} {{${parts.nameVar}}},</mj-text>`
    );
  }
  if (parts.body) lines.push(`          <mj-text padding="0">${parts.body}</mj-text>`);
  return section(lines.join('\n'), { top: '28px', bottom: '24px' });
}

/** The heading, the greeting and one paragraph. No greeting without a name. */
export function intro(titleKey: string, bodyKey: string, nameVar?: string): string {
  return introBlock({ title: `{{t:${titleKey}}}`, nameVar, body: `{{t:${bodyKey}}}` });
}

/** The rounded square beside a callout's value, holding its icon. */
function tile(name: EmailIcon, tone: Tone): string {
  const size = px(S.tile);
  return `<table ${TABLE} align="right"><tr><td width="${size}" height="${size}" align="center" valign="middle" style="width:${S.tile};height:${S.tile};border-radius:${S.tileRadius};background:${C.surface};background-color:${C.surface};border:1px solid ${tone.border}">${icon(name, S.tileIcon)}</td></tr></table>`;
}

/** A tinted panel with a caption over a value and an icon beside them, from raw markup. */
export function panel(tone: Tone, label: string, value: string, iconName: EmailIcon = 'label'): string {
  const text = `<div style="${eyebrowStyle};color:${tone.label}">${label}</div><div style="padding-top:4px;font-size:22px;line-height:30px;font-weight:800;color:${tone.value};word-break:break-word">${value}</div>`;
  return section(
    `          <mj-text padding="18px 20px"><table ${TABLE} width="100%"><tr><td valign="middle" style="vertical-align:middle">${text}</td><td width="68" valign="middle" style="width:68px;padding-left:16px;vertical-align:middle">${tile(iconName, tone)}</td></tr></table></mj-text>`,
    { column: frame(tone) }
  );
}

/** The tinted panel naming the thing this email is about. */
export function callout(tone: Tone, labelKey: string, valueVar: string): string {
  return panel(tone, `{{t:${labelKey}}}`, `{{${valueVar}}}`, iconForKey(labelKey));
}

/** A tinted note with its tone's icon: a heading (optional) and a sentence. */
function noteBox(tone: Tone, body: string, title?: string): string {
  const heading = title ? `<div style="padding-bottom:4px;font-weight:700;color:${tone.label}">${title}</div>` : '';
  return section(
    `          <mj-text padding="16px 20px"><table ${TABLE} width="100%"><tr><td width="40" valign="top" style="width:40px;padding-top:1px;vertical-align:top">${icon(tone.note, '24px')}</td><td valign="top" style="padding-left:12px;vertical-align:top;color:${C.body}">${heading}${body}</td></tr></table></mj-text>`,
    { column: frame(tone), bottom: '20px' }
  );
}

/** A tinted panel that explains rather than names — a heading and a sentence. */
export function notice(tone: Tone, titleKey: string, body: string): string {
  return noteBox(tone, body, `{{t:${titleKey}}}`);
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
          <mj-text color="${C.ink}" padding="14px 16px" container-background-color="${C.panel}"><div style="border-left:3px solid ${C.border};padding-left:12px;white-space:pre-line">{{${valueVar}}}</div></mj-text>`
  );
}

/** One label/value line inside {@link detailRows}: a caption key, or a var holding it. */
export type DetailRow = { valueVar: string; total?: boolean; icon?: EmailIcon } & (
  | { labelKey: string; labelVar?: never }
  | { labelVar: string; labelKey?: never }
);

function rowCells(row: DetailRow, last: boolean): string {
  const label = row.labelKey ? `{{t:${row.labelKey}}}` : `{{${row.labelVar}}}`;
  const name = row.icon ?? (row.labelKey ? iconForKey(row.labelKey) : 'label');
  const edge = last ? 'none' : `1px solid ${C.border}`;
  const top = row.total ? `border-top:2px solid ${C.ink};` : '';
  const size = row.total ? F.value.size : '16px';
  return `            <tr>
              <td width="52" valign="middle" style="${top}width:52px;padding:10px 0;vertical-align:middle">${badge(name, S.rowBadge, '18px')}</td>
              <th scope="row" align="left" style="${top}padding:14px 12px 14px 0;border-bottom:${edge};color:${C.muted};font-size:${F.body.size};line-height:${F.body.line};font-weight:400;text-align:left;vertical-align:middle;width:38%">${label}</th>
              <td align="left" style="${top}padding:14px 0;border-bottom:${edge};color:${C.ink};font-size:${size};line-height:${F.body.line};font-weight:700;text-align:left;vertical-align:middle;word-break:break-word">{{${row.valueVar}}}</td>
            </tr>`;
}

/** The record's own details, each with its icon, as a table a screen reader can walk. */
export function detailRows(rows: readonly DetailRow[]): string {
  const lines = rows.map((row, index) => rowCells(row, index === rows.length - 1)).join('\n');
  return section(
    `          <mj-table cellpadding="0" cellspacing="0" width="100%" padding="6px 20px">
${lines}
          </mj-table>`,
    { column: frame({ bg: C.panel, border: C.border }), bottom: '20px' }
  );
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
  return `      <mj-section css-class="gutter" padding="4px ${GUTTER} 20px ${GUTTER}">
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
    `          <mj-text align="center" ${eyebrow} color="${tone.label}" padding="22px 16px 6px 16px">{{t:email.otp.codeLabel}}</mj-text>
          <mj-text align="center" color="${C.ink}" font-family="${F.mono}" font-size="${F.code.size}" line-height="${F.code.line}" font-weight="700" letter-spacing="8px" padding="0 16px">{{${codeVar}}}</mj-text>
          <mj-text align="center" ${small} color="${C.muted}" padding="8px 16px 22px 16px">${expiry}</mj-text>`,
    { column: frame(tone, 'dashed'), bottom: '20px' }
  );
}

/** A plain-text link on its own line, for the secondary way out of an email. */
export function textLink(labelKey: string, urlVar: string): string {
  return section(
    `          <mj-text ${small} padding="0"><a href="{{${urlVar}}}" style="color:${C.primary};font-weight:600;text-decoration:none">{{t:${labelKey}}}</a></mj-text>`
  );
}

/** The closing line, from raw markup — the blue "good to know" note at the foot. */
export const closingText = (markup: string): string => noteBox(INFO, markup);

/** The closing line, by key. */
export const closing = (helpKey: string): string => closingText(`{{t:${helpKey}}}`);

/** The closing line under a callout. The same piece as {@link closing}. */
export const note = closing;
