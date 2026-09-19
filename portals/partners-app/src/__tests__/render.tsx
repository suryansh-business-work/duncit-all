/**
 * One render harness for the partners-app component suites.
 *
 * It mounts the providers `mountPortal` puts above every page in the real app —
 * Apollo, the MUI theme, the date adapter, the confirm dialog host, the router,
 * the session user and the locale catalogue (shell copy with the portal's own
 * layered over it) — so a suite sees the same words and the same behaviour a
 * partner does, without each file re-assembling that tree.
 */
import type { ReactElement, ReactNode } from 'react';
import type { ApolloLink } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { ConfirmProvider } from '@duncit/dialogs';
import { LocaleProvider } from '@duncit/app-settings';
import { SHELL_FALLBACK_FLAT } from '@duncit/shell';
import { UserProvider, writeCachedUser, type DuncitUser } from '@duncit/user-context';
import { PARTNERS_FALLBACK } from '../i18n';

const theme = createTheme();
const PORTAL_FALLBACK = { ...SHELL_FALLBACK_FLAT, ...PARTNERS_FALLBACK };
const USER_STORAGE_KEY = 'partner_user';

/** A signed-in partner, keyed the way the server keys a session user. */
export const partnerUser = (over: Partial<DuncitUser> = {}): DuncitUser => ({
  user_id: 'user-1',
  full_name: 'Asha Rao',
  email: 'asha@duncit.com',
  roles: ['USER'],
  city: 'Bengaluru',
  ...over,
});

export interface InitialRoute {
  pathname: string;
  search?: string;
  state?: unknown;
}

export interface RenderOptions {
  mocks?: readonly MockedResponse[];
  /** A custom link (e.g. the schema mock); wins over `mocks`. */
  link?: ApolloLink;
  route?: string | InitialRoute;
  /** The route pattern the element is mounted at, so `useParams` resolves. */
  path?: string;
  /** The session user; omitted means nobody is signed in. */
  user?: DuncitUser | null;
}

/** Shows where the router currently is, so a test can assert a navigation. */
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

interface TreeProps {
  options: RenderOptions;
  children: ReactNode;
}

function ProviderTree({ options, children }: Readonly<TreeProps>) {
  const { mocks = [], link, route = '/', path } = options;
  const routed = path ? (
    <Routes>
      <Route path={path} element={children} />
      <Route path="*" element={null} />
    </Routes>
  ) : (
    children
  );
  return (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks} link={link}>
      <UserProvider isAuthed={() => false} loadUser={async () => null} storageKey={USER_STORAGE_KEY}>
        <ThemeProvider theme={theme}>
          <LocaleProvider fallback={PORTAL_FALLBACK}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <MemoryRouter initialEntries={[route]}>
                <ConfirmProvider>
                  {routed}
                  <LocationProbe />
                </ConfirmProvider>
              </MemoryRouter>
            </LocalizationProvider>
          </LocaleProvider>
        </ThemeProvider>
      </UserProvider>
    </MockedProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  writeCachedUser(options.user ?? null, USER_STORAGE_KEY);
  const view = render(<ProviderTree options={options}>{ui}</ProviderTree>);
  return {
    ...view,
    rerenderWith: (next: ReactElement) => view.rerender(<ProviderTree options={options}>{next}</ProviderTree>),
  };
}
