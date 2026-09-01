import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PackagesDocsPage from '../../src/pages/packages-docs';
import { PACKAGE_DOCS } from '../../src/pages/packages-docs/package-docs';

/**
 * The docs are read from packages/-star-/docs/index.mdx at build time, so this
 * runs against the REAL files. That is the point: a frontmatter shape that
 * drifts, or a glob that silently resolves to nothing, fails here rather than
 * rendering an empty page in production.
 */
describe('package docs', () => {
  it('finds every documented package, not zero of them', () => {
    // A broken glob returns an empty object and the page still renders — which
    // is exactly the failure that would otherwise ship unnoticed.
    expect(PACKAGE_DOCS.length).toBeGreaterThan(20);
  });

  it('reads the frontmatter the docs site validates', () => {
    const comms = PACKAGE_DOCS.find((p) => p.slug === 'communication');
    expect(comms).toBeDefined();
    expect(comms!.name).toBe('@duncit/communication');
    expect(comms!.summary).toContain('Provider-agnostic');
    expect(comms!.category).toBe('domain');
    // Booleans arrive as the string "true" unless they are parsed as booleans.
    expect(comms!.zeroDeps).toBe(true);
    expect(comms!.frameworkFree).toBe(true);
    // Dash lists, not one string.
    expect(comms!.exports).toContain('createEmailChannel');
    expect(comms!.exports.length).toBeGreaterThan(5);
  });

  it('keeps the body and drops the frontmatter block', () => {
    const comms = PACKAGE_DOCS.find((p) => p.slug === 'communication')!;
    expect(comms.body.startsWith('---')).toBe(false);
    expect(comms.body.startsWith('# @duncit/communication')).toBe(false);
    expect(comms.body).toContain('Two channels, one idea');
  });

  it('opens on the first package, since a general index privileges none', () => {
    render(
      <MemoryRouter>
        <PackagesDocsPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: PACKAGE_DOCS[0].name })).toBeInTheDocument();
  });

  it('opens the package named in the URL', () => {
    render(
      <MemoryRouter initialEntries={['/emails/docs?pkg=table']}>
        <PackagesDocsPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: '@duncit/table' })).toBeInTheDocument();
  });
});
