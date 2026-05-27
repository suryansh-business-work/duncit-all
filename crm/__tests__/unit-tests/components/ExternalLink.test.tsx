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
});
