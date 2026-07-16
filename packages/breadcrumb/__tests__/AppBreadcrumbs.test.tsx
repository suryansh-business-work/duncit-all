import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppBreadcrumbs } from '../src/AppBreadcrumbs';
import { BreadcrumbProvider, useSetBreadcrumbs } from '../src/BreadcrumbContext';
import type { BreadcrumbNavItem, Crumb } from '../src/types';

const nav: BreadcrumbNavItem[] = [
  { label: 'App', to: '/' },
  { label: 'Venues', to: '/venues', children: [{ label: 'Detail', to: '/venues/detail' }] },
];

const renderAt = (path: string, ui: React.ReactElement) =>
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

function OverrideSetter({ crumbs }: Readonly<{ crumbs: Crumb[] }>) {
  useSetBreadcrumbs(crumbs);
  return null;
}

describe('AppBreadcrumbs', () => {
  it('renders nothing on the home route', () => {
    const { container } = renderAt('/', <AppBreadcrumbs nav={nav} appName="App" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on the login route', () => {
    const { container } = renderAt('/login', <AppBreadcrumbs nav={nav} appName="App" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the trail on a normal route with the home crumb as a link', () => {
    renderAt('/venues/detail', <AppBreadcrumbs nav={nav} appName="App" />);
    expect(screen.getByLabelText('breadcrumb')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /app/i })).toHaveAttribute('href', '/');
    expect(screen.getByText('Venues')).toBeInTheDocument();
    expect(screen.getByText('Detail')).toBeInTheDocument();
  });

  it('applies a labelMap override for a path segment', () => {
    renderAt(
      '/venues/detail/billing',
      <AppBreadcrumbs nav={nav} appName="App" labelMap={{ billing: 'Billing Hub' }} />,
    );
    expect(screen.getByText('Billing Hub')).toBeInTheDocument();
  });

  it('honors a page-set dynamic override for the tail', () => {
    renderAt(
      '/venues/detail/abc',
      <BreadcrumbProvider>
        <OverrideSetter crumbs={[{ label: 'Acme Club' }]} />
        <AppBreadcrumbs nav={nav} appName="App" />
      </BreadcrumbProvider>,
    );
    expect(screen.getByText('Acme Club')).toBeInTheDocument();
  });
});
