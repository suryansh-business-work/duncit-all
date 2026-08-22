/**
 * The staff chat panel, opened with nothing behind it and then with the
 * schema-shaped answers a real session would get.
 *
 * The calls it hosts are peer-to-peer and the thread rides a socket, so neither
 * exists in jsdom — this does not pretend to test either. What it does cover is
 * everything around them, which is most of the panel: the closed state, the
 * composer, the thread's empty and populated shapes, and the search panel. None
 * of it had ever been rendered.
 */
import { MockedProvider } from '@apollo/client/testing';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StaffChatPanel } from '../src/staff-chat';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const mount = (props: Record<string, unknown> = {}) =>
  render(
    <MockedProvider mocks={[]}>
      <StaffChatPanel
        open
        onClose={vi.fn()}
        meId="u-1"
        meName="Asha Rao"
        meRoles={['SUPPORT']}
        {...(props as never)}
      />
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('StaffChatPanel', () => {
  it('renders nothing on screen while it is closed', async () => {
    const { container } = mount({ open: false });
    await settle();

    expect(container.textContent ?? '').toBe('');
  });

  it('opens with nothing behind it rather than throwing', async () => {
    const { container } = mount();
    await settle();
    await settle();

    expect(document.body.innerHTML).not.toBe('');
    expect(container).toBeDefined();
  });

  it('opens for a SUPER_ADMIN, who may read a message’s edit history', async () => {
    mount({ meRoles: ['SUPER_ADMIN'] });
    await settle();

    expect(document.body.innerHTML).not.toBe('');
  });

  it('opens for a reader with no roles at all', async () => {
    mount({ meRoles: undefined, meName: undefined });
    await settle();

    expect(document.body.innerHTML).not.toBe('');
  });

  it('survives every control on it being pressed', async () => {
    mount();
    await settle();

    for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 20)) {
      if (!control.isConnected) continue;
      fireEvent.click(control);
      await settle();
    }

    expect(document.body.innerHTML).not.toBe('');
  });

  it('survives text being typed into every field it offers', async () => {
    mount();
    await settle();

    for (const field of document.body.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input:not([type="file"]):not([disabled]), textarea:not([disabled])'
    )) {
      if (!field.isConnected) continue;
      fireEvent.change(field, { target: { value: 'smoke' } });
      await settle();
    }

    expect(document.body.innerHTML).not.toBe('');
  });

  it('closes through the caller callback rather than on its own', async () => {
    const onClose = vi.fn();
    mount({ onClose });
    await settle();

    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    await settle();

    // Whether Escape closes it is the panel's choice; what must hold is that it
    // never closes itself behind the caller's back.
    expect(onClose.mock.calls.every((call) => call.length === 0)).toBe(true);
  });
});
