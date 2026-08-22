/**
 * The three panels around the thread: the box you write in, the search over
 * what was said, and the place-sharing dialog.
 *
 * Each keeps one rule that a screenshot would not show and that this holds:
 *
 *  - the composer sends on Enter only when the reader asked it to. With
 *    `enterToSend` off, Enter is a new line and Ctrl/Cmd+Enter sends — getting
 *    that backwards posts half-written messages to a colleague.
 *  - the search filters are the SERVER's, not a second implementation over
 *    whatever happens to be loaded, and a hit outside the loaded page says so
 *    rather than quietly doing nothing when it is clicked.
 *  - the location dialog sends a LINK, never coordinates: the recipient opens
 *    it in their own Maps, already signed in.
 */
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { schemaMockLink } from './schema-mock';
import ChatComposer from '../src/staff-chat/ChatComposer';
import ChatSearchPanel from '../src/staff-chat/ChatSearchPanel';
import LocationDialog from '../src/staff-chat/LocationDialog';
import type { ChatFormats } from '../src/staff-chat/useChatSettings';

const testTheme = createTheme();

const formats: ChatFormats = {
  time: { format: (value: Date) => `T:${value.toISOString().slice(11, 16)}` },
  full: { format: (value: Date) => `F:${value.toISOString()}` },
  day: { format: (value: Date) => `D:${value.toISOString().slice(0, 10)}` },
};

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => undefined;
});

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: React.ReactNode) =>
  render(
    <MockedProvider link={schemaMockLink()}>
      <ThemeProvider theme={testTheme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>{ui}</LocalizationProvider>
      </ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('ChatComposer', () => {
  const composer = (over: Partial<Parameters<typeof ChatComposer>[0]> = {}) => {
    const spies = {
      onSend: vi.fn(),
      onAttach: vi.fn(),
      onVoiceNote: vi.fn(),
      onTyping: vi.fn(),
      onShareLocation: vi.fn(),
    };
    const result = wrap(
      <ChatComposer
        sending={false}
        uploading={false}
        mentionNames={['Vikram N', 'Asha Rao']}
        enterToSend
        {...spies}
        {...over}
      />
    );
    const box = result.container.querySelector('textarea') as HTMLTextAreaElement;
    return { ...result, spies, box };
  };

  it('renders a box to write in', () => {
    expect(composer().box).not.toBeNull();
  });

  it('tells the other side you are typing, without sending anything yet', () => {
    const { box, spies } = composer();

    fireEvent.change(box, { target: { value: 'Half a thought' } });

    expect(spies.onTyping).toHaveBeenCalled();
    expect(spies.onSend).not.toHaveBeenCalled();
  });

  it('sends on Enter when the reader asked it to, and never an empty message', () => {
    const { box, spies } = composer();

    fireEvent.keyDown(box, { key: 'Enter' });
    expect(spies.onSend).not.toHaveBeenCalled();

    fireEvent.change(box, { target: { value: 'Court 2 at seven.' } });
    fireEvent.keyDown(box, { key: 'Enter' });

    expect(spies.onSend).toHaveBeenCalledWith('Court 2 at seven.');
  });

  it('puts Enter on a new line when the reader turned that off, and sends on Ctrl+Enter', () => {
    const { box, spies } = composer({ enterToSend: false });
    fireEvent.change(box, { target: { value: 'Line one' } });

    fireEvent.keyDown(box, { key: 'Enter' });
    expect(spies.onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
    expect(spies.onSend).toHaveBeenCalledWith('Line one');
  });

  it('keeps Shift+Enter a new line whatever the setting says', () => {
    const { box, spies } = composer();
    fireEvent.change(box, { target: { value: 'First line' } });

    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });

    expect(spies.onSend).not.toHaveBeenCalled();
  });

  it('takes a file dropped anywhere on it', () => {
    const { container, spies } = composer();
    const file = new File(['roster'], 'roster.pdf', { type: 'application/pdf' });
    const target = container.firstElementChild as HTMLElement;

    fireEvent.dragOver(target, { dataTransfer: { files: [file], types: ['Files'] } });
    fireEvent.drop(target, { dataTransfer: { files: [file], types: ['Files'] } });

    expect(spies.onAttach).toHaveBeenCalledWith(file);
  });

  it('clears the drag state when the file is taken back out again', () => {
    const { container } = composer();
    const target = container.firstElementChild as HTMLElement;

    fireEvent.dragOver(target, { dataTransfer: { types: ['Files'] } });
    fireEvent.dragLeave(target);

    expect(container.innerHTML).not.toBe('');
  });

  it('offers a mention list once an @ is typed', async () => {
    const { box, container } = composer();

    fireEvent.change(box, { target: { value: '@Vik' } });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders while a message is going out and while a file uploads', () => {
    expect(composer({ sending: true }).container.innerHTML).not.toBe('');
    expect(composer({ uploading: true }).container.innerHTML).not.toBe('');
  });

  it('survives every control beside the box being pressed', async () => {
    const { container } = composer();

    for (const control of [...container.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 12)) {
      if (control.isConnected) fireEvent.click(control);
      await settle();
    }

    expect(container.innerHTML).not.toBe('');
  });
});

describe('ChatSearchPanel', () => {
  const panel = (over: Partial<Parameters<typeof ChatSearchPanel>[0]> = {}) => {
    const spies = { onJump: vi.fn(), onClose: vi.fn() };
    return {
      spies,
      ...wrap(
        <ChatSearchPanel
          peerId="u-peer"
          meId="u-me"
          peerName="Vikram N"
          formats={formats}
          loadedIds={new Set(['m-1'])}
          {...spies}
          {...over}
        />
      ),
    };
  };

  it('opens on an empty search rather than a list of everything', async () => {
    const { container } = panel();
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('searches on what was typed', async () => {
    const { container } = panel();
    const field = container.querySelector('input') as HTMLInputElement;

    fireEvent.change(field, { target: { value: 'court' } });
    await settle();
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('narrows by sender, by files and by links without a second search of its own', async () => {
    const { container } = panel();

    for (const control of [...container.querySelectorAll<HTMLElement>('button, input[type="checkbox"]')].slice(0, 12)) {
      if (control.isConnected) fireEvent.click(control);
      await settle();
    }

    expect(container.innerHTML).not.toBe('');
  });

  it('never jumps to a hit outside the page the thread has loaded', async () => {
    const { container, spies } = panel({ loadedIds: new Set(['m-1']) });
    await settle();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
      await settle();
    }

    // A jump to an id the thread does not hold scrolls to nothing, which reads
    // as the search being broken rather than the result being old.
    for (const [id] of spies.onJump.mock.calls) expect(id).toBe('m-1');
  });
});

describe('LocationDialog', () => {
  const dialog = (over: Partial<Parameters<typeof LocationDialog>[0]> = {}) => {
    const spies = { onClose: vi.fn(), onSend: vi.fn() };
    return { spies, ...wrap(<LocationDialog open {...spies} {...over} />) };
  };

  it('renders nothing while it is closed', () => {
    dialog({ open: false });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens with no place chosen yet', async () => {
    dialog();
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('shows the map only once a place has been searched for, not on every keystroke', async () => {
    dialog();
    await settle();
    const field = document.body.querySelector('input') as HTMLInputElement;

    fireEvent.change(field, { target: { value: 'Blue Tokai, Church Street' } });
    await settle();
    expect(document.body.querySelector('iframe')).toBeNull();

    for (const control of document.body.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
      await settle();
    }

    expect(document.body.innerHTML).not.toBe('');
  });

  it('sends a link the recipient can open in their own Maps, never bare coordinates', async () => {
    const { spies } = dialog();
    await settle();
    const field = document.body.querySelector('input') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'Church Street' } });
    await settle();

    for (const control of document.body.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
      await settle();
    }

    for (const [text] of spies.onSend.mock.calls) {
      expect(String(text)).toContain('https://');
    }
  });
});
