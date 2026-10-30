import type { FestiveTheme, OccasionLook } from './types';

/** National and awareness days. Same contrast budget as `./indian` (see its header). */
type NationalTheme = Extract<
  FestiveTheme,
  'INDEPENDENCE_DAY' | 'REPUBLIC_DAY' | 'GANDHI_JAYANTI' | 'CHILDRENS_DAY' | 'WOMENS_DAY' | 'YOGA_DAY' | 'EARTH_DAY'
>;

/** Saffron, white and India green: the tricolour particles both national days share. */
const TRICOLOUR = ['#FF9933', '#FFFFFF', '#138808'] as const;

export const NATIONAL_LOOKS: Record<NationalTheme, OccasionLook> = {
  INDEPENDENCE_DAY: {
    light: {
      brand: '#CC5A00', cta: '#A84E00', ctaHover: '#8F4200', ctaActive: '#773700', ctaInk: '#8A4200',
      navBar: '#0B1F4D', brandTint: '#FFE6CC', heroFrom: '#FFE6CC', heroTo: '#E3F6E8', festive: '#FF9933',
      tints: ['#FFE6CC', '#E3F6E8', '#E4EBFF', '#FFF5E6', '#ECEEF3'],
    },
    dark: {
      brand: '#F08A2A', cta: '#B35400', ctaHover: '#A84E00', ctaActive: '#8F4200', ctaInk: '#FFB38A',
      navBar: '#132A5E', brandTint: '#402614', heroFrom: '#402614', heroTo: '#16301F', festive: '#FF9933',
      tints: ['#402614', '#16301F', '#1A2442', '#3A2A1C', '#262B33'],
    },
    effect: { shapes: ['circle', 'star'], colors: TRICOLOUR, motion: 'fall', count: 40, size: [6, 14], speed: 35 },
  },
  REPUBLIC_DAY: {
    light: {
      brand: '#2A64D4', cta: '#1A3E8C', ctaHover: '#15336F', ctaActive: '#102857', ctaInk: '#1A3E8C',
      navBar: '#0B1F4D', brandTint: '#E4EBFF', heroFrom: '#FFE6CC', heroTo: '#E3F6E8', festive: '#FF9933',
      tints: ['#E4EBFF', '#FFE6CC', '#E3F6E8', '#FFF5E6', '#ECEEF3'],
    },
    dark: {
      brand: '#4A84F0', cta: '#2A5BC4', ctaHover: '#2450A8', ctaActive: '#1A3E8C', ctaInk: '#9DB8FF',
      navBar: '#132A5E', brandTint: '#1A2442', heroFrom: '#402614', heroTo: '#16301F', festive: '#FF9933',
      tints: ['#1A2442', '#402614', '#16301F', '#3A2A1C', '#262B33'],
    },
    effect: { shapes: ['chakra', 'circle', 'circle'], colors: [...TRICOLOUR, '#1A3E8C'], motion: 'fall', count: 36, size: [8, 18], speed: 30 },
  },
  GANDHI_JAYANTI: {
    light: {
      brand: '#8A6A3A', cta: '#6B4E16', ctaHover: '#5A4112', ctaActive: '#4A350F', ctaInk: '#6B4E16',
      navBar: '#2B2416', brandTint: '#F7EBD9', heroFrom: '#FFF5E6', heroTo: '#F7EBD9', festive: '#FF9933',
      tints: ['#F7EBD9', '#FFF5E6', '#E3F6E8', '#FBEFD0', '#ECEEF3'],
    },
    dark: {
      brand: '#C9A06A', cta: '#7A5A1E', ctaHover: '#6B4E16', ctaActive: '#5A4112', ctaInk: '#F5C84A',
      navBar: '#3A3020', brandTint: '#3A2A1C', heroFrom: '#3A2A1C', heroTo: '#3B3015', festive: '#FFB347',
      tints: ['#3A2A1C', '#3B3015', '#1A3328', '#3A2E14', '#262B33'],
    },
    effect: { shapes: ['petal'], colors: [...TRICOLOUR, '#F2B705'], motion: 'fall', count: 24, size: [10, 18], speed: 25 },
  },
  CHILDRENS_DAY: {
    light: {
      brand: '#1A78D0', cta: '#0B5FA5', ctaHover: '#094F8A', ctaActive: '#073F6F', ctaInk: '#1F4FB5',
      navBar: '#0A2A4A', brandTint: '#E3F0FF', heroFrom: '#FFF6CC', heroTo: '#E3F0FF', festive: '#FF4FA3',
      tints: ['#E3F0FF', '#FFF6CC', '#FFE3F1', '#E3F6E8', '#FFE2CF'],
    },
    dark: {
      brand: '#4AA8F0', cta: '#0E6CB8', ctaHover: '#0B5FA5', ctaActive: '#094F8A', ctaInk: '#8CC8FF',
      navBar: '#0E3456', brandTint: '#183040', heroFrom: '#3B3015', heroTo: '#183040', festive: '#FF6FB5',
      tints: ['#183040', '#3B3015', '#3D1F2C', '#1A3328', '#3D2416'],
    },
    effect: { shapes: ['balloon', 'circle'], colors: ['#FF4FA3', '#3EC1F3', '#FFD60A', '#7ED957', '#FF7A00'], motion: 'rise', count: 22, size: [16, 30], speed: 35 },
  },
  WOMENS_DAY: {
    light: {
      brand: '#8E44C8', cta: '#6B2FA0', ctaHover: '#5A2787', ctaActive: '#4A206E', ctaInk: '#6A1B9A',
      navBar: '#24124A', brandTint: '#F3E8FF', heroFrom: '#F3E8FF', heroTo: '#FFE3F1', festive: '#B57EDC',
      tints: ['#F3E8FF', '#FFE3F1', '#EFE6FF', '#E3F6E8', '#FFF5E6'],
    },
    dark: {
      brand: '#B07AE8', cta: '#8A3FC2', ctaHover: '#7B37AD', ctaActive: '#6B2FA0', ctaInk: '#C9A8FF',
      navBar: '#321A5E', brandTint: '#33203F', heroFrom: '#33203F', heroTo: '#3D1F2C', festive: '#C9A0F0',
      tints: ['#33203F', '#3D1F2C', '#2A2340', '#1A3328', '#3A2A1C'],
    },
    effect: { shapes: ['petal'], colors: ['#9B5DE5', '#B57EDC', '#7B2CBF', '#E0B0FF'], motion: 'fall', count: 28, size: [10, 20], speed: 28 },
  },
  YOGA_DAY: {
    light: {
      brand: '#00869A', cta: '#00677A', ctaHover: '#005766', ctaActive: '#004753', ctaInk: '#00616A',
      navBar: '#062A2E', brandTint: '#DDF4F1', heroFrom: '#FFF5E6', heroTo: '#DDF4F1', festive: '#FFB74D',
      tints: ['#DDF4F1', '#FFF5E6', '#E8F4FA', '#FFF0C9', '#F3E8FF'],
    },
    dark: {
      brand: '#2AB0C4', cta: '#00768A', ctaHover: '#00677A', ctaActive: '#005766', ctaInk: '#6FD6C8',
      navBar: '#0A3A40', brandTint: '#143230', heroFrom: '#3A2A1C', heroTo: '#143230', festive: '#FFC77A',
      tints: ['#143230', '#3A2A1C', '#1E2C38', '#3A2E14', '#33203F'],
    },
    effect: { shapes: ['circle', 'circle', 'sun'], colors: ['#FFB74D', '#80CBC4', '#B2DFDB'], motion: 'rise', count: 18, size: [10, 26], speed: 12 },
  },
  EARTH_DAY: {
    light: {
      brand: '#3E8E2E', cta: '#2E6B1F', ctaHover: '#265A1A', ctaActive: '#1E4815', ctaInk: '#17602F',
      navBar: '#0F3A1E', brandTint: '#E1F2DC', heroFrom: '#E3F0FF', heroTo: '#E1F2DC', festive: '#43A047',
      tints: ['#E1F2DC', '#E3F0FF', '#E3F6E8', '#FFF6CC', '#DDF4F1'],
    },
    dark: {
      brand: '#5CB04A', cta: '#357A30', ctaHover: '#2E6B1F', ctaActive: '#265A1A', ctaInk: '#B5E07A',
      navBar: '#14421F', brandTint: '#16301F', heroFrom: '#183040', heroTo: '#16301F', festive: '#66BB6A',
      tints: ['#16301F', '#183040', '#1A3328', '#3B3015', '#143230'],
    },
    effect: { shapes: ['leaf'], colors: ['#43A047', '#7CB342', '#2E7D32', '#AED581'], motion: 'fall', count: 28, size: [12, 22], speed: 28 },
  },
};
