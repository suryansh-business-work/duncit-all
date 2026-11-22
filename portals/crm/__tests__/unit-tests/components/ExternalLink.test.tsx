import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExternalLink, { safeHref } from '@/components/ExternalLink';

describe('safeHref', () => {
  it('keeps http(s) links and trims them', () => {
    expect(safeHref(' https://duncit.com/x ')).toBe('https://duncit.com/x');
    expect(safeHref('http://duncit.com')).toBe('http://duncit.com');
  });

  it('turns a bare host into an https link', () => {
    expect(safeHref('instagram.com/duncit')).toBe('https://instagram.com/duncit');
    expect(safeHref('www.duncit.com')).toBe('https://www.duncit.com');
  });

  it('refuses any other scheme and anything that is not an address', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,<b>x</b>')).toBeNull();
    expect(safeHref('mailto:a@b.co')).toBeNull();
    expect(safeHref('')).toBeNull();
  });
});

describe('ExternalLink', () => {
  it('renders a javascript: value as plain text, never as a link', () => {
    render(<ExternalLink href="javascript:alert(1)" />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
  });

  it('links a bare host over https', () => {
    render(<ExternalLink href="instagram.com/duncit" />);
    expect(screen.getByRole('link', { name: /instagram\.com\/duncit/ })).toHaveAttribute('href', 'https://instagram.com/duncit');
  });

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
