import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

vi.mock('@apollo/client', () => ({ useQuery: vi.fn(), gql: (s: TemplateStringsArray) => s }));

import { useQuery } from '@apollo/client';
import { DuncitThemeProvider, type ColorMode } from '@duncit/theme';
import { AuthSplitLayout } from '../src/chrome/AuthSplitLayout';

vi.mocked(useQuery).mockReturnValue({
  data: { branding: { portals_logo_url: '/l.png', app_name: 'Acme' } },
  loading: false,
} as never);

function wrap(node: ReactNode, mode: ColorMode) {
  return render(
    <DuncitThemeProvider defaultMode={mode} storageKey={`asl_${mode}`}>
      {node}
    </DuncitThemeProvider>,
  );
}

const base = {
  title: 'Sign in',
  portalLabel: 'Finance Portal',
  fullName: 'Duncit Finance',
  tagline: 'Money, sorted.',
  loginImage: '/bg.png',
};

describe('AuthSplitLayout', () => {
  it('renders content and toggles the color mode (light start)', async () => {
    const u = userEvent.setup();
    wrap(
      <AuthSplitLayout {...base} subtitle="Welcome back">
        <div>form-body</div>
      </AuthSplitLayout>,
      'light',
    );
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('form-body')).toBeInTheDocument();
    expect(screen.getAllByText('Finance Portal').length).toBe(2);
    expect(screen.getByTestId('DarkModeIcon')).toBeInTheDocument();

    await u.click(screen.getByLabelText('toggle color mode'));
    expect(screen.getByTestId('LightModeIcon')).toBeInTheDocument();
  });

  it('renders the dark overlay and omits the subtitle', () => {
    wrap(
      <AuthSplitLayout {...base}>
        <div>form-body</div>
      </AuthSplitLayout>,
      'dark',
    );
    expect(screen.getByTestId('LightModeIcon')).toBeInTheDocument();
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
  });
});
