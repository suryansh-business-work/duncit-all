import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import CreatePodPage from '../index';
import { CREATE_POD_OPTIONS, MODERATE_POD_CONTENT, MY_POD_DRAFT, SAVE_POD_DRAFT } from '../queries';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  options: { data: undefined as unknown, loading: false, error: undefined as unknown },
  draft: { data: undefined as unknown, loading: false },
  save: vi.fn(),
  moderate: vi.fn(),
  hostAgain: { prefill: null as unknown, loading: false, failed: false },
  partner: { values: {} as object, pinnedVenueId: null as string | null, loading: false, error: null as string | null },
  stepper: undefined as undefined | Record<string, any>,
  publish: vi.fn(),
  locationId: 'loc1',
  navigate: vi.fn(),
}));

vi.mock('react-router', async (orig) => ({ ...(await orig<object>()), useNavigate: () => h.navigate }));
vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (doc: unknown) => (doc === CREATE_POD_OPTIONS ? h.options : h.draft),
  useMutation: (doc: unknown) => [doc === SAVE_POD_DRAFT ? h.save : h.moderate, { loading: false }],
}));
vi.mock('../create-pod', async (orig) => ({
  ...(await orig<object>()),
  CreatePodStepper: (p: Record<string, any>) => {
    h.stepper = p;
    return <div data-testid="stepper" />;
  },
}));
vi.mock('../useHostAgainPrefill', () => ({ useHostAgainPrefill: () => h.hostAgain }));
vi.mock('../usePartnerRequestPrefill', () => ({ usePartnerRequestPrefill: () => h.partner }));
vi.mock('../useCreatePodPublish', () => ({ useCreatePodPublish: () => h.publish }));
vi.mock('../../../app/AppLocationContext', () => ({ useAppLocation: () => ({ locationId: h.locationId }) }));
vi.mock('../HostAgainNotice', () => ({
  default: (p: { otherCityName: string | null; prefill: { source_title: string } }) => (
    <div data-testid="host-again" data-city={p.otherCityName ?? ''} data-title={p.prefill.source_title} />
  ),
}));

const hostOptions = (over: Record<string, unknown> = {}) => ({
  me: { user_id: 'u1', roles: ['HOST'] },
  clubs: [{ id: 'c1' }],
  locations: [{ id: 'loc1', location_name: 'Pune', city: 'Pune' }, { id: 'loc2', location_name: 'Goa', city: 'Goa' }],
  publicVenues: [{ id: 'v1' }],
  myHost: { status: 'APPROVED', is_active: true, host_categories: [] },
  subCategories: [],
  availablePodProducts: [],
  ...over,
});

const page = (entry = '/create-pod') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <CreatePodPage />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  h.options = { data: hostOptions(), loading: false, error: undefined };
  h.draft = { data: undefined, loading: false };
  h.hostAgain = { prefill: null, loading: false, failed: false };
  h.partner = { values: {}, pinnedVenueId: null, loading: false, error: null };
  h.locationId = 'loc1';
  h.stepper = undefined;
});

describe('CreatePodPage Host Again', () => {
  const prefill = (payloadLocation: string) => ({
    source_pod_id: 'p1',
    source_title: 'Sunday Run',
    payload: JSON.stringify({ location_id: payloadLocation }),
    step: 1,
    notices: [],
  });

  it('opens the stepper on the copied form and shows the Host Again notice, naming no city when it is the header city', () => {
    h.hostAgain = { prefill: prefill('loc1'), loading: false, failed: false };
    page();
    expect(screen.getByTestId('host-again')).toHaveAttribute('data-title', 'Sunday Run');
    expect(screen.getByTestId('host-again')).toHaveAttribute('data-city', '');
    expect(h.stepper?.initialStep).toBe(1);
  });

  it('names the copied pod city when it is not the header city', () => {
    h.hostAgain = { prefill: prefill('loc2'), loading: false, failed: false };
    page();
    expect(screen.getByTestId('host-again')).toHaveAttribute('data-city', expect.stringContaining('Goa'));
  });

  it('names no city when the copied city is not among the known locations', () => {
    h.hostAgain = { prefill: prefill('gone'), loading: false, failed: false };
    page();
    expect(screen.getByTestId('host-again')).toHaveAttribute('data-city', '');
  });

  it('shows no notice for a plain new pod', () => {
    page();
    expect(screen.queryByTestId('host-again')).not.toBeInTheDocument();
  });

  it('opens nothing but an error when the copy could not be read', () => {
    h.hostAgain = { prefill: null, loading: false, failed: true };
    page();
    expect(screen.getByTestId('create-pod-page-error')).toHaveTextContent(fallbackT('mweb.hostPodActions.hostAgainFailed'));
    expect(screen.queryByTestId('stepper')).not.toBeInTheDocument();
  });

  it('shows the options error before the copy error, and the prefill error when there is no options error', () => {
    h.options = { data: undefined, loading: false, error: new Error('Options down') };
    h.hostAgain = { prefill: null, loading: false, failed: true };
    const { unmount } = page();
    expect(screen.getByTestId('create-pod-page-error')).toHaveTextContent('Options down');
    unmount();
    h.options = { data: hostOptions(), loading: false, error: undefined };
    h.partner = { values: {}, pinnedVenueId: null, loading: false, error: 'Request gone' };
    page();
    expect(screen.getByTestId('create-pod-page-error')).toHaveTextContent('Request gone');
  });

  it('shows the loader while the copy is read', () => {
    h.hostAgain = { prefill: null, loading: true, failed: false };
    page();
    expect(screen.getByTestId('create-pod-loading')).toBeInTheDocument();
  });
});

describe('CreatePodPage saving and moderating', () => {
  it('saves a draft through the server and hands the stepper the draft id', async () => {
    h.save.mockResolvedValue({ data: { savePodDraft: { id: 'draft9' } } });
    page();
    let id = '';
    await act(async () => {
      id = await h.stepper?.onSaveDraft(null, { payload: '{}', step: 1 });
    });
    expect(h.save).toHaveBeenCalledWith({ variables: { draft_id: null, input: { payload: '{}', step: 1 } } });
    expect(id).toBe('draft9');
  });

  it('runs content moderation and hands back the verdict', async () => {
    h.moderate.mockResolvedValue({ data: { moderatePodContent: { ok: false, violations: [{ field: 'pod_title' }] } } });
    page();
    let verdict: unknown;
    await act(async () => {
      verdict = await h.stepper?.onModerate({ pod_title: 'x' });
    });
    expect(h.moderate).toHaveBeenCalledWith({ variables: { input: { pod_title: 'x' } } });
    expect(verdict).toEqual({ ok: false, violations: [{ field: 'pod_title' }] });
  });

  it('passes the publish handler and the pinned venue from a pod request to the stepper', () => {
    h.partner = { values: { venue_id: 'v1' }, pinnedVenueId: 'v1', loading: false, error: null };
    page();
    expect(h.stepper?.onPublish).toBe(h.publish);
    expect(h.stepper?.pinnedVenueId).toBe('v1');
  });

  it('lets a legacy host whose profile is approved create pods without the role, and sends others to become hosts', () => {
    h.options = { data: hostOptions({ me: { user_id: 'u1', roles: [] }, myHost: { status: 'APPROVED' } }), loading: false, error: undefined };
    const { unmount } = page();
    expect(screen.getByTestId('stepper')).toBeInTheDocument();
    unmount();
    h.options = { data: hostOptions({ me: { user_id: 'u1' }, myHost: { status: 'APPROVED', is_active: false } }), loading: false, error: undefined };
    page();
    expect(screen.getByTestId('create-pod-not-host')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('create-pod-become-host'));
    expect(h.navigate).toHaveBeenCalledWith('/become-host');
  });

  it('treats missing option lists as empty and closes to host management', () => {
    h.options = { data: { me: { roles: ['HOST'] } }, loading: false, error: undefined };
    page();
    expect(h.stepper?.clubs).toEqual([]);
    expect(h.stepper?.viewerUserId).toBe('');
    fireEvent.click(screen.getByTestId('create-pod-page-close'));
    expect(h.navigate).toHaveBeenCalledWith('/host/manage');
  });

  it('shows a not-host panel when the host profile is missing altogether', () => {
    h.options = { data: { me: null }, loading: false, error: undefined };
    page();
    expect(screen.getByTestId('create-pod-not-host')).toBeInTheDocument();
  });
});
