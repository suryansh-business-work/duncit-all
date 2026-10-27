import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import ConsentDetails from '../../../src/pages/connect/ConsentDetails';
import { authRequest } from '../../mocks/fixtures';
import { renderWithProviders } from '../../testkit';

describe('ConsentDetails', () => {
  it('shows the app’s self-declared website as plain text, never as a link', () => {
    renderWithProviders(<ConsentDetails request={authRequest({ client_uri: 'https://claude.ai' })} />);
    expect(screen.getByText('Its website')).toBeInTheDocument();
    expect(screen.getByText('https://claude.ai')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('leaves the website row out when the app registered none', () => {
    renderWithProviders(<ConsentDetails request={authRequest({ client_uri: null })} />);
    expect(screen.queryByText('Its website')).not.toBeInTheDocument();
    expect(screen.getByText('Request expires')).toBeInTheDocument();
  });

  it('marks a trusted redirect host and raises no warning', () => {
    renderWithProviders(<ConsentDetails request={authRequest({ trusted: true })} />);
    expect(screen.getByText('Trusted')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('flags an untrusted redirect host by name before anyone approves', () => {
    renderWithProviders(<ConsentDetails request={authRequest({ trusted: false, redirect_host: 'localhost.evil.example' })} />);
    expect(screen.getByText('Not trusted')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Duncit does not know localhost.evil.example.');
  });
});
