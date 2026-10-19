import type { FestiveTheme, OccasionLook } from './types';

/** Global days. Same contrast budget as `./indian` (see its header). */
type WesternTheme = Extract<
  FestiveTheme,
  'CHRISTMAS' | 'HALLOWEEN' | 'NEW_YEAR' | 'VALENTINES_DAY' | 'EASTER' | 'FRIENDSHIP_DAY' | 'MOTHERS_DAY' | 'FATHERS_DAY' | 'APRIL_FOOLS'
>;

export const WESTERN_LOOKS: Record<WesternTheme, OccasionLook> = {
  CHRISTMAS: {
    light: {
      brand: '#C62828', cta: '#1B6B3A', ctaHover: '#155A30', ctaActive: '#104826', ctaInk: '#A0153E',
      navBar: '#0E2A1A', brandTint: '#E3F6E8', heroFrom: '#FFE5E5', heroTo: '#E3F6E8', festive: '#D4AF37',
      tints: ['#E3F6E8', '#FFE5E5', '#FBEFD0', '#E8F4FA', '#FFE4E6'],
    },
    dark: {
      brand: '#E84848', cta: '#1F7A42', ctaHover: '#1B6B3A', ctaActive: '#155A30', ctaInk: '#FF9AA2',
      navBar: '#14421F', brandTint: '#1A3328', heroFrom: '#3D1A1A', heroTo: '#16301F', festive: '#E6C35C',
      tints: ['#1A3328', '#3D1A1A', '#3B3015', '#1E2C38', '#401C24'],
    },
    effect: { shapes: ['snowflake', 'circle'], colors: ['#B3D4F5', '#90CAF9', '#FFFFFF'], motion: 'fall', count: 50, size: [6, 16], speed: 35 },
  },
  HALLOWEEN: {
    light: {
      brand: '#D45500', cta: '#A84300', ctaHover: '#8F3900', ctaActive: '#772F00', ctaInk: '#8F3A00',
      navBar: '#1E1030', brandTint: '#FFE2CF', heroFrom: '#FFE2CF', heroTo: '#EFE6FF', festive: '#7B2CBF',
      tints: ['#FFE2CF', '#EFE6FF', '#FFF0C9', '#ECEEF3', '#E3F6E8'],
    },
    dark: {
      brand: '#F07A1A', cta: '#B84A00', ctaHover: '#A84300', ctaActive: '#8F3900', ctaInk: '#FFA766',
      navBar: '#2A1A42', brandTint: '#3D2416', heroFrom: '#3D2416', heroTo: '#2A2340', festive: '#9D4EDD',
      tints: ['#3D2416', '#2A2340', '#3A2E14', '#262B33', '#1A3328'],
    },
    effect: { shapes: ['bat'], colors: ['#3D2A55', '#FF7A00', '#5E3A8C'], motion: 'drift', count: 18, size: [16, 28], speed: 45 },
  },
  NEW_YEAR: {
    light: {
      brand: '#5B4BD6', cta: '#3B2D9B', ctaHover: '#322684', ctaActive: '#291F6D', ctaInk: '#4527A0',
      navBar: '#12123A', brandTint: '#EFE6FF', heroFrom: '#E4EBFF', heroTo: '#FBEFD0', festive: '#D4AF37',
      tints: ['#EFE6FF', '#FBEFD0', '#E3F0FF', '#FFE3F1', '#ECEEF3'],
    },
    dark: {
      brand: '#7B6CF0', cta: '#5A44C4', ctaHover: '#4A38A8', ctaActive: '#3B2D9B', ctaInk: '#C9A8FF',
      navBar: '#1E1E52', brandTint: '#2A2340', heroFrom: '#1A2442', heroTo: '#3B3015', festive: '#F5C84A',
      tints: ['#2A2340', '#3B3015', '#1C2A3D', '#3D1F2C', '#262B33'],
    },
    effect: { shapes: ['confetti', 'star'], colors: ['#F5C84A', '#FF4FA3', '#3EC1F3', '#7ED957', '#9B5DE5'], motion: 'fall', count: 55, size: [6, 14], speed: 60 },
  },
  VALENTINES_DAY: {
    light: {
      brand: '#E02454', cta: '#B0174A', ctaHover: '#96133F', ctaActive: '#7C1034', ctaInk: '#A0153E',
      navBar: '#4A0E26', brandTint: '#FFE4E6', heroFrom: '#FFE3F1', heroTo: '#FFE4E6', festive: '#FF4D6D',
      tints: ['#FFE4E6', '#FFE3F1', '#FCE4F6', '#FFE5E5', '#F3E8FF'],
    },
    dark: {
      brand: '#F04A70', cta: '#C21E52', ctaHover: '#B0174A', ctaActive: '#96133F', ctaInk: '#FF9AA2',
      navBar: '#561230', brandTint: '#401C24', heroFrom: '#3D1F2C', heroTo: '#401C24', festive: '#FF6B88',
      tints: ['#401C24', '#3D1F2C', '#3D1B35', '#3D1A1A', '#33203F'],
    },
    effect: { shapes: ['heart'], colors: ['#FF4D6D', '#FF8FA3', '#E02454', '#FFB3C1'], motion: 'rise', count: 30, size: [10, 22], speed: 30 },
  },
  EASTER: {
    light: {
      brand: '#8E5BD6', cta: '#7B3FA8', ctaHover: '#69368F', ctaActive: '#572D77', ctaInk: '#6A1B9A',
      navBar: '#24124A', brandTint: '#F3E8FF', heroFrom: '#FFF6CC', heroTo: '#F3E8FF', festive: '#7ED957',
      tints: ['#F3E8FF', '#FFF6CC', '#E3F6E8', '#FFE3F1', '#E3F0FF'],
    },
    dark: {
      brand: '#A87BE8', cta: '#9445B8', ctaHover: '#7B3FA8', ctaActive: '#69368F', ctaInk: '#C9A8FF',
      navBar: '#321A5E', brandTint: '#33203F', heroFrom: '#3B3015', heroTo: '#33203F', festive: '#9BE07A',
      tints: ['#33203F', '#3B3015', '#1A3328', '#3D1F2C', '#1C2A3D'],
    },
    effect: { shapes: ['egg', 'petal'], colors: ['#B39DDB', '#FFE082', '#A5D6A7', '#F8BBD0', '#81D4FA'], motion: 'fall', count: 22, size: [14, 24], speed: 25 },
  },
  FRIENDSHIP_DAY: {
    light: {
      brand: '#D44A1E', cta: '#B23A1E', ctaHover: '#983119', ctaActive: '#7E2915', ctaInk: '#8F3A00',
      navBar: '#0A2A4A', brandTint: '#FFE2CF', heroFrom: '#FFF6CC', heroTo: '#E3F0FF', festive: '#FFD60A',
      tints: ['#FFE2CF', '#FFF6CC', '#E3F0FF', '#E3F6E8', '#FFE3F1'],
    },
    dark: {
      brand: '#F0704A', cta: '#C2421F', ctaHover: '#B23A1E', ctaActive: '#983119', ctaInk: '#FFB38A',
      navBar: '#0E3456', brandTint: '#3D2416', heroFrom: '#3B3015', heroTo: '#183040', festive: '#FFE066',
      tints: ['#3D2416', '#3B3015', '#183040', '#1A3328', '#3D1F2C'],
    },
    effect: { shapes: ['confetti', 'star'], colors: ['#FFD60A', '#FF7A00', '#3EC1F3', '#7ED957', '#FF4FA3'], motion: 'fall', count: 40, size: [6, 14], speed: 50 },
  },
  MOTHERS_DAY: {
    light: {
      brand: '#D6457A', cta: '#A8226C', ctaHover: '#8F1D5C', ctaActive: '#75184B', ctaInk: '#A3175A',
      navBar: '#3A0A30', brandTint: '#FFE3F1', heroFrom: '#FFE3F1', heroTo: '#F3E8FF', festive: '#FF8FAB',
      tints: ['#FFE3F1', '#F3E8FF', '#FFE4E6', '#FFF5E6', '#E3F6E8'],
    },
    dark: {
      brand: '#F06A9A', cta: '#B8287A', ctaHover: '#A8226C', ctaActive: '#8F1D5C', ctaInk: '#FF9FD6',
      navBar: '#4A1040', brandTint: '#3D1F2C', heroFrom: '#3D1F2C', heroTo: '#33203F', festive: '#FFA3BF',
      tints: ['#3D1F2C', '#33203F', '#401C24', '#3A2A1C', '#1A3328'],
    },
    effect: { shapes: ['petal', 'heart'], colors: ['#FF8FAB', '#F8BBD0', '#E0457B', '#CE93D8'], motion: 'fall', count: 28, size: [10, 20], speed: 28 },
  },
  FATHERS_DAY: {
    light: {
      brand: '#2A64D4', cta: '#1A3E8C', ctaHover: '#15336F', ctaActive: '#102857', ctaInk: '#1A3E8C',
      navBar: '#0B1F4D', brandTint: '#E4EBFF', heroFrom: '#E4EBFF', heroTo: '#ECEEF3', festive: '#F2B705',
      tints: ['#E4EBFF', '#ECEEF3', '#E3F0FF', '#FBEFD0', '#E8F4FA'],
    },
    dark: {
      brand: '#4A84F0', cta: '#2A5BC4', ctaHover: '#2450A8', ctaActive: '#1A3E8C', ctaInk: '#9DB8FF',
      navBar: '#132A5E', brandTint: '#1A2442', heroFrom: '#1A2442', heroTo: '#262B33', festive: '#F5C84A',
      tints: ['#1A2442', '#262B33', '#1C2A3D', '#3B3015', '#1E2C38'],
    },
    effect: { shapes: ['star'], colors: ['#F2B705', '#90CAF9', '#FFE082'], motion: 'twinkle', count: 28, size: [8, 16], speed: 15 },
  },
  APRIL_FOOLS: {
    light: {
      brand: '#00897A', cta: '#006E62', ctaHover: '#005E54', ctaActive: '#004D45', ctaInk: '#00616A',
      navBar: '#24124A', brandTint: '#FFF6CC', heroFrom: '#FFF6CC', heroTo: '#DDF4F1', festive: '#FF4FA3',
      tints: ['#FFF6CC', '#DDF4F1', '#FFE3F1', '#E3F0FF', '#FFE2CF'],
    },
    dark: {
      brand: '#22B8A4', cta: '#007A6C', ctaHover: '#006E62', ctaActive: '#005E54', ctaInk: '#6FD6C8',
      navBar: '#321A5E', brandTint: '#3B3015', heroFrom: '#3B3015', heroTo: '#143230', festive: '#FF6FB5',
      tints: ['#3B3015', '#143230', '#3D1F2C', '#183040', '#3D2416'],
    },
    effect: { shapes: ['confetti', 'circle'], colors: ['#FFD60A', '#FF4FA3', '#2EC4B6', '#9B5DE5', '#FF7A00'], motion: 'drift', count: 36, size: [6, 16], speed: 40 },
  },
};
