import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from '../../src/pages/DashboardPage';
import { renderWithProviders } from '../testkit';
import { dashboardMocks } from '../mocks/dashboard.mock';

const sockMock = vi.hoisted(() => ({ events: {} as Record<string, () => void> }));
vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: (events: Record<string, () => void>) => {
    sockMock.events = events;
    return { current: null };
  },
}));

describe('DashboardPage', () => {
  it('renders live counts and navigates from a stat card', async () => {
    renderWithProviders(<></>, {
      mocks: dashboardMocks(),
      initialEntries: ['/'],
      routes: (
        <>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sos" element={<div>SOS PAGE</div>} />
        </>
      ),
    });
    await waitFor(() => expect(screen.getByText('Active SOS alerts')).toBeInTheDocument());
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();

    // Cover every live-refetch callback.
    sockMock.events.onSos();
    sockMock.events.onSosUpdate();
    sockMock.events.onCallback();
    sockMock.events.onCallbackUpdate();
    sockMock.events.onTicketNew();
    sockMock.events.onTicketUpdate();
    sockMock.events.onChatSessionNew();
    sockMock.events.onChatSessionUpdate();

    fireEvent.click(screen.getByText('Active SOS alerts'));
    await waitFor(() => expect(screen.getByText('SOS PAGE')).toBeInTheDocument());
  });
});
