import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  it('shows the current year, app name and the external links', () => {
    render(<Footer appName="Duncit" />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${year} Duncit`))).toBeTruthy();
    expect(screen.getByRole('link', { name: 'duncit.com' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'API health' })).toBeTruthy();
  });
});
