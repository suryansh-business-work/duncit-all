import { describe, expect, it, vi } from 'vitest';
import { gql } from '@apollo/client';
import { type MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../__tests__/testkit';
import MinAgeSection from '../MinAgeSection';

/**
 * Restated from the component (the documents are private to it), so a renamed
 * field or operation stops every mock below from matching.
 */
const APP_SETTINGS_MIN_AGE = gql`
  query AppSettingsMinAge {
    appSettings {
      min_signup_age
      updated_at
    }
  }
`;

const UPDATE = gql`
  mutation UpdateAppSettingsMinAge($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      min_signup_age
      updated_at
    }
  }
`;

const settingsMock = (minAge: number | null): MockedResponse => ({
  request: { query: APP_SETTINGS_MIN_AGE },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      appSettings: {
        __typename: 'AppSettings',
        min_signup_age: minAge,
        updated_at: '2026-10-01T00:00:00.000Z',
      },
    },
  },
});

const renderSection = (mocks: MockedResponse[]) => {
  const onToast = vi.fn();
  renderWithProviders(<MinAgeSection onToast={onToast} />, { mocks });
  return { onToast };
};

const ageInput = () => screen.getByLabelText('Minimum age (years)');
const saveButton = () => screen.getByRole('button', { name: /^Sav/ });
const RANGE_WARNING = 'Enter a whole number between 1 and 120.';

describe('MinAgeSection', () => {
  it('hydrates the saved age and keeps Save disabled until it changes', async () => {
    renderSection([settingsMock(21)]);

    await waitFor(() => expect(ageInput()).toHaveValue(21));
    expect(saveButton()).toBeDisabled();

    fireEvent.change(ageInput(), { target: { value: '16' } });

    expect(saveButton()).toBeEnabled();
    expect(screen.queryByText(RANGE_WARNING)).not.toBeInTheDocument();
  });

  it('falls back to 18 when the server has no age stored', async () => {
    renderSection([settingsMock(null)]);

    await waitFor(() => expect(ageInput()).toHaveValue(18));
    // The stored value (null) differs from the shown 18, so saving the default is allowed.
    await waitFor(() => expect(saveButton()).toBeEnabled());
  });

  it.each([
    ['0', 'below the minimum'],
    ['121', 'above the maximum'],
    ['17.5', 'not a whole number'],
  ])('warns and blocks Save for %s (%s)', async (value) => {
    renderSection([settingsMock(21)]);

    await waitFor(() => expect(ageInput()).toHaveValue(21));
    fireEvent.change(ageInput(), { target: { value } });

    expect(screen.getByText(RANGE_WARNING)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('accepts the boundaries 1 and 120', async () => {
    renderSection([settingsMock(21)]);

    await waitFor(() => expect(ageInput()).toHaveValue(21));
    for (const value of ['1', '120']) {
      fireEvent.change(ageInput(), { target: { value } });
      expect(screen.queryByText(RANGE_WARNING)).not.toBeInTheDocument();
      expect(saveButton()).toBeEnabled();
    }
  });

  it('saves the new age and toasts', async () => {
    const { onToast } = renderSection([
      settingsMock(21),
      {
        request: { query: UPDATE, variables: { input: { min_signup_age: 16 } } },
        result: {
          data: {
            updateAppSettings: {
              __typename: 'AppSettings',
              min_signup_age: 16,
              updated_at: '2026-10-04T00:00:00.000Z',
            },
          },
        },
      },
    ]);

    await waitFor(() => expect(ageInput()).toHaveValue(21));
    fireEvent.change(ageInput(), { target: { value: '16' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Minimum age saved'));
  });

  it('shows the server error when the save fails and does not toast', async () => {
    const { onToast } = renderSection([
      settingsMock(21),
      {
        request: { query: UPDATE, variables: { input: { min_signup_age: 16 } } },
        error: new Error('min_signup_age is out of range'),
      },
    ]);

    await waitFor(() => expect(ageInput()).toHaveValue(21));
    fireEvent.change(ageInput(), { target: { value: '16' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('min_signup_age is out of range')).toBeInTheDocument();
    expect(onToast).not.toHaveBeenCalled();
    // The failed save releases the button rather than leaving it stuck on "Saving…".
    expect(saveButton()).toHaveTextContent('Save');
    expect(saveButton()).toBeEnabled();
  });
});
