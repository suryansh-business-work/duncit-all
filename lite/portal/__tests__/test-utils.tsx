import type { ReactElement, ReactNode } from 'react';
import { render, screen, within, type RenderResult } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockLink } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router';
import { ConfirmProvider, NotifyHost } from '@duncit/dialogs';
import { createTranslator } from '@duncit/i18n';
import { DuncitThemeProvider } from '@duncit/theme';
import { PORTAL_FALLBACK } from '../../shared/i18n';

/** The console's English translator — what `usePortalT()` resolves to without a LocaleProvider. */
export const portalT = createTranslator({ locale: 'en-IN', fallback: PORTAL_FALLBACK }).t;

export type GqlMock = MockLink.MockedResponse;

interface ProviderOptions {
  mocks?: readonly GqlMock[];
  /** The URL the in-memory router starts on. */
  route?: string;
}

/** Everything a console page sits inside in production, minus the network: mocked Apollo, theme, confirm, notifications, router. */
export function Providers({ mocks = [], route = '/', children }: Readonly<ProviderOptions & { children: ReactNode }>) {
  return (
    <MockedProvider mocks={mocks} mockLinkDefaultOptions={{ delay: 0 }}>
      <DuncitThemeProvider storageKey="lite_portal_test_color_mode" defaultMode="light">
        <ConfirmProvider>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          <NotifyHost />
        </ConfirmProvider>
      </DuncitThemeProvider>
    </MockedProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options: ProviderOptions = {}): RenderResult {
  return render(ui, { wrapper: ({ children }) => <Providers {...options}>{children}</Providers> });
}

/** The toast the page raised last, read off the shared NotifyHost. */
export async function findToast(severity: 'success' | 'error'): Promise<HTMLElement> {
  return screen.findByTestId(`notify-${severity}`);
}

/** The open confirmation dialog. */
export async function findConfirm(): Promise<HTMLElement> {
  return screen.findByTestId('confirm-dialog');
}

/** A table row rendered by the fake grid, scoped for `within` queries. */
export async function findRow(id: string) {
  return within(await screen.findByTestId(`row-${id}`));
}
