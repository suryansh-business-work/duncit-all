import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider, PUBLIC_LOCALES, PUBLIC_TRANSLATIONS } from '@duncit/app-settings';
import { PORTAL_FALLBACK } from '../../../shared/i18n';
import { ConsoleAppBar } from '../../layout/ConsoleAppBar';
import { Providers, type GqlMock } from '../test-utils';

vi.mock('../../../shared/session', async () => {
  const fixtures = await import('../fixtures');
  return { useLiteSession: () => fixtures.makeSession() };
});

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = '';
});

const locale = (code: string, label: string, english: string, isDefault: boolean) => ({ __typename: 'Locale', code, label, english_label: english, is_rtl: false, is_default: isDefault, sort_order: 0 });

const localeMocks = (locales: ReturnType<typeof locale>[]): GqlMock[] => [
  { request: { query: PUBLIC_LOCALES }, result: { data: { publicLocales: locales } } },
  { request: { query: PUBLIC_TRANSLATIONS, variables: () => true }, result: { data: { publicTranslations: [] } }, maxUsageCount: Number.POSITIVE_INFINITY },
];

const renderBar = (mocks: GqlMock[], onLocaleChange = vi.fn(), onOpenNav = vi.fn()) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Providers mocks={mocks}>
      <LocaleProvider fallback={PORTAL_FALLBACK} onLocaleChange={onLocaleChange}>
        {children}
      </LocaleProvider>
    </Providers>
  );
  render(<ConsoleAppBar onOpenNav={onOpenNav} />, { wrapper });
  return { user: userEvent.setup(), onLocaleChange, onOpenNav };
};

describe('ConsoleAppBar', () => {
  it('titles the console and opens the navigation drawer on phones', async () => {
    const { user, onOpenNav } = renderBar(localeMocks([]));
    expect(screen.getByText('Duncit Lite Console')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(onOpenNav).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument();
  });

  it('toggles between light and dark, naming the mode it switches to', async () => {
    const { user } = renderBar(localeMocks([]));
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
  });

  it('hides the language picker while only one language is offered', async () => {
    renderBar(localeMocks([locale('hi', 'हिन्दी', 'Hindi', true)]));
    // The platform's one language has been applied to the document once it arrived.
    await waitFor(() => expect(document.documentElement.lang).toBe('hi'));
    expect(screen.queryByTestId('app-bar-language')).not.toBeInTheDocument();
  });

  it('switches the language from the picker and reports the choice', async () => {
    const { user, onLocaleChange } = renderBar(localeMocks([locale('en-IN', 'English', 'English', true), locale('hi', 'हिन्दी', 'Hindi', false)]));
    const picker = await screen.findByRole('combobox', { name: 'Language' });
    expect(picker).toHaveTextContent('English');
    await user.click(picker);
    await user.click(await screen.findByRole('option', { name: 'हिन्दी' }));
    expect(onLocaleChange).toHaveBeenCalledWith('hi');
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Language' })).toHaveTextContent('हिन्दी'));
  });
});
