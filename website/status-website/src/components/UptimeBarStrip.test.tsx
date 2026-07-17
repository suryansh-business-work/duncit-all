import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import UptimeBarStrip from './UptimeBarStrip';
import type { DailyBar } from '../types';

const daily: DailyBar[] = [
  { date: '2026-07-10', uptime: 100, state: 'operational' },
  { date: '2026-07-11', uptime: 92.5, state: 'degraded' },
];

describe('UptimeBarStrip', () => {
  it('renders nothing when there are no days', () => {
    const { container } = render(<UptimeBarStrip daily={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one titled bar per day with an accessible summary', () => {
    render(<UptimeBarStrip daily={daily} height={26} />);
    const strip = screen.getByRole('img', {
      name: 'Uptime over the last 2 days: 1 fully operational',
    });
    expect(strip).toBeTruthy();
    expect(screen.getByTitle('2026-07-10 · 100.00% · Operational')).toBeTruthy();
    expect(screen.getByTitle('2026-07-11 · 92.50% · Degraded')).toBeTruthy();
  });
});
