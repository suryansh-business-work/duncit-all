import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { createRef } from 'react';
import ChallengesTable from '../../src/pages/challenges/ChallengesTable';
import type { Challenge } from '../../src/graphql/challenges';
import { renderWithProviders } from '../testkit';
import { makeChallenge, challengeTableCategoryMocks } from '../mocks';

vi.mock('@duncit/table', () => import('./table-mock'));

const onEdit = vi.fn();
const onDelete = vi.fn();

const renderTable = (rows: Challenge[]) =>
  renderWithProviders(
    <ChallengesTable
      fetchRows={async () => ({ rows, total: rows.length })}
      refetchRef={createRef()}
      toolbarActions={<button type="button">new-challenge</button>}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
    { mocks: challengeTableCategoryMocks() },
  );

describe('ChallengesTable', () => {
  it('renders the toolbar, headers and empty state with no rows', async () => {
    renderTable([]);
    expect(screen.getByText('new-challenge')).toBeInTheDocument();
    expect(screen.getByTestId('col-name')).toHaveTextContent('Name');
    await waitFor(() =>
      expect(screen.getByTestId('table-empty')).toHaveTextContent(/No challenges yet/),
    );
  });

  it('renders the name cell with and without a description', async () => {
    renderTable([
      makeChallenge({ name: 'Sample', description: 'A short blurb' }),
      makeChallenge({ id: 'c10', name: 'No blurb', description: null }),
    ]);
    await waitFor(() => expect(screen.getAllByText('Sample').length).toBeGreaterThan(0));
    // The description caption only exists for the row that has one.
    expect(screen.getByText('A short blurb')).toBeInTheDocument();
    expect(screen.getAllByText('No blurb').length).toBeGreaterThan(0);
    expect(screen.queryByText(/second blurb/)).not.toBeInTheDocument();
  });

  it('dashes out empty category names and shows populated ones', async () => {
    renderTable([
      makeChallenge({
        super_category_name: 'Sports',
        category_name: null,
        sub_category_name: 'Yoga',
      }),
    ]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-super_category_id')).toHaveTextContent('Sports');
    expect(within(row).getByTestId('cell-category_id')).toHaveTextContent('—');
    expect(within(row).getByTestId('cell-sub_category_id')).toHaveTextContent('Yoga');
  });

  it('wires the row edit/delete actions to the callbacks', async () => {
    onEdit.mockReset();
    onDelete.mockReset();
    const challenge = makeChallenge({ id: 'row-1' });
    renderTable([challenge]);
    await screen.findByTestId('table-row');
    fireEvent.click(screen.getByRole('button', { name: 'Edit challenge' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete challenge' }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'row-1' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'row-1' }));
  });
});
