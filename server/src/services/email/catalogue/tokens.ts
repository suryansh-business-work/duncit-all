/**
 * The design tokens every email is drawn with (CLAUDE.md rule 81).
 *
 * Email clients understand neither CSS variables nor a stylesheet they did not
 * receive inline, so a body cannot point at the theme the apps read — the value
 * itself has to be written into each attribute. This file is the one place
 * those values live: the builders in `./mjml`, the nine fragments and every
 * hand-shaped body read from here, and nothing else in the email system writes
 * a colour, a size or a radius of its own.
 *
 * The palette MIRRORS the light half of `@duncit/auth-tokens` (packages/auth-
 * tokens/tokens.json). The server imports no `@duncit/*` package by design
 * (see server/Dockerfile), so the values are restated here rather than read
 * from there — change one, change the other. The tints have no app twin: they
 * exist only because an email cannot fade a colour with `opacity` reliably.
 */

export const EMAIL_COLOR = {
  /** The page behind the card — light.bg. */
  canvas: '#f2f3ef',
  /** The card — light.surface. */
  surface: '#ffffff',
  /** A quiet panel inside the card — neutral.50. */
  panel: '#fafafa',
  /** Hairlines and card edges — light.border. */
  border: '#e3e5df',
  /** Headings and values — light.ink. */
  ink: '#16181d',
  /** Body copy — neutral.700, 10:1 on white. */
  body: '#374151',
  /** Captions, notes, the footer — light.muted, 5.6:1 on white. */
  muted: '#62676f',
  /** The brand mark's own red — light.brand. Decoration only, never text. */
  brand: '#f82c2e',
  /** Buttons and links — light.primary, 4.9:1 against white text. */
  primary: '#d92d2d',
  onPrimary: '#ffffff',
  success: '#137333',
  warning: '#a14e06',
  error: '#c62828',
  info: '#1d4ed8',
  /** The dark stage a gift card sits on — dark.bg / dark.surface. */
  stage: '#0e1012',
  stageRaised: '#181b1f',
  onStage: '#f2f4f1',
  onStageMuted: '#9aa0a8',
  /** The gift card's code — dark.warning, legible on the stage. */
  stageAccent: '#fbbf24',
} as const;

/** The soft fills behind a callout, one per tone. */
export const EMAIL_TINT = {
  success: '#e8f5ec',
  successEdge: '#b7dfc3',
  warning: '#fdf1e4',
  warningEdge: '#f2cfa6',
  error: '#fdecec',
  errorEdge: '#f3bcbc',
  info: '#eaf0fd',
  infoEdge: '#bfd0f7',
  brand: '#fff1f1',
  brandEdge: '#ffc7c7',
} as const;

/** One type scale. Pixel values, because that is what every client honours. */
export const EMAIL_TYPE = {
  family: "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace",
  display: { size: '26px', line: '34px' },
  value: { size: '20px', line: '28px' },
  body: { size: '15px', line: '24px' },
  small: { size: '13px', line: '20px' },
  caption: { size: '12px', line: '18px' },
  code: { size: '34px', line: '42px' },
} as const;

/** Spacing, radius and the card's width. */
export const EMAIL_SPACE = {
  /** Side padding inside the card. */
  gutter: '32px',
  cardRadius: '16px',
  panelRadius: '12px',
  buttonRadius: '10px',
  bodyWidth: '600px',
  logoWidth: '112px',
} as const;
