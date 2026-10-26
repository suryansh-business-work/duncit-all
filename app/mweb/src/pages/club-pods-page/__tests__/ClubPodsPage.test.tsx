import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import ClubPodsPage from '../index';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  paged: vi.fn(),
  del: vi.fn(),
  change: vi.fn(),
  success: vi.fn(),
  debounced: vi.fn((v: string) => v),
}));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: h.useQuery }));
vi.mock('../../../components/club-admin/usePagedRows', () => ({ usePagedRows: h.paged }));
vi.mock('../useDeletePod', () => ({ useDeletePod: h.del }));
vi.mock('@duncit/pod-change-requests', () => ({ useRequestPodChange: h.change }));
vi.mock('@duncit/ui', async (orig) => ({ ...(await orig<object>()), useDebouncedValue: h.debounced }));
vi.mock('../../../components/notify', () => ({ notifySuccess: h.success, notifyError: vi.fn() }));
vi.mock('../CreatePodLauncher', () => ({ default: () => <span data-testid="launcher" /> }));
vi.mock('../ClubPodActivityDialog', () => ({
  default: (p: { pod: { id: string } | null; onClose: () => void }) =>
    p.pod ? <button data-testid="activity" onClick={p.onClose}>{p.pod.id}</button> : null,
}));
vi.mock('../ClubPodRow', () => ({
  default: (p: { pod: { id: string }; onActivity: (x: unknown) => void; onRequestChange: (x: unknown) => void; onDelete: (x: unknown) => void }) => (
    <div data-testid={`row-${p.pod.id}`}>
      <button data-testid={`act-${p.pod.id}`} onClick={() => p.onActivity(p.pod)} />
      <button data-testid={`chg-${p.pod.id}`} onClick={() => p.onRequestChange(p.pod)} />
      <button data-testid={`del-${p.pod.id}`} onClick={() => p.onDelete(p.pod)} />
    </div>
  ),
}));

const row = (id: string) => ({ id, pod_title: `Pod ${id}`, pod_attendees: ['a', 'b', 'c'] });

let ask: ReturnType<typeof vi.fn>;
let open: ReturnType<typeof vi.fn>;
let confirm: ReturnType<typeof vi.fn>;
let reload: ReturnType<typeof vi.fn>;

const paged = (over: object = {}) => ({
  rows: [row('p1')],
  loading: false,
  error: null,
  hasMore: false,
  loadMore: vi.fn(),
  reload,
  ...over,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/clubs/c1/pods']}>
      <Routes>
        <Route path="/clubs/:clubId/pods" element={<ClubPodsPage />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  ask = vi.fn();
  open = vi.fn();
  confirm = vi.fn();
  reload = vi.fn();
  h.useQuery.mockReturnValue({ data: { myAdminClubs: [{ id: 'c1', club_name: 'Run Club' }] }, error: undefined });
  h.paged.mockReturnValue(paged());
  h.del.mockReturnValue({ target: null, busy: false, ask, cancel: vi.fn(), confirm });
  h.change.mockReturnValue({ open, dialog: <div data-testid="change-dialog" /> });
});

describe('ClubPodsPage', () => {
  it('titles the page with the club name and lists the pods', () => {
    renderPage();
    expect(screen.getByTestId('club-pods-page')).toHaveTextContent('Run Club');
    expect(screen.getByTestId('row-p1')).toBeInTheDocument();
    expect(screen.getByTestId('launcher')).toBeInTheDocument();
    expect(screen.getByTestId('change-dialog')).toBeInTheDocument();
  });

  it('falls back to the generic title for an unknown club and shows a lookup error', () => {
    h.useQuery.mockReturnValue({ data: { myAdminClubs: [] }, error: { message: 'Lookup failed' } });
    renderPage();
    expect(screen.getByTestId('club-pods-page')).toHaveTextContent(fallbackT('clubAdmin.pods.clubPods'));
    expect(screen.getByTestId('club-pods-page-error')).toHaveTextContent('Lookup failed');
  });

  it('copes with no club data at all', () => {
    h.useQuery.mockReturnValue({ data: undefined, error: undefined });
    renderPage();
    expect(screen.getByTestId('club-pods-page')).toHaveTextContent(fallbackT('clubAdmin.pods.clubPods'));
  });

  it('shows the empty text when the club has no pods', () => {
    h.paged.mockReturnValue(paged({ rows: [] }));
    renderPage();
    expect(screen.getByTestId('paged-list-body-empty')).toHaveTextContent(fallbackT('clubAdmin.pods.noPods'));
  });

  it('builds the page query from the club, the status filter and the debounced search', () => {
    renderPage();
    const variables = h.paged.mock.calls[0][0].variables as (page: number) => unknown;
    expect(variables(2)).toEqual({
      club_id: 'c1',
      status: null,
      query: { page: 2, page_size: 20, search: undefined, sort_by: 'pod_date_time', sort_dir: 'desc' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: fallbackT('mweb.common.search') }), { target: { value: '  yoga ' } });
    fireEvent.click(screen.getByTestId('pill-chips-ACTIVE'));
    const next = h.paged.mock.calls.at(-1)?.[0].variables as (page: number) => unknown;
    expect(next(1)).toEqual({
      club_id: 'c1',
      status: 'ACTIVE',
      query: { page: 1, page_size: 20, search: 'yoga', sort_by: 'pod_date_time', sort_dir: 'desc' },
    });
  });

  it('opens and closes the activity dialog for a row', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('act-p1'));
    expect(screen.getByTestId('activity')).toHaveTextContent('p1');
    fireEvent.click(screen.getByTestId('activity'));
    expect(screen.queryByTestId('activity')).not.toBeInTheDocument();
  });

  it('files a club-admin change request with the pod attendee count', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('chg-p1'));
    expect(open).toHaveBeenCalledWith({ podDocId: 'p1', role: 'CLUB_ADMIN', attendeeCount: 3 });
  });

  it('asks before deleting and wires the confirm dialog to the delete flow', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('del-p1'));
    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('names the pod in the open delete confirmation and confirms', () => {
    h.del.mockReturnValue({ target: { id: 'p1', pod_title: 'Sunday Run' }, busy: false, ask, cancel: vi.fn(), confirm });
    renderPage();
    const dialog = screen.getByTestId('club-pods-delete-confirm');
    expect(dialog).toHaveTextContent('Sunday Run');
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.common.delete') }));
    });
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('hands the list reload to the delete flow', () => {
    renderPage();
    expect(h.del).toHaveBeenCalledWith(reload);
  });

  it('confirms a filed change request through the success toast', () => {
    renderPage();
    expect(h.change).toHaveBeenCalledWith({ onFiled: h.success });
  });
});
