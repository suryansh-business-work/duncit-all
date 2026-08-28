/**
 * What the taskbar clock opens: the zone picker (built from whatever the
 * browser itself enumerates, never a curated list), the seconds switch and
 * the console's language.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ClockTray } from '../src/workspace/ClockTray';

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

const localeState = vi.hoisted(() => ({
  locale: 'en',
  locales: [{ code: 'en', label: 'English' }],
  change: vi.fn(),
  saved: false,
  error: null as string | null,
}));
vi.mock('../src/i18n/useLocalePreference', () => ({
  useLocalePreference: () => localeState,
}));

const deviceZone = vi.hoisted(() => ({ value: 'Not/ARealZone' as string }));
vi.mock('../src/workspace/clock', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/workspace/clock')>()),
  deviceTimeZone: () => deviceZone.value,
}));

describe('ClockTray', () => {
  it('reads the workspace zone and seconds setting when one is provided', () => {
    workspaceState.value = {
      clockZone: 'Asia/Kolkata',
      clockSeconds: true,
      setClockZone: vi.fn(),
      setClockSeconds: vi.fn(),
    };
    const { container } = render(<ClockTray full="28 Aug 2026, 12:00" zone="Asia/Kolkata" />);

    expect((container.querySelector('input') as HTMLInputElement).value).toContain('Asia/Kolkata');
    expect(container.querySelector('input[type="checkbox"]')).toBeChecked();
  });

  it('falls back to following the workspace and to seconds off with no workspace at all', () => {
    workspaceState.value = null;
    const { container } = render(<ClockTray full="28 Aug 2026, 12:00" zone="UTC" />);

    expect((container.querySelector('input') as HTMLInputElement).value).toContain('UTC');
    expect(container.querySelector('input[type="checkbox"]')).not.toBeChecked();
  });

  it('does nothing risky when the seconds switch is used with no workspace to save to', () => {
    workspaceState.value = null;
    const { container } = render(<ClockTray full="28 Aug 2026, 12:00" zone="UTC" />);

    expect(() => {
      fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLElement);
    }).not.toThrow();
  });

  it('saves a chosen seconds setting when a workspace is there to save it to', () => {
    const setClockSeconds = vi.fn();
    workspaceState.value = {
      clockZone: '',
      clockSeconds: false,
      setClockZone: vi.fn(),
      setClockSeconds,
    };
    const { container } = render(<ClockTray full="28 Aug 2026, 12:00" zone="UTC" />);

    fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLElement);

    expect(setClockSeconds).toHaveBeenCalledWith(true);
  });

  it('pins the device zone to the top when the engine did not enumerate it itself', () => {
    workspaceState.value = null;
    const { container } = render(<ClockTray full="28 Aug 2026, 12:00" zone="UTC" />);

    fireEvent.mouseDown(container.querySelector('input') as HTMLElement);

    expect(document.body.textContent).toContain('This device');
  });

  it('offers no device row of its own on an engine that cannot say what the device zone is', () => {
    deviceZone.value = '';
    workspaceState.value = null;
    try {
      const { container } = render(<ClockTray full="28 Aug 2026, 12:00" zone="UTC" />);
      fireEvent.mouseDown(container.querySelector('input') as HTMLElement);

      expect(document.body.textContent).not.toContain('This device');
    } finally {
      deviceZone.value = 'Not/ARealZone';
    }
  });

  it('picks a zone from the list, saving it to the workspace', () => {
    const setClockZone = vi.fn();
    workspaceState.value = {
      clockZone: '',
      clockSeconds: false,
      setClockZone,
      setClockSeconds: vi.fn(),
    };
    const { container } = render(<ClockTray full="28 Aug 2026, 12:00" zone="UTC" />);

    fireEvent.mouseDown(container.querySelector('input') as HTMLElement);
    const option = document.body.querySelectorAll('[role="option"]')[1] as HTMLElement;
    fireEvent.click(option);

    expect(setClockZone).toHaveBeenCalledTimes(1);
  });

  it('shows the saved and the failed banners for a language change', () => {
    localeState.saved = true;
    localeState.error = null;
    const saved = render(<ClockTray full="28 Aug 2026, 12:00" zone="UTC" />);
    expect(saved.container.textContent).toContain('Language updated');

    localeState.saved = false;
    localeState.error = 'Could not save your language';
    const failed = render(<ClockTray full="28 Aug 2026, 12:00" zone="UTC" />);
    expect(failed.container.textContent).toContain('Could not save your language');
  });
});
