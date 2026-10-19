import type { FestiveTheme, OccasionLook } from './types';

/**
 * Indian festivals. Contrast reasoning, per mode (the coordinator re-checks
 * every literal with a script):
 * - light `cta` / `navBar` stay at relative luminance <= 0.16 / 0.05, so white
 *   text clears 5:1 / 10:1; `ctaInk` <= 0.11, so it clears 5:1 on the pale
 *   tints, hero and brand tint (all >= 0.80) as well as the page and surface.
 * - dark `cta` / `navBar` the same under white; `ctaInk` >= 0.41, the deep
 *   tints, hero and brand tint <= 0.035, so it clears 5:1 on all of them.
 */
type IndianTheme = Extract<
  FestiveTheme,
  | 'DIWALI'
  | 'HOLI'
  | 'DUSSEHRA'
  | 'NAVRATRI'
  | 'DURGA_PUJA'
  | 'GANESH_CHATURTHI'
  | 'JANMASHTAMI'
  | 'MAKAR_SANKRANTI'
  | 'LOHRI'
  | 'PONGAL'
  | 'ONAM'
  | 'RAKSHA_BANDHAN'
  | 'KARWA_CHAUTH'
  | 'BAISAKHI'
  | 'GURU_NANAK_JAYANTI'
  | 'EID'
  | 'CHHATH_PUJA'
>;

export const INDIAN_LOOKS: Record<IndianTheme, OccasionLook> = {
  DIWALI: {
    light: {
      brand: '#C25E00', cta: '#9E1B32', ctaHover: '#861529', ctaActive: '#6E1022', ctaInk: '#8A1C1C',
      navBar: '#3D0A14', brandTint: '#FFF0C9', heroFrom: '#FFF5E6', heroTo: '#FFE6CC', festive: '#F2B705',
      tints: ['#FFF0C9', '#FFE4E6', '#FFE6CC', '#FBEFD0', '#FFE3F1'],
    },
    dark: {
      brand: '#E0731A', cta: '#B8213D', ctaHover: '#9E1B32', ctaActive: '#861529', ctaInk: '#FFC46B',
      navBar: '#4A1420', brandTint: '#3A2E14', heroFrom: '#3A1F22', heroTo: '#3A2E14', festive: '#F5C84A',
      tints: ['#3A2E14', '#3A1F22', '#402614', '#3B3015', '#3D1F2C'],
    },
    effect: { shapes: ['diya', 'spark', 'spark'], colors: ['#F2B705', '#FF8A00', '#FFD54F', '#FF6F3C'], motion: 'rise', count: 36, size: [10, 22], speed: 30 },
  },
  HOLI: {
    light: {
      brand: '#D6247A', cta: '#A0167A', ctaHover: '#87126A', ctaActive: '#6E0E56', ctaInk: '#9C1C6B',
      navBar: '#3A0A30', brandTint: '#FCE4F6', heroFrom: '#FFE3F1', heroTo: '#EFE6FF', festive: '#FF4FA3',
      tints: ['#FCE4F6', '#FFF6CC', '#E3F0FF', '#E3F6E8', '#FFE2CF'],
    },
    dark: {
      brand: '#E04A9A', cta: '#B81C8C', ctaHover: '#A0167A', ctaActive: '#87126A', ctaInk: '#FF9FD6',
      navBar: '#4A1040', brandTint: '#3D1B35', heroFrom: '#3D1B35', heroTo: '#2A2340', festive: '#FF6FB5',
      tints: ['#3D1B35', '#3B3015', '#1A2442', '#1A3328', '#3D2416'],
    },
    effect: { shapes: ['circle', 'drop'], colors: ['#FF4FA3', '#FFD60A', '#3EC1F3', '#7ED957', '#9B5DE5', '#FF7A00'], motion: 'drift', count: 48, size: [8, 20], speed: 40 },
  },
  DUSSEHRA: {
    light: {
      brand: '#C25E00', cta: '#9A4A00', ctaHover: '#823E00', ctaActive: '#6B3300', ctaInk: '#7A3B00',
      navBar: '#3A1A00', brandTint: '#FBEFD0', heroFrom: '#FFF5E6', heroTo: '#FBEFD0', festive: '#E8A400',
      tints: ['#FBEFD0', '#FFE8D6', '#FFE5E5', '#FFF0C9', '#F7EBD9'],
    },
    dark: {
      brand: '#E08A1A', cta: '#A85200', ctaHover: '#9A4A00', ctaActive: '#823E00', ctaInk: '#FFC46B',
      navBar: '#4A2408', brandTint: '#3B3015', heroFrom: '#3A2A1C', heroTo: '#3B3015', festive: '#F5C84A',
      tints: ['#3B3015', '#3D2416', '#3D1A1A', '#3A2E14', '#3A2A1C'],
    },
    effect: { shapes: ['spark'], colors: ['#F5C84A', '#FFB300', '#FFE082'], motion: 'rise', count: 40, size: [6, 14], speed: 45 },
  },
  NAVRATRI: {
    light: {
      brand: '#D63A6A', cta: '#A8226C', ctaHover: '#8F1D5C', ctaActive: '#75184B', ctaInk: '#A3175A',
      navBar: '#4A0E26', brandTint: '#FFE3F1', heroFrom: '#FFF6CC', heroTo: '#FFE3F1', festive: '#FF9F1C',
      tints: ['#FFE3F1', '#FFF0C9', '#E3F6E8', '#FFE2CF', '#EFE6FF'],
    },
    dark: {
      brand: '#EB5A8C', cta: '#B8287A', ctaHover: '#A8226C', ctaActive: '#8F1D5C', ctaInk: '#FF9FD6',
      navBar: '#561230', brandTint: '#3D1F2C', heroFrom: '#3B3015', heroTo: '#3D1F2C', festive: '#FFB347',
      tints: ['#3D1F2C', '#3A2E14', '#1A3328', '#3D2416', '#33203F'],
    },
    effect: { shapes: ['ring', 'spark'], colors: ['#FF9F1C', '#FF4FA3', '#2EC4B6', '#FFD60A', '#9B5DE5'], motion: 'twinkle', count: 36, size: [10, 20], speed: 20 },
  },
  DURGA_PUJA: {
    light: {
      brand: '#D42A2A', cta: '#B3121F', ctaHover: '#990F1A', ctaActive: '#800C16', ctaInk: '#8A1C1C',
      navBar: '#3D0A14', brandTint: '#FFE5E5', heroFrom: '#FFF5E6', heroTo: '#FFE5E5', festive: '#F2B705',
      tints: ['#FFE5E5', '#FFF5E6', '#FBEFD0', '#FFE4E6', '#FFE6CC'],
    },
    dark: {
      brand: '#F04848', cta: '#C4192A', ctaHover: '#B3121F', ctaActive: '#990F1A', ctaInk: '#FF9AA2',
      navBar: '#4A1420', brandTint: '#3D1A1A', heroFrom: '#3D1A1A', heroTo: '#3B3015', festive: '#F5C84A',
      tints: ['#3D1A1A', '#3A2A1C', '#3B3015', '#401C24', '#402614'],
    },
    effect: { shapes: ['petal'], colors: ['#E53935', '#FF8A65', '#F2B705', '#C62828'], motion: 'fall', count: 30, size: [12, 22], speed: 35 },
  },
  GANESH_CHATURTHI: {
    light: {
      brand: '#D9480F', cta: '#B33F00', ctaHover: '#993600', ctaActive: '#802D00', ctaInk: '#8F3A00',
      navBar: '#3A0E00', brandTint: '#FFE6CC', heroFrom: '#FFF0C9', heroTo: '#FFE2CF', festive: '#F2B705',
      tints: ['#FFE6CC', '#FFF0C9', '#FFE4E6', '#E3F6E8', '#FFF5E6'],
    },
    dark: {
      brand: '#F06A2A', cta: '#B33F00', ctaHover: '#993600', ctaActive: '#802D00', ctaInk: '#FFA766',
      navBar: '#4A1A08', brandTint: '#402614', heroFrom: '#3A2E14', heroTo: '#3D2416', festive: '#F5C84A',
      tints: ['#402614', '#3A2E14', '#401C24', '#1A3328', '#3A2A1C'],
    },
    effect: { shapes: ['modak', 'petal', 'spark'], colors: ['#F2B705', '#FF8A00', '#FFE0B2', '#E53935'], motion: 'fall', count: 32, size: [12, 22], speed: 30 },
  },
  JANMASHTAMI: {
    light: {
      brand: '#0077A3', cta: '#005F73', ctaHover: '#00505F', ctaActive: '#00414D', ctaInk: '#00616A',
      navBar: '#0A2A4A', brandTint: '#DDF4F1', heroFrom: '#E3F0FF', heroTo: '#DDF4F1', festive: '#2EC4B6',
      tints: ['#DDF4F1', '#E3F0FF', '#FFF6CC', '#EFE6FF', '#E3F6E8'],
    },
    dark: {
      brand: '#1FA3C4', cta: '#00708A', ctaHover: '#005F73', ctaActive: '#00505F', ctaInk: '#6FD6C8',
      navBar: '#0E3456', brandTint: '#143230', heroFrom: '#183040', heroTo: '#143230', festive: '#3ED3C4',
      tints: ['#143230', '#183040', '#3B3015', '#2A2340', '#1A3328'],
    },
    effect: { shapes: ['feather'], colors: ['#2EC4B6', '#1565C0', '#7ED957', '#F2B705'], motion: 'fall', count: 24, size: [16, 28], speed: 25 },
  },
  MAKAR_SANKRANTI: {
    light: {
      brand: '#0088A8', cta: '#00696F', ctaHover: '#00595E', ctaActive: '#00494D', ctaInk: '#00616A',
      navBar: '#062A2E', brandTint: '#E8F4FA', heroFrom: '#E3F0FF', heroTo: '#FFF6CC', festive: '#FF7A00',
      tints: ['#E8F4FA', '#FFF0C9', '#FFE3F1', '#E3F6E8', '#FFE2CF'],
    },
    dark: {
      brand: '#22B0C8', cta: '#007A80', ctaHover: '#00696F', ctaActive: '#00595E', ctaInk: '#6FD6C8',
      navBar: '#0A3A40', brandTint: '#183040', heroFrom: '#183040', heroTo: '#3B3015', festive: '#FF9F43',
      tints: ['#183040', '#3A2E14', '#3D1F2C', '#1A3328', '#3D2416'],
    },
    effect: { shapes: ['kite'], colors: ['#FF7A00', '#E53935', '#3EC1F3', '#FFD60A', '#9B5DE5'], motion: 'drift', count: 18, size: [18, 30], speed: 35 },
  },
  LOHRI: {
    light: {
      brand: '#D4410A', cta: '#B3300A', ctaHover: '#992908', ctaActive: '#802207', ctaInk: '#8F3A00',
      navBar: '#3A0E00', brandTint: '#FFE2CF', heroFrom: '#FFF0C9', heroTo: '#FFE2CF', festive: '#FF8F00',
      tints: ['#FFE2CF', '#FFF0C9', '#FFE5E5', '#FBEFD0', '#F7EBD9'],
    },
    dark: {
      brand: '#F0612A', cta: '#B3300A', ctaHover: '#992908', ctaActive: '#802207', ctaInk: '#FFA766',
      navBar: '#4A1A08', brandTint: '#3D2416', heroFrom: '#3A2E14', heroTo: '#3D2416', festive: '#FFA726',
      tints: ['#3D2416', '#3A2E14', '#3D1A1A', '#3B3015', '#3A2A1C'],
    },
    effect: { shapes: ['flame', 'spark'], colors: ['#FF8F00', '#FF5722', '#FFD54F', '#FF3D00'], motion: 'rise', count: 40, size: [6, 16], speed: 55 },
  },
  PONGAL: {
    light: {
      brand: '#B86A00', cta: '#8F4A00', ctaHover: '#7A3F00', ctaActive: '#663500', ctaInk: '#7A3B00',
      navBar: '#3A1A00', brandTint: '#FFF6CC', heroFrom: '#FFF6CC', heroTo: '#E1F2DC', festive: '#F9A825',
      tints: ['#FFF6CC', '#E1F2DC', '#FFE8D6', '#FFF0C9', '#E3F6E8'],
    },
    dark: {
      brand: '#E0961A', cta: '#A05200', ctaHover: '#8F4A00', ctaActive: '#7A3F00', ctaInk: '#FFC46B',
      navBar: '#4A2408', brandTint: '#3B3015', heroFrom: '#3B3015', heroTo: '#16301F', festive: '#FBC02D',
      tints: ['#3B3015', '#16301F', '#3A2A1C', '#3A2E14', '#1A3328'],
    },
    effect: { shapes: ['circle', 'circle', 'sun'], colors: ['#FFE0B2', '#F9A825', '#FFCC80'], motion: 'rise', count: 24, size: [10, 24], speed: 20 },
  },
  ONAM: {
    light: {
      brand: '#3E8E2E', cta: '#2F6B2B', ctaHover: '#275A24', ctaActive: '#1F481D', ctaInk: '#17602F',
      navBar: '#0F3A1E', brandTint: '#FBEFD0', heroFrom: '#FFF5E6', heroTo: '#E1F2DC', festive: '#F2B705',
      tints: ['#FBEFD0', '#E1F2DC', '#FFE6CC', '#FFF6CC', '#E3F6E8'],
    },
    dark: {
      brand: '#5CB04A', cta: '#357A30', ctaHover: '#2F6B2B', ctaActive: '#275A24', ctaInk: '#B5E07A',
      navBar: '#14421F', brandTint: '#3B3015', heroFrom: '#3B3015', heroTo: '#16301F', festive: '#F5C84A',
      tints: ['#3B3015', '#16301F', '#402614', '#3A2E14', '#1A3328'],
    },
    effect: { shapes: ['petal'], colors: ['#F2B705', '#FF8F00', '#E53935', '#FFD54F'], motion: 'fall', count: 32, size: [10, 20], speed: 30 },
  },
  RAKSHA_BANDHAN: {
    light: {
      brand: '#E0457B', cta: '#A3175A', ctaHover: '#8A134C', ctaActive: '#72103F', ctaInk: '#9C1C6B',
      navBar: '#4A0E26', brandTint: '#FFE3F1', heroFrom: '#FFE6CC', heroTo: '#FFE3F1', festive: '#FF9F1C',
      tints: ['#FFE3F1', '#FFE6CC', '#FFF0C9', '#EFE6FF', '#FFE4E6'],
    },
    dark: {
      brand: '#F06A9A', cta: '#B81C6A', ctaHover: '#A3175A', ctaActive: '#8A134C', ctaInk: '#FF9FD6',
      navBar: '#561230', brandTint: '#3D1F2C', heroFrom: '#402614', heroTo: '#3D1F2C', festive: '#FFB347',
      tints: ['#3D1F2C', '#402614', '#3A2E14', '#33203F', '#401C24'],
    },
    effect: { shapes: ['ring', 'star'], colors: ['#FF9F1C', '#E0457B', '#F2B705', '#9B5DE5'], motion: 'drift', count: 24, size: [12, 22], speed: 25 },
  },
  KARWA_CHAUTH: {
    light: {
      brand: '#C8203F', cta: '#A0153E', ctaHover: '#87112F', ctaActive: '#6E0E27', ctaInk: '#A0153E',
      navBar: '#12123A', brandTint: '#FFE4E6', heroFrom: '#E4EBFF', heroTo: '#FFE4E6', festive: '#F2C94C',
      tints: ['#FFE4E6', '#E4EBFF', '#FBEFD0', '#FFE3F1', '#ECEEF3'],
    },
    dark: {
      brand: '#E84A68', cta: '#B8213D', ctaHover: '#A0153E', ctaActive: '#87112F', ctaInk: '#FF9AA2',
      navBar: '#1E1E52', brandTint: '#401C24', heroFrom: '#1A2442', heroTo: '#401C24', festive: '#F5D76E',
      tints: ['#401C24', '#1A2442', '#3B3015', '#3D1F2C', '#262B33'],
    },
    effect: { shapes: ['star', 'star', 'moon'], colors: ['#F5D76E', '#FFF3C4', '#F2C94C'], motion: 'twinkle', count: 30, size: [8, 18], speed: 15 },
  },
  BAISAKHI: {
    light: {
      brand: '#A07C00', cta: '#6B5A00', ctaHover: '#5A4C00', ctaActive: '#4A3E00', ctaInk: '#4D5A00',
      navBar: '#2A2A08', brandTint: '#FFF0C9', heroFrom: '#FFF6CC', heroTo: '#E1F2DC', festive: '#E0A800',
      tints: ['#FFF0C9', '#E1F2DC', '#FFE6CC', '#FFF6CC', '#F7EBD9'],
    },
    dark: {
      brand: '#C9A227', cta: '#7A6600', ctaHover: '#6B5A00', ctaActive: '#5A4C00', ctaInk: '#F5C84A',
      navBar: '#38380C', brandTint: '#3A2E14', heroFrom: '#3B3015', heroTo: '#2E3216', festive: '#F5C84A',
      tints: ['#3A2E14', '#2E3216', '#402614', '#3B3015', '#3A2A1C'],
    },
    effect: { shapes: ['leaf'], colors: ['#E0A800', '#C9A227', '#8BC34A', '#F9A825'], motion: 'drift', count: 28, size: [12, 22], speed: 30 },
  },
  GURU_NANAK_JAYANTI: {
    light: {
      brand: '#A86E00', cta: '#8A5A00', ctaHover: '#754C00', ctaActive: '#603E00', ctaInk: '#7A5200',
      navBar: '#0B1F4D', brandTint: '#FBEFD0', heroFrom: '#FFF5E6', heroTo: '#FBEFD0', festive: '#F2B705',
      tints: ['#FBEFD0', '#E4EBFF', '#FFF0C9', '#FFF5E6', '#ECEEF3'],
    },
    dark: {
      brand: '#D4A020', cta: '#966200', ctaHover: '#8A5A00', ctaActive: '#754C00', ctaInk: '#F5C84A',
      navBar: '#132A5E', brandTint: '#3B3015', heroFrom: '#1C2A3D', heroTo: '#3B3015', festive: '#F5C84A',
      tints: ['#3B3015', '#1A2442', '#3A2E14', '#3A2A1C', '#262B33'],
    },
    effect: { shapes: ['spark', 'circle'], colors: ['#F2B705', '#FFD54F', '#FFE9A8'], motion: 'rise', count: 26, size: [4, 10], speed: 15 },
  },
  EID: {
    light: {
      brand: '#00875A', cta: '#00704A', ctaHover: '#005E3E', ctaActive: '#004D33', ctaInk: '#17602F',
      navBar: '#062A2E', brandTint: '#E3F6E8', heroFrom: '#E3F6E8', heroTo: '#FBEFD0', festive: '#D4AF37',
      tints: ['#E3F6E8', '#FBEFD0', '#DDF4F1', '#E4EBFF', '#FFF5E6'],
    },
    dark: {
      brand: '#1FB07A', cta: '#007A50', ctaHover: '#00704A', ctaActive: '#005E3E', ctaInk: '#7EDC9A',
      navBar: '#0A3A40', brandTint: '#1A3328', heroFrom: '#1A3328', heroTo: '#3B3015', festive: '#E6C35C',
      tints: ['#1A3328', '#3B3015', '#143230', '#1A2442', '#3A2A1C'],
    },
    effect: { shapes: ['moon', 'lantern', 'star'], colors: ['#D4AF37', '#F5D76E', '#FFF3C4'], motion: 'twinkle', count: 26, size: [10, 22], speed: 12 },
  },
  CHHATH_PUJA: {
    light: {
      brand: '#CC5500', cta: '#B34700', ctaHover: '#993D00', ctaActive: '#803300', ctaInk: '#8A4200',
      navBar: '#3A1A00', brandTint: '#FFE6CC', heroFrom: '#FFF0C9', heroTo: '#FFE2CF', festive: '#FF8F00',
      tints: ['#FFE6CC', '#FFF0C9', '#FFE5E5', '#FBEFD0', '#FFE8D6'],
    },
    dark: {
      brand: '#F07A2A', cta: '#B34700', ctaHover: '#993D00', ctaActive: '#803300', ctaInk: '#FFA766',
      navBar: '#4A2408', brandTint: '#402614', heroFrom: '#3A2E14', heroTo: '#3D2416', festive: '#FFA726',
      tints: ['#402614', '#3A2E14', '#3D1A1A', '#3B3015', '#3A2A1C'],
    },
    effect: { shapes: ['sun', 'diya'], colors: ['#FF8F00', '#FFB300', '#FF7043'], motion: 'rise', count: 20, size: [12, 26], speed: 18 },
  },
};
