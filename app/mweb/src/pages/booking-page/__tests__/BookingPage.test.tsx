import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';
import BookingPage from '..';
import { BOOKING_DETAIL, type BookingDetail } from '../queries';

const booking: BookingDetail = {
  id: 'booking-1',
  pod_id: 'pod-doc-1',
  club_slug: 'sunset-club',
  pod_slug: 'rooftop-jam',
  pod_title: 'Sunset Rooftop Jam',
  pod_date_time: '2026-08-12T12:30:00.000Z',
  status: 'JOINED',
};

const detailMock = (result: BookingDetail | null, errors?: GraphQLError[]) => ({
  request: { query: BOOKING_DETAIL, variables: { booking_id: 'booking-1' } },
  result: errors ? { errors } : { data: { bookingDetail: result } },
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="pathname">{location.pathname}</div>;
}

const renderPage = (mocks: unknown[]) =>
  render(
    <MockedProvider mocks={mocks as never}>
      <MemoryRouter initialEntries={['/booking/booking-1']}>
        <Routes>
          <Route path="/booking/:bookingId" element={<BookingPage />} />
          <Route path="/club/:clubSlug/pod/:podSlug" element={<div>PodDetailsStub</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </MockedProvider>,
  );

describe('BookingPage (booking deep link, native BookingScreen twin)', () => {
  it('shows the spinner while the booking resolves', () => {
    renderPage([detailMock(booking)]);
    expect(screen.getByTestId('booking-loading')).toBeInTheDocument();
  });

  it('forwards to the pod detail page once the booking resolves', async () => {
    renderPage([detailMock(booking)]);
    expect(await screen.findByText('PodDetailsStub')).toBeInTheDocument();
    expect(screen.getByTestId('pathname')).toHaveTextContent('/club/sunset-club/pod/rooftop-jam');
  });

  it('surfaces the server ownership error instead of the pod', async () => {
    renderPage([
      detailMock(null, [new GraphQLError('You are not authorized to view this booking.')]),
    ]);
    expect(await screen.findByTestId('booking-error')).toHaveTextContent(
      'You are not authorized to view this booking.',
    );
    expect(screen.queryByText('PodDetailsStub')).not.toBeInTheDocument();
  });
});
