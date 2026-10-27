import { EMAIL_COLOR as C, EMAIL_DARK as D, EMAIL_SPACE as S, EMAIL_TYPE as F } from './tokens';

/**
 * Everything an email's `<mj-head>` carries: the shared attributes, the
 * responsive rules, and dark mode.
 *
 * DARK MODE. Every colour in an email is written inline (a client keeps
 * nothing else), so dark mode cannot swap a variable the way the apps do.
 * Instead each light token gets one rule — "any element whose inline style
 * still carries this light value, repaint it with its dark twin" — matched on
 * the style text itself. That one stylesheet reaches the builders, the hand-
 * shaped bodies, the server-drawn HTML blocks and the header/footer fragments
 * alike, and nobody has to remember a class. Clients that honour
 * `prefers-color-scheme` (Apple Mail, iOS, Outlook for Mac, Thunderbird) get
 * the designed dark palette; Gmail ignores the query and applies its own
 * inversion, which the light design survives because it uses no images for
 * text. It sits in a `<style>` of its own so a client that rejects attribute
 * selectors drops this block and keeps the responsive one.
 */

/** Text colour lives after a `;`, or opens the attribute — never `background-color`. */
const textRule = (light: string, dark: string): string =>
  `[style^="color:${light}"],[style*=";color:${light}"]{color:${dark}!important}`;

const fillRule = (light: string, dark: string): string =>
  `[style*="background:${light}"],[style*="background-color:${light}"],[bgcolor="${light}"]{background:${dark}!important;background-color:${dark}!important}`;

/** `1px solid #…` from a frame, `solid 1px #…` from an `<mj-divider>`. */
const edgeRule = (light: string, dark: string): string =>
  `[style*="solid ${light}"],[style*="dashed ${light}"],[style*="px ${light}"]{border-color:${dark}!important}`;

const rules = <T extends Record<string, string>>(map: T, rule: (light: string, dark: string) => string): string[] =>
  Object.entries(map).map(([light, dark]) => `      ${rule(light, dark)}`);

/** The dark-mode stylesheet, generated from `EMAIL_DARK`. */
export function darkModeCss(): string {
  return [
    '    <mj-raw>',
    '    <style type="text/css">',
    '    @media (prefers-color-scheme: dark) {',
    ...rules(D.fill, fillRule),
    ...rules(D.text, textRule),
    ...rules(D.edge, edgeRule),
    '    }',
    '    </style>',
    '    </mj-raw>',
  ].join('\n');
}

/**
 * The shared attributes and the light stylesheet.
 *
 * `color-scheme` tells a dark-mode client this email has a dark design of its
 * own, so it applies the rules above instead of inverting the page itself.
 * `.hero` lifts the heading on a wide screen; `.gutter` narrows the card's side
 * padding on a phone — a class on an `<mj-section>` lands on its outer `<div>`.
 * Also on a phone: `.cta` (the class an `<mj-button>` puts on its cell) fills
 * the width, and a detail row's label stacks over its value. A client that
 * drops the query keeps the wide layout, which still reads.
 */
export const HEAD = `    <mj-raw>
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    </mj-raw>
    <mj-attributes>
      <mj-all font-family="${F.family}" />
      <mj-text color="${C.body}" font-size="${F.body.size}" line-height="${F.body.line}" padding="0" />
      <mj-button background-color="${C.primary}" color="${C.onPrimary}" border-radius="${S.buttonRadius}" font-size="${F.body.size}" font-weight="700" inner-padding="15px 32px" padding="0" />
    </mj-attributes>
    <mj-style>
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      a { color: ${C.primary}; }
      h1 { margin: 0; }
      @media only screen and (min-width: 480px) {
        .hero h1 { font-size: ${F.hero.wide} !important; line-height: ${F.hero.wideLine} !important; }
      }
      @media only screen and (max-width: 479px) {
        .gutter > table > tbody > tr > td { padding-left: ${S.gutterNarrow} !important; padding-right: ${S.gutterNarrow} !important; }
        .cta table { width: 100% !important; }
        .cta a { display: block !important; }
        .dl-label, .dl-value { display: block !important; width: auto !important; }
        .dl-label { padding: 12px 0 0 0 !important; border-bottom: 0 !important; }
        .dl-value { padding: 2px 0 12px 0 !important; border-top: 0 !important; }
      }
    </mj-style>
${darkModeCss()}`;
