import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExternalLink from '@/components/ExternalLink';

describe('ExternalLink', () => {
  it('opens in a new tab with rel="noreferrer noopener"', () => {
    render(<ExternalLink href="https://duncit.com">duncit.com</ExternalLink>);
    const anchor = screen.getByRole('link', { name: /duncit\.com/i }) as HTMLAnchorElement;
    expect(anchor).toBeInTheDocument();
    expect(anchor.target).toBe('_blank');
    expect(anchor.rel).toContain('noreferrer');
    expect(anchor.rel).toContain('noopener');
    expect(anchor.href).toContain('https://duncit.com');
  });

  it('falls back to href as the displayed text when no children are passed', () => {
    render(<ExternalLink href="https://server.duncit.com" />);
    expect(screen.getByRole('link', { name: /server\.duncit\.com/i })).toBeInTheDocument();
  });

  it('shows the external-link icon by default and drops it when asked to', () => {
    const { rerender } = render(<ExternalLink href="https://duncit.com">Site</ExternalLink>);
    expect(screen.getByTestId('OpenInNewIcon')).toBeInTheDocument();

    rerender(
      <ExternalLink href="https://duncit.com" withIcon={false}>
        Site
      </ExternalLink>,
    );
    expect(screen.queryByTestId('OpenInNewIcon')).toBeNull();
  });

  it('layers a caller sx object over its own styles', () => {
    render(
      <ExternalLink href="https://duncit.com" sx={{ textTransform: 'uppercase' }}>
        Site
      </ExternalLink>,
    );
    const anchor = screen.getByRole('link', { name: 'Site' });
    expect(anchor).toHaveStyle({ textTransform: 'uppercase', display: 'inline-flex' });
  });

  it('layers every entry of a caller sx array over its own styles', () => {
    render(
      <ExternalLink href="https://duncit.com" sx={[{ textTransform: 'uppercase' }, { display: 'block' }]}>
        Site
      </ExternalLink>,
    );
    const anchor = screen.getByRole('link', { name: 'Site' });
    expect(anchor).toHaveStyle({ textTransform: 'uppercase', display: 'block' });
  });
});
