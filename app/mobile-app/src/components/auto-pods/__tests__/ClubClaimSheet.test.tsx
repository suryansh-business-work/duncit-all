import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { mwebAutoPodLabels, type AutoPodRow } from '@duncit/utils';

import { ClubClaimSheet } from '@/components/auto-pods/ClubClaimSheet';
import { ClubClaimAutoPodDocument, MyAdminClubsForAutoPodDocument } from '@/graphql/auto-pods';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

/** Copy that reads back as its key plus any interpolated values. */
const labels = mwebAutoPodLabels((key, options) =>
  [key, ...Object.values(options?.vars ?? {})].join('|'),
);

const location = {
  location_id: 'blr',
  location_name: 'Bengaluru',
  country: 'India',
  state: 'Karnataka',
  city: 'Bengaluru',
  bound_by: 'VENUE' as const,
  bound_at: '2030-01-01T00:00:00.000Z',
};

function makeRow(over: Partial<AutoPodRow> = {}): AutoPodRow {
  return {
    id: 'ap1',
    auto_pod_no: 'AP-1',
    stage: 'CLAIMING',
    pod_title: 'Morning Run',
    pod_description: '',
    pod_images_and_videos: [],
    sub_category_id: 'run',
    pod_amount: 0,
    no_of_spots: 0,
    venue_claim: null,
    host_claim: null,
    club_claim: null,
    location: null,
    viewer_claimed: false,
    ...over,
  };
}

const clubs = [
  { id: 'c1', club_name: 'Runners BLR', category_id: 'run', location_id: 'blr' },
  { id: 'c2', club_name: 'Runners DEL', category_id: 'run', location_id: 'del' },
  { id: 'c3', club_name: 'Chess BLR', category_id: 'chess', location_id: 'blr' },
  { id: 'c4', club_name: 'Joggers BLR', category_id: 'run', location_id: 'blr' },
  { id: 'c5', club_name: 'No Category', category_id: null, location_id: 'blr' },
];

function serveClubs(list = clubs) {
  mockRequest.mockImplementation((doc: unknown) =>
    doc === MyAdminClubsForAutoPodDocument
      ? Promise.resolve({ myAdminClubs: list })
      : Promise.resolve({ clubClaimAutoPod: { id: 'ap1' } }),
  );
}

interface MountOpts {
  row?: AutoPodRow | null;
  subCategoryId?: string | null;
}

function mount({ row = makeRow(), subCategoryId = 'run' }: MountOpts = {}) {
  const onClose = jest.fn();
  const onClaimed = jest.fn();
  const formatWhen = jest.fn((iso: string) => `when:${iso}`);
  const props = { subCategoryId, labels, onClose, onClaimed, formatWhen };
  const view = renderWithProviders(<ClubClaimSheet row={row} {...props} />);
  return { ...view, onClose, onClaimed, formatWhen, props };
}

const confirm = () => screen.getByTestId('auto-pod-claim-confirm');
const disabled = (testID: string) => {
  const node = screen.getByTestId(testID);
  return node.props.accessibilityState?.disabled === true || node.props['aria-disabled'] === true;
};
const selected = (testID: string) =>
  screen.getByTestId(testID).props.accessibilityState?.selected === true;

beforeEach(() => mockRequest.mockReset());

describe('ClubClaimSheet — club list', () => {
  it('reads nothing while no offer is open', () => {
    mount({ row: null });
    expect(mockRequest).not.toHaveBeenCalled();
    expect(screen.queryByTestId('auto-pod-club-c1')).toBeNull();
  });

  it('offers only clubs in the offer’s category and pinned city', async () => {
    serveClubs();
    mount({ row: makeRow({ location }) });
    expect(screen.getByTestId('auto-pod-clubs-loading')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('auto-pod-club-c1')).toBeOnTheScreen());

    expect(mockRequest).toHaveBeenCalledWith(MyAdminClubsForAutoPodDocument, undefined, {
      auth: true,
    });
    expect(screen.getByTestId('auto-pod-club-c4')).toBeOnTheScreen();
    expect(screen.queryByTestId('auto-pod-club-c2')).toBeNull();
    expect(screen.queryByTestId('auto-pod-club-c3')).toBeNull();
    expect(screen.queryByTestId('auto-pod-club-c5')).toBeNull();
    expect(screen.queryByTestId('auto-pod-clubs-loading')).toBeNull();
    expect(screen.getByTestId('auto-pod-claim-city')).toHaveTextContent(
      'mweb.autoPods.pinnedTo|Bengaluru, Karnataka',
    );
    // Two clubs are a real choice: nothing is picked for the admin.
    expect(selected('auto-pod-club-c1')).toBe(false);
    expect(disabled('auto-pod-claim-confirm')).toBe(true);
  });

  it('offers every club when the offer has no category and no city yet', async () => {
    serveClubs();
    mount({ subCategoryId: null });
    await waitFor(() => expect(screen.getByTestId('auto-pod-club-c5')).toBeOnTheScreen());
    for (const id of ['c1', 'c2', 'c3', 'c4']) {
      expect(screen.getByTestId(`auto-pod-club-${id}`)).toBeOnTheScreen();
    }
    expect(screen.queryByTestId('auto-pod-claim-city')).toBeNull();
    expect(screen.queryByTestId('auto-pod-no-club-in-city')).toBeNull();
  });

  it('preselects the only eligible club', async () => {
    serveClubs([clubs[0], clubs[1]]);
    mount({ row: makeRow({ location }) });
    await waitFor(() => expect(selected('auto-pod-club-c1')).toBe(true));
    expect(disabled('auto-pod-claim-confirm')).toBe(false);
  });

  it('says so when the admin has no club in the pinned city', async () => {
    serveClubs([clubs[1]]);
    mount({ row: makeRow({ location }) });
    await waitFor(() =>
      expect(screen.getByTestId('auto-pod-no-club-in-city')).toHaveTextContent(
        'mweb.autoPods.noClubInCity|Bengaluru, Karnataka',
      ),
    );
  });

  it('does not claim "no club in city" for an unpinned offer with no clubs', async () => {
    serveClubs([]);
    mount();
    await waitFor(() => expect(screen.queryByTestId('auto-pod-clubs-loading')).toBeNull());
    expect(screen.queryByTestId('auto-pod-no-club-in-city')).toBeNull();
  });

  it('shows the load failure label when clubs cannot be read', async () => {
    mockRequest.mockRejectedValueOnce(new Error('down'));
    mount();
    await waitFor(() =>
      expect(screen.getByTestId('auto-pod-claim-error')).toHaveTextContent(
        'mweb.autoPods.loadFailed',
      ),
    );
  });

  it('shows the venue and its time when a venue already accepted', async () => {
    serveClubs();
    const venue_claim = {
      venue_id: 'v1',
      venue_slot_id: 's1',
      owner_user_id: 'o1',
      venue_name: 'Cubbon Park',
      pod_date_time: '2030-01-05T01:00:00.000Z',
      pod_end_date_time: null,
      slot_price: 0,
      accepted_at: '2030-01-01T00:00:00.000Z',
    };
    const { formatWhen } = mount({ row: makeRow({ venue_claim }) });
    expect(screen.getByText('Cubbon Park · when:2030-01-05T01:00:00.000Z')).toBeOnTheScreen();
    expect(formatWhen).toHaveBeenCalledWith('2030-01-05T01:00:00.000Z');
    expect(screen.getByText('Morning Run')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByTestId('auto-pod-clubs-loading')).toBeNull());
  });

  it('ignores a list or a failure that lands after the sheet unmounts', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const first = mount();
    first.unmount();
    await act(async () => resolve({ myAdminClubs: clubs }));

    let reject: (e: unknown) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((_r, rej) => {
        reject = rej;
      }),
    );
    const second = mount();
    second.unmount();
    await act(async () => reject(new Error('late')));
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });
});

describe('ClubClaimSheet — claiming', () => {
  async function ready() {
    serveClubs();
    const view = mount();
    await waitFor(() => expect(screen.getByTestId('auto-pod-club-c4')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('auto-pod-club-c4'));
    return view;
  }

  it('claims the offer for the picked club', async () => {
    const { onClaimed } = await ready();
    expect(disabled('auto-pod-claim-confirm')).toBe(false);
    fireEvent.press(confirm());
    await waitFor(() => expect(onClaimed).toHaveBeenCalledTimes(1));
    expect(mockRequest).toHaveBeenLastCalledWith(
      ClubClaimAutoPodDocument,
      { auto_pod_doc_id: 'ap1', club_id: 'c4' },
      { auth: true },
    );
    expect(screen.queryByTestId('auto-pod-claim-busy')).toBeNull();
  });

  it('shows a spinner while the claim is in flight', async () => {
    await ready();
    let resolve: (v: unknown) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    fireEvent.press(confirm());
    expect(await screen.findByTestId('auto-pod-claim-busy')).toBeOnTheScreen();
    expect(disabled('auto-pod-claim-confirm')).toBe(true);
    await act(async () => resolve({}));
    expect(screen.queryByTestId('auto-pod-claim-busy')).toBeNull();
  });

  it('shows the server’s reason when the claim fails', async () => {
    const { onClaimed } = await ready();
    mockRequest.mockRejectedValueOnce(new Error('Club not eligible'));
    fireEvent.press(confirm());
    await waitFor(() =>
      expect(screen.getByTestId('auto-pod-claim-error')).toHaveTextContent('Club not eligible'),
    );
    expect(onClaimed).not.toHaveBeenCalled();
  });

  it('falls back to the claimed-elsewhere label for a bare failure', async () => {
    await ready();
    mockRequest.mockRejectedValueOnce({});
    fireEvent.press(confirm());
    await waitFor(() =>
      expect(screen.getByTestId('auto-pod-claim-error')).toHaveTextContent(
        'mweb.autoPods.claimedElsewhere',
      ),
    );
  });

  it('cancel closes without claiming', async () => {
    const { onClose } = await ready();
    fireEvent.press(screen.getByTestId('auto-pod-claim-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('a different offer starts a fresh choice', async () => {
    const { rerender, props } = await ready();
    expect(selected('auto-pod-club-c4')).toBe(true);
    rerender(<ClubClaimSheet row={makeRow({ id: 'ap2' })} {...props} />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId('auto-pod-club-c4')).toBeOnTheScreen());
    expect(selected('auto-pod-club-c4')).toBe(false);
    expect(disabled('auto-pod-claim-confirm')).toBe(true);
  });
});
