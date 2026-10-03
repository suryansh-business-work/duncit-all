import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  ClubAdminClubDocument,
  ClubAdminCreatePodDocument,
  ClubAdminHostSearchDocument,
  ClubAdminPodForEditDocument,
  ClubAdminUpdatePodDocument,
} from '@/graphql/club-admin';
import { CreatePodOptionsDocument, ModeratePodContentDocument } from '@/graphql/create-pod';
import type { CreatePodInput } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { useClubAdminPodEditor } from '@/hooks/useClubAdminPodEditor';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
// The barrel re-exports the whole stepper UI; the hook only needs the pure form
// helpers, so point it at the real modules that hold them.
jest.mock('@/components/create-pod', () => ({
  ...jest.requireActual('@/components/create-pod/create-pod.types'),
  ...jest.requireActual('@/components/create-pod/create-pod.form'),
  ...jest.requireActual('@/components/create-pod/pod-to-form'),
}));

const mockRequest = graphqlRequest as jest.Mock;

const club = {
  id: 'c1',
  location_id: 'loc-1',
  locality: 'Indiranagar',
  super_category_id: 'sup-1',
  category_id: 'sub-1',
};

const pod = {
  id: 'p1',
  pod_title: 'Sunday Run',
  pod_description: 'Easy 5k',
  pod_images_and_videos: [{ url: 'https://img.example/a.jpg' }],
  reel_url: null,
  club_id: 'c1',
  venue_id: 'v1',
  venue_slot_id: 'slot-1',
  location_id: 'loc-1',
  zone_name: 'Indiranagar',
  pod_mode: 'PHYSICAL',
  meeting_platform: null,
  meeting_url: null,
  meeting_notes: null,
  pod_hashtag: ['run'],
  pod_date_time: '2030-01-06T01:30:00.000Z',
  pod_end_date_time: null,
  pod_type: 'PAID',
  pod_amount: 200,
  no_of_spots: 10,
  pod_info: null,
  what_this_pod_offers: [],
  available_perks: [],
  payment_terms: null,
  place_charges: [],
  product_requests: [],
  ticket_discount_enabled: false,
  ticket_discount_tiers: null,
  pod_hosts_id: ['h1', 'h2'],
  host_names: ['Asha'],
};

const options = { me: { user_id: 'viewer-1' } };

interface Serve {
  club?: unknown;
  pod?: unknown;
  options?: unknown;
  fail?: boolean;
}

function serve({ club: c = club, pod: p = null, options: o = options, fail }: Serve = {}) {
  mockRequest.mockImplementation((doc: unknown) => {
    if (fail) return Promise.reject(new Error('down'));
    if (doc === CreatePodOptionsDocument) return Promise.resolve(o);
    if (doc === ClubAdminClubDocument) return Promise.resolve({ club: c });
    if (doc === ClubAdminPodForEditDocument) return Promise.resolve({ clubAdminPodForEdit: p });
    return Promise.resolve({});
  });
}

async function mount(podId?: string) {
  const hook = renderHook(() => useClubAdminPodEditor('c1', podId));
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

const input = { pod_title: 'Sunday Run', venue_slot_id: 'slot-1' } as unknown as CreatePodInput;

beforeEach(() => mockRequest.mockReset());

describe('useClubAdminPodEditor — loading', () => {
  it('seeds a new pod in the club’s city and category', async () => {
    serve();
    const { result } = await mount();
    expect(result.current.hasError).toBe(false);
    expect(result.current.notFound).toBe(false);
    expect(result.current.viewerUserId).toBe('viewer-1');
    expect(result.current.options).toEqual(options);
    expect(result.current.initialValues).toMatchObject({
      club_id: 'c1',
      location_id: 'loc-1',
      locality: 'Indiranagar',
      host_category_key: 'sup-1|sub-1',
      agreed_to_terms: true,
      pod_title: '',
    });
    expect(result.current.initialHosts).toEqual([]);
    expect(mockRequest).not.toHaveBeenCalledWith(
      ClubAdminPodForEditDocument,
      expect.anything(),
      expect.anything(),
    );
  });

  it('falls back to blank city fields when the club has none', async () => {
    serve({ club: { ...club, location_id: null, locality: null }, options: { me: null } });
    const { result } = await mount();
    expect(result.current.initialValues).toMatchObject({ location_id: '', locality: '' });
    expect(result.current.viewerUserId).toBe('');
  });

  it('rehydrates an existing pod with labelled hosts', async () => {
    serve({ pod });
    const { result } = await mount('p1');
    expect(mockRequest).toHaveBeenCalledWith(
      ClubAdminPodForEditDocument,
      { pod_doc_id: 'p1' },
      { auth: true },
    );
    expect(result.current.initialValues).toMatchObject({
      pod_title: 'Sunday Run',
      club_id: 'c1',
      venue_slot_id: 'slot-1',
      host_category_key: 'sup-1|sub-1',
      agreed_to_terms: true,
    });
    // A host with no name on file is labelled by id rather than dropped.
    expect(result.current.initialHosts).toEqual([
      { user_id: 'h1', full_name: 'Asha' },
      { user_id: 'h2', full_name: 'h2' },
    ]);
  });

  it('is not found when the club is missing', async () => {
    serve({ club: null });
    const { result } = await mount();
    expect(result.current.notFound).toBe(true);
    expect(result.current.club).toBeNull();
    expect(result.current.initialValues.club_id).toBe('');
  });

  it('is not found when the pod being edited is missing', async () => {
    serve({ pod: null });
    const { result } = await mount('p404');
    expect(result.current.notFound).toBe(true);
  });

  it('reports a failed load and recovers on refetch', async () => {
    serve({ fail: true });
    const { result } = await mount();
    expect(result.current.hasError).toBe(true);
    expect(result.current.notFound).toBe(false);
    expect(result.current.options).toBeNull();

    serve();
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.hasError).toBe(false));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.club).toEqual(club);
  });

  it('ignores a load that lands after unmount', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result, unmount } = renderHook(() => useClubAdminPodEditor('c1'));
    expect(result.current.isLoading).toBe(true);
    unmount();
    await act(async () => resolve({ club }));
    expect(result.current.club).toBeNull();
  });

  it('ignores a failure that lands after unmount', async () => {
    let reject: (e: unknown) => void = () => undefined;
    mockRequest.mockReturnValue(
      new Promise((_r, rej) => {
        reject = rej;
      }),
    );
    const { result, unmount } = renderHook(() => useClubAdminPodEditor('c1'));
    unmount();
    await act(async () => reject(new Error('late')));
    expect(result.current.hasError).toBe(false);
  });
});

describe('useClubAdminPodEditor — actions', () => {
  it('searches hosts, sending null for an empty term', async () => {
    serve();
    const { result } = await mount();
    mockRequest.mockResolvedValueOnce({ clubAdminHostSearch: [{ user_id: 'h1', full_name: 'A' }] });
    await expect(result.current.searchHosts('as')).resolves.toEqual([
      { user_id: 'h1', full_name: 'A' },
    ]);
    expect(mockRequest).toHaveBeenLastCalledWith(
      ClubAdminHostSearchDocument,
      { search: 'as' },
      { auth: true },
    );

    mockRequest.mockResolvedValueOnce({ clubAdminHostSearch: [] });
    await result.current.searchHosts('');
    expect(mockRequest).toHaveBeenLastCalledWith(
      ClubAdminHostSearchDocument,
      { search: null },
      { auth: true },
    );
  });

  it('runs the moderation preflight', async () => {
    serve();
    const { result } = await mount();
    const verdict = { allowed: true, violations: [] };
    mockRequest.mockResolvedValueOnce({ moderatePodContent: verdict });
    const modInput = { pod_title: 'x' } as never;
    await expect(result.current.moderate(modInput)).resolves.toBe(verdict);
    expect(mockRequest).toHaveBeenLastCalledWith(
      ModeratePodContentDocument,
      { input: modInput },
      { auth: true },
    );
  });

  it('creates a new pod pinned to the club with the chosen hosts', async () => {
    serve();
    const { result } = await mount();
    await expect(result.current.submit(input, ['h1'])).resolves.toBe('created');
    expect(mockRequest).toHaveBeenLastCalledWith(
      ClubAdminCreatePodDocument,
      { input: { ...input, club_id: 'c1', pod_hosts_id: ['h1'] } },
      { auth: true },
    );
  });

  it('saves a draft as an inactive pod', async () => {
    serve();
    const { result } = await mount();
    await result.current.submit(input, [], { draft: true });
    expect(mockRequest.mock.calls.at(-1)?.[1].input.is_active).toBe(false);
  });

  it('updates without the slot when it is unchanged', async () => {
    serve({ pod });
    const { result } = await mount('p1');
    await expect(result.current.submit(input, ['h1'])).resolves.toBe('updated');
    const [doc, vars] = mockRequest.mock.calls.at(-1) ?? [];
    expect(doc).toBe(ClubAdminUpdatePodDocument);
    expect(vars.pod_doc_id).toBe('p1');
    expect(vars.input).not.toHaveProperty('venue_slot_id');
    expect(vars.input).toMatchObject({ club_id: 'c1', pod_hosts_id: ['h1'] });
  });

  it('sends the slot when it changed, and treats two missing slots as the same', async () => {
    serve({ pod });
    const { result } = await mount('p1');
    const moved = { ...input, venue_slot_id: 'slot-2' } as CreatePodInput;
    await result.current.submit(moved, []);
    expect(mockRequest.mock.calls.at(-1)?.[1].input.venue_slot_id).toBe('slot-2');

    serve({ pod: { ...pod, venue_slot_id: null } });
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const noSlot = { pod_title: 'x' } as unknown as CreatePodInput;
    await result.current.submit(noSlot, []);
    expect(mockRequest.mock.calls.at(-1)?.[1].input).not.toHaveProperty('venue_slot_id');
  });
});
