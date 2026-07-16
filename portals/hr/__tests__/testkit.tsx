import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Routes } from 'react-router-dom';
import { ColorModeProvider } from '@duncit/shell';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface Options {
  mocks?: MockedResponse[];
  initialEntries?: string[];
  /** Pass <Route .../> children to mount the UI behind a path pattern. */
  routes?: ReactNode;
}

/**
 * Renders a component inside the providers every HR-portal screen relies on:
 * Apollo (mocked), the color-mode/theme provider, the MUI X date localization
 * provider, and an in-memory router.
 *
 * `MockedProvider` runs with its default `addTypename: true`, so every mocked
 * response MUST carry `__typename` on each object — which the typed factories in
 * `../mocks/*` provide for free from the generated `@duncit/gql-types` shapes.
 * That keeps the mock cache behaving like production (no deprecated
 * `addTypename={false}` escape hatch, no Apollo "__typename" runtime error).
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { mocks = [], initialEntries = ['/'], routes } = options;
  return render(
    <MockedProvider mocks={mocks}>
      <ColorModeProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <MemoryRouter initialEntries={initialEntries}>
            {routes ? <Routes>{routes}</Routes> : ui}
          </MemoryRouter>
        </LocalizationProvider>
      </ColorModeProvider>
    </MockedProvider>,
  );
}

/** Resolves after Apollo's MockedProvider has flushed its microtask queue. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
