/**
 * The chip row two read-only Auto Pod summaries share — the template's review
 * step in `@duncit/pod-form` and the admin console's offer page. Both draw a
 * pod's hashtags, perks and what it offers, so the empty state and the chip
 * text have to read the same in each (rule 40).
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChipList } from '../src/ChipList';

describe('ChipList', () => {
  it('draws one chip per value, in the order it was given', () => {
    const { container } = render(<ChipList items={['Water', 'Parking']} empty="—" />);
    expect(screen.getByText('Water')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
    expect(container.textContent).not.toContain('—');
  });

  // An Auto Pod template often has nothing under a heading yet, and the summary
  // has to say so rather than leave the row blank.
  it('draws the caller’s empty text when there is nothing to show', () => {
    const { container } = render(<ChipList items={[]} empty="—" />);
    expect(container.textContent).toBe('—');
  });

  it('takes the caller’s chip size', () => {
    const { container } = render(<ChipList items={['Coaching']} empty="—" size="medium" />);
    expect(container.querySelector('.MuiChip-sizeMedium')).not.toBeNull();
  });
});
