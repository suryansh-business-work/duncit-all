import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

vi.mock('@apollo/client', () => ({ useQuery: vi.fn(), gql: (s: TemplateStringsArray) => s }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

import { useQuery } from '@apollo/client';
import { DuncitThemeProvider, type ColorMode } from '@duncit/theme';
import { AppHeader } from '../src/chrome/AppHeader';
import type { AppNavItem } from '../src/types';

vi.mocked(useQuery).mockReturnValue({ data: { branding: { app_name: 'Acme' } }, loading: false } as never);

const nav: AppNavItem[] = [{ label: 'Home', to: '/' }];

function renderHeader(mode: ColorMode, extra: Partial<Parameters<typeof AppHeader>[0]> = {}) {
  return render(
    <DuncitThemeProvider defaultMode={mode} storageKey={`hdr_${mode}`}>
      <AppHeader
        title="Duncit CRM"
        name="CRM"
        nav={nav}
        user={null}
        onLogout={vi.fn()}
        onOpenMobileNav={vi.fn()}
        {...extra}
      />
    </DuncitThemeProvider>,
  );
}

describe('AppHeader', () => {
  it('shows the dark-mode toggle in light mode and flips it', async () => {
    const u = userEvent.setup();
    renderHeader('light');
    expect(screen.getByText('Duncit CRM')).toBeInTheDocument();
    expect(screen.getByLabelText('toggle color mode')).toBeInTheDocument();
    expect(screen.getByTestId('DarkModeIcon')).toBeInTheDocument();
    await u.click(screen.getByLabelText('toggle color mode'));
    expect(screen.getByTestId('LightModeIcon')).toBeInTheDocument();
  });

  it('shows the light-mode toggle in dark mode', () => {
    renderHeader('dark');
    expect(screen.getByTestId('LightModeIcon')).toBeInTheDocument();
  });

  it('calls onOpenMobileNav from the hamburger', async () => {
    const u = userEvent.setup();
    const onOpenMobileNav = vi.fn();
    renderHeader('light', { onOpenMobileNav });
    await u.click(screen.getByLabelText('open navigation'));
    expect(onOpenMobileNav).toHaveBeenCalledTimes(1);
  });

  it('opens and closes the mobile search overlay', async () => {
    const u = userEvent.setup();
    renderHeader('light');
    await u.click(screen.getByLabelText('open search'));
    expect(screen.getByLabelText('close search')).toBeInTheDocument();
    await u.click(screen.getByLabelText('close search'));
    expect(screen.getByLabelText('open search')).toBeInTheDocument();
  });

  it('closes the mobile search overlay after navigating to a result', async () => {
    const u = userEvent.setup();
    renderHeader('light');
    await u.click(screen.getByLabelText('open search'));
    const input = screen.getByPlaceholderText('Search');
    await u.type(input, 'Home');
    await u.click(await screen.findByText('Home'));
    expect(screen.getByLabelText('open search')).toBeInTheDocument();
  });
});
