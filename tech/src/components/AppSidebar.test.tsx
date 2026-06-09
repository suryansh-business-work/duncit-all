import { describe, expect, it, vi } from 'vitest';
import { gql } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AppSidebar from './AppSidebar';
import { appConfig } from '../config/app-config';

const BRANDING_SUMMARY = gql`
  query AppBranding {
    branding {
      app_name
      logo_url
      primary_color
      support_email
    }
  }
`;

const brandingMock = {
  request: { query: BRANDING_SUMMARY },
  result: { data: { branding: { app_name: 'Duncit', logo_url: 'https://x/logo.png', primary_color: '#000', support_email: 's@x.com' } } },
};

const renderSidebar = (mocks: any[], path = '/', onNavigate?: () => void) =>
  render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter initialEntries={[path]}>
        <AppSidebar onNavigate={onNavigate} />
      </MemoryRouter>
    </MockedProvider>
  );

describe('AppSidebar', () => {
  it('shows a logo skeleton while branding loads and lists the nav', () => {
    renderSidebar([]);
    expect(screen.getByText(appConfig.name)).toBeInTheDocument();
    expect(screen.getByText('Environment Variables')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders the branding logo and fires onNavigate on click', async () => {
    const onNavigate = vi.fn();
    renderSidebar([brandingMock], '/portal-modes', onNavigate);
    await waitFor(() => expect(screen.getByRole('img')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Feature Flags'));
    expect(onNavigate).toHaveBeenCalled();
  });

  it('auto-expands the Server group when a child route is active', () => {
    renderSidebar([], '/server/info');
    // Group header + both children are visible because the group is open.
    expect(screen.getByText('Server')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Docker')).toBeInTheDocument();
  });

  it('expands the Server group when its header is clicked', () => {
    renderSidebar([], '/');
    // Collapsed by default on an unrelated route.
    expect(screen.queryByText('Docker')).toBeNull();
    fireEvent.click(screen.getByText('Server'));
    expect(screen.getByText('Docker')).toBeInTheDocument();
  });
});
