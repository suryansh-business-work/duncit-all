/**
 * The tree every self-fetching section of the pod page is rendered inside.
 *
 * Apollo (the section's own query), a theme (MUI's `useTheme()` returns NULL
 * outside a provider), a router (the name links navigate) and the scope
 * provider (which query set the section reads) — declared once here rather
 * than once per suite.
 */
import type { ReactNode } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PodDetailsScopeProvider, type PodDetailsScope } from '../src/scope';

export const POD_ID = 'pod-1';

export const testTheme = createTheme();

/** Lets a mocked Apollo response land and React commit the result. */
export const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

export const mountSection = (
  ui: ReactNode,
  mocks: readonly MockedResponse[] = [],
  scope: PodDetailsScope = 'ADMIN',
) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ThemeProvider theme={testTheme}>
        <MemoryRouter initialEntries={[`/pods/${POD_ID}`]}>
          <PodDetailsScopeProvider scope={scope}>
            <Routes>
              <Route path="/pods/:id" element={ui} />
              <Route path="/users/:id" element={<div>user-page</div>} />
              <Route path="/clubs/:id" element={<div>club-page</div>} />
            </Routes>
          </PodDetailsScopeProvider>
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>,
  );
