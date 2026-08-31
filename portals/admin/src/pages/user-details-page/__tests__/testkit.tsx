import type { ReactElement, ReactNode } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { renderWithProviders as renderWithPortalProviders } from '../../../__tests__/testkit';

interface Options {
  mocks?: MockedResponse[];
  initialEntries?: string[];
}

/**
 * The portal-wide harness plus the MUI X localization context: the user-details
 * screens render `DateField`, which is a `DatePicker` and throws without it.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  return renderWithPortalProviders(
    <LocalizationProvider dateAdapter={AdapterDateFns}>{ui}</LocalizationProvider>,
    options,
  );
}

/**
 * `renderHook` takes a wrapper component rather than an element, so it cannot go
 * through `renderWithProviders`. `useUserDetailsState` only needs Apollo and a
 * router, which is all this mounts.
 */
export function makeWrapper(mocks: readonly MockedResponse[] = []) {
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <MockedProvider mocks={mocks as MockedResponse[]}>
        <MemoryRouter>{children}</MemoryRouter>
      </MockedProvider>
    );
  };
}
