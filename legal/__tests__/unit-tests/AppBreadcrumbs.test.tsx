import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppBreadcrumbs from '../../src/components/AppBreadcrumbs';

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppBreadcrumbs />
    </MemoryRouter>
  );

describe('AppBreadcrumbs', () => {
  it('renders nothing on the dashboard root', () => {
    const { container } = at('/');
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on the login route', () => {
    const { container } = at('/login');
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the section crumb for a top-level nav route', () => {
    at('/documents');
    expect(screen.getByText('Legal')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
  });

  it('labels a 24-hex object id segment as "Detail"', () => {
    at('/documents/abcdef0123456789abcdef01');
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Detail')).toBeInTheDocument();
  });

  it('labels a UUID segment as "Detail"', () => {
    at('/documents/00000000-0000-0000-0000-000000000000');
    expect(screen.getByText('Detail')).toBeInTheDocument();
  });

  it('humanises a non-id detail segment', () => {
    at('/documents/new-doc');
    expect(screen.getByText('New Doc')).toBeInTheDocument();
  });

  it('falls back to path segments for an unmapped route', () => {
    at('/unknown/page');
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('Page')).toBeInTheDocument();
  });
});
