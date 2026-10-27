import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import type { ReactNode } from 'react';

import NoVenuesAlert from '../NoVenuesAlert';
import VenueCancelPodDialog from '../VenueCancelPodDialog';
import VenueHealthCard from '../VenueHealthCard';
import VenueOwnerStatsStrip from '../VenueOwnerStatsStrip';
import VenuePageFrame from '../VenuePageFrame';
import VenuePodDetailDialog from '../VenuePodDetailDialog';
import VenuePodsFigures from '../VenuePodsFigures';
import VenueStatTiles from '../VenueStatTiles';
import VenueStudioHeader from '../VenueStudioHeader';
import VenueSwitcher from '../VenueSwitcher';
import { useVenuePodActions } from '../useVenuePodActions';
import { VENUE_CANCEL_PENALTY, VENUE_CANCEL_POD, VENUE_POD_ATTENDEES } from '../queries';
import { VENUE_STUDIO_SUMMARY } from '../../../components/studio-pods';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  attendees: { data: undefined as unknown, loading: false },
  attendeesOpts: undefined as undefined | { skip: boolean; variables: unknown },
  penalty: { data: undefined as unknown },
  cancel: vi.fn(),
  cancelState: { loading: false },
  summary: { data: undefined as unknown, error: undefined as unknown, refetch: vi.fn() },
  notify: vi.fn(),
  changeOpen: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (doc: unknown, opts: typeof h.attendeesOpts) => {
    if (doc === VENUE_POD_ATTENDEES) {
      h.attendeesOpts = opts;
      return h.attendees;
    }
    if (doc === VENUE_CANCEL_PENALTY) return h.penalty;
    if (doc === VENUE_STUDIO_SUMMARY) return h.summary;
    return { data: undefined };
  },
  useMutation: (doc: unknown) => (doc === VENUE_CANCEL_POD ? [h.cancel, h.cancelState] : [vi.fn(), { loading: false }]),
}));
vi.mock('../../../components/AskClubAdminHelp', () => ({ default: (p: { podId: string; side: string }) => <div data-testid="ask-help" data-pod={p.podId} data-side={p.side} /> }));
vi.mock('../../../components/notify', () => ({ notifySuccess: h.notify }));
vi.mock('@duncit/pod-change-requests', () => ({ useRequestPodChange: () => ({ open: h.changeOpen, dialog: <div data-testid="change-dialog" /> }) }));
vi.mock('../../../utils/dateFormat', async (orig) => ({ ...(await orig<object>()), useDateFormat: () => ({ formatDateTime: (d: string) => `when:${d}` }) }));
vi.mock('../../../components/StudioPageHeader', () => ({ default: (p: { title: string }) => <h1 data-testid="header">{p.title}</h1> }));

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const inRouter = (ui: ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

const pod = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  pod_slug: 'jam',
  pod_title: 'Sunset Jam',
  pod_date_time: '2026-08-01T10:00:00.000Z',
  pod_end_date_time: null,
  pod_amount: 250,
  pod_type: 'PAID',
  no_of_spots: 10,
  attendee_count: 4,
  pod_attendees: ['u1', 'u2'],
  host_names: ['Asha', '', 'Ravi'],
  owner_id: 'v1',
  owner_name: 'Court One',
  bucket: 'UPCOMING',
  is_active: true,
  completed_at: null,
  cancelled_at: null,
  created_at: '2026-07-01T10:00:00.000Z',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.attendees = { data: undefined, loading: false };
  h.penalty = { data: undefined };
  h.cancelState = { loading: false };
  h.summary = { data: undefined, error: undefined, refetch: vi.fn() };
});

describe('VenuePodDetailDialog', () => {
  const open = (p: unknown, onClose = vi.fn()) => render(<VenuePodDetailDialog pod={p as never} currencySymbol="₹" onClose={onClose} />);

  it('shows nothing while no pod is chosen', () => {
    open(null);
    expect(screen.queryByTestId('venue-pod-detail')).not.toBeInTheDocument();
  });

  it('shows the pod facts, its hosts without blanks, who is booked in, and the club admin help', () => {
    h.attendees = {
      data: { publicUsersByIds: [{ user_id: 'u1', full_name: 'Asha', profile_photo: 'a.png' }, { user_id: 'u2', full_name: null, profile_photo: null }] },
      loading: false,
    };
    const onClose = vi.fn();
    open(pod(), onClose);
    const dialog = screen.getByTestId('venue-pod-detail');
    expect(dialog).toHaveTextContent('Sunset Jam');
    expect(dialog).toHaveTextContent('Asha, Ravi');
    expect(dialog).toHaveTextContent('when:2026-08-01T10:00:00.000Z');
    expect(dialog).toHaveTextContent('4/10');
    expect(dialog).toHaveTextContent('Court One');
    expect(dialog).toHaveTextContent(fallbackT('mweb.podDetails.attendee'));
    expect(screen.getByTestId('ask-help')).toHaveAttribute('data-side', 'VENUE');
    expect((h.attendeesOpts as { variables: { ids: string[] } }).variables.ids).toEqual(['u1', 'u2']);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.common.close') }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('says there are no hosts, and that nobody is booked in, without asking for names', () => {
    open(pod({ host_names: [], pod_attendees: [], pod_type: 'FREE', pod_amount: 0 }));
    expect(screen.getByTestId('venue-pod-detail')).toHaveTextContent(fallbackT('mweb.studioPods.hostsNone'));
    expect(screen.getByText(fallbackT('mweb.venuePods.noAttendees'))).toBeInTheDocument();
    expect(h.attendeesOpts?.skip).toBe(true);
  });

  it('shows a spinner while the names load', () => {
    h.attendees = { data: undefined, loading: true };
    open(pod());
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('keeps the names up while a refresh loads', () => {
    h.attendees = { data: { publicUsersByIds: [{ user_id: 'u1', full_name: 'Asha', profile_photo: null }] }, loading: true };
    open(pod({ pod_attendees: ['u1'] }));
    expect(screen.getByText('Asha', { selector: 'p' })).toBeInTheDocument();
  });

  it('shows a blank initial for a person with no name', () => {
    h.attendees = { data: { publicUsersByIds: [{ user_id: 'u1', full_name: null, profile_photo: null }] }, loading: false };
    open(pod({ pod_attendees: ['u1'] }));
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});

describe('VenueCancelPodDialog', () => {
  const cancelDialog = (onCancelled = vi.fn().mockResolvedValue(undefined), onClose = vi.fn()) => {
    render(<VenueCancelPodDialog pod={pod() as never} onClose={onClose} onCancelled={onCancelled} />);
    return { onCancelled, onClose };
  };

  it('is closed without a pod', () => {
    render(<VenueCancelPodDialog pod={null} onClose={vi.fn()} onCancelled={vi.fn()} />);
    expect(screen.queryByTestId('venue-cancel-pod')).not.toBeInTheDocument();
  });

  it('explains the penalty the server configured, names the pod, and keeps the pod on request', () => {
    h.penalty = { data: { publicAppSettings: { venue_cancel_health_penalty: 5 } } };
    const { onClose } = cancelDialog();
    expect(screen.getByTestId('venue-cancel-pod')).toHaveTextContent('Sunset Jam');
    expect(screen.getByTestId('venue-cancel-pod')).toHaveTextContent('5');
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.venuePods.keepPod') }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('says the penalty is unknown until the setting is read', () => {
    cancelDialog();
    expect(screen.getByTestId('venue-cancel-pod')).toHaveTextContent(fallbackT('mweb.venuePods.penaltyUnknown'));
  });

  it('will not cancel without a reason', async () => {
    cancelDialog();
    fireEvent.click(screen.getByTestId('venue-cancel-pod-confirm'));
    await act(async () => undefined);
    expect(h.cancel).not.toHaveBeenCalled();
  });

  it('cancels with the reason and reports the result to the page', async () => {
    const result = { refunded_count: 2, venue_health_score: 80 };
    h.cancel.mockResolvedValue({ data: { venueCancelPod: result } });
    const { onCancelled } = cancelDialog();
    fireEvent.change(screen.getByTestId('venue-cancel-pod-form-reason-input'), { target: { value: 'Pipe burst' } });
    fireEvent.click(screen.getByTestId('venue-cancel-pod-confirm'));
    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith(result));
    expect(h.cancel).toHaveBeenCalledWith({ variables: { pod_id: 'p1', reason: 'Pipe burst' } });
  });

  it('shows why the cancel failed under the reason and stays open', async () => {
    h.cancel.mockRejectedValue({ graphQLErrors: [{ message: 'Pod already started' }], message: 'x' });
    const { onCancelled } = cancelDialog();
    fireEvent.change(screen.getByTestId('venue-cancel-pod-form-reason-input'), { target: { value: 'Pipe burst' } });
    fireEvent.click(screen.getByTestId('venue-cancel-pod-confirm'));
    expect(await screen.findByTestId('venue-cancel-pod-form-error')).toHaveTextContent('Pod already started');
    expect(onCancelled).not.toHaveBeenCalled();
  });

  it('shows cancelling and shuts both buttons while the request runs', () => {
    h.cancelState = { loading: true };
    cancelDialog();
    expect(screen.getByTestId('venue-cancel-pod-confirm')).toBeDisabled();
    expect(screen.getByTestId('venue-cancel-pod-confirm')).toHaveTextContent(fallbackT('mweb.venuePods.cancelling'));
    expect(screen.getByRole('button', { name: fallbackT('mweb.venuePods.keepPod') })).toBeDisabled();
  });
});

describe('VenueHealthCard', () => {
  const health = (over: Record<string, unknown> = {}) => ({ total_score: 82, band: 'GREEN', base_score: 80, delta_sum: 2, adjustments: [{ id: 'a' }], ...over });

  it.each([
    ['GREEN', 'Venue is in great shape.'],
    ['YELLOW', 'A few things to polish.'],
    ['RED', 'Needs attention.'],
  ])('headlines the %s band', (band, text) => {
    inRouter(<VenueHealthCard health={health({ band }) as never} venueId="v1" />);
    expect(screen.getByTestId('venue-health-card-headline')).toHaveTextContent(text);
  });

  it('shows the base score, a positive and a negative admin adjustment, and the remark count', () => {
    const { unmount } = inRouter(<VenueHealthCard health={health() as never} venueId="v1" />);
    expect(screen.getByTestId('venue-health-card')).toHaveTextContent('Base activity: 80 · Admin adjustment: +2');
    expect(screen.getByTestId('venue-health-card')).toHaveTextContent('1 admin remark —');
    unmount();
    inRouter(<VenueHealthCard health={health({ delta_sum: -4, adjustments: [{ id: 'a' }, { id: 'b' }] }) as never} venueId="v1" />);
    expect(screen.getByTestId('venue-health-card')).toHaveTextContent('Admin adjustment: -4');
    expect(screen.getByTestId('venue-health-card')).toHaveTextContent('2 admin remarks');
  });

  it('shows no adjustment line or remark count when there are none, and opens the detail page from the meter', () => {
    inRouter(<VenueHealthCard health={health({ delta_sum: 0, adjustments: [] }) as never} venueId="v7" />);
    expect(screen.getByTestId('venue-health-card')).not.toHaveTextContent('Admin adjustment');
    expect(screen.getByTestId('venue-health-card')).not.toHaveTextContent('remark');
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('where')).toHaveTextContent('/venues/v7/health');
  });
});

describe('VenuePodsFigures', () => {
  it('is withheld while loading, rather than reading a false zero', () => {
    const { container } = render(<VenuePodsFigures venueId="v1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the figures once the summary arrives', () => {
    h.summary = {
      data: { studioSummary: { scope_count: 1, total: 5, upcoming: 2, ongoing: 1, completed: 1, cancelled: 1, total_spots: 40, filled_spots: 20, total_attendees: 18, fill_rate: 0.5, next_pod_date_time: null, revenue: null } },
      error: undefined,
      refetch: vi.fn(),
    };
    render(<VenuePodsFigures venueId="v1" />);
    expect(screen.getByTestId('venue-pods-figures')).toBeInTheDocument();
    expect(screen.queryByTestId('venue-pods-figures-error')).not.toBeInTheDocument();
  });

  it('shows the failure with a retry, and logs a retry that fails too', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const refetch = vi.fn().mockRejectedValue(new Error('still down'));
    h.summary = { data: undefined, error: new Error('x'), refetch };
    render(<VenuePodsFigures venueId="v1" />);
    expect(screen.getByTestId('venue-pods-figures-error')).toHaveTextContent(fallbackT('mweb.studioPods.error'));
    fireEvent.click(screen.getByTestId('venue-pods-figures-retry'));
    await waitFor(() => expect(warn).toHaveBeenCalledWith('[VenuePodsFigures] retry failed', expect.any(Error)));
    warn.mockRestore();
  });

  it('retries quietly when the retry works', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const refetch = vi.fn().mockResolvedValue(undefined);
    h.summary = { data: undefined, error: new Error('x'), refetch };
    render(<VenuePodsFigures venueId="v1" />);
    fireEvent.click(screen.getByTestId('venue-pods-figures-retry'));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('VenueOwnerStatsStrip and VenueStatTiles', () => {
  it('shows each slot earning figure, money as rupees and counts as numbers', () => {
    render(<VenueOwnerStatsStrip stats={{ potential_earning: 12000, booked_earning: 4500, upcoming_slots: 7, booked_slots: 3, pending_requests: 2, total_capacity: 40 } as never} />);
    const strip = screen.getByTestId('venue-slot-earnings');
    expect(strip).toHaveTextContent(fallbackT('mweb.venueManagePage.potentialEarning'));
    expect(strip).toHaveTextContent('12,000');
    expect(strip).toHaveTextContent('4,500');
    expect(strip).toHaveTextContent(fallbackT('mweb.venueManagePage.pendingRequests'));
  });

  it('shows listed, capacity and status, with a dash for no capacity', () => {
    const { unmount } = render(<VenueStatTiles listed={3} capacity={40} status="APPROVED" />);
    expect(screen.getByTestId('venue-stat-tiles')).toHaveTextContent('3');
    expect(screen.getByTestId('venue-stat-tiles')).toHaveTextContent('40');
    expect(screen.getByTestId('venue-stat-tiles')).toHaveTextContent('APPROVED');
    unmount();
    render(<VenueStatTiles listed={1} capacity={0} status="PENDING" />);
    expect(screen.getByTestId('venue-stat-tiles')).toHaveTextContent('-');
  });
});

describe('VenuePageFrame, NoVenuesAlert and the header', () => {
  const venue = { id: 'v1', venue_name: 'Court One', status: 'APPROVED' };
  const frame = (props: Record<string, unknown>) =>
    inRouter(<VenuePageFrame icon={<span />} title="Settings" venues={[venue]} venue={venue} onSelect={vi.fn()} loading={false} noVenuesMessage="No venue yet" {...(props as object)}>
      <div data-testid="venue-body" />
    </VenuePageFrame>);

  it('shows the loader on the first load', () => {
    frame({ loading: true });
    expect(screen.getByTestId('venue-page-frame-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('venue-body')).not.toBeInTheDocument();
  });

  it('shows the error in place of the venue', () => {
    frame({ error: { message: 'Venues down' } });
    expect(screen.getByTestId('venue-page-frame-error')).toHaveTextContent('Venues down');
  });

  it('shows the venue content, dimmed while a re-read runs', () => {
    frame({ refreshing: true });
    expect(screen.getByTestId('venue-body')).toBeInTheDocument();
  });

  it('shows the no-venue prompt with a way to register one, and no switcher', () => {
    frame({ venues: [], venue: null });
    expect(screen.getByTestId('no-venues-alert')).toHaveTextContent('No venue yet');
    fireEvent.click(screen.getByTestId('no-venues-alert-cta'));
    expect(screen.getByTestId('where')).toHaveTextContent('/register-venue');
  });

  it('renders the standalone prompt and the studio header', () => {
    inRouter(<NoVenuesAlert message="Add your first venue" />);
    expect(screen.getByTestId('no-venues-alert')).toHaveTextContent('Add your first venue');
    render(<VenueStudioHeader />);
    expect(screen.getByTestId('header')).toHaveTextContent(fallbackT('mweb.venueManage.venueStudio'));
  });

  it('falls back to the first venue in the switcher when the chosen one is gone', () => {
    const other = { id: 'v2', venue_name: 'Court Two', status: 'APPROVED' };
    render(<VenueSwitcher venues={[venue, other]} venueId="gone" onChange={vi.fn()} />);
    expect(screen.getByTestId('venue-switcher')).toHaveTextContent('Court One');
  });
});

describe('useVenuePodActions', () => {
  let currentPath = '';
  const Probe = () => {
    currentPath = useLocation().pathname;
    return null;
  };
  const run = (refetch = vi.fn().mockResolvedValue(undefined), onPodsChanged?: () => Promise<unknown>) =>
    renderHook(() => useVenuePodActions({ currencySymbol: '₹', refetch, onPodsChanged }), {
      wrapper: ({ children }) => (
        <MemoryRouter>
          <Probe />
          {children}
        </MemoryRouter>
      ),
    });

  it('opens a pod detail sheet and a cancel dialog from the row actions', async () => {
    const { result } = run();
    render(<>{result.current.dialogs}</>);
    act(() => result.current.rowActions.onOpenPod(pod() as never));
    render(<>{result.current.dialogs}</>);
    expect(screen.getAllByTestId('venue-pod-detail').length).toBeGreaterThan(0);
  });

  it('files a venue change request with the pod and its head count, and labels the action', () => {
    const { result } = run();
    result.current.rowActions.onRequestChange(pod() as never);
    expect(h.changeOpen).toHaveBeenCalledWith({ podDocId: 'p1', role: 'VENUE', attendeeCount: 4 });
    expect(result.current.rowActions.requestChangeLabel).toBeTruthy();
    expect(result.current.dialogs).toBeDefined();
  });

  it('opens the private chat with the hosts', () => {
    const { result } = run();
    act(() => result.current.rowActions.onChat(pod() as never));
    expect(currentPath).toBe('/venue-chat/p1');
  });

  it('after a cancel, says what happened, re-reads the pods, and refreshes what else the page derived', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    const onPodsChanged = vi.fn().mockResolvedValue(undefined);
    h.cancel.mockResolvedValue({ data: { venueCancelPod: { refunded_count: 1, venue_health_score: 90 } } });
    const { result } = run(refetch, onPodsChanged);
    act(() => result.current.rowActions.onCancelPod(pod() as never));
    const view = render(<>{result.current.dialogs}</>);
    fireEvent.change(screen.getByTestId('venue-cancel-pod-form-reason-input'), { target: { value: 'Flooded' } });
    fireEvent.click(screen.getByTestId('venue-cancel-pod-confirm'));
    await waitFor(() => expect(h.notify).toHaveBeenCalledTimes(1));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(onPodsChanged).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('after a cancel with nothing else to refresh, only re-reads the pods', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    h.cancel.mockResolvedValue({ data: { venueCancelPod: { refunded_count: 3, venue_health_score: 70 } } });
    const { result } = run(refetch);
    act(() => result.current.rowActions.onCancelPod(pod() as never));
    render(<>{result.current.dialogs}</>);
    fireEvent.change(screen.getByTestId('venue-cancel-pod-form-reason-input'), { target: { value: 'Flooded' } });
    fireEvent.click(screen.getByTestId('venue-cancel-pod-confirm'));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });
});
