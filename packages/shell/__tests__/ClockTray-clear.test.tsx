/**
 * The zone picker is `disableClearable`, so no UI path ever offers the user a
 * way to clear it — but the real Autocomplete component can still call back
 * with `next: null` (e.g. a freeSolo-style reset), and the handler falls back
 * to "follow the workspace" rather than saving a hole. Covering that fallback
 * means capturing the callback directly, since no click/keyboard sequence in
 * the real widget clears a `disableClearable` field.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

import { ClockTray } from '../src/workspace/ClockTray';

let capturedOnChange: ((event: unknown, next: string | null) => void) | undefined;

vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>();
  return {
    ...actual,
    Autocomplete: (props: { onChange: (event: unknown, next: string | null) => void }): ReactElement | null => {
      capturedOnChange = props.onChange;
      return null;
    },
  };
});

const workspaceState = vi.hoisted(() => ({
  value: null as null | {
    clockZone: string;
    clockSeconds: boolean;
    setClockZone: ReturnType<typeof vi.fn>;
    setClockSeconds: ReturnType<typeof vi.fn>;
  },
}));
vi.mock('../src/workspace/context', () => ({
  useWorkspace: () => workspaceState.value,
}));

vi.mock('../src/i18n/useLocalePreference', () => ({
  useLocalePreference: () => ({
    locale: 'en',
    locales: [{ code: 'en', label: 'English' }],
    change: vi.fn(),
    saved: false,
    error: null,
  }),
}));

describe('ClockTray zone clearing', () => {
  it('falls back to following the workspace when the picker calls back with nothing chosen', () => {
    const setClockZone = vi.fn();
    workspaceState.value = {
      clockZone: 'Asia/Kolkata',
      clockSeconds: false,
      setClockZone,
      setClockSeconds: vi.fn(),
    };
    render(<ClockTray full="28 Aug 2026, 12:00" zone="Asia/Kolkata" />);

    capturedOnChange?.({}, null);

    expect(setClockZone).toHaveBeenCalledWith('');
  });
});
