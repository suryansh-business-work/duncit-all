// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { setCalculatorNote } from '../../src/widgets/calculator-note';
import { WIDGET_LOADERS } from '../../src/widgets/index';

describe('setCalculatorNote', () => {
  it('writes the standard note in the soft colour', () => {
    const note = document.createElement('p');
    setCalculatorNote(note, 'Estimate only', false);
    expect(note.textContent).toBe('Estimate only');
    expect(note.className).toBe('mt-5 text-xs text-ink-soft');
  });

  it('draws a warning in the accent colour', () => {
    const note = document.createElement('p');
    setCalculatorNote(note, 'Capped', true);
    expect(note.className).toBe('mt-5 text-xs font-semibold text-primary-dark');
  });

  it('is a no-op without a note element', () => {
    expect(() => setCalculatorNote(null, 'x', true)).not.toThrow();
  });
});

describe('WIDGET_LOADERS', () => {
  it('registers every widget by its data-cms-widget name', () => {
    expect(Object.keys(WIDGET_LOADERS).sort()).toEqual(
      [
        'campaign-calculator',
        'careers-apply',
        'contact-form',
        'earnings-calculator',
        'faq',
        'grievance-form',
        'help-center',
        'policy-list',
        'policy-reader',
        'site-header',
        'site-nav',
      ].sort()
    );
  });

  it('loads a module exposing mount for every widget', async () => {
    for (const name of Object.keys(WIDGET_LOADERS)) {
      const widget = await WIDGET_LOADERS[name]();
      expect(typeof widget.mount).toBe('function');
    }
  });
});
