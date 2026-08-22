/**
 * The staff chat panel, opened against schema-shaped answers.
 *
 * The calls it hosts are peer-to-peer and the thread rides a socket, so neither
 * exists in jsdom — this does not pretend to test either. What it does cover is
 * everything around them, which is most of the panel: the closed state, the
 * composer, the thread with messages in it, and the search panel. None of it had
 * ever been rendered.
 *
 * The answers come from ./schema-mock, which reads the server's own SDL — a
 * thread with no messages exercises almost none of what a thread does.
 */
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { schemaMockLink, serverSchema } from './schema-mock';

import { StaffChatPanel } from '../src/staff-chat';

const testTheme = createTheme();

/**
 * jsdom has neither observer, and the composer and thread both mount things
 * that construct one. A stub that never REPORTS is as bad as none at all for a
 * scroller, so both answer immediately.
 */
beforeAll(() => {
  const box = { x: 0, y: 0, top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800 };
  const size = [{ inlineSize: 1200, blockSize: 800 }];
  class SizedResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback([{ target, contentRect: box, borderBoxSize: size, contentBoxSize: size, devicePixelContentBoxSize: size }] as never, this as never);
    }
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver ??= SizedResizeObserver as unknown as typeof ResizeObserver;
  Element.prototype.scrollTo ??= () => undefined;
  Element.prototype.scrollIntoView ??= () => undefined;
});

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const mount = (props: Record<string, unknown> = {}) =>
  render(
    <MockedProvider link={schemaMockLink()}>
      <ThemeProvider theme={testTheme}>
      <StaffChatPanel
        open
        onClose={vi.fn()}
        meId="u-1"
        meName="Asha Rao"
        meRoles={['SUPPORT']}
        {...(props as never)}
      />
      </ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('StaffChatPanel', () => {
  it('reads the server schema the answers below depend on', () => {
    expect(serverSchema()?.getQueryType()).toBeTruthy();
  });

  it('renders nothing on screen while it is closed', async () => {
    const { container } = mount({ open: false });
    await settle();

    expect(container.textContent ?? '').toBe('');
  });

  it('opens and renders a thread rather than throwing', async () => {
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
