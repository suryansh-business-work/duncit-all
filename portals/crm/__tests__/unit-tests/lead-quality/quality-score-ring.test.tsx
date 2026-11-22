import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import QualityScoreRing, { toneOf } from '@/components/lead-quality/QualityScoreRing';

/** The two progress circles: the full grey track, then the filled score. */
const filled = () => screen.getAllByRole('progressbar', { hidden: true })[1];

describe('QualityScoreRing', () => {
  it('reads the score and classification out as one image, and fills the ring to the score', () => {
    render(<QualityScoreRing score={72} tone="warning" label="Good" />);

    expect(screen.getByRole('img', { name: 'Quality score 72 out of 100, Good' })).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(filled()).toHaveAttribute('aria-valuenow', '72');
  });

  it('never shows more than 100 or less than 0', () => {
    const { rerender } = render(<QualityScoreRing score={130} tone="success" label="Excellent" />);
    expect(screen.getByRole('img', { name: 'Quality score 100 out of 100, Excellent' })).toBeInTheDocument();
    expect(filled()).toHaveAttribute('aria-valuenow', '100');

    rerender(<QualityScoreRing score={-5} tone="error" label="Weak" />);
    expect(screen.getByRole('img', { name: 'Quality score 0 out of 100, Weak' })).toBeInTheDocument();
    expect(filled()).toHaveAttribute('aria-valuenow', '0');
  });

  it('says a lead is not scored yet instead of showing 0', () => {
    render(<QualityScoreRing score={null} size="large" />);

    expect(screen.getByRole('img', { name: 'Not scored yet' })).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    // The "/100" caption belongs to a real score only.
    expect(screen.queryByText('/100')).not.toBeInTheDocument();
  });

  it('shows "/100" under a scored large ring', () => {
    render(<QualityScoreRing score={88.4} size="large" label="Excellent" />);
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('becomes a named button that opens the breakdown when clickable', () => {
    const onClick = vi.fn();
    render(<QualityScoreRing score={64} label="Good" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open the quality score breakdown (64/100)' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('colours by the band tone and treats an unknown tone as red', () => {
    expect(toneOf('success')).toBe('success');
    expect(toneOf('warning')).toBe('warning');
    expect(toneOf('purple')).toBe('error');
    expect(toneOf(null)).toBe('error');
  });
});
