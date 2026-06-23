import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MeetingScheduleStrip from './MeetingScheduleStrip';

describe('MeetingScheduleStrip', () => {
  it('renders Venue/Host/Seller counts and opens the calendar on click', () => {
    const onOpen = vi.fn();
    render(<MeetingScheduleStrip counts={{ VENUE: 2, HOST: 1, ECOMM: 0 }} onOpen={onOpen} />);

    expect(screen.getByText('Venue meetings')).toBeInTheDocument();
    expect(screen.getByText('Host meetings')).toBeInTheDocument();
    expect(screen.getByText('Seller meetings')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Venue meetings'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
