import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revealFirstInvalid } from '../../src/shared/revealFirstInvalid';

/**
 * Save on a tall console editor must take the admin to what stopped it — in the
 * order they read the page, and including composite fields RHF cannot focus.
 */
const scroll = vi.fn();

beforeEach(() => {
  Element.prototype.scrollIntoView = scroll;
});

afterEach(() => {
  scroll.mockReset();
  document.body.innerHTML = '';
});

function mount(html: string) {
  document.body.innerHTML = `<form>${html}</form>`;
  return document.querySelector('form');
}

describe('revealFirstInvalid', () => {
  it('answers false and does nothing when no field is in error', () => {
    expect(revealFirstInvalid(mount('<input id="venue-name" />'))).toBe(false);
    expect(revealFirstInvalid(null)).toBe(false);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('reveals the first errored MUI field in DOM order and focuses its input', () => {
    const form = mount(`
      <div class="MuiFormControl-root"><input id="venue-name" /></div>
      <div class="MuiFormControl-root" id="owner">
        <label class="Mui-error">Owner account</label>
        <input id="owner-input" role="combobox" aria-invalid="true" />
      </div>
      <div class="MuiFormControl-root"><input id="pincode" aria-invalid="true" /></div>
    `);
    expect(revealFirstInvalid(form)).toBe(true);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.contexts[0]).toBe(document.getElementById('owner'));
    expect(document.activeElement?.id).toBe('owner-input');
  });

  it('focuses a bare invalid input that sits outside any form control', () => {
    const form = mount('<input id="capacity" aria-invalid="true" />');
    expect(revealFirstInvalid(form)).toBe(true);
    expect(document.activeElement?.id).toBe('capacity');
  });

  it('still scrolls to an errored block that has nothing to focus', () => {
    const form = mount('<p class="Mui-error" id="tiers">Two bands share a window</p>');
    expect(revealFirstInvalid(form)).toBe(true);
    expect(scroll.mock.contexts[0]).toBe(document.getElementById('tiers'));
  });
});
