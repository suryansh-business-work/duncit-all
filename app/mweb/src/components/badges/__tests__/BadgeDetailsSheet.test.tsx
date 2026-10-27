import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import BadgeDetailsSheet from '../BadgeDetailsSheet';

vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  formatDate: (d: string) => `day:${d}`,
}));

const sheet = (props: Partial<Parameters<typeof BadgeDetailsSheet>[0]> = {}) =>
  render(<BadgeDetailsSheet open onClose={vi.fn()} badge={{ title: 'Explorer' }} {...props} />);

describe('BadgeDetailsSheet', () => {
  it('renders nothing without a badge', () => {
    sheet({ badge: null });
    expect(screen.queryByTestId('badge-details-sheet')).not.toBeInTheDocument();
  });

  it('shows title, description, condition with threshold, progress and award date', () => {
    sheet({
      badge: {
        title: 'Host Hero',
        description: 'Hosted many pods',
        condition_type: 'POD_HOST_COUNT',
        threshold: 10,
        image_url: 'https://img/b.png',
      },
      awardedAt: '2026-05-01',
      awardedReason: 'Hosted 4 / 10 pods',
    });
    expect(screen.getByTestId('badge-details-sheet-title')).toHaveTextContent('Host Hero');
    expect(screen.getByText('Pods hosted · ≥ 10')).toBeInTheDocument();
    expect(screen.getByText('Hosted many pods')).toBeInTheDocument();
    expect(screen.getByTestId('badge-details-sheet-progress')).toHaveTextContent('4 / 10');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('Earned on day:2026-05-01')).toBeInTheDocument();
  });

  it('caps progress at 100 percent when over the target', () => {
    sheet({ awardedReason: '12/10' });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('shows a full bar for a zero target instead of dividing by zero', () => {
    sheet({ awardedReason: '3 / 0' });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('shows no progress when the reason has no fraction or is empty', () => {
    sheet({ awardedReason: 'Awarded for being great' });
    expect(screen.queryByTestId('badge-details-sheet-progress')).not.toBeInTheDocument();
    sheet({ awardedReason: '' });
    expect(screen.getAllByTestId('badge-details-sheet-title').length).toBeGreaterThan(0);
  });

  it('labels the condition without a threshold, and falls back to the raw type or a default title', () => {
    sheet({ badge: { condition_type: 'MANUAL' } });
    expect(screen.getByText('Awarded by admin')).toBeInTheDocument();
    expect(screen.getByTestId('badge-details-sheet-title')).toHaveTextContent('Badge');
    expect(screen.queryByText(/Earned on/)).not.toBeInTheDocument();
    expect(screen.queryByText('About this badge')).not.toBeInTheDocument();
  });

  it('shows an unknown condition type as-is and none when absent', () => {
    const { unmount } = sheet({ badge: { title: 'X', condition_type: 'NEW_KIND' } });
    expect(screen.getByText('NEW_KIND')).toBeInTheDocument();
    unmount();
    sheet({ badge: { title: 'Y' } });
    expect(screen.queryByText('NEW_KIND')).not.toBeInTheDocument();
  });
});
