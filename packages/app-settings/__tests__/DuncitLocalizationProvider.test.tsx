// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import {
  ambientDateFormat,
  ambientDateFormatter,
  ambientTimeFormat,
  setAmbientDateSettings,
} from '@duncit/datetime';
import type {} from '@mui/x-date-pickers/themeAugmentation';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: useQueryMock,
}));

// Import AFTER the mock is registered.
const { DuncitLocalizationProvider } = await import('../src/DuncitLocalizationProvider');

type Settings = { date_format?: string; time_format?: string; time_zone?: string };

const withSettings = (settings?: Settings) => {
  useQueryMock.mockReturnValue({ data: settings ? { publicAppSettings: settings } : undefined });
};

/** Reads the clock-cycle defaults the provider layered onto the outer theme. */
function ThemeProbe() {
  const theme = useTheme();
  const ampm = theme.components?.MuiTimePicker?.defaultProps?.ampm;
  const dateTimeAmpm = theme.components?.MuiDateTimePicker?.defaultProps?.ampm;
  return (
    <div>
      <span data-testid="ampm">{String(ampm)}</span>
      <span data-testid="datetime-ampm">{String(dateTimeAmpm)}</span>
      <span data-testid="child">rendered</span>
    </div>
  );
}

const outerTheme = createTheme();

const renderProvider = (props?: { timeZoneAware?: boolean }) =>
  render(
    <ThemeProvider theme={outerTheme}>
      <DuncitLocalizationProvider timeZoneAware={props?.timeZoneAware}>
        <ThemeProbe />
      </DuncitLocalizationProvider>
    </ThemeProvider>,
  );

const text = (id: string) => screen.getByTestId(id).textContent;

beforeEach(() => {
  useQueryMock.mockReset();
  withSettings();
});

afterEach(() => {
  cleanup();
  // The provider publishes into @duncit/datetime's module-level cell; put the
  // shared fallbacks back so tests cannot leak settings into each other.
  setAmbientDateSettings({});
});

describe('DuncitLocalizationProvider', () => {
  it('renders its children and defaults the pickers to a 12h clock face', () => {
    renderProvider();
    expect(text('child')).toBe('rendered');
    // Fallback time pattern is 'hh:mm a', an AM/PM clock.
    expect(text('ampm')).toBe('true');
    expect(text('datetime-ampm')).toBe('true');
  });

  it('switches every picker to a 24h clock when the admin pattern is HH:mm', () => {
    withSettings({ date_format: 'yyyy/MM/dd', time_format: 'HH:mm', time_zone: 'Asia/Kolkata' });
    renderProvider();
    expect(text('ampm')).toBe('false');
    expect(text('datetime-ampm')).toBe('false');
  });

  it('publishes the admin patterns for callers outside the component tree', () => {
    withSettings({ date_format: 'yyyy/MM/dd', time_format: 'HH:mm', time_zone: 'Asia/Kolkata' });
    renderProvider();
    expect(ambientDateFormat()).toBe('yyyy/MM/dd');
    expect(ambientTimeFormat()).toBe('HH:mm');
  });

  it('publishes a zone-aware ambient formatter when timeZoneAware is set', () => {
    withSettings({ date_format: 'yyyy-MM-dd', time_format: 'HH:mm', time_zone: 'Asia/Kolkata' });
    renderProvider({ timeZoneAware: true });
    // 12:00 UTC is 17:30 IST; only a zone-aware formatter says so.
    expect(ambientDateFormatter().formatTime('2024-01-15T12:00:00Z')).toBe('17:30');
  });
});
