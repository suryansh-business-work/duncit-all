import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gql } from '@apollo/client';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DisplayFormatsSection from '../DisplayFormatsSection';
import { DuncitLocalizationProvider } from '@duncit/app-settings';

/**
 * Both documents live inside the component, so restating them here is the
 * contract: rename `date_format`/`time_format`, or the operation itself, and
 * no mock matches any more.
 */
const APP_SETTINGS_FORMATS = gql`
  query AppSettingsFormats {
    appSettings {
      date_format
      time_format
      updated_at
    }
  }
`;

const UPDATE = gql`
  mutation UpdateAppSettingsFormats($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      date_format
      time_format
      updated_at
    }
  }
`;

interface SavedFormats {
  date_format: string | null;
  time_format: string | null;
}

const SAVED: SavedFormats = { date_format: 'dd/MM/yyyy', time_format: 'HH:mm' };

const settingsMock = (saved: SavedFormats = SAVED): MockedResponse => ({
  request: { query: APP_SETTINGS_FORMATS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      appSettings: {
        __typename: 'AppSettings',
        ...saved,
        updated_at: '2024-05-17T04:00:00.000Z',
      },
    },
  },
});

const publicMock = (): MockedResponse => ({
  request: { query: PUBLIC_APP_SETTINGS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      publicAppSettings: {
        __typename: 'PublicAppSettings',
        date_format: 'dd/MM/yyyy',
        time_format: 'HH:mm',
        time_zone: 'Asia/Kolkata',
        time_source: 'SERVER',
        custom_time: null,
        custom_time_set_at: null,
        server_time: '2024-05-17T04:00:37.000Z',
        min_birth_year: 1950,
        max_birth_year: 2010,
        draft_retention_days: 30,
      },
    },
  },
});

const updateMock = (
  dateFmt: string,
  timeFmt: string,
  outcome: Pick<MockedResponse, 'result' | 'error'>,
): MockedResponse => ({
  request: { query: UPDATE, variables: { input: { date_format: dateFmt, time_format: timeFmt } } },
  ...outcome,
});

const updateOk = (dateFmt: string, timeFmt: string): MockedResponse =>
  updateMock(dateFmt, timeFmt, {
    result: {
      data: {
        updateAppSettings: {
          __typename: 'AppSettings',
          date_format: dateFmt,
          time_format: timeFmt,
          updated_at: '2024-05-17T04:00:00.000Z',
        },
      },
    },
  });

const theme = createTheme();

const renderSection = (mocks: readonly MockedResponse[], onToast = vi.fn()) => {
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks as MockedResponse[]}>
      <DuncitLocalizationProvider>
        <ThemeProvider theme={theme}>
          <DisplayFormatsSection onToast={onToast} />
        </ThemeProvider>
      </DuncitLocalizationProvider>
    </MockedProvider>,
  );
  return { onToast };
};

const saveButton = () => screen.getByRole('button', { name: /^Sav/ });
const datePattern = () => screen.getByLabelText('Date pattern (date-fns)');
const timePattern = () => screen.getByLabelText('Time pattern (date-fns)');
const previewText = () => screen.getByText(/^Preview:/).textContent;

/** Picks an option out of one of the two MUI preset selects. */
const pickPreset = (selectName: string, optionName: RegExp) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: selectName }));
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: optionName }));
};

/** Waits until the saved settings have hydrated the two pattern inputs. */
const waitForHydration = async () => {
  await waitFor(() => expect(datePattern()).toHaveValue('dd/MM/yyyy'));
};

describe('DisplayFormatsSection', () => {
  beforeEach(() => {
    // 17 May 2024, 09:30:37 local — fixed so every preview assertion is exact.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2024, 4, 17, 9, 30, 37));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hydrates both patterns from the saved settings and keeps Save disabled until one changes', async () => {
    renderSection([settingsMock(), publicMock()]);

    await waitForHydration();
    expect(timePattern()).toHaveValue('HH:mm');
    expect(saveButton()).toBeDisabled();

    fireEvent.change(datePattern(), { target: { value: 'yyyy-MM-dd' } });

    expect(saveButton()).toBeEnabled();
  });

  it('previews the entered patterns through date-fns', async () => {
    renderSection([settingsMock(), publicMock()]);

    await waitForHydration();
    expect(previewText()).toBe('Preview: 17/05/2024 · 09:30');

    fireEvent.change(datePattern(), { target: { value: 'EEE, dd MMM yyyy' } });
    fireEvent.change(timePattern(), { target: { value: 'hh:mm a' } });

    expect(previewText()).toBe('Preview: Fri, 17 May 2024 · 09:30 AM');
  });

  it('reports an unusable date-fns token instead of crashing the card', async () => {
    renderSection([settingsMock(), publicMock()]);

    await waitForHydration();
    fireEvent.change(datePattern(), { target: { value: 'YYYY-MM-dd' } });

    expect(previewText()).toBe('Preview: Invalid format pattern');
    // 'YYYY' isn't a token a picker field can split into sections, so saving
    // it would silently break every date/time picker elsewhere — blocked,
    // with the warning below explaining why.
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(/cannot edit/i)).toHaveTextContent('YYYY');
  });

  it('shows each preset next to a live sample and applies the one picked', async () => {
    renderSection([settingsMock(), publicMock()]);

    await waitForHydration();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Time format' }));
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      'hh:mm a — 09:30 AM',
      'HH:mm — 09:30',
      'h:mm a — 9:30 AM',
      'HH:mm:ss — 09:30:37',
      'Custom pattern…',
    ]);

    fireEvent.click(options[3]);

    expect(timePattern()).toHaveValue('HH:mm:ss');
    expect(previewText()).toBe('Preview: 17/05/2024 · 09:30:37');
  });

  it('flips the preset select to "Custom pattern…" once the typed pattern is off-list', async () => {
    renderSection([settingsMock(), publicMock()]);

    await waitForHydration();
    expect(screen.getByRole('combobox', { name: 'Date format' })).toHaveTextContent('dd/MM/yyyy');

    fireEvent.change(datePattern(), { target: { value: 'dd.MM.yy' } });

    expect(screen.getByRole('combobox', { name: 'Date format' })).toHaveTextContent(
      'Custom pattern…',
    );
    expect(previewText()).toBe('Preview: 17.05.24 · 09:30');
  });

  it('applies a picked date preset, and the "Custom pattern…" row keeps it instead of writing the sentinel', async () => {
    renderSection([settingsMock(), publicMock()]);

    await waitForHydration();
    pickPreset('Date format', /^yyyy-MM-dd/);

    expect(datePattern()).toHaveValue('yyyy-MM-dd');
    expect(previewText()).toBe('Preview: 2024-05-17 · 09:30');

    // Picking the escape-hatch row must not push "__custom__" into the pattern.
    pickPreset('Date format', /^Custom pattern…$/);

    expect(datePattern()).toHaveValue('yyyy-MM-dd');
    expect(previewText()).toBe('Preview: 2024-05-17 · 09:30');
  });

  it('falls each blank saved pattern back to its default', async () => {
    renderSection([settingsMock({ date_format: null, time_format: 'HH:mm:ss' }), publicMock()]);

    // A non-default time pattern proves the query really landed.
    await waitFor(() => expect(timePattern()).toHaveValue('HH:mm:ss'));
    expect(datePattern()).toHaveValue('dd MMM yyyy');
    expect(previewText()).toBe('Preview: 17 May 2024 · 09:30:37');
  });

  it('falls a blank saved time pattern back to its default', async () => {
    renderSection([settingsMock({ date_format: 'yyyy-MM-dd', time_format: null }), publicMock()]);

    await waitFor(() => expect(datePattern()).toHaveValue('yyyy-MM-dd'));
    expect(timePattern()).toHaveValue('hh:mm a');
    expect(previewText()).toBe('Preview: 2024-05-17 · 09:30 AM');
  });

  it('saves both patterns, toasts, and settles the button back to Save', async () => {
    const { onToast } = renderSection([
      settingsMock(),
      publicMock(),
      updateOk('yyyy-MM-dd', 'HH:mm:ss'),
    ]);

    await waitForHydration();
    fireEvent.change(datePattern(), { target: { value: 'yyyy-MM-dd' } });
    fireEvent.change(timePattern(), { target: { value: 'HH:mm:ss' } });
    fireEvent.click(saveButton());

    // A mismatch in the mutation variables would leave onToast uncalled.
    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Display formats saved'));
    await waitFor(() => expect(saveButton()).toHaveTextContent('Save'));
  });

  it('surfaces a save failure and does not toast success', async () => {
    const { onToast } = renderSection([
      settingsMock(),
      publicMock(),
      updateMock('yyyy-MM-dd', 'HH:mm', { error: new Error('date_format is not allowed') }),
    ]);

    await waitForHydration();
    fireEvent.change(datePattern(), { target: { value: 'yyyy-MM-dd' } });
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(screen.getByText('date_format is not allowed')).toBeInTheDocument(),
    );
    expect(onToast).not.toHaveBeenCalled();
    // The failed save must not leave the button stuck in its busy state.
    expect(saveButton()).toHaveTextContent('Save');
  });
});
