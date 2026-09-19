import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import { renderWithProviders } from '../testkit';
import {
  leaderboardBoardMock,
  makeLeaderboardEntry,
  makeLeaderboardReward,
  makeLeaderboardSettings,
  updateLeaderboardSettingsMock,
} from '../mocks';

const dialogsMock = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: dialogsMock.notifySuccess,
  notifyError: dialogsMock.notifyError,
}));

import BoardViewer from '../../src/pages/leaderboard/BoardViewer';
import PointsPerActionCard from '../../src/pages/leaderboard/PointsPerActionCard';
import RewardsEditor from '../../src/pages/leaderboard/RewardsEditor';
import { buildLeaderboardPointsColumns } from '../../src/pages/leaderboard/leaderboardPointsColumns';
import type { LeaderboardPointRow } from '../../src/pages/leaderboard/queries';

/** The provider-free translator the pages' hook falls back to. */
const { t } = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() });

const SAVED = 'Leaderboard settings saved';
const FAILED = 'Leaderboard settings could not be loaded.';

afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
describe('BoardViewer', () => {
  it('ranks the board, marking the viewer and falling back to an initial', async () => {
    renderWithProviders(<BoardViewer />, {
      mocks: [
        leaderboardBoardMock([
          makeLeaderboardEntry({ is_me: true }),
          makeLeaderboardEntry({ rank: 2, user_id: 'u2', name: 'Ravi K', avatar_url: '', points: 900 }),
        ]),
      ],
    });
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('Ravi K')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    // Header row + two ranked rows; the viewer's own row is the selected one.
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveClass('Mui-selected');
    expect(rows[2]).not.toHaveClass('Mui-selected');
    expect(rows[1].querySelector('img')).toHaveAttribute('src', 'https://cdn.duncit.com/users/asha.jpg');
    expect(rows[2].querySelector('img')).toBeNull();
  });

  it('says so when nobody has points on the board yet', async () => {
    renderWithProviders(<BoardViewer />, { mocks: [leaderboardBoardMock([])] });
    expect(await screen.findByText('No points on this board yet.')).toBeInTheDocument();
  });
});

// ===========================================================================
describe('points ledger columns', () => {
  const columns = buildLeaderboardPointsColumns(t, (value) => String(value));
  const column = (field: string) => columns.find((c) => c.field === field);

  const pointRow = (over: Partial<LeaderboardPointRow> = {}): LeaderboardPointRow => ({
    id: 'lp1',
    category: 'HOST',
    user_id: 'u1',
    user_name: 'Asha Rao',
    user_email: 'asha@example.com',
    points: 25,
    source_type: 'POD_HOSTED',
    source_id: 'DUN-POD-4821',
    pod_id: 'p1',
    pod_title: 'Sunday badminton',
    created_at: '2026-09-10T09:00:00.000Z',
    ...over,
  });

  it('reads the board, the person, the source and the pod off a ledger row', () => {
    const row = pointRow();
    expect(column('category')?.valueGetter?.(row)).toBe('Hosts');
    expect(column('user_name')?.valueGetter?.(row)).toBe('Asha Rao');
    expect(column('points')?.valueGetter?.(row)).toBe(25);
    expect(column('source_type')?.valueGetter?.(row)).toBe('POD_HOSTED');
    expect(column('source_id')?.valueGetter?.(row)).toBe('DUN-POD-4821');
    expect(column('pod_title')?.valueGetter?.(row)).toBe('Sunday badminton');
  });

  // A product sale has no pod, and a deleted account has no name or email left.
  it('falls back to the user id and dashes what a row does not have', () => {
    const row = pointRow({ user_name: '', user_email: '', source_id: '', pod_id: null, pod_title: '' });
    expect(column('user_name')?.valueGetter?.(row)).toBe('u1');
    expect(column('source_id')?.valueGetter?.(row)).toBe('—');
    expect(column('pod_title')?.valueGetter?.(row)).toBe('—');

    render(<>{column('user_name')?.cellRenderer?.(row)}</>);
    expect(screen.getByText('u1')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders a named user over their email', () => {
    render(<>{column('user_name')?.cellRenderer?.(pointRow())}</>);
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
  });
});

// ===========================================================================
describe('PointsPerActionCard', () => {
  const settings = makeLeaderboardSettings();
  const joinField = () => screen.getByLabelText('Points per successful join (Users board)');
  const hostField = () => screen.getByLabelText('Points per completed pod (Hosts board)');

  // A blank or negative entry saves as 0 — the way to switch an action off.
  it('saves the scalars, turning a blank or negative entry into 0', async () => {
    renderWithProviders(<PointsPerActionCard settings={settings} />, {
      mocks: [
        updateLeaderboardSettingsMock({
          points_per_join: 0,
          points_per_host: 0,
          points_per_club_pod: 15,
          points_per_venue_pod: 20,
          points_per_product_sale: 5,
        }),
      ],
    });
    expect(joinField()).toHaveValue(10);
    fireEvent.change(joinField(), { target: { value: '' } });
    fireEvent.change(hostField(), { target: { value: '-3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith(SAVED));
    expect(dialogsMock.notifyError).not.toHaveBeenCalled();
  });

  it('says so when the save is refused', async () => {
    renderWithProviders(<PointsPerActionCard settings={settings} />, {
      mocks: [
        updateLeaderboardSettingsMock(
          {
            points_per_join: 10,
            points_per_host: 25,
            points_per_club_pod: 15,
            points_per_venue_pod: 20,
            points_per_product_sale: 5,
          },
          { failWith: 'Not allowed' },
        ),
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(dialogsMock.notifyError).toHaveBeenCalledWith(FAILED));
    expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
  });
});

// ===========================================================================
describe('RewardsEditor', () => {
  const saved = [makeLeaderboardReward()];

  it('says so when there are no rewards yet', () => {
    renderWithProviders(<RewardsEditor savedRewards={[]} />);
    expect(screen.getByText('No rewards yet. Add the first one.')).toBeInTheDocument();
  });

  // Blank-titled rows are dropped and sort_order follows the list position.
  it('edits, adds and removes rewards, then saves the whole list', async () => {
    renderWithProviders(<RewardsEditor savedRewards={saved} />, {
      mocks: [
        updateLeaderboardSettingsMock({
          rewards: [
            {
              category: 'USER',
              period: 'MONTHLY',
              rank_from: 1,
              rank_to: 3,
              title: 'Free pod pass',
              description: 'One free pod next month',
              is_active: false,
              sort_order: 0,
            },
            {
              category: 'USER',
              period: 'MONTHLY',
              rank_from: 1,
              rank_to: 5,
              title: 'Duncit tee',
              description: '',
              is_active: true,
              sort_order: 1,
            },
          ],
        }),
      ],
    });
    expect(await screen.findByDisplayValue('Free pod pass')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('switch', { name: 'Active' })[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Add reward' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add reward' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add reward' }));
    expect(screen.getAllByLabelText('Reward')).toHaveLength(4);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove reward' })[3]);
    expect(screen.getAllByLabelText('Reward')).toHaveLength(3);

    fireEvent.change(screen.getAllByLabelText('Reward')[1], { target: { value: '  Duncit tee ' } });
    fireEvent.change(screen.getAllByLabelText('Rank to')[1], { target: { value: '5' } });
    // An emptied or negative rank snaps back to 1.
    fireEvent.change(screen.getAllByLabelText('Rank from')[1], { target: { value: '' } });
    fireEvent.change(screen.getAllByLabelText('Rank from')[2], { target: { value: '-4' } });
    expect(screen.getAllByLabelText('Rank from')[2]).toHaveValue(1);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith(SAVED));
  });

  it('says so when the save is refused', async () => {
    renderWithProviders(<RewardsEditor savedRewards={saved} />, {
      mocks: [
        updateLeaderboardSettingsMock(
          { rewards: [{ ...makeLeaderboardReward(), sort_order: 0 }] },
          { failWith: 'Not allowed' },
        ),
      ],
    });
    expect(await screen.findByDisplayValue('Free pod pass')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(dialogsMock.notifyError).toHaveBeenCalledWith(FAILED));
  });
});
