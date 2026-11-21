import { EMAIL_COLOR as C, EMAIL_DARK as D, EMAIL_SPACE as S, EMAIL_TYPE as F } from '@services/email/catalogue/tokens';
import { HEAD } from '@services/email/catalogue/mjml.head';
import {
  CRM_EMAIL_FONTS,
  CRM_EMAIL_THEME_DEFAULTS,
  applyCrmEmailTheme,
  completeTheme,
  fontFor,
  isFontKey,
  normalizeHex,
  type CrmEmailTheme,
} from '../../crmEmailTheme';

/**
 * The CRM email theme is a render-time remap from the shared email tokens to
 * the CRM's own choices. These specs drive it over the real shared head (the
 * one every CRM email carries) plus a body written with the same tokens.
 */

const theme = (over: Partial<CrmEmailTheme>): CrmEmailTheme => ({ ...CRM_EMAIL_THEME_DEFAULTS, ...over });

const BODY = [
  `  <mj-body background-color="${C.canvas}">`,
  `    <mj-section background-color="${C.surface}" border-radius="${S.panelRadius}">`,
  '      <mj-column>',
  `        <mj-text color="${C.ink}">Heading</mj-text>`,
  `        <mj-text color="${C.body}">Body copy with a link in ${C.primary.toUpperCase()}</mj-text>`,
  `        <mj-text color="${C.brand}">Brand mark</mj-text>`,
  // A translucent white overlay: its first six digits are the card colour, but it is not that token.
  '        <mj-text container-background-color="#ffffff80">Overlay</mj-text>',
  // The gift-card stage shares its hex with the dark canvas; outside the dark sheet it must stay.
  `        <mj-section background-color="${C.stage}">Stage</mj-section>`,
  '        <mj-button>Book now</mj-button>',
  '      </mj-column>',
  '    </mj-section>',
  '  </mj-body>',
].join('\n');

const SOURCE = `<mjml>\n  <mj-head>\n${HEAD}\n  </mj-head>\n${BODY}\n</mjml>`;

/** The dark-mode `<style>` block of a rendered source, or null when it has none. */
const darkSheet = (source: string): string | null => {
  const at = source.indexOf('@media (prefers-color-scheme: dark)');
  if (at === -1) return null;
  return source.slice(source.lastIndexOf('<style', at), source.indexOf('</style>', at));
};
const outsideDark = (source: string): string => {
  const sheet = darkSheet(source);
  return sheet ? source.replace(sheet, '') : source;
};

describe('normalizeHex', () => {
  it.each([
    ['#D92D2D', '#d92d2d'],
    ['  #d92d2d ', '#d92d2d'],
    ['#ABC', '#aabbcc'],
    ['#0f0', '#00ff00'],
  ])('reads %p as %p', (input, expected) => {
    expect(normalizeHex(input)).toBe(expected);
  });

  it.each([['red'], ['d92d2d'], ['#abcd'], ['#gggggg'], ['#d92d2d80'], [''], [null], [undefined], [0xd92d2d]])(
    'refuses %p',
    (input) => {
      expect(normalizeHex(input)).toBeNull();
    }
  );
});

describe('fonts', () => {
  it('knows every listed key and nothing else', () => {
    for (const font of CRM_EMAIL_FONTS) expect(isFontKey(font.key)).toBe(true);
    expect(isFontKey('comic-sans')).toBe(false);
    expect(isFontKey('')).toBe(false);
    expect(isFontKey(42)).toBe(false);
  });

  it('falls back to the first font (Inter, the shared family) for an unknown key', () => {
    expect(fontFor('georgia').label).toBe('Georgia');
    expect(fontFor('nope')).toBe(CRM_EMAIL_FONTS[0]);
    expect(CRM_EMAIL_FONTS[0]).toMatchObject({ key: 'inter', stack: F.family });
  });
});

describe('CRM_EMAIL_THEME_DEFAULTS', () => {
  it('is exactly the shared tokens, so a CRM that never opens Settings renders as before', () => {
    expect(CRM_EMAIL_THEME_DEFAULTS).toEqual({
      primary_color: C.primary,
      accent_color: C.brand,
      heading_color: C.ink,
      text_color: C.body,
      muted_color: C.muted,
      background_color: C.canvas,
      card_color: C.surface,
      panel_color: C.panel,
      border_color: C.border,
      dark_background_color: D.fill[C.canvas],
      dark_card_color: D.fill[C.surface],
      dark_heading_color: D.text[C.ink],
      dark_text_color: D.text[C.body],
      dark_primary_color: D.text[C.primary],
      body_font: 'inter',
      heading_font: 'inter',
      base_font_size: 15,
      content_padding: 32,
      button_radius: 10,
      panel_radius: 12,
      color_mode: 'AUTO',
    });
  });
});

describe('completeTheme', () => {
  it('returns the defaults for a missing document', () => {
    expect(completeTheme()).toEqual(CRM_EMAIL_THEME_DEFAULTS);
    expect(completeTheme(null)).toEqual(CRM_EMAIL_THEME_DEFAULTS);
    // A copy, never the shared object itself.
    expect(completeTheme()).not.toBe(CRM_EMAIL_THEME_DEFAULTS);
  });

  it('keeps the valid stored fields and reads every invalid one as its default', () => {
    const stored = {
      primary_color: '#ABC',
      accent_color: 'blue',
      dark_card_color: '#101010',
      body_font: 'poppins',
      heading_font: 'comic-sans',
      base_font_size: 16,
      content_padding: 49,
      button_radius: 3.5,
      panel_radius: '8',
      color_mode: 'DARK',
    } as unknown as Partial<CrmEmailTheme>;

    expect(completeTheme(stored)).toEqual({
      ...CRM_EMAIL_THEME_DEFAULTS,
      primary_color: '#aabbcc',
      dark_card_color: '#101010',
      body_font: 'poppins',
      base_font_size: 16,
    });
  });

  it('accepts both ends of every range and the LIGHT colour mode', () => {
    expect(
      completeTheme({ base_font_size: 13, content_padding: 48, button_radius: 0, panel_radius: 28, color_mode: 'LIGHT' })
    ).toMatchObject({ base_font_size: 13, content_padding: 48, button_radius: 0, panel_radius: 28, color_mode: 'LIGHT' });
    expect(completeTheme({ base_font_size: 12, panel_radius: 29 })).toMatchObject({ base_font_size: 15, panel_radius: 12 });
    expect(completeTheme({ color_mode: 'AUTO' }).color_mode).toBe('AUTO');
  });
});

describe('applyCrmEmailTheme', () => {
  it('returns the source untouched for the default theme', () => {
    expect(applyCrmEmailTheme(SOURCE, completeTheme())).toBe(SOURCE);
  });

  it('repaints every use of a light token, in any case, and adds nothing else to the body', () => {
    const out = applyCrmEmailTheme(SOURCE, theme({ primary_color: '#123456' }));

    expect(out.toLowerCase()).not.toContain(C.primary);
    // The button default, the link colour and the upper-case copy in the body.
    expect(out).toContain('<mj-button background-color="#123456"');
    expect(out).toContain('a { color: #123456; }');
    expect(out).toContain('link in #123456');
    // The dark sheet's rule that matched the old light value now matches the new one.
    expect(darkSheet(out)).toContain('[style^="color:#123456"]');
    // Its dark twin is a separate setting and stays.
    expect(darkSheet(out)).toContain(`color:${D.text[C.primary]}!important`);
  });

  it('remaps in one pass, so a colour moved onto another token is not moved again', () => {
    const out = applyCrmEmailTheme(SOURCE, theme({ primary_color: C.brand, accent_color: '#000000' }));

    expect(out).toContain(`<mj-button background-color="${C.brand}"`);
    expect(out).toContain('<mj-text color="#000000">Brand mark</mj-text>');
    expect(out).not.toContain('<mj-button background-color="#000000"');
  });

  it('never rewrites the start of a longer hex', () => {
    const out = applyCrmEmailTheme(SOURCE, theme({ card_color: '#eeeeee' }));

    expect(out).toContain(`<mj-section background-color="#eeeeee"`);
    expect(out).toContain('container-background-color="#ffffff80"');
  });

  it('moves the card colour only where white is a fill, never the button label (onPrimary is also white)', () => {
    const inline = `<td style="background:${C.surface};background-color:${C.surface};color:${C.onPrimary}" bgcolor="${C.surface}">x</td>`;
    const out = applyCrmEmailTheme(`${SOURCE}\n${inline}`, theme({ card_color: '#101828' }));

    expect(out).toContain(`color="${C.onPrimary}"`);
    expect(out).toContain('<td style="background:#101828;background-color:#101828;color:#ffffff" bgcolor="#101828">x</td>');
    // The dark sheet's selectors follow the fill, so dark mode still repaints the new card colour.
    expect(darkSheet(out)).toContain('[style*="background:#101828"]');
    expect(darkSheet(out)).toContain('[bgcolor="#101828"]');
  });

  it('changes the dark values only inside the dark stylesheet', () => {
    const out = applyCrmEmailTheme(SOURCE, theme({ dark_background_color: '#000001', dark_heading_color: '#fafaf0' }));

    const sheet = darkSheet(out)!;
    expect(sheet).toContain('background:#000001!important');
    expect(sheet).toContain('color:#fafaf0!important');
    expect(sheet).not.toContain(D.fill[C.canvas]);
    // The gift-card stage writes the same hex as the dark canvas; it is not dark mode.
    expect(outsideDark(out)).toContain(`<mj-section background-color="${C.stage}">Stage</mj-section>`);
  });

  it('keeps the dark stylesheet and the light-dark scheme in AUTO mode', () => {
    const out = applyCrmEmailTheme(SOURCE, theme({ heading_color: '#111111' }));

    expect(out).toContain('@media (prefers-color-scheme: dark)');
    expect(out).toContain('<meta name="color-scheme" content="light dark" />');
  });

  it('drops the dark stylesheet and declares the email light-only in LIGHT mode', () => {
    const out = applyCrmEmailTheme(SOURCE, theme({ color_mode: 'LIGHT' }));

    expect(out).not.toContain('prefers-color-scheme');
    expect(out).toContain('<meta name="color-scheme" content="light" />');
    expect(out).toContain('<meta name="supported-color-schemes" content="light" />');
    expect(out).toContain(':root { color-scheme: light; supported-color-schemes: light; }');
    expect(out).not.toContain('light dark');
    // The light design is untouched.
    expect(out).toContain(`<mj-text color="${C.ink}">Heading</mj-text>`);
  });

  it('removes every dark stylesheet in LIGHT mode, not only the first', () => {
    const second = '<mj-raw><style>@media (prefers-color-scheme: dark) { .x { color: #fff } }</style></mj-raw>';
    const doubled = SOURCE.replace('</mj-head>', `${second}\n  </mj-head>`);

    const out = applyCrmEmailTheme(doubled, theme({ color_mode: 'LIGHT' }));

    expect(out).not.toContain('prefers-color-scheme');
    expect(out).toContain('<mj-raw></mj-raw>');
  });

  it('leaves a dark query that is not inside a complete <style> block alone', () => {
    const noOpening = '<mjml><mj-head></mj-head><mj-body>@media (prefers-color-scheme: dark) #16181d</mj-body></mjml>';
    const noClosing = `<mjml><mj-head></mj-head><mj-body><style>@media (prefers-color-scheme: dark) ${D.text[C.ink]}</mj-body></mjml>`;
    const t = theme({ color_mode: 'LIGHT', heading_color: '#222222', dark_heading_color: '#eeeeee' });

    const a = applyCrmEmailTheme(noOpening, t);
    expect(a).toContain('@media (prefers-color-scheme: dark) #222222');

    const b = applyCrmEmailTheme(noClosing, t);
    expect(b).toContain(`@media (prefers-color-scheme: dark) ${D.text[C.ink]}`);
  });

  it('puts the body font, size and line height on the shared attributes', () => {
    const out = applyCrmEmailTheme(SOURCE, theme({ body_font: 'georgia', base_font_size: 16 }));

    expect(out).toContain(`<mj-all font-family="${fontFor('georgia').stack}" />`);
    expect(out).not.toContain(`font-family="${F.family}"`);
    // 16 × 1.6 = 25.6, rounded.
    expect(out).toContain('font-size="16px" line-height="26px" padding="0"');
    // The button keeps its own size: only the paragraph default follows the setting.
    expect(out).toContain(`font-size="${F.body.size}" font-weight="700"`);
  });

  it('sets the button and panel corner radius', () => {
    const out = applyCrmEmailTheme(SOURCE, theme({ button_radius: 0, panel_radius: 4 }));

    expect(out).toContain(`color="${C.onPrimary}" border-radius="0px"`);
    expect(out).toContain('<mj-section background-color="#ffffff" border-radius="4px">');
  });

  it('adds the web fonts once each and the heading font rule before </mj-head>', () => {
    const out = applyCrmEmailTheme(SOURCE, theme({ body_font: 'poppins', heading_font: 'playfair' }));
    const head = out.slice(0, out.indexOf('</mj-head>'));

    expect(head).toContain(`<mj-font name="Poppins" href="${fontFor('poppins').href}" />`);
    expect(head).toContain(`<mj-font name="Playfair Display" href="${fontFor('playfair').href}" />`);
    expect(head).toContain(`h1, h2, h3 { font-family: ${fontFor('playfair').stack} !important; }`);
    // The default gutter, since padding was not changed.
    expect(head).toContain('padding-left: 32px !important; padding-right: 32px !important;');

    const same = applyCrmEmailTheme(SOURCE, theme({ body_font: 'lato', heading_font: 'lato' }));
    expect(same.match(/<mj-font /g)).toHaveLength(1);
  });

  it('adds no web font for a system font, but still the heading rule and the gutter', () => {
    const out = applyCrmEmailTheme(SOURCE, theme({ body_font: 'helvetica', heading_font: 'georgia', content_padding: 24 }));

    expect(out).not.toContain('<mj-font');
    expect(out).toContain(`h1, h2, h3 { font-family: ${fontFor('georgia').stack} !important; }`);
    expect(out).toContain('padding-left: 24px !important; padding-right: 24px !important;');
  });

  it('applies a padding-only change as head extras without touching any colour', () => {
    const out = applyCrmEmailTheme(SOURCE, theme({ content_padding: 40 }));
    // A themed email loads the web font it names — the default Inter here — before its rules.
    const start = out.indexOf(`    <mj-font name="Inter" href="${fontFor('inter').href}" />\n    <mj-style>\n      h1, h2, h3`);
    const end = out.indexOf('</mj-style>', start) + '</mj-style>\n  '.length;

    expect(start).toBeGreaterThan(-1);
    expect(out.slice(start, end)).toContain('padding-left: 40px !important;');
    // Take the added font and rule out again and nothing else differs.
    expect(out.slice(0, start) + out.slice(end)).toBe(SOURCE);
  });

  it('remaps the colours but adds no head rules to a source without an <mj-head>', () => {
    const bare = `<mjml><mj-body><mj-text color="${C.body}">x</mj-text></mj-body></mjml>`;

    expect(applyCrmEmailTheme(bare, theme({ text_color: '#333333', body_font: 'poppins' }))).toBe(
      '<mjml><mj-body><mj-text color="#333333">x</mj-text></mj-body></mjml>'
    );
  });
});
