import { describe, expect, it } from 'vitest';
import { gql } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing';
import { render, screen, waitFor } from '@testing-library/react';
import { useBranding } from './useBranding';

const BRANDING_SUMMARY = gql`
  query AppBranding {
    branding {
      app_name
      logo_url
      portals_logo_url
      primary_color
      support_email
    }
  }
`;

function Probe() {
  const b = useBranding();
  return (
    <div>
      <span data-testid="name">{b.appName}</span>
      <span data-testid="logo">{b.logoUrl}</span>
      <span data-testid="primary">{b.primaryColor ?? 'none'}</span>
      <span data-testid="loading">{String(b.loading)}</span>
    </div>
  );
}

describe('useBranding', () => {
  it('falls back to bundled defaults while loading', () => {
    render(<MockedProvider mocks={[]}><Probe /></MockedProvider>);
    expect(screen.getByTestId('name').textContent).toBe('Duncit');
    expect(screen.getByTestId('logo').textContent).toBe('');
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('returns the dynamic branding once loaded', async () => {
    const mocks = [
      {
        request: { query: BRANDING_SUMMARY },
        result: {
          data: { branding: { app_name: 'Acme', logo_url: 'https://x/logo.png', portals_logo_url: '', primary_color: '#123456', support_email: 's@x.com' } },
        },
      },
    ];
    render(<MockedProvider mocks={mocks}><Probe /></MockedProvider>);
    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('Acme'));
    expect(screen.getByTestId('logo').textContent).toBe('https://x/logo.png');
    expect(screen.getByTestId('primary').textContent).toBe('#123456');
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });
});
