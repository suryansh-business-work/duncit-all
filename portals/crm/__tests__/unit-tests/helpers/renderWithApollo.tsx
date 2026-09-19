import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

interface Options {
  /** The URL the router starts on. */
  route?: string;
  /** When set, the UI is mounted under this route pattern so `useParams` resolves. */
  path?: string;
}

/** Prints where the router is now, so a test can assert a navigation landed. */
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

/**
 * Mounts a CRM component the way the app does: Apollo (mocked at the link, as
 * every suite in this workspace does) around a router. Mocks answer with no
 * delay so a test only waits for React, never for a timer.
 */
export function renderWithApollo(ui: ReactElement, mocks: ReadonlyArray<MockedResponse> = [], options: Options = {}) {
  const { route = '/', path } = options;
  const tree = path ? (
    <Routes>
      <Route path={path} element={ui} />
      <Route path="*" element={null} />
    </Routes>
  ) : (
    ui
  );
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={[route]}>
        {tree}
        <LocationProbe />
      </MemoryRouter>
    </MockedProvider>,
  );
}
