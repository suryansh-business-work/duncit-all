import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../src/pages/packages-docs/demos/PackageDemos', () => ({
  default: ({ slug }: { slug: string }) => <div data-testid="package-demos">{slug}</div>,
}));
vi.mock('../../src/pages/packages-docs/PackageDocBody', () => ({
  default: ({ markdown }: { markdown: string }) => <div data-testid="package-doc-body">{markdown.slice(0, 20)}</div>,
}));

import PackagesDocsPage from '../../src/pages/packages-docs';
import { PACKAGE_DOCS } from '../../src/pages/packages-docs/package-docs';

const mount = (entry = '/packages') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <PackagesDocsPage />
    </MemoryRouter>,
  );

describe('Package documentation page', () => {
  it('opens the first package when the URL names one that is not documented', () => {
    mount('/packages?pkg=no-such-package');
    expect(screen.getByRole('heading', { name: PACKAGE_DOCS[0].name })).toBeInTheDocument();
  });

  it('shows the package prose by default and its demos from the Demos tab', () => {
    mount('/packages?pkg=table');

    expect(screen.getByTestId('package-doc-body')).toBeInTheDocument();
    expect(screen.queryByTestId('package-demos')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /demo/i }));

    expect(screen.getByTestId('package-demos')).toHaveTextContent('table');
    expect(screen.queryByTestId('package-doc-body')).not.toBeInTheDocument();
  });

  it('switches to another package from the sidebar', () => {
    mount('/packages?pkg=table');
    const other = PACKAGE_DOCS.find((doc) => doc.slug !== 'table') ?? PACKAGE_DOCS[0];

    fireEvent.click(screen.getAllByText(other.name)[0]);

    expect(screen.getByRole('heading', { name: other.name })).toBeInTheDocument();
  });
});
