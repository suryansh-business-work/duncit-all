import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Routes } from 'react-router';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import { ColorModeProvider } from '@duncit/shell';

/**
 * The admin's display settings every screen formats dates with: a fixed
 * pattern and a 24-hour clock, on the browser's time source.
 */
export const settingsMock = (): MockedResponse => ({
  request: { query: PUBLIC_APP_SETTINGS },
  result: {
    data: {
      publicAppSettings: {
        __typename: 'PublicAppSettings',
        date_format: 'dd MMM yyyy',
        time_format: 'HH:mm',
        time_zone: 'Asia/Kolkata',
        time_source: 'BROWSER',
        custom_time: null,
        custom_time_set_at: null,
        server_time: '2026-10-26T10:00:00.000Z',
        min_signup_age: 18,
        draft_retention_days: 30,
        ticket_discount_max_pct: 50,
        happening_nearby_days: 7,
      },
    },
  },
  maxUsageCount: 20,
});

interface Options {
  mocks?: MockedResponse[];
  initialEntries?: string[];
  /** Pass <Route .../> children to mount the UI behind a path pattern. */
  routes?: ReactNode;
}

/**
 * Renders inside the providers every MCP screen relies on: Apollo (mocked, with
 * the display settings already answered), the theme, the MUI X date
 * localization and an in-memory router.
 *
 * MockedProvider adds `__typename` to every document, so every mocked object
 * carries one — see `./mocks/fixtures`.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { mocks = [], initialEntries = ['/'], routes } = options;
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[settingsMock(), ...mocks]}>
      <ColorModeProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <MemoryRouter initialEntries={initialEntries}>{routes ? <Routes>{routes}</Routes> : ui}</MemoryRouter>
        </LocalizationProvider>
      </ColorModeProvider>
    </MockedProvider>,
  );
}

/** Lets Apollo's mocked link answer and React commit what it answered. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Replaces the clipboard for one test; `writeText` decides whether a copy lands. */
export function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
}
