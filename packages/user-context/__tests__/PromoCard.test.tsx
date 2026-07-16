import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PromoCard from '../src/login-screen/PromoCard';

describe('PromoCard', () => {
  it('splits a multi-word title into a solid first word + muted rest', () => {
    render(<PromoCard title="Run every pod" text="Body copy" brandName="Duncit" />);
    expect(screen.getByText('Run')).toBeInTheDocument();
    expect(screen.getByText('every pod')).toBeInTheDocument();
    expect(screen.getByText('Body copy')).toBeInTheDocument();
    expect(screen.getByText('By Duncit')).toBeInTheDocument();
  });

  it('renders a single-word title without the muted remainder', () => {
    render(<PromoCard title="Welcome" text="Body" brandName="Duncit" />);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    // No trailing muted span exists, so the Explore CTA is the only extra text.
    expect(screen.getByText('Explore')).toBeInTheDocument();
  });
});
