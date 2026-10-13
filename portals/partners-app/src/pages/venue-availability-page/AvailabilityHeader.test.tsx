import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import AvailabilityHeader from './AvailabilityHeader';
import { renderWithProviders } from '../../__tests__/render';

afterEach(cleanup);

describe('AvailabilityHeader', () => {
  it('names the venue whose calendar this is', () => {
    renderWithProviders(<AvailabilityHeader venueName="Skyline Banquets" onBack={vi.fn()} />);
    expect(screen.getByText(/Skyline Banquets/)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('shows a placeholder until the venue name is known', () => {
    renderWithProviders(<AvailabilityHeader onBack={vi.fn()} />);
    expect(screen.getByText(/…/)).toBeTruthy();
  });

  it('goes back to the venue list from the back button', () => {
    const onBack = vi.fn();
    renderWithProviders(<AvailabilityHeader venueName="Skyline Banquets" onBack={onBack} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
