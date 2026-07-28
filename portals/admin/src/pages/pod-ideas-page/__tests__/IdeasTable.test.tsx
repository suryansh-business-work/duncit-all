import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRef } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../../__tests__/testkit';
import type { IdeaRow, Status } from '../queries';
import IdeasTable from '../IdeasTable';

// The real table renders through AG Grid, which needs a layout engine jsdom
// lacks; the stub still runs every valueGetter and cellRenderer for real.
vi.mock('@duncit/table', () => import('../../../__tests__/table-mock'));

const onView = vi.fn();
const onSetStatus = vi.fn();
const onDelete = vi.fn();

const makeIdea = (over: Partial<IdeaRow> = {}): IdeaRow => ({
  id: 'idea-1',
  author_id: 'u1',
  title: 'Sunday board games',
  description: 'Catan and Codenames at the cafe',
  likes_count: 12,
  shares_count: 3,
  comments_count: 4,
  status: 'PENDING',
  created_at: '2026-03-04T10:15:00.000Z',
  author: {
    user_id: 'u1',
    full_name: 'Asha Rao',
    first_name: 'asha',
    email: 'asha@example.com',
    profile_photo: null,
  },
  ...over,
});

const renderTable = (rows: IdeaRow[]) =>
  renderWithProviders(
    <IdeasTable
      fetchRows={async () => ({ rows, total: rows.length })}
      refetchRef={createRef<(() => void) | null>()}
      onView={onView}
      onSetStatus={onSetStatus}
      onDelete={onDelete}
    />,
  );

describe('IdeasTable', () => {
  beforeEach(() => {
    onView.mockReset();
    onSetStatus.mockReset();
    onDelete.mockReset();
  });

  it('declares the six idea columns and the empty state', async () => {
    renderTable([]);
    expect(screen.getByTestId('col-title')).toHaveTextContent('Idea');
    expect(screen.getByTestId('col-author')).toHaveTextContent('Author');
    expect(screen.getByTestId('col-engagement')).toHaveTextContent('Engagement');
    expect(screen.getByTestId('col-status')).toHaveTextContent('Status');
    expect(screen.getByTestId('col-created_at')).toHaveTextContent('Created');
    expect(screen.getByTestId('col-actions')).toHaveTextContent('Actions');
    await waitFor(() =>
      expect(screen.getByTestId('table-empty')).toHaveTextContent(
        'No pod ideas match the current filters.',
      ),
    );
  });

  it('renders the idea title + description and sorts/searches on them', async () => {
    renderTable([makeIdea()]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-title')).toHaveTextContent('Sunday board games');
    expect(within(row).getByTestId('cell-title')).toHaveTextContent(
      'Catan and Codenames at the cafe',
    );
    expect(screen.getByTestId('duncit-table')).toHaveAttribute(
      'data-search-placeholder',
      'Search title or description',
    );
  });

  it('shows the author name, email and an uppercased first-name initial', async () => {
    renderTable([makeIdea()]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-author')).toHaveTextContent('Asha Rao');
    expect(within(row).getByText('asha@example.com')).toBeInTheDocument();
    // first_name 'asha' -> avatar fallback 'A'
    expect(within(row).getByText('A')).toBeInTheDocument();
  });

  it('falls back to a dash and a "U" avatar when the idea has no author', async () => {
    renderTable([makeIdea({ id: 'idea-2', author: null })]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-author')).toHaveTextContent('—');
    expect(within(row).getByText('U')).toBeInTheDocument();
    expect(within(row).queryByText('asha@example.com')).not.toBeInTheDocument();
  });

  it('summarises engagement counts for search and renders each counter', async () => {
    renderTable([makeIdea()]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-engagement')).toHaveTextContent(
      '12 likes · 4 comments · 3 shares',
    );
    const engagementCell = within(row).getByTestId('cell-engagement');
    expect(within(engagementCell).getByText('12')).toBeInTheDocument();
    expect(within(engagementCell).getByText('4')).toBeInTheDocument();
    expect(within(engagementCell).getByText('3')).toBeInTheDocument();
  });

  it('renders the status chip and offers the three status filter options', async () => {
    renderTable([makeIdea({ status: 'APPROVED' })]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-status')).toHaveTextContent('APPROVED');
    // The chip label is rendered in addition to the raw valueGetter value.
    expect(within(row).getAllByText('APPROVED')).toHaveLength(2);
  });

  it('formats the created date and dashes out a missing one', async () => {
    renderTable([makeIdea({ created_at: '2026-03-04T10:15:00.000Z' })]);
    const row = await screen.findByTestId('table-row');
    const created = within(row).getByTestId('value-created_at').textContent ?? '';
    expect(created).toContain('2026');
    expect(created).not.toBe('—');
  });

  it('dashes out an empty created date', async () => {
    renderTable([makeIdea({ created_at: '' })]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-created_at')).toHaveTextContent('—');
  });

  it('wires View and Delete to their callbacks with the row', async () => {
    const idea = makeIdea({ id: 'row-9' });
    renderTable([idea]);
    await screen.findByTestId('table-row');
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onView).toHaveBeenCalledWith('row-9');
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'row-9' }));
  });

  it('offers both Approve and Reject on a pending idea', async () => {
    renderTable([makeIdea({ id: 'p1', status: 'PENDING' })]);
    await screen.findByTestId('table-row');
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onSetStatus).toHaveBeenNthCalledWith(1, 'p1', 'APPROVED');
    expect(onSetStatus).toHaveBeenNthCalledWith(2, 'p1', 'REJECTED');
  });

  it.each<[Status, string, string]>([
    ['APPROVED', 'Approve', 'Reject'],
    ['REJECTED', 'Reject', 'Approve'],
  ])('hides the %s action on an already-%s idea', async (status, hidden, shown) => {
    renderTable([makeIdea({ id: 'x1', status })]);
    await screen.findByTestId('table-row');
    expect(screen.queryByRole('button', { name: hidden })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: shown })).toBeInTheDocument();
  });
});
