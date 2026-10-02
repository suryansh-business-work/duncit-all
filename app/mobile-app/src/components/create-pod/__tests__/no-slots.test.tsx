import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ClubPreview } from '../ClubPreview';
import { ClubSearchField } from '../ClubSearchField';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;

const openClub = {
  id: 'club-open',
  club_name: 'Noida Badminton Club',
  location_id: 'loc-1',
  available_slots_count: 4,
};
const emptyClub = {
  id: 'club-empty',
  club_name: 'Sector 62 Runners',
  location_id: 'loc-1',
  available_slots_count: 0,
};
const clubs = [openClub, emptyClub];

function renderField(podMode: string, value = '') {
  const onChange = jest.fn();
  renderWithProviders(
    <ClubSearchField
      clubs={clubs}
      locations={[]}
      value={value}
      onChange={onChange}
      locality=""
      locked={false}
      podMode={podMode}
    />,
  );
  return onChange;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Create Pod step 1 — clubs with no open slots', () => {
  it('names each club’s open slots for a physical pod and selects a club that has some', () => {
    const onChange = renderField('PHYSICAL', 'club-open');
    expect(screen.getByTestId('create-pod-club-club-open-note')).toHaveTextContent('4 open slots');
    expect(screen.getByTestId('create-pod-club-club-empty-note')).toHaveTextContent(
      'No open slots',
    );
    fireEvent.press(screen.getByTestId('create-pod-club-club-open'));
    expect(onChange).toHaveBeenCalledWith('club-open');
  });

  it('opens the warning instead of selecting a club with none, and closes on Choose another club', () => {
    const onChange = renderField('PHYSICAL');
    fireEvent.press(screen.getByTestId('create-pod-club-club-empty'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('No slots available in this club')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('create-pod-no-slots-choose'));
    expect(screen.queryByText('No slots available in this club')).toBeNull();
  });

  it('messages the club admin and retires the button once they are told', async () => {
    mockRequest.mockResolvedValueOnce({ requestClubVenueSlots: { status: 'SENT', notified: 2 } });
    renderField('PHYSICAL');
    fireEvent.press(screen.getByTestId('create-pod-club-club-empty'));
    fireEvent.press(screen.getByTestId('create-pod-no-slots-notify'));
    await waitFor(() =>
      expect(screen.getByTestId('create-pod-no-slots-notice')).toHaveTextContent(/Message sent/),
    );
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { club_doc_id: 'club-empty' },
      { auth: true },
    );
  });

  it('says so when the club has no admin', async () => {
    mockRequest.mockResolvedValueOnce({
      requestClubVenueSlots: { status: 'NO_CLUB_ADMIN', notified: 0 },
    });
    renderField('PHYSICAL');
    fireEvent.press(screen.getByTestId('create-pod-club-club-empty'));
    fireEvent.press(screen.getByTestId('create-pod-no-slots-notify'));
    await waitFor(() =>
      expect(screen.getByTestId('create-pod-no-slots-notice')).toHaveTextContent(/no club admin/),
    );
  });

  it('keeps the button for a retry when the request fails', async () => {
    mockRequest.mockRejectedValueOnce(new Error('offline'));
    renderField('PHYSICAL');
    fireEvent.press(screen.getByTestId('create-pod-club-club-empty'));
    fireEvent.press(screen.getByTestId('create-pod-no-slots-notify'));
    await waitFor(() =>
      expect(screen.getByTestId('create-pod-no-slots-notice')).toHaveTextContent(/Could not send/),
    );
  });

  it('never blocks or counts slots for a virtual pod', () => {
    const onChange = renderField('VIRTUAL');
    expect(screen.queryByTestId('create-pod-club-club-empty-note')).toBeNull();
    fireEvent.press(screen.getByTestId('create-pod-club-club-empty'));
    expect(onChange).toHaveBeenCalledWith('club-empty');
  });

  it('shows the picked club’s open slots in the preview, warning at none', () => {
    const open = renderWithProviders(<ClubPreview club={openClub} showSlots />);
    expect(screen.getByTestId('club-preview-slot-count')).toHaveTextContent('4 open slots');
    open.unmount();
    const none = renderWithProviders(<ClubPreview club={emptyClub} showSlots />);
    expect(screen.getByTestId('club-preview-slot-count')).toHaveTextContent('No open slots');
    none.unmount();
    renderWithProviders(<ClubPreview club={openClub} />);
    expect(screen.queryByTestId('club-preview-slot-count')).toBeNull();
  });
});
