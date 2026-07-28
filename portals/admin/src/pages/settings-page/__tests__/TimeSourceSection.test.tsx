import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gql } from '@apollo/client';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PUBLIC_APP_SETTINGS, resetServerTimeStamp } from '@duncit/app-settings';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TimeSourceSection from '../TimeSourceSection';

/**
 * Restated from the component (the documents are private to it), so a renamed
 * field or operation stops every mock below from matching.
 */
const APP_SETTINGS_CLOCK = gql`
  query AppSettingsClock {
    appSettings {
      time_zone
      time_source
      custom_time
      custom_time_set_at
      updated_at
    }
  }
`;

const UPDATE_CLOCK = gql`
  mutation UpdateAppSettingsClock($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      time_zone
      time_source
      custom_time
      custom_time_set_at
      updated_at
    }
  }
`;

/** The server's clock, and the instant the browser is pinned to. */
const SERVER_TIME = '2024-05-17T04:00:37.000Z'; // 09:30:37 in Asia/Kolkata

interface SavedClock {
  time_zone: string | null;
  time_source: string | null;
  custom_time: string | null;
  custom_time_set_at: string | null;
}

// Deliberately NOT the component's own default zone, so waiting for it to
// appear proves the query really hydrated the form.
const serverSaved: SavedClock = {
  time_zone: 'Asia/Dubai',
  time_source: 'SERVER',
  custom_time: null,
  custom_time_set_at: null,
};

/** A clock already pinned to an anchor that the server has stamped. */
const customSaved: SavedClock = {
  time_zone: 'Asia/Dubai',
  time_source: 'CUSTOM',
  custom_time: '2030-01-01T04:30:00.000Z',
  custom_time_set_at: SERVER_TIME,
};

const settingsMock = (saved: SavedClock): MockedResponse => ({
  request: { query: APP_SETTINGS_CLOCK },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { appSettings: { __typename: 'AppSettings', ...saved, updated_at: SERVER_TIME } } },
});

const publicMock = (): MockedResponse => ({
  request: { query: PUBLIC_APP_SETTINGS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      publicAppSettings: {
        __typename: 'PublicAppSettings',
        date_format: 'dd MMM yyyy',
        time_format: 'hh:mm a',
        time_zone: 'Asia/Kolkata',
        time_source: 'SERVER',
        custom_time: null,
        custom_time_set_at: null,
        server_time: SERVER_TIME,
        min_birth_year: 1950,
        max_birth_year: 2010,
        draft_retention_days: 30,
      },
    },
  },
});

type SaveInput = { time_zone: string; time_source: string; custom_time: string | null };

const updateMock = (
  input: SaveInput,
  outcome: Pick<MockedResponse, 'result' | 'error'>,
): MockedResponse => ({
  request: { query: UPDATE_CLOCK, variables: { input } },
  ...outcome,
});

const updateOk = (input: SaveInput): MockedResponse =>
  updateMock(input, {
    result: {
      data: {
        updateAppSettings: {
          __typename: 'AppSettings',
          time_zone: input.time_zone,
          time_source: input.time_source,
          custom_time: input.custom_time,
          custom_time_set_at: SERVER_TIME,
          updated_at: SERVER_TIME,
        },
      },
    },
  });

const theme = createTheme();

const renderSection = (mocks: readonly MockedResponse[], onToast = vi.fn()) => {
  render(
    <MockedProvider mocks={mocks as MockedResponse[]}>
      <ThemeProvider theme={theme}>
        <TimeSourceSection onToast={onToast} />
      </ThemeProvider>
    </MockedProvider>,
  );
  return { onToast };
};

const saveButton = () => screen.getByRole('button', { name: /^Sav/ });
const ianaField = () => screen.getByLabelText('IANA zone');
/** The datetime-local box, disambiguated from the "Custom time" select row. */
const customTimeInput = () =>
  screen.getByLabelText('Custom time', { selector: 'input[type="datetime-local"]' });
const noCustomTimeInput = () =>
  screen.queryByLabelText('Custom time', { selector: 'input[type="datetime-local"]' });
const preview = () => screen.getByText(/^Apps now show:/).textContent ?? '';

const pickOption = (selectName: string, optionName: RegExp) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: selectName }));
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: optionName }));
};

/** Waits for the query to hydrate the zone free-text field. */
const waitForHydration = async (zone = 'Asia/Dubai') => {
  await waitFor(() => expect(ianaField()).toHaveValue(zone));
};

/** Runs the component's 1s preview interval forward without touching setTimeout. */
const tickSeconds = (seconds: number) => {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });
};

describe('TimeSourceSection', () => {
  beforeEach(() => {
    resetServerTimeStamp();
    // Only Date + the preview interval are faked: setTimeout stays real so
    // Apollo's mocked link and RTL's waitFor keep working normally.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(SERVER_TIME));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hydrates zone and source from the saved settings, keeping Save disabled until one changes', async () => {
    renderSection([settingsMock(serverSaved), publicMock()]);

    await waitForHydration();
    expect(screen.getByRole('combobox', { name: 'Time zone' })).toHaveTextContent('Asia/Dubai');
    expect(screen.getByRole('combobox', { name: 'Time source' })).toHaveTextContent(
      'Sync time with server',
    );
    // SERVER is selected, so no custom-time input is offered.
    expect(noCustomTimeInput()).toBeNull();
    expect(saveButton()).toBeDisabled();

    fireEvent.change(ianaField(), { target: { value: 'Europe/London' } });

    expect(saveButton()).toBeEnabled();
  });

  it('previews the server clock in the chosen zone and ticks it forward every second', async () => {
    renderSection([settingsMock(serverSaved), publicMock()]);

    await waitForHydration();
    // 04:00:37Z rendered in the saved zone, Asia/Dubai (UTC+4).
    expect(preview()).toMatch(/^Apps now show: 17 May 2024, 08:00:37 \(/);

    tickSeconds(1);
    expect(preview()).toMatch(/^Apps now show: 17 May 2024, 08:00:38 \(/);

    tickSeconds(3);
    expect(preview()).toMatch(/^Apps now show: 17 May 2024, 08:00:41 \(/);
  });

  it('re-renders the preview in a newly typed zone', async () => {
    renderSection([settingsMock(serverSaved), publicMock()]);

    await waitForHydration();
    fireEvent.change(ianaField(), { target: { value: 'Africa/Nairobi' } });

    // Same instant, Nairobi wall clock (UTC+3).
    expect(preview()).toMatch(/^Apps now show: 17 May 2024, 07:00:37 \(/);
    // The zone is off the preset list, so the dropdown falls back to the escape hatch.
    expect(screen.getByRole('combobox', { name: 'Time zone' })).toHaveTextContent(
      'Other (type below)…',
    );
  });

  it('renders "Invalid time zone" rather than crashing on an unusable IANA zone', async () => {
    renderSection([settingsMock(serverSaved), publicMock()]);

    await waitForHydration();
    fireEvent.change(ianaField(), { target: { value: 'Not/AZone' } });

    expect(preview()).toBe('Apps now show: Invalid time zone');
  });

  it('applies a picked preset zone, and the "Other (type below)…" row keeps it instead of writing the sentinel', async () => {
    renderSection([settingsMock(serverSaved), publicMock()]);

    await waitForHydration();
    pickOption('Time zone', /^Australia\/Sydney$/);

    expect(ianaField()).toHaveValue('Australia/Sydney');
    expect(preview()).toMatch(/^Apps now show: 17 May 2024, 14:00:37 \(/);

    // The escape-hatch row must not push "__custom__" into the zone — that
    // would render an unusable zone straight into every app.
    pickOption('Time zone', /^Other \(type below\)…$/);

    expect(ianaField()).toHaveValue('Australia/Sydney');
    expect(preview()).toMatch(/^Apps now show: 17 May 2024, 14:00:37 \(/);
  });

  it('falls a blank saved zone back to the default while still honouring the saved source', async () => {
    renderSection([
      settingsMock({ ...serverSaved, time_zone: null, time_source: 'BROWSER' }),
      publicMock(),
    ]);

    // A non-default source proves the query landed before the zone is checked.
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Time source' })).toHaveTextContent(
        'Sync time with browser',
      ),
    );
    expect(ianaField()).toHaveValue('Asia/Kolkata');
    expect(screen.getByText(/Each device uses its own clock/)).toBeInTheDocument();
    // BROWSER reads the device clock, which the test has pinned to SERVER_TIME.
    expect(preview()).toMatch(/^Apps now show: 17 May 2024, 09:30:37 \(/);
  });

  it('falls a blank saved source back to SERVER', async () => {
    renderSection([settingsMock({ ...serverSaved, time_source: null }), publicMock()]);

    await waitForHydration();
    expect(screen.getByRole('combobox', { name: 'Time source' })).toHaveTextContent(
      'Sync time with server',
    );
    // The stored value is still null, not 'SERVER', so the card reads as dirty
    // and Save is offered — one click writes the default back explicitly.
    expect(saveButton()).toBeEnabled();
  });

  it('reveals the custom-time input with its own warning copy, and freezes the preview on an unsaved anchor', async () => {
    renderSection([settingsMock(serverSaved), publicMock()]);

    await waitForHydration();
    expect(screen.getByText(/Every app follows the server's clock/)).toBeInTheDocument();

    pickOption('Time source', /^Custom time$/);

    expect(screen.getByText(/Pin the clock to a chosen instant/)).toBeInTheDocument();
    fireEvent.change(customTimeInput(), { target: { value: '2030-01-01T10:00' } });

    const frozen = preview();
    expect(frozen).toMatch(/2030/);
    // No save-stamp yet, so the anchor must NOT run forward.
    tickSeconds(5);
    expect(preview()).toBe(frozen);
  });

  it('saves the custom anchor as an ISO instant and toasts', async () => {
    const anchorIso = new Date(2030, 0, 1, 10, 0).toISOString();
    const { onToast } = renderSection([
      settingsMock(serverSaved),
      publicMock(),
      updateOk({ time_zone: 'Asia/Dubai', time_source: 'CUSTOM', custom_time: anchorIso }),
    ]);

    await waitForHydration();
    pickOption('Time source', /^Custom time$/);
    fireEvent.change(customTimeInput(), { target: { value: '2030-01-01T10:00' } });
    fireEvent.click(saveButton());

    // Any other payload would find no mock and surface an error instead.
    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Time settings saved'));
  });

  it('clears a stale anchor from the payload when the source moves away from CUSTOM', async () => {
    const { onToast } = renderSection([
      settingsMock(customSaved),
      publicMock(),
      updateOk({ time_zone: 'Asia/Dubai', time_source: 'SERVER', custom_time: null }),
    ]);

    await waitForHydration();
    // Hydrated as CUSTOM, so the anchor input is on screen and Save is idle.
    expect(customTimeInput()).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    pickOption('Time source', /^Sync time with server$/);
    expect(noCustomTimeInput()).toBeNull();
    fireEvent.click(saveButton());

    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Time settings saved'));
  });

  it('treats an edited anchor alone as a change worth saving', async () => {
    renderSection([settingsMock(customSaved), publicMock()]);

    await waitForHydration();
    expect(saveButton()).toBeDisabled();

    fireEvent.change(customTimeInput(), { target: { value: '2031-06-06T08:15' } });

    expect(saveButton()).toBeEnabled();
  });

  it('surfaces a save failure and does not toast success', async () => {
    const { onToast } = renderSection([
      settingsMock(serverSaved),
      publicMock(),
      updateMock(
        { time_zone: 'Europe/London', time_source: 'SERVER', custom_time: null },
        { error: new Error('Unknown time zone') },
      ),
    ]);

    await waitForHydration();
    fireEvent.change(ianaField(), { target: { value: 'Europe/London' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(screen.getByText('Unknown time zone')).toBeInTheDocument());
    expect(onToast).not.toHaveBeenCalled();
    expect(saveButton()).toHaveTextContent('Save');
  });
});
