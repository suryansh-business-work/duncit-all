import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CrumbNode } from '../src/CrumbNode';

const withRouter = (ui: React.ReactElement) => <MemoryRouter>{ui}</MemoryRouter>;

describe('CrumbNode', () => {
  it('renders a router link with the home icon for the first navigable crumb', () => {
    const { container } = render(
      withRouter(<CrumbNode crumb={{ label: 'App', to: '/' }} isFirst isLast={false} />),
    );
    const link = screen.getByRole('link', { name: /app/i });
    expect(link).toHaveAttribute('href', '/');
    expect(container.querySelector('svg[data-testid="HomeIcon"]')).toBeInTheDocument();
  });

  it('renders a middle navigable crumb as a link without the home icon', () => {
    const { container } = render(
      withRouter(<CrumbNode crumb={{ label: 'Venues', to: '/venues' }} isFirst={false} isLast={false} />),
    );
    expect(screen.getByRole('link', { name: 'Venues' })).toHaveAttribute('href', '/venues');
    expect(container.querySelector('svg[data-testid="HomeIcon"]')).not.toBeInTheDocument();
  });

  it('renders the last crumb as bold plain text even when it has a `to`', () => {
    render(
      withRouter(<CrumbNode crumb={{ label: 'Detail', to: '/x' }} isFirst={false} isLast />),
    );
    const node = screen.getByText('Detail');
    expect(node.closest('a')).toBeNull();
    expect(node).toHaveStyle({ fontWeight: '700' });
  });

  it('renders a non-navigable, non-last first crumb as secondary text with the home icon', () => {
    const { container } = render(
      withRouter(<CrumbNode crumb={{ label: 'Solo' }} isFirst isLast={false} />),
    );
    const node = screen.getByText('Solo');
    expect(node.closest('a')).toBeNull();
    expect(node).toHaveStyle({ fontWeight: '500' });
    expect(container.querySelector('svg[data-testid="HomeIcon"]')).toBeInTheDocument();
  });
});
