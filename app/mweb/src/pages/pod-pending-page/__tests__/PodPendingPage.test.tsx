import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing/react';
import { describe, expect, it, vi } from 'vitest';
import PodPendingPage from '..';
import { HOST_POD_PENDING_VIEW, type PodPendingView } from '../queries';

// Deterministic date output — the admin-configured formatter is covered by its
// own suite; this test asserts the page wiring.
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({
    formatDateTime: () => '12 Aug 2026, 18:00',
    formatTime: () => '21:00',
  }),
}));

const view: PodPendingView = {
  pod: {
    id: 'pod-doc-1',
    pod_title: 'Sunset Rooftop Jam',
    pod_images_and_videos: [{ url: 'https://img.test/cover.jpg', type: 'IMAGE' }],
    pod_date_time: '2026-08-12T12:30:00.000Z',
    pod_end_date_time: '2026-08-12T15:30:00.000Z',
    place_label: 'The Loft',
    place_detail: 'Indiranagar',
    venue_approval_status: 'PENDING',
  },
  category_name: 'Music',
  expected_earnings: 4200,
  currency_symbol: '₹',
  venue: {
    venue_id: 'v1',
    venue_name: 'The Loft',
    contact_person: 'Asha Rao',
    phone: '+91 98765 43210',
    email: 'venue@loft.test',
    address: '12 Main St',
    lat: 12.9,
    lng: 77.6,
  },
  club_admin: {
    user_id: 'u9',
    name: 'Rahul Menon',
    profile_photo: 'https://img.test/admin.jpg',
    phone: '+91 90000 11111',
    whatsapp: '+91 90000 11111',
    email: 'admin@duncit.test',
  },
};

const viewMock = (data: PodPendingView | null, error?: Error) => ({
  request: { query: HOST_POD_PENDING_VIEW, variables: { pod_doc_id: 'pod-doc-1' } },
  ...(error ? { error } : { result: { data: { hostPodPendingView: data } } }),
});

const renderPage = (mocks: unknown[]) =>
  render(
    <MockedProvider mocks={mocks as never}>
      <MemoryRouter initialEntries={['/host/pod-pending/pod-doc-1']}>
        <Routes>
          <Route path="/host/pod-pending/:podId" element={<PodPendingPage />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );

describe('PodPendingPage (native PodPendingScreen twin, rule 27)', () => {
  it('shows the spinner while the pending view loads', () => {
    renderPage([viewMock(view)]);
    expect(screen.getByTestId('pod-pending-loading')).toBeInTheDocument();
  });

  it('renders the banner, pod summary, venue card and club-admin card', async () => {
    renderPage([viewMock(view)]);
    expect(await screen.findByTestId('pod-pending-banner')).toBeInTheDocument();
    expect(
      screen.getByText('Your Pod will go live once the venue accepts your slot request.'),
    ).toBeInTheDocument();

    expect(screen.getByText('Sunset Rooftop Jam')).toBeInTheDocument();
    expect(screen.getByTestId('pod-pending-image')).toHaveAttribute(
      'src',
      'https://img.test/cover.jpg',
    );
    expect(screen.getByTestId('pod-pending-when')).toHaveTextContent('12 Aug 2026, 18:00 → 21:00');
    expect(screen.getByTestId('pod-pending-earnings')).toHaveTextContent('4200');
    expect(screen.getByTestId('pod-pending-location')).toHaveTextContent('The Loft · Indiranagar');
    expect(screen.getByTestId('pod-pending-category')).toHaveTextContent('Music');
    expect(screen.getByTestId('pod-pending-status')).toHaveTextContent('Awaiting venue approval');

    expect(screen.getByTestId('venue-pending-badge')).toHaveTextContent('Pending Approval');
    expect(screen.getByTestId('venue-pending-contact')).toHaveTextContent('Asha Rao');
    expect(screen.getByTestId('venue-pending-map')).toHaveAttribute(
      'href',
      expect.stringContaining('query=12.9%2C77.6'),
    );

    expect(screen.getByTestId('club-admin-card')).toHaveTextContent(
      'Need Help? Contact the Club Admin',
    );
    expect(screen.getByTestId('club-admin-call')).toHaveAttribute('href', 'tel:+91 90000 11111');
    expect(screen.getByTestId('club-admin-message')).toHaveAttribute(
      'href',
      'https://wa.me/919000011111',
    );
    expect(screen.getByTestId('club-admin-email-action')).toHaveAttribute(
      'href',
      'mailto:admin@duncit.test',
    );
  });

  it('omits the venue and club-admin cards when the pod has neither', async () => {
    renderPage([viewMock({ ...view, venue: null, club_admin: null })]);
    expect(await screen.findByTestId('pod-pending-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('venue-pending-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('club-admin-card')).not.toBeInTheDocument();
  });

  it('shows the query error message', async () => {
    renderPage([viewMock(null, new Error('Forbidden'))]);
    expect(await screen.findByTestId('pod-pending-error')).toHaveTextContent('Forbidden');
  });
});
