import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FreeJoinSuccessPage from '..';
import { FREE_JOIN_SUCCESS, type FreeJoinSuccessData } from '../queries';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});
// The confetti plays a lottie over the page; nothing here is about it.
vi.mock('../../../components/ConfettiOverlay', () => ({ default: () => null }));

const POD: NonNullable<FreeJoinSuccessData['pod']> = {
  id: 'pod-1',
  pod_title: 'Sunday Book Club',
  pod_date_time: '2026-11-01T10:00:00.000Z',
  pod_end_date_time: '2026-11-01T12:00:00.000Z',
};

const answer = (data: FreeJoinSuccessData): MockedResponse => ({
  request: { query: FREE_JOIN_SUCCESS, variables: { id: 'pod-1' } },
  result: { data },
});

function renderPage(mocks: MockedResponse[]) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={['/pod/pod-1/booked']}>
        <Routes>
          <Route path="/pod/:podId/booked" element={<FreeJoinSuccessPage />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

beforeEach(() => mockNavigate.mockReset());

describe('FreeJoinSuccessPage (/pod/:podId/booked)', () => {
  it('shows the loading skeleton while the pod and membership are read', () => {
    renderPage([answer({ pod: POD, podMembershipState: { pod_id: 'pod-1', is_member: true } })]);
    expect(screen.getByTestId('checkout-loading')).toHaveAttribute('role', 'progressbar');
  });

  it('confirms a member’s free spot with the pod and its ticket, and nothing paid', async () => {
    renderPage([answer({ pod: POD, podMembershipState: { pod_id: 'pod-1', is_member: true } })]);
    expect(await screen.findByTestId('checkout-success')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Spot confirmed');
    expect(screen.getByTestId('confirmation-pod')).toHaveTextContent('Sunday Book Club');
    expect(screen.getByTestId('download-ticket')).toBeInTheDocument();
    expect(screen.queryByTestId('download-invoice')).not.toBeInTheDocument();

    // The primary action goes to the member's bookings, the other home.
    expect(screen.getByTestId('success-profile')).toHaveTextContent('My bookings');
    fireEvent.click(screen.getByTestId('success-profile'));
    expect(mockNavigate).toHaveBeenLastCalledWith('/pod-history');
    fireEvent.click(screen.getByTestId('success-home'));
    expect(mockNavigate).toHaveBeenLastCalledWith('/');
  });

  it('congratulates nobody who holds no spot — a hand-typed URL or a since-cancelled spot', async () => {
    renderPage([answer({ pod: POD, podMembershipState: { pod_id: 'pod-1', is_member: false } })]);
    const empty = await screen.findByTestId('checkout-unavailable');
    expect(empty).toHaveTextContent('Pod history record not found.');
    expect(screen.queryByTestId('checkout-success')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows the same empty state when the pod no longer exists', async () => {
    renderPage([answer({ pod: null, podMembershipState: null })]);
    expect(await screen.findByTestId('checkout-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-success')).not.toBeInTheDocument();
  });

  it('shows the server’s error when the read fails', async () => {
    renderPage([
      {
        request: { query: FREE_JOIN_SUCCESS, variables: { id: 'pod-1' } },
        result: { errors: [new GraphQLError('You are not signed in')] },
      },
    ]);
    const alert = await screen.findByTestId('free-join-success-error');
    expect(alert).toHaveTextContent('You are not signed in');
    expect(screen.queryByTestId('checkout-success')).not.toBeInTheDocument();
  });
});
