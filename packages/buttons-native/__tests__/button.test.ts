import { describe, expect, it } from 'vitest';
import { BUTTON_SIZES, buttonSpec, type ButtonSpecInput } from '../src/button';
import { DISABLED_OPACITY, TOUCH_TARGET } from '../src/intents';

const base: ButtonSpecInput = { variant: 'solid', tone: 'primary', size: 'md' };

describe('BUTTON_SIZES', () => {
  it('keeps md at exactly one touch target', () => {
    expect(BUTTON_SIZES.md.height).toBe(TOUCH_TARGET);
  });

  it('orders the sizes and keeps every one a pill', () => {
    expect(BUTTON_SIZES.sm.height).toBeLessThan(BUTTON_SIZES.md.height);
    expect(BUTTON_SIZES.md.height).toBeLessThan(BUTTON_SIZES.lg.height);
    expect(BUTTON_SIZES.sm.borderRadius).toBe(999);
    expect(BUTTON_SIZES.md.borderRadius).toBe(999);
    expect(BUTTON_SIZES.lg.borderRadius).toBe(999);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(BUTTON_SIZES)).toBe(true);
    expect(Object.isFrozen(BUTTON_SIZES.lg)).toBe(true);
  });
});

describe('buttonSpec — variants', () => {
  it('solid paints the tone fill and darkens it under press', () => {
    const spec = buttonSpec(base);
    expect(spec.backgroundColor).toBe('$primary');
    expect(spec.pressBackgroundColor).toBe('$primaryPress');
    expect(spec.color).toBe('$onPrimary');
    expect(spec.borderWidth).toBe(0);
    expect(spec.borderColor).toBe('transparent');
    expect(spec.intent).toBe('solid');
  });

  it('outline draws a hairline in the accent and flashes the soft fill', () => {
    const spec = buttonSpec({ variant: 'outline', tone: 'danger', size: 'sm' });
    expect(spec.backgroundColor).toBe('transparent');
    expect(spec.pressBackgroundColor).toBe('$dangerSoft');
    expect(spec.borderWidth).toBe(1);
    expect(spec.borderColor).toBe('$danger');
    expect(spec.color).toBe('$danger');
    expect(spec.intent).toBe('control');
  });

  it('soft rests on the tonal fill and stays on it while pressed', () => {
    const spec = buttonSpec({ variant: 'soft', tone: 'success', size: 'lg' });
    expect(spec.backgroundColor).toBe('$successSoft');
    expect(spec.pressBackgroundColor).toBe('$successSoft');
    expect(spec.color).toBe('$success');
    expect(spec.borderWidth).toBe(0);
    expect(spec.intent).toBe('control');
  });

  it('ghost carries no fill and no border, and presses like a ghost', () => {
    const spec = buttonSpec({ variant: 'ghost', tone: 'neutral', size: 'md' });
    expect(spec.backgroundColor).toBe('transparent');
    expect(spec.pressBackgroundColor).toBe('$backgroundPress');
    expect(spec.color).toBe('$color');
    expect(spec.borderWidth).toBe(0);
    expect(spec.borderColor).toBe('transparent');
    expect(spec.intent).toBe('ghost');
  });
});

describe('buttonSpec — tones', () => {
  it('neutral fills from the surface tokens', () => {
    const spec = buttonSpec({ variant: 'solid', tone: 'neutral', size: 'md' });
    expect(spec.backgroundColor).toBe('$surface');
    expect(spec.pressBackgroundColor).toBe('$backgroundPress');
    expect(spec.color).toBe('$color');
  });

  it('danger and success fill from their own tokens', () => {
    expect(buttonSpec({ variant: 'solid', tone: 'danger', size: 'md' }).backgroundColor).toBe(
      '$danger'
    );
    expect(buttonSpec({ variant: 'solid', tone: 'success', size: 'md' }).backgroundColor).toBe(
      '$success'
    );
  });
});

describe('buttonSpec — states', () => {
  it('is interactive, full-opacity and hugging by default', () => {
    const spec = buttonSpec(base);
    expect(spec.interactive).toBe(true);
    expect(spec.opacity).toBe(1);
    expect(spec.width).toBeUndefined();
  });

  it('spreads the size dimensions into the spec', () => {
    const spec = buttonSpec({ ...base, size: 'lg' });
    expect(spec.height).toBe(BUTTON_SIZES.lg.height);
    expect(spec.paddingHorizontal).toBe(BUTTON_SIZES.lg.paddingHorizontal);
    expect(spec.fontSize).toBe(BUTTON_SIZES.lg.fontSize);
    expect(spec.iconSize).toBe(BUTTON_SIZES.lg.iconSize);
    expect(spec.gap).toBe(BUTTON_SIZES.lg.gap);
    expect(spec.borderRadius).toBe(BUTTON_SIZES.lg.borderRadius);
  });

  it('recedes and stops answering presses when disabled', () => {
    const spec = buttonSpec({ ...base, disabled: true });
    expect(spec.opacity).toBe(DISABLED_OPACITY);
    expect(spec.interactive).toBe(false);
  });

  it('keeps its colour while loading — it is still the thing just pressed', () => {
    const spec = buttonSpec({ ...base, loading: true });
    expect(spec.opacity).toBe(1);
    expect(spec.interactive).toBe(false);
  });

  it('stretches when fullWidth', () => {
    expect(buttonSpec({ ...base, fullWidth: true }).width).toBe('100%');
  });
});
