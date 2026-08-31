/**
 * The provider stack every smoke suite mounts its pages inside.
 *
 * It mirrors what the real app puts above a route — `main.tsx` supplies Apollo,
 * the theme and `DuncitLocalizationProvider`; `App.tsx` supplies the cart and
 * tour contexts — because a page that reads one of them throws without it, and
 * a thrown page renders nothing at all. That is not a cosmetic failure: the
 * suite dies at the mount, so every branch below the throw goes uncovered and
 * the workspace's lcov silently loses the whole file.
 *
 * Four separate causes were doing exactly that across mWeb's smoke run:
 *   56x  MUI: Can not find the date and time pickers localization context
 *   14x  useCart must be used inside CartProvider
 *    6x  useTours must be used inside a TourProvider
 *    6x  Cannot read properties of null (reading 'breakpoints')
 *
 * Kept in ONE place rather than repeated per suite (rule 34) so the stack
 * cannot drift from the app's: when a provider is added to `App.tsx`, this is
 * the single file that has to learn about it.
 */
import type { ReactNode } from 'react';
import type { ApolloLink } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DuncitLocalizationProvider } from '@duncit/app-settings';
import { CartProvider } from '../components/cart/CartContext';
import { TourProvider } from '../tours/TourContext';
import { StatusUploadProvider } from '../components/status-upload/StatusUploadProvider';

/**
 * MUI's `useTheme()` returns NULL outside a provider rather than falling back
 * to the default theme, so `useMediaQuery((theme) => theme.breakpoints.…)` —
 * the common shape in this app — throws and takes the page down with it.
 */
export const smokeTheme = createTheme();

export interface SmokeProvidersProps {
  children: ReactNode;
  /** Omit to answer nothing, which is a page's first paint and its failed-request state. */
  link?: ApolloLink;
}

export function SmokeProviders({ children, link }: Readonly<SmokeProvidersProps>) {
  // Apollo has to sit outermost: DuncitLocalizationProvider resolves the
  // admin-configured date format through a `publicAppSettings` query.
  const inner = (
    <ThemeProvider theme={smokeTheme}>
      <DuncitLocalizationProvider timeZoneAware>{children}</DuncitLocalizationProvider>
    </ThemeProvider>
  );

  if (link) {
    return <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} link={link}>{inner}</MockedProvider>;
  }
  return <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>{inner}</MockedProvider>;
}

export interface SmokeRouteProps {
  /** The route pattern, so the page's own `useParams()` reads what it expects. */
  pattern: string;
  /** A concrete URL matching that pattern. */
  concrete: string;
  children: ReactNode;
  link?: ApolloLink;
}

/**
 * A page mounted behind its own route, inside the app's contexts.
 *
 * The cart and tour providers live INSIDE the router because both read the
 * current location, exactly as they do under `App.tsx`.
 */
export function SmokeRoute({ pattern, concrete, children, link }: Readonly<SmokeRouteProps>) {
  // A pressed control may navigate. The real route table always has a
  // catch-all; without one the router matches nothing and renders an EMPTY
  // container, which the smoke assertion reads as a broken page rather than a
  // page that simply went somewhere else.
  const catchAll = pattern === '*' ? null : <Route path="*" element={<div data-testid="smoke-elsewhere" />} />;

  return (
    <SmokeProviders link={link}>
      <MemoryRouter initialEntries={[concrete]}>
        <StatusUploadProvider>
          <CartProvider>
            <TourProvider>
              <Routes>
                <Route path={pattern} element={children} />
                {catchAll}
              </Routes>
            </TourProvider>
          </CartProvider>
        </StatusUploadProvider>
      </MemoryRouter>
    </SmokeProviders>
  );
}
