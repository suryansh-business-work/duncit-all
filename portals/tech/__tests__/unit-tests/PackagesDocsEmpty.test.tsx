import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

// A build whose glob matched nothing — the failure the real-docs suite exists to catch,
// reproduced here so the page's own answer to it is pinned.
vi.mock('../../src/pages/packages-docs/package-docs', () => ({ PACKAGE_DOCS: [] }));

import PackagesDocsPage from '../../src/pages/packages-docs';

describe('Package documentation page without any compiled docs', () => {
  it('says so instead of rendering an empty page', () => {
    render(
      <MemoryRouter>
        <PackagesDocsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('No package docs were compiled into this build.')).toBeInTheDocument();
    expect(screen.getByText(/0 packages documented/)).toBeInTheDocument();
  });

  it('opens a named package that does not exist as the same empty notice', () => {
    render(
      <MemoryRouter initialEntries={['/packages?pkg=table']}>
        <PackagesDocsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('No package docs were compiled into this build.')).toBeInTheDocument();
  });
});
