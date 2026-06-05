import { screen } from '@testing-library/react-native';

import { HealthBreakdown, HealthMeter } from '@/components/health';
import { renderWithProviders } from '@/utils/test-utils';
import type { HealthScoreLike } from '@/utils/health';

const score = (over: Partial<HealthScoreLike> = {}): HealthScoreLike => ({
  base_score: 100,
  delta_sum: 0,
  total_score: 100,
  band: 'GREEN',
  adjustments: [],
  ...over,
});

describe('HealthMeter', () => {
  it('renders the clamped score and label', () => {
    renderWithProviders(<HealthMeter score={150} band="GREEN" label="Account Health" />);
    expect(screen.getByText('100')).toBeOnTheScreen();
    expect(screen.getByText('/ 100')).toBeOnTheScreen();
    expect(screen.getByText('Account Health')).toBeOnTheScreen();
  });

  it('renders an optional caption', () => {
    renderWithProviders(<HealthMeter score={40} band="RED" caption="Tap for details" />);
    expect(screen.getByText('Tap for details')).toBeOnTheScreen();
  });
});

describe('HealthBreakdown', () => {
  it('shows the score, band label and the empty-remarks state', () => {
    renderWithProviders(<HealthBreakdown score={score()} />);
    expect(screen.getByText('100')).toBeOnTheScreen();
    expect(screen.getByText('In great shape')).toBeOnTheScreen();
    expect(screen.getByText('Base score: 100')).toBeOnTheScreen();
    expect(screen.getByTestId('health-no-remarks')).toBeOnTheScreen();
  });

  it('lists admin remarks with signed deltas and the adjustment caption', () => {
    renderWithProviders(
      <HealthBreakdown
        score={score({
          band: 'YELLOW',
          delta_sum: -8,
          total_score: 92,
          adjustments: [
            {
              id: 'a1',
              delta: 5,
              remark: 'Great host',
              created_by_name: 'Admin',
              created_at: '2026-06-01T10:00:00Z',
            },
            {
              id: 'a2',
              delta: -13,
              remark: 'Late cancel',
              created_by_name: 'Mod',
              created_at: '2026-06-02T10:00:00Z',
            },
          ],
        })}
      />,
    );
    expect(screen.getByText('Doing OK')).toBeOnTheScreen();
    expect(screen.getByText('Base score: 100 · Admin adjustment: -8')).toBeOnTheScreen();
    expect(screen.getByTestId('health-remark-a1')).toBeOnTheScreen();
    expect(screen.getByText('+5')).toBeOnTheScreen();
    expect(screen.getByText('-13')).toBeOnTheScreen();
    expect(screen.getByText(/Great host/)).toBeOnTheScreen();
  });
});
