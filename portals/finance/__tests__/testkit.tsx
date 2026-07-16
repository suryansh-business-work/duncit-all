import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { InMemoryCache } from '@apollo/client';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const theme = createTheme();

interface Options {
  /** Apollo `MockedResponse` builders (from `../mocks/*`). */
  mocks?: readonly MockedResponse[];
  /** Router history for leaf renders (defaults to `['/']`). */
  initialEntries?: string[];
  /** Mount `ui` behind this route pattern (enables routed mode). */
  path?: string;
  /** Initial URL for routed mode (defaults to `'/'`). */
  entry?: string;
  /** Extra sibling `<Route>` elements for routed mode. */
  extra?: ReactNode;
}

/**
 * `Expense` is refetched/mutated repeatedly with a fresh `refunds` array; leaving
 * it normalised makes Apollo log a "Cache data may be lost when replacing the
 * refunds field" dev warning on every array overwrite. The app reads the
 * mutation result from local state, not the cache, so treating `Expense` as an
 * embedded (non-normalised) object is behaviour-neutral and keeps the output
 * warning-free.
 */
const makeCache = () => new InMemoryCache({ typePolicies: { Expense: { keyFields: false } } });

function Providers({ mocks, children }: Readonly<{ mocks: readonly MockedResponse[]; children: ReactNode }>) {
  return (
    <MockedProvider mocks={mocks as MockedResponse[]} cache={makeCache()}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>{children}</LocalizationProvider>
      </ThemeProvider>
    </MockedProvider>
  );
}

/**
 * Renders a finance-portal component inside every provider its screens rely on:
 * Apollo (`MockedProvider`), the MUI theme, the MUI X date localization
 * provider, and an in-memory router.
 *
 * `MockedProvider` runs with its default `addTypename: true`, so every mocked
 * response MUST carry `__typename` on each object — which the typed factories in
 * `../mocks/*` provide for free from the generated `@duncit/gql-types` shapes.
 * That keeps the mock cache behaving like production (no deprecated
 * `addTypename={false}` escape hatch, no Apollo "__typename" runtime error).
 *
 * Pass `path`/`entry`/`extra` to mount the UI behind a route so navigation
 * (`useNavigate`/`useParams`) can be asserted; omit them for a leaf render.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { mocks = [], initialEntries, path, entry, extra } = options;
  const routed = path !== undefined || entry !== undefined || extra !== undefined;
  const entries = initialEntries ?? [entry ?? '/'];
  const body = routed ? (
    <Routes>
      <Route path={path ?? '/'} element={ui} />
      {extra}
      <Route path="*" element={<div data-testid="location-other">other</div>} />
    </Routes>
  ) : (
    ui
  );
  return render(
    <Providers mocks={mocks}>
      <MemoryRouter initialEntries={entries}>{body}</MemoryRouter>
    </Providers>,
  );
}

/** Resolves after Apollo's MockedProvider has flushed its microtask queue. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
