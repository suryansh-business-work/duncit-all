import type { BannerStyle } from '../podPromo.types';

/**
 * The banner design system: every colour, typeface and treatment a pod
 * carousel can use, as configuration. Slides read roles (bg, ink, accent …)
 * and never a value, so a family is restyled here and nowhere else.
 *
 * The five families follow the Duncit Instagram banners the team designs by
 * hand. Each carries a few palettes; the one whose accent sits nearest the
 * cover photo's dominant hue is used (banner.palette.ts), so a banner over a
 * green football pitch and one over a red Diwali stage look made for them
 * while staying inside the family.
 */
export interface BannerPalette {
  /** Slide background where no photo shows. */
  bg: string;
  /** Cards, panels and the circle behind a host photo. */
  surface: string;
  /** Main text on bg. */
  ink: string;
  /** Secondary text on bg. */
  muted: string;
  /** Pills, rules, the price — the colour the eye lands on. */
  accent: string;
  /** Text on accent. */
  accent_ink: string;
  /** The wash laid over a photo so text reads on it. */
  scrim: string;
}

/** Which bundled typeface plays which part (banner.fonts.ts loads them). */
export type FontRole = 'display' | 'serif' | 'sans' | 'sans_bold';

/** How a slide uses the pod's photo: under the whole slide, in a framed panel, or not at all. */
export type PhotoTreatment = 'full' | 'panel' | 'none';

export interface BannerFamily {
  title_font: FontRole;
  body_font: FontRole;
  /** Display titles in capitals (chunky and condensed families). */
  upper_title: boolean;
  /** How opaque the scrim is over a full-bleed photo, 0–1. */
  scrim_opacity: number;
  cover_photo: PhotoTreatment;
  /** Corner radius of pills and cards, in px at 1080 wide. */
  radius: number;
  palettes: readonly BannerPalette[];
}

export const BANNER_FAMILIES: Record<BannerStyle, BannerFamily> = {
  FESTIVE_BOLD: {
    title_font: 'display',
    body_font: 'sans_bold',
    upper_title: true,
    scrim_opacity: 0.55,
    cover_photo: 'panel',
    radius: 28,
    palettes: [
      { bg: '#D7261E', surface: '#F7C52B', ink: '#FFF8E7', muted: '#FFE3A3', accent: '#F7C52B', accent_ink: '#4A0D0A', scrim: '#3A0806' },
      { bg: '#E0531F', surface: '#FFD23F', ink: '#FFF8E7', muted: '#FFE6B0', accent: '#FFD23F', accent_ink: '#3D1404', scrim: '#3A1205' },
      { bg: '#B3125B', surface: '#FFC93C', ink: '#FFF5F9', muted: '#FFD3E6', accent: '#FFC93C', accent_ink: '#40061F', scrim: '#33041A' },
    ],
  },
  ELEGANT_SERIF: {
    title_font: 'serif',
    body_font: 'sans',
    upper_title: false,
    scrim_opacity: 0.35,
    cover_photo: 'panel',
    radius: 6,
    palettes: [
      { bg: '#F6EEDF', surface: '#EADBC3', ink: '#5B1A22', muted: '#8C5A4F', accent: '#5B1A22', accent_ink: '#F6EEDF', scrim: '#2B0A0E' },
      { bg: '#F3EFE4', surface: '#DCE3D3', ink: '#24402F', muted: '#5E7464', accent: '#24402F', accent_ink: '#F3EFE4', scrim: '#0F1E15' },
      { bg: '#F4EDE6', surface: '#E3D4E6', ink: '#3E1F4D', muted: '#6F5A7A', accent: '#3E1F4D', accent_ink: '#F4EDE6', scrim: '#1C0C24' },
    ],
  },
  SPORT_NIGHT: {
    title_font: 'display',
    body_font: 'sans_bold',
    upper_title: true,
    scrim_opacity: 0.7,
    cover_photo: 'full',
    radius: 4,
    palettes: [
      { bg: '#3B0A12', surface: '#5C1420', ink: '#FFFFFF', muted: '#E8C9CD', accent: '#F2C230', accent_ink: '#2A0509', scrim: '#1A0307' },
      { bg: '#0E2A1A', surface: '#174A2C', ink: '#FFFFFF', muted: '#C8E6D2', accent: '#B7F34A', accent_ink: '#0B2012', scrim: '#06140C' },
      { bg: '#0D1B3D', surface: '#1A2F63', ink: '#FFFFFF', muted: '#C9D5F2', accent: '#FF7A1A', accent_ink: '#1A0C02', scrim: '#060D1F' },
    ],
  },
  PLAYFUL_PASTEL: {
    title_font: 'sans_bold',
    body_font: 'sans',
    upper_title: false,
    scrim_opacity: 0.25,
    cover_photo: 'panel',
    radius: 40,
    palettes: [
      { bg: '#FBD3E0', surface: '#FFFFFF', ink: '#4A1D34', muted: '#7D4E64', accent: '#E8487F', accent_ink: '#FFFFFF', scrim: '#3A1027' },
      { bg: '#D6EEF8', surface: '#FFFFFF', ink: '#173B52', muted: '#4D6E82', accent: '#2E8BC9', accent_ink: '#FFFFFF', scrim: '#0C2333' },
      { bg: '#E5F5D8', surface: '#FFFFFF', ink: '#2C4417', muted: '#5C7348', accent: '#6BAA2E', accent_ink: '#FFFFFF', scrim: '#16240B' },
    ],
  },
  CALM_WELLNESS: {
    title_font: 'serif',
    body_font: 'sans',
    upper_title: false,
    scrim_opacity: 0.5,
    cover_photo: 'full',
    radius: 999,
    palettes: [
      { bg: '#3A2A20', surface: '#5A4433', ink: '#FBF4EA', muted: '#E5D6C3', accent: '#E9C79C', accent_ink: '#2E1F15', scrim: '#1C130D' },
      { bg: '#24332B', surface: '#3B5145', ink: '#F3F7F2', muted: '#D2DFD5', accent: '#BFD8B8', accent_ink: '#172019', scrim: '#0E1712' },
      { bg: '#2C2638', surface: '#463D59', ink: '#F7F3FB', muted: '#DCD3E8', accent: '#D9C2F0', accent_ink: '#1D1726', scrim: '#120F18' },
    ],
  },
};

/** Pixel sizes of the two banner shapes. */
export const BANNER_DIMENSIONS = {
  PORTRAIT: { width: 1080, height: 1350 },
  SQUARE: { width: 1080, height: 1080 },
} as const;

/** The safe margin every slide keeps clear, in px. */
export const SLIDE_MARGIN = 72;
/** JPEG quality of an uploaded slide; Instagram recompresses anyway. */
export const JPEG_QUALITY = 88;

/**
 * The QR code is always dark on light, whatever the family: phone scanners
 * read inverted codes badly, and a code that does not scan is a dead slide.
 */
export const QR_COLORS = { dark: '#111111', light: '#FFFFFF' } as const;

/** Above this relative luminance a background counts as light (it gets the red wordmark). */
export const LIGHT_BACKGROUND_LUMINANCE = 0.55;
