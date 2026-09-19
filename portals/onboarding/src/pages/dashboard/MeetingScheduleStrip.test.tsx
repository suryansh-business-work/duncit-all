import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MeetingScheduleStrip from './MeetingScheduleStrip';

describe('MeetingScheduleStrip', () => {
  it('renders Venue/Host/E-Commerce Brand counts and opens the calendar on click', () => {
    const onOpen = vi.fn();
    render(
      <MeetingScheduleStrip
        counts={{ VENUE: 2, HOST: 1, ECOMM: 0 }}
        kinds={['VENUE', 'HOST', 'ECOMM']}
        onOpen={onOpen}
      />,
    );

    expect(screen.getByText('Venue meetings')).toBeInTheDocument();
    expect(screen.getByText('Host meetings')).toBeInTheDocument();
    expect(screen.getByText('E-Commerce Brand meetings')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Venue meetings'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith('VENUE');
  });

  // E-commerce sits behind a system flag: the parent leaves the kind out.
  it('draws only the kinds it is given', () => {
    render(
      <MeetingScheduleStrip
        counts={{ VENUE: 2, HOST: 1, ECOMM: 0 }}
        kinds={['VENUE', 'HOST']}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText('Host meetings')).toBeInTheDocument();
    expect(screen.queryByText('E-Commerce Brand meetings')).not.toBeInTheDocument();
  });
});
