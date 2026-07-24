import { Linking } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { EarnScreen } from '@/screens/EarnScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
let focusCallback: (() => void) | undefined;
const mockAddListener = jest.fn((_event: string, cb: () => void) => {
  focusCallback = cb;
  return jest.fn();
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    canGoBack: () => true,
    navigate: mockNavigate,
    goBack: jest.fn(),
    addListener: mockAddListener,
  }),
}));
const mockUseMe = jest.fn();
jest.mock('@/hooks/useMe', () => ({ useMe: () => mockUseMe() }));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
// Products gated on by default so the "By listing your product" box shows; the
// off path (box hidden) has its own test.
const mockFeatureFlag = jest.fn().mockReturnValue(true);
jest.mock('@/hooks/useFeatureFlag', () => ({
  useFeatureFlag: (key: string, fallback?: boolean) => mockFeatureFlag(key, fallback),
}));
const opName = (doc: { definitions?: { name?: { value?: string } }[] }) =>
  doc?.definitions?.[0]?.name?.value;

beforeEach(() => {
  jest.clearAllMocks();
  mockFeatureFlag.mockReturnValue(true);
  mockUseMe.mockReturnValue({ data: { me: { roles: ['HOST'] } } });
  mockRequest.mockResolvedValue({ myMeetings: [] });
});

describe('EarnScreen', () => {
  it('disables held-role boxes and navigates from an available one', async () => {
    renderWithProviders(<EarnScreen />);
    expect(screen.getByTestId('earn-box-HOST-enabled')).toBeOnTheScreen();
    expect(screen.queryByTestId('earn-box-VENUE_OWNER-enabled')).toBeNull();
    fireEvent.press(screen.getByTestId('earn-box-VENUE_OWNER'));
    expect(mockNavigate).toHaveBeenCalledWith('RegisterVenue');
  });

  it('treats a user with no roles as all-available', async () => {
    mockUseMe.mockReturnValue({ data: {} });
    renderWithProviders(<EarnScreen />);
    expect(screen.queryByTestId('earn-box-HOST-enabled')).toBeNull();
    fireEvent.press(screen.getByTestId('earn-box-ECOMM_MANAGER'));
    expect(mockNavigate).toHaveBeenCalledWith('ListProduct');
  });

  it('blocks a box while its meeting is scheduled, and while a done meeting awaits approval', async () => {
    mockUseMe.mockReturnValue({ data: { me: { roles: [] } } });
    mockRequest.mockResolvedValue({
      myMeetings: [
        {
          id: 'm1',
          kind: 'VENUE',
          status: 'SCHEDULED',
          approval_status: 'NONE',
          requested_at: null,
          scheduled_at: '2027-01-04T04:30:00.000Z',
        },
        {
          // DONE with no approval yet (approval_status omitted → defaults to NONE).
          id: 'm2',
          kind: 'HOST',
          status: 'DONE',
          requested_at: '2027-01-01T04:30:00.000Z',
          scheduled_at: null,
        },
      ],
    });
    renderWithProviders(<EarnScreen />);
    await waitFor(() => expect(screen.getByText('Meeting scheduled')).toBeOnTheScreen());
    expect(screen.getByText(/unlocks once the meeting is done/)).toBeOnTheScreen();
    // Business rule: a non-approved (meeting) state must NOT expose a next-step CTA.
    expect(screen.queryByTestId('earn-box-VENUE_OWNER-cta')).toBeNull();
    // Pending venue meeting blocks the venue box…
    fireEvent.press(screen.getByTestId('earn-box-VENUE_OWNER'));
    expect(mockNavigate).not.toHaveBeenCalled();
    // …and a DONE host meeting awaiting approval now reads "Onboarding in process."
    expect(screen.getByText('Onboarding in process.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('earn-box-HOST'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('re-enables the box once onboarding is approved or denied', async () => {
    mockUseMe.mockReturnValue({ data: { me: { roles: [] } } });
    mockRequest.mockResolvedValue({
      myMeetings: [
        {
          id: 'm1',
          kind: 'VENUE',
          status: 'DONE',
          approval_status: 'APPROVED',
          requested_at: '2027-01-01T04:30:00.000Z',
          scheduled_at: null,
        },
        {
          id: 'm2',
          kind: 'HOST',
          status: 'DONE',
          approval_status: 'DENIED',
          requested_at: '2027-01-01T04:30:00.000Z',
          scheduled_at: null,
        },
      ],
    });
    renderWithProviders(<EarnScreen />);
    await waitFor(() => expect(screen.queryByTestId('earn-box-VENUE_OWNER-enabled')).toBeNull());
    expect(screen.queryByText('Onboarding in process.')).toBeNull();
    // Approved venue → user may re-apply.
    fireEvent.press(screen.getByTestId('earn-box-VENUE_OWNER'));
    expect(mockNavigate).toHaveBeenCalledWith('RegisterVenue');
    // Denied host → also available to re-apply.
    fireEvent.press(screen.getByTestId('earn-box-HOST'));
    expect(mockNavigate).toHaveBeenCalledWith('BecomeHost');
  });

  it("keeps the box locked while an approved meeting's onboarded record is under review, re-opens on rejection", async () => {
    mockUseMe.mockReturnValue({ data: { me: { roles: [] } } });
    mockRequest.mockResolvedValue({
      myMeetings: [
        {
          id: 'm1',
          kind: 'VENUE',
          status: 'DONE',
          approval_status: 'APPROVED',
          onboarded_status: 'DRAFT',
          requested_at: '2027-01-01T04:30:00.000Z',
          scheduled_at: null,
        },
        {
          id: 'm2',
          kind: 'HOST',
          status: 'DONE',
          approval_status: 'APPROVED',
          onboarded_status: 'REJECTED',
          requested_at: '2027-01-01T04:30:00.000Z',
          scheduled_at: null,
        },
      ],
    });
    renderWithProviders(<EarnScreen />);
    // Approved venue whose onboarded record is still a Draft → stays locked (Item 2).
    await waitFor(() => expect(screen.getByText('Onboarding in process.')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('earn-box-VENUE_OWNER'));
    expect(mockNavigate).not.toHaveBeenCalled();
    // Rejected onboarded record → the host box re-opens for re-application.
    fireEvent.press(screen.getByTestId('earn-box-HOST'));
    expect(mockNavigate).toHaveBeenCalledWith('BecomeHost');
  });

  it('shows the notice without a time when the meeting has no date', async () => {
    mockUseMe.mockReturnValue({ data: { me: { roles: [] } } });
    mockRequest.mockResolvedValue({
      myMeetings: [
        { id: 'm1', kind: 'ECOMM', status: 'REQUESTED', requested_at: null, scheduled_at: null },
      ],
    });
    renderWithProviders(<EarnScreen />);
    await waitFor(() =>
      expect(
        screen.getByText(/You already have an onboarding meeting scheduled for this\./),
      ).toBeOnTheScreen(),
    );
  });

  it('refreshes the meetings after a cancel from the meeting actions', async () => {
    mockUseMe.mockReturnValue({ data: { me: { roles: [] } } });
    mockRequest.mockResolvedValue({
      myMeetings: [
        {
          id: 'm1',
          kind: 'VENUE',
          status: 'SCHEDULED',
          requested_at: null,
          scheduled_at: '2027-01-04T04:30:00.000Z',
        },
      ],
    });
    renderWithProviders(<EarnScreen />);
    fireEvent.press(await screen.findByTestId('cancel-VENUE'));
    fireEvent.changeText(screen.getByTestId('cancel-reason'), 'Changed my mind');
    fireEvent.press(screen.getByTestId('cancel-confirm'));
    await waitFor(() => expect(screen.queryByTestId('cancel-dialog')).toBeNull(), {
      timeout: 5000,
    });
    // onChanged → loadMeetings: MyMeetings is fetched again after the cancel.
    await waitFor(
      () => {
        const calls = mockRequest.mock.calls.filter((c) => opName(c[0]) === 'MyMeetings');
        expect(calls.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 5000 },
    );
  }, 15000);

  it('survives a failed meetings load', async () => {
    mockRequest.mockRejectedValue(new Error('down'));
    renderWithProviders(<EarnScreen />);
    fireEvent.press(screen.getByTestId('earn-box-VENUE_OWNER'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('RegisterVenue'));
  });

  it('reloads the meetings when the screen regains focus', async () => {
    renderWithProviders(<EarnScreen />);
    expect(mockAddListener).toHaveBeenCalledWith('focus', expect.any(Function));
    const before = mockRequest.mock.calls.length;
    focusCallback?.();
    await waitFor(() => expect(mockRequest.mock.calls.length).toBeGreaterThan(before));
  });

  it('hides the product-seller box when products are gated off', () => {
    mockFeatureFlag.mockReturnValue(false);
    mockUseMe.mockReturnValue({ data: { me: { roles: [] } } });
    renderWithProviders(<EarnScreen />);
    expect(screen.queryByTestId('earn-box-ECOMM_MANAGER')).toBeNull();
    expect(screen.getByTestId('earn-box-HOST')).toBeOnTheScreen();
  });

  it('gives an approved host an in-app CTA into Host Studio, keeping the label visible', () => {
    mockUseMe.mockReturnValue({ data: { me: { roles: ['HOST'] } } });
    renderWithProviders(<EarnScreen />);
    // Business rule: the "Already enabled" label stays visible alongside the CTA.
    expect(screen.getByText('Already enabled')).toBeOnTheScreen();
    expect(screen.getByText('Ready to host more experiences?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('earn-box-HOST-cta'));
    expect(mockNavigate).toHaveBeenCalledWith('HostManage');
  });

  it('sends each approved venue/brand/club CTA to its OWN Partner Portal deep link', () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    mockUseMe.mockReturnValue({
      data: { me: { roles: ['VENUE_OWNER', 'ECOMM_MANAGER', 'CLUB_ADMIN'] } },
    });
    renderWithProviders(<EarnScreen />);
    // Assert each button in isolation (toHaveBeenLastCalledWith) so a
    // button->URL cross-wiring would be caught, not just the URL set.
    fireEvent.press(screen.getByTestId('earn-box-VENUE_OWNER-cta'));
    expect(openSpy).toHaveBeenLastCalledWith('https://partners-app.duncit.com/register-venue/new');
    fireEvent.press(screen.getByTestId('earn-box-ECOMM_MANAGER-cta'));
    expect(openSpy).toHaveBeenLastCalledWith('https://partners-app.duncit.com/ecomm-brand');
    fireEvent.press(screen.getByTestId('earn-box-CLUB_ADMIN-cta'));
    expect(openSpy).toHaveBeenLastCalledWith(
      'https://partners-app.duncit.com/club-admin/dashboard',
    );
    // Partner CTAs leave in-app navigation untouched.
    expect(mockNavigate).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
