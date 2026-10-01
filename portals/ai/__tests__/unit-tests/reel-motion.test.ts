import { describe, expect, it } from 'vitest';
import { entranceStyle, motionTransform, typedText } from '../../src/pages/reels/composition/motion';
import { formatReelDuration } from '../../src/pages/reels/format';

describe('motionTransform', () => {
  it('zooms in across the scene, and out the other way', () => {
    expect(motionTransform('ZOOM_IN', 0)).toBe('scale(1)');
    expect(motionTransform('ZOOM_IN', 1)).toBe('scale(1.15)');
    expect(motionTransform('ZOOM_OUT', 0)).toBe('scale(1.15)');
    expect(motionTransform('ZOOM_OUT', 1)).toBe('scale(1)');
  });

  it('pans zoomed in, so the frame never slides off the picture', () => {
    expect(motionTransform('PAN_LEFT', 0)).toBe('scale(1.15) translateX(4%)');
    expect(motionTransform('PAN_LEFT', 1)).toBe('scale(1.15) translateX(-4%)');
    expect(motionTransform('PAN_RIGHT', 0)).toBe('scale(1.15) translateX(-4%)');
    expect(motionTransform('PAN_RIGHT', 1)).toBe('scale(1.15) translateX(4%)');
  });

  it('leaves a still scene alone', () => {
    expect(motionTransform('NONE', 0.5)).toBe('none');
  });
});

describe('entranceStyle', () => {
  it('fades a text in over its first frames and then holds', () => {
    expect(entranceStyle('FADE', 0, 30)).toEqual({ opacity: 0 });
    expect(entranceStyle('FADE', 6, 30)).toEqual({ opacity: 0.5 });
    expect(entranceStyle('FADE', 120, 30)).toEqual({ opacity: 1 });
  });

  it('slides a text up into place', () => {
    expect(entranceStyle('SLIDE_UP', 0, 30)).toEqual({ opacity: 0, transform: 'translateY(60px)' });
    expect(entranceStyle('SLIDE_UP', 12, 30)).toEqual({ opacity: 1, transform: 'translateY(0px)' });
  });

  it('pops a text up from a smaller size', () => {
    expect(entranceStyle('POP', 0, 30)).toEqual({ opacity: 0, transform: 'scale(0.6)' });
    const settled = entranceStyle('POP', 90, 30);
    expect(settled.opacity).toBe(1);
    expect(Number(/scale\((.+)\)/.exec(String(settled.transform))?.[1])).toBeCloseTo(1, 2);
  });

  it('adds nothing for a text that simply appears, or types itself out', () => {
    expect(entranceStyle('NONE', 5, 30)).toEqual({});
    expect(entranceStyle('TYPEWRITER', 5, 30)).toEqual({});
  });
});

describe('typedText', () => {
  it('reveals a character every frame and a half', () => {
    expect(typedText('Jam night', 0)).toBe('');
    expect(typedText('Jam night', 3)).toBe('Ja');
    expect(typedText('Jam night', 100)).toBe('Jam night');
  });

  it('never cuts an emoji in half', () => {
    expect(typedText('🎸🥁', 1)).toBe('🎸');
  });
});

describe('formatReelDuration', () => {
  it('writes a length as minutes and seconds, and an empty reel as zero', () => {
    expect(formatReelDuration(84_000)).toBe('1:24');
    expect(formatReelDuration(7000)).toBe('0:07');
    expect(formatReelDuration(0)).toBe('0:00');
  });
});
