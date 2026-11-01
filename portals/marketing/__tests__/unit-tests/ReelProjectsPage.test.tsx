import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import ReelProjectsPage from '../../src/pages/reels/projects-list';
import { CREATE_REEL_PROJECT, DELETE_REEL_PROJECT, REEL_PROJECTS } from '../../src/pages/reels/queries';
import type { ReelProjectSummary } from '../../src/pages/reels/types';
import { renderWithProviders } from '../testkit';
import { answerQuery, mutationOf, resetApollo, setMutationBusy } from '../mocks/reel-apollo-mock';

const confirm = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../mocks/reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  useConfirm: () => confirm,
}));

/** The signed-in marketer, for the guide kit's per-user tour record. */
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => ({ user: { user_id: 'u1' } }),
}));

interface ActionOptions {
  onEdit: (row: ReelProjectSummary) => void;
  onDelete: (row: ReelProjectSummary) => void;
  edit: { ariaLabel: (row: ReelProjectSummary) => string };
}

/** The shared table stand-in, plus the two column builders this table uses. */
vi.mock('@duncit/table', async () => ({
  ...(await import('./table-mock')),
  dateColumn: (options: object) => options,
  actionsColumn: ({ onEdit, onDelete, edit }: ActionOptions) => ({
    field: 'actions',
    cellRenderer: (row: ReelProjectSummary): ReactNode => (
      <>
        <button
          type="button"
          aria-label={edit.ariaLabel(row)}
          data-testid={`open-${row.id}`}
          onClick={(event) => {
            event.stopPropagation();
            onEdit(row);
          }}
        />
        <button
          type="button"
          data-testid={`delete-${row.id}`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(row);
          }}
        />
      </>
    ),
  }),
}));

const reel = (over: Partial<ReelProjectSummary>): ReelProjectSummary =>
  ({
    id: 'DUN-REEL-1',
    name: 'Jam night recap',
    drive_url: 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp',
    asset_count: 4,
    scene_count: 3,
    duration_ms: 84_000,
    cover_url: 'https://server.duncit.com/reels/cover/1',
    last_check_pass: true,
    posts_count: 2,
    views: 12_400,
    created_by: 'reels@duncit.com',
    created_at: '2026-10-01T10:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z',
    ...over,
  }) as ReelProjectSummary;

const REELS = [
  reel({}),
  reel({
    id: 'DUN-REEL-2',
    name: 'Pottery workshop teaser',
    created_by: 'studio@duncit.com',
    duration_ms: 0,
    cover_url: '',
    last_check_pass: null,
    posts_count: 0,
    views: 0,
  }),
];

const mount = () =>
  renderWithProviders(<ReelProjectsPage />, {
    initialEntries: ['/studio/reels'],
    routes: (
      <>
        <Route path="/studio/reels" element={<ReelProjectsPage />} />
        <Route path="/studio/reels/:projectId" element={<div data-testid="studio-route" />} />
      </>
    ),
  });

const rows = () => screen.findAllByTestId('table-row');

beforeEach(() => {
  resetApollo();
  confirm.mockReset();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
  // The list's tour has been seen: it does not open over the table under test.
  localStorage.setItem('duncit.tours.completed.u1', '["marketing.reels"]');
});

describe('ReelProjectsPage — the list', () => {
  it('lists every reel with its cover, length, last check, posts and views', async () => {
    answerQuery(REEL_PROJECTS, { data: { reelProjects: REELS } });
    mount();
    const [first, second] = await rows();
    expect(first).toHaveTextContent('Jam night recap');
    expect(first.querySelector('[data-testid="cell-cover"] img')).toHaveAttribute('src', 'https://server.duncit.com/reels/cover/1');
    expect(first.querySelector('[data-testid="cell-duration_ms"]')).toHaveTextContent('1:24');
    expect(first.querySelector('[data-testid="cell-last_check_pass"]')).toHaveTextContent('Checks pass');
    expect(first.querySelector('[data-testid="cell-posts_count"]')).toHaveTextContent('2');
    expect(first.querySelector('[data-testid="cell-views"]')).toHaveTextContent('12,400');
    // A reel with nothing in it yet: zero seconds long, no cover, no check run, nothing posted.
    expect(second.querySelector('[data-testid="cell-duration_ms"]')).toHaveTextContent('0:00');
    expect(second.querySelector('[data-testid="cell-cover"] img')).toBeNull();
    expect(second.querySelector('[data-testid="reel-check-none-DUN-REEL-2"]')).toHaveTextContent('—');
    expect(second.querySelector('[data-testid="cell-views"]')).toHaveTextContent('0');
    expect(screen.getByTestId('open-DUN-REEL-1')).toHaveAccessibleName(/Jam night recap/);
  });

  it('flags a reel whose last check found something', async () => {
    answerQuery(REEL_PROJECTS, { data: { reelProjects: [reel({ last_check_pass: false })] } });
    mount();
    const [first] = await rows();
    expect(first.querySelector('[data-testid="cell-last_check_pass"]')).toHaveTextContent('Needs attention');
  });

  it('opens with the intro and starts the tour over the button and the table', async () => {
    answerQuery(REEL_PROJECTS, { data: { reelProjects: REELS } });
    mount();
    await rows();
    expect(screen.getByTestId('page-intro')).toBeInTheDocument();
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start tour' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('New reel');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Your reels');
  });

  it('searches by name, by who made it and by its Drive folder', async () => {
    answerQuery(REEL_PROJECTS, { data: { reelProjects: REELS } });
    mount();
    await rows();
    fireEvent.change(screen.getByLabelText('table-search'), { target: { value: 'studio@duncit.com' } });
    await waitFor(async () => expect(await rows()).toHaveLength(1));
    expect((await rows())[0]).toHaveTextContent('Pottery workshop teaser');
  });

  it('shows the empty state before the first reel, and while the list is still loading', async () => {
    answerQuery(REEL_PROJECTS, { loading: true });
    const { unmount } = mount();
    expect(screen.queryByTestId('duncit-table')).not.toBeInTheDocument();
    unmount();

    answerQuery(REEL_PROJECTS, { data: { reelProjects: [] } });
    mount();
    expect(await screen.findByTestId('table-empty')).toBeInTheDocument();
  });

  it('reports a list that could not be read instead of an empty one', () => {
    answerQuery(REEL_PROJECTS, { error: new Error('Access Denied') });
    mount();
    expect(screen.queryByTestId('duncit-table')).not.toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it.each([
    ['its row', async () => fireEvent.click(await screen.findByText('rowclick-0'))],
    ['its open button', async () => fireEvent.click(await screen.findByTestId('open-DUN-REEL-1'))],
  ])('opens a reel in the studio from %s', async (_label, press) => {
    answerQuery(REEL_PROJECTS, { data: { reelProjects: REELS } });
    mount();
    await press();
    expect(await screen.findByTestId('studio-route')).toBeInTheDocument();
  });
});

describe('ReelProjectsPage — a new reel', () => {
  const fillAndSubmit = async (name: string) => {
    fireEvent.click(screen.getByTestId('reel-new-project'));
    fireEvent.change(await screen.findByTestId('reel-project-name'), { target: { value: name } });
    await waitFor(() => expect(screen.getByTestId('reel-project-submit')).toBeEnabled());
    fireEvent.submit(screen.getByTestId('reel-project-form'));
  };

  beforeEach(() => {
    answerQuery(REEL_PROJECTS, { data: { reelProjects: [] } });
  });

  it('creates the reel and opens it straight in the studio', async () => {
    const create = mutationOf(CREATE_REEL_PROJECT);
    create.mockResolvedValue({ data: { createReelProject: { id: 'DUN-REEL-9' } } });
    mount();
    await fillAndSubmit('Open mic highlights');
    expect(await screen.findByTestId('studio-route')).toBeInTheDocument();
    expect(create).toHaveBeenCalledWith({ variables: { input: { name: 'Open mic highlights', drive_url: '' } } });
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('stays on the list when the server answers without the new reel', async () => {
    mutationOf(CREATE_REEL_PROJECT).mockResolvedValue({ data: undefined });
    mount();
    await fillAndSubmit('Open mic highlights');
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByTestId('reel-project-form')).not.toBeInTheDocument());
    expect(screen.queryByTestId('studio-route')).not.toBeInTheDocument();
  });

  it('keeps the dialog open and says why when the reel could not be created', async () => {
    mutationOf(CREATE_REEL_PROJECT).mockRejectedValue(new Error('Give the reel a name.'));
    mount();
    await fillAndSubmit('Open mic highlights');
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Give the reel a name.'));
    expect(screen.getByTestId('reel-project-form')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('shows the create button working while the request is out, and can be dismissed', async () => {
    setMutationBusy(CREATE_REEL_PROJECT, true);
    mount();
    fireEvent.click(screen.getByTestId('reel-new-project'));
    expect(await screen.findByTestId('reel-project-submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('reel-project-cancel'));
    await waitFor(() => expect(screen.queryByTestId('reel-project-form')).not.toBeInTheDocument());
  });
});

describe('ReelProjectsPage — deleting a reel', () => {
  let refetch: ReturnType<typeof answerQuery>;

  beforeEach(() => {
    refetch = answerQuery(REEL_PROJECTS, { data: { reelProjects: REELS } });
  });

  const pressDelete = async () => fireEvent.click(await screen.findByTestId('delete-DUN-REEL-1'));

  it('asks first, naming the reel, and does nothing when the answer is no', async () => {
    confirm.mockResolvedValue(false);
    mount();
    await pressDelete();
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(confirm.mock.calls[0][0]).toMatchObject({ destructive: true, message: expect.stringContaining('Jam night recap') });
    expect(mutationOf(DELETE_REEL_PROJECT)).not.toHaveBeenCalled();
    expect(screen.queryByTestId('studio-route')).not.toBeInTheDocument();
  });

  it('deletes the reel and reads the list again', async () => {
    confirm.mockResolvedValue(true);
    // A refetch that fails must not surface as an unhandled rejection.
    refetch.mockRejectedValue(new Error('offline'));
    mount();
    await pressDelete();
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledTimes(1));
    expect(mutationOf(DELETE_REEL_PROJECT)).toHaveBeenCalledWith({ variables: { id: 'DUN-REEL-1' } });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('says why when the reel could not be deleted', async () => {
    confirm.mockResolvedValue(true);
    mutationOf(DELETE_REEL_PROJECT).mockRejectedValue(new Error('That reel no longer exists.'));
    mount();
    await pressDelete();
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('That reel no longer exists.'));
    expect(refetch).not.toHaveBeenCalled();
  });
});
