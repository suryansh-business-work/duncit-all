import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import RangeFilter from '../../../src/pages/dashboard/RangeFilter';
import { renderWithProviders } from '../../testkit';

const RANGE = { from: new Date(2026, 8, 27), to: new Date(2026, 9, 26) };

describe('RangeFilter', () => {
  it('offers a From and a To day, with no complaint about a sound window', () => {
    renderWithProviders(<RangeFilter range={RANGE} problem={null} onChange={vi.fn()} />);
    expect(screen.getAllByText('From').length).toBeGreaterThan(0);
    expect(screen.getAllByText('To').length).toBeGreaterThan(0);
    expect(screen.queryByText('Pick a From day on or before the To day.')).not.toBeInTheDocument();
    expect(screen.queryByText('Pick a window of a year or less.')).not.toBeInTheDocument();
  });

  it('explains a window that runs backwards', () => {
    renderWithProviders(<RangeFilter range={RANGE} problem="order" onChange={vi.fn()} />);
    expect(screen.getByText('Pick a From day on or before the To day.')).toBeInTheDocument();
  });

  it('explains a window longer than the server answers', () => {
    renderWithProviders(<RangeFilter range={RANGE} problem="length" onChange={vi.fn()} />);
    expect(screen.getByText('Pick a window of a year or less.')).toBeInTheDocument();
  });
});
