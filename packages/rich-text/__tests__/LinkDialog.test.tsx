/**
 * The link dialog: what it lets through, what it refuses, and how it hands the
 * result back. A link is the one place authored copy can point OUT of Duncit,
 * so the protocol allow-list (http, https, mailto, tel) is the whole contract —
 * `javascript:` never reaches the editor.
 */
import { describe, expect, it, vi } from 'vitest';

import { LinkDialog } from '../src/LinkDialog';
import { buttonWithText, click, dialog, dialogInput, keyDown, mount, setInputValue } from './harness';

const open = (currentUrl: string, onApply = vi.fn(), onClose = vi.fn()) => ({
  onApply,
  onClose,
  ui: <LinkDialog currentUrl={currentUrl} open onApply={onApply} onClose={onClose} />,
});

describe('LinkDialog', () => {
  it('applies the link already on the selection from the Apply button', async () => {
    const { ui, onApply } = open('https://duncit.com');
    await mount(ui);

    await click(buttonWithText(document.body, 'Apply link'));

    expect(onApply).toHaveBeenCalledWith('https://duncit.com');
  });

  it('applies a trimmed URL on Enter', async () => {
    const { ui, onApply } = open('');
    await mount(ui);

    await setInputValue(dialogInput(), '  https://duncit.com/pods/DUN-POD-4821  ');
    await keyDown(dialogInput(), 'Enter');

    expect(onApply).toHaveBeenCalledWith('https://duncit.com/pods/DUN-POD-4821');
  });

  it('accepts mailto and tel links, which are how a host is reached', async () => {
    const { ui, onApply } = open('');
    await mount(ui);

    await setInputValue(dialogInput(), 'mailto:hello@duncit.com');
    await keyDown(dialogInput(), 'Enter');
    await setInputValue(dialogInput(), 'tel:+919999999999');
    await keyDown(dialogInput(), 'Enter');

    expect(onApply.mock.calls).toEqual([['mailto:hello@duncit.com'], ['tel:+919999999999']]);
  });

  it('refuses a URL outside the allow-list and marks the field once submitted', async () => {
    const { ui, onApply } = open('');
    await mount(ui);

    await setInputValue(dialogInput(), 'javascript:alert(1)');
    expect(dialogInput().getAttribute('aria-invalid')).toBe('false');

    await click(buttonWithText(document.body, 'Apply link'));

    expect(onApply).not.toHaveBeenCalled();
    expect(dialogInput().getAttribute('aria-invalid')).toBe('true');
  });

  it('refuses text that is not a URL at all', async () => {
    const { ui, onApply } = open('');
    await mount(ui);

    await setInputValue(dialogInput(), 'court 2');
    await keyDown(dialogInput(), 'Enter');

    expect(onApply).not.toHaveBeenCalled();
    expect(dialogInput().getAttribute('aria-invalid')).toBe('true');
  });

  it('only submits on Enter — other keys just edit the field', async () => {
    const { ui, onApply } = open('https://duncit.com');
    await mount(ui);

    await keyDown(dialogInput(), 'Tab');

    expect(onApply).not.toHaveBeenCalled();
  });

  it('hands Cancel back to the caller', async () => {
    const { ui, onClose } = open('https://duncit.com');
    await mount(ui);

    await click(buttonWithText(document.body, 'Cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialog()).not.toBeNull();
  });
});
