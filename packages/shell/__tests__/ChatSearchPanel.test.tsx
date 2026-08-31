/**
 * Searching a thread — every filter is the server's own, so a hit outside
 * the loaded page can still say "found, but scroll up first" instead of
 * quietly doing nothing when it is clicked.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ChatSearchPanel from '../src/staff-chat/ChatSearchPanel';
import { SEARCH_STAFF_MESSAGES, type StaffMessage } from '../src/staff-chat/queries';
import type { ChatFormats } from '../src/staff-chat/useChatSettings';

const testTheme = createTheme();
const ME = 'u-me';
const PEER = 'u-peer';

const formats: ChatFormats = {
  time: { format: (value: Date) => `T:${value.toISOString().slice(11, 16)}` },
  full: { format: (value: Date) => `F:${value.toISOString()}` },
  day: { format: (value: Date) => `D:${value.toISOString().slice(0, 10)}` },
};

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const message = (over: Partial<StaffMessage> & { id: string }): StaffMessage => ({
  from_user_id: PEER,
  to_user_id: ME,
  text: '',
  created_at: '2026-08-20T09:30:00.000Z',
  attachment_url: null,
  attachment_name: null,
  attachment_type: null,
  attachment_size: null,
  attachment_peaks: null,
  read_at: null,
  edited_at: null,
  deleted_at: null,
  reactions: [],
  delivered_at: null,
  reply_to_id: null,
  forwarded_from: null,
  pinned_at: null,
  pinned_by: null,
  mentions: [],
  ...over,
} as StaffMessage);

const panel = (mocks: readonly MockedResponse[], over: Partial<Parameters<typeof ChatSearchPanel>[0]> = {}) => {
  const spies = { onJump: vi.fn(), onClose: vi.fn() };
  const result = render(
    <MockedProvider mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ChatSearchPanel
            peerId={PEER}
            meId={ME}
            peerName="Vikram N"
            formats={formats}
            loadedIds={new Set(['m-loaded'])}
            {...spies}
            {...over}
          />
        </LocalizationProvider>
      </ThemeProvider>
    </MockedProvider>
  );
  return { ...result, spies };
};

const searchMock = (variables: () => void, results: StaffMessage[]): MockedResponse =>
  ({
    request: { query: SEARCH_STAFF_MESSAGES, variables: (vars: unknown) => {
      variables();
      Object.assign(lastVariables, vars as Record<string, unknown>);
      return true;
    } },
    result: { data: { searchStaffMessages: results } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  }) as MockedResponse;

let lastVariables: Record<string, unknown> = {};

describe('ChatSearchPanel', () => {
  it('runs a search on Enter, not on every keystroke', async () => {
    const ran = vi.fn();
    const { container } = panel([searchMock(ran, [])]);
    const field = container.querySelector('input') as HTMLInputElement;

    fireEvent.change(field, { target: { value: 'court' } });
    expect(ran).not.toHaveBeenCalled();

    fireEvent.keyDown(field, { key: 'Enter' });
    await settle();

    expect(ran).toHaveBeenCalledTimes(1);
  });

  it('runs a search from its own button, sending nobody as the sender by default', async () => {
    lastVariables = {};
    const { container } = panel([searchMock(vi.fn(), [])]);
    const field = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'roster' } });

    fireEvent.click(container.querySelector('[aria-label="Run the search"]') as HTMLElement);
    await settle();

    expect(lastVariables.peerId).toBe(PEER);
    expect((lastVariables.filter as Record<string, unknown>).from_user_id).toBeNull();
    expect((lastVariables.filter as Record<string, unknown>).text).toBe('roster');
  });

  it('narrows to messages from me or from the other person, one at a time', async () => {
    lastVariables = {};
    const { container } = panel([searchMock(vi.fn(), [])]);
    const chips = [...container.querySelectorAll('.MuiChip-root')];
    const fromMe = chips.find((c) => c.textContent === 'From you') as HTMLElement;
    const fromThem = chips.find((c) => c.textContent === 'From Vikram N') as HTMLElement;

    fireEvent.click(fromMe);
    fireEvent.keyDown(container.querySelector('input') as HTMLElement, { key: 'Enter' });
    await settle();
    expect((lastVariables.filter as Record<string, unknown>).from_user_id).toBe(ME);
    expect(fromMe.className).toContain('MuiChip-colorPrimary');

    fireEvent.click(fromThem);
    fireEvent.keyDown(container.querySelector('input') as HTMLElement, { key: 'Enter' });
    await settle();
    expect((lastVariables.filter as Record<string, unknown>).from_user_id).toBe(PEER);
    expect(fromThem.className).toContain('MuiChip-colorPrimary');
    expect(fromMe.className).not.toContain('MuiChip-colorPrimary');

    const anyone = chips.find((c) => c.textContent === 'Anyone') as HTMLElement;
    fireEvent.click(anyone);
    fireEvent.keyDown(container.querySelector('input') as HTMLElement, { key: 'Enter' });
    await settle();
    expect((lastVariables.filter as Record<string, unknown>).from_user_id).toBeNull();
    expect(anyone.className).toContain('MuiChip-colorPrimary');
  });

  it('toggles the files-only and links-only filters independently', async () => {
    lastVariables = {};
    const { container } = panel([searchMock(vi.fn(), [])]);
    const chips = [...container.querySelectorAll('.MuiChip-root')];
    const filesChip = chips.find((c) => c.textContent === 'Files') as HTMLElement;
    const linksChip = chips.find((c) => c.textContent === 'Links') as HTMLElement;

    fireEvent.click(filesChip);
    fireEvent.click(linksChip);
    fireEvent.keyDown(container.querySelector('input') as HTMLElement, { key: 'Enter' });
    await settle();

    expect((lastVariables.filter as Record<string, unknown>).only_files).toBe(true);
    expect((lastVariables.filter as Record<string, unknown>).only_links).toBe(true);
    expect(filesChip.className).toContain('MuiChip-colorPrimary');
    expect(linksChip.className).toContain('MuiChip-colorPrimary');

    fireEvent.click(filesChip);
    fireEvent.keyDown(container.querySelector('input') as HTMLElement, { key: 'Enter' });
    await settle();
    expect((lastVariables.filter as Record<string, unknown>).only_files).toBe(false);
  });

  it('sends the end of the chosen day for "before", so that day is included', async () => {
    lastVariables = {};
    const { container } = panel([searchMock(vi.fn(), [])]);
    const allInputs = container.querySelectorAll('input');
    const after = allInputs[1] as HTMLInputElement;
    const before = allInputs[2] as HTMLInputElement;

    fireEvent.change(after, { target: { value: '08/01/2026' } });
    fireEvent.change(before, { target: { value: '08/20/2026' } });
    fireEvent.keyDown(allInputs[0], { key: 'Enter' });
    await settle();

    expect(lastVariables.filter).toBeTruthy();
    const filter = lastVariables.filter as Record<string, string>;
    // Checked as local wall-clock values, not the raw ISO string, since the
    // UTC offset it lands on otherwise depends on the machine's own time zone.
    expect(new Date(filter.after).getDate()).toBe(1);
    const untilEndOfDay = new Date(filter.before);
    expect(untilEndOfDay.getDate()).toBe(20);
    expect(untilEndOfDay.getHours()).toBe(23);
    expect(untilEndOfDay.getMinutes()).toBe(59);
    expect(untilEndOfDay.getSeconds()).toBe(59);
  });

  it('says nothing was found, once a search has actually run', async () => {
    const { container } = panel([searchMock(vi.fn(), [])]);
    fireEvent.keyDown(container.querySelector('input') as HTMLElement, { key: 'Enter' });
    await settle();

    expect(container.textContent).toContain('Nothing matched.');
  });

  it('names who said it — the reader, or the other person by name', async () => {
    const results = [
      message({ id: 'm-mine', from_user_id: ME, text: 'sent by me' }),
      message({ id: 'm-theirs', from_user_id: PEER, text: 'sent by them' }),
    ];
    const { container } = panel([searchMock(vi.fn(), results)]);
    fireEvent.keyDown(container.querySelector('input') as HTMLElement, { key: 'Enter' });
    await settle();

    expect(container.textContent).toContain('You');
    expect(container.textContent).toContain('Vikram N');
  });

  it('closes the panel through its own close button', () => {
    const { container, spies } = panel([]);

    fireEvent.click(container.querySelector('[aria-label="Close search"]') as HTMLElement);

    expect(spies.onClose).toHaveBeenCalledTimes(1);
  });
});
