/**
 * Closes two gaps the broad `UserHealthSection.test.tsx` suite leaves behind:
 *
 * 1. `AdjustHealthDialog` submitting while `editing` is set never actually
 *    finishes there — the existing suite renders the edit seed but only
 *    submits from the ADD path, so `edit()`/`editAdjustment` is never called,
 *    and its own submit-failure branch is never exercised either.
 * 2. `HealthScoreCard.onDelete` awaits the shared confirm dialog, which
 *    portals its Confirm/Cancel buttons into `document.body` — the existing
 *    "confirms a delete through the shared dialog" test only clicks buttons
 *    inside the card's own `container`, so that promise is left pending and
 *    everything past the `confirm()` call (both the early return and the
 *    actual delete) never runs.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './testkit';
import AdjustHealthDialog from '../UserHealthSection/AdjustHealthDialog';
import HealthScoreCard from '../UserHealthSection/HealthScoreCard';
import {
  ADJUST_HEALTH,
  DELETE_ADJUSTMENT,
  EDIT_ADJUSTMENT,
  type AdminHealthAdjustment,
  type AdminHealthScore,
} from '../UserHealthSection/queries';

const adjustment = (over: Partial<AdminHealthAdjustment> = {}): AdminHealthAdjustment & { __typename: string } => ({
  __typename: 'HealthAdjustment',
  id: 'adj-1',
  delta: -8,
  remark: 'No-showed twice in a month',
  created_by_name: 'Asha Rao',
  created_at: '2026-08-01T10:00:00.000Z',
  ...over,
});

const score = (over: Partial<AdminHealthScore> = {}): AdminHealthScore & { __typename: string } => ({
  __typename: 'HealthScore',
  subject_type: 'USER',
  subject_id: 'u-1',
  subject_label: 'Meera N',
  base_score: 70,
  delta_sum: -8,
  total_score: 62,
  band: 'YELLOW',
  adjustments: [adjustment(), adjustment({ id: 'adj-2', delta: 5, remark: 'Hosted a full pod' })],
  ...over,
});

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('AdjustHealthDialog — editing an existing adjustment', () => {
  it('calls editAdjustment (not adjustHealth) and hands the result back on success', async () => {
    const onEdit = vi.fn();
    const editing = adjustment();
    const mocks: MockedResponse[] = [
      {
        request: { query: EDIT_ADJUSTMENT },
        variableMatcher: (variables) => {
          onEdit(variables);
          return true;
        },
        result: { data: { editAdjustment: score({ total_score: 67 }) } },
      },
    ];
    const spies = { onClose: vi.fn(), onSaved: vi.fn() };
    renderWithProviders(
      <AdjustHealthDialog
        open
        subjectType="USER"
        subjectId="u-1"
        subjectLabel="Meera N"
        currentScore={62}
        editing={editing}
        {...spies}
      />,
      { mocks },
    );
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Save adjustment' }));
    await settle();

    expect(onEdit).toHaveBeenCalledWith({ input: { id: 'adj-1', delta: -8, remark: editing.remark } });
    expect(spies.onSaved).toHaveBeenCalledWith(expect.objectContaining({ total_score: 67 }));
    expect(spies.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the mutation error and never calls onSaved/onClose when the edit fails', async () => {
    const mocks: MockedResponse[] = [
      { request: { query: EDIT_ADJUSTMENT }, variableMatcher: () => true, error: new Error('Adjustment locked') },
    ];
    const spies = { onClose: vi.fn(), onSaved: vi.fn() };
    renderWithProviders(
      <AdjustHealthDialog
        open
        subjectType="USER"
        subjectId="u-1"
        subjectLabel="Meera N"
        currentScore={62}
        editing={adjustment()}
        {...spies}
      />,
      { mocks },
    );
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Save adjustment' }));
    await settle();

    expect(screen.getByText('Adjustment locked')).toBeInTheDocument();
    expect(spies.onSaved).not.toHaveBeenCalled();
    expect(spies.onClose).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the rejection carries no message', async () => {
    const mocks: MockedResponse[] = [
      { request: { query: ADJUST_HEALTH }, variableMatcher: () => true, error: new Error('') },
    ];
    renderWithProviders(
      <AdjustHealthDialog
        open
        subjectType="USER"
        subjectId="u-1"
        subjectLabel="Meera N"
        currentScore={62}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
      { mocks },
    );
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Save adjustment' }));
    await settle();

    expect(screen.getByText('Could not save adjustment.')).toBeInTheDocument();
  });
});

describe('HealthScoreCard — deleting an adjustment through the real confirm dialog', () => {
  const card = (mocks: MockedResponse[]) => {
    const onUpdated = vi.fn();
    return {
      onUpdated,
      ...renderWithProviders(<HealthScoreCard score={score()} onUpdated={onUpdated} />, { mocks }),
    };
  };

  it('deletes and hands the refreshed score back once the confirm dialog is accepted', async () => {
    const onDeleteVars = vi.fn();
    const { onUpdated } = card([
      {
        request: { query: DELETE_ADJUSTMENT },
        variableMatcher: (variables) => {
          onDeleteVars(variables);
          return true;
        },
        result: { data: { deleteAdjustment: score({ adjustments: [adjustment({ id: 'adj-2', delta: 5 })], total_score: 70 }) } },
      },
    ]);

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete adjustment')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await settle();

    expect(onDeleteVars).toHaveBeenCalledWith({ id: 'adj-1' });
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ total_score: 70 }));
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('leaves the adjustment in place when the confirm dialog is cancelled', async () => {
    const { onUpdated } = card([]);

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await settle();

    expect(onUpdated).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    // Both adjustments are still listed — nothing was removed.
    expect(screen.getByText('No-showed twice in a month')).toBeInTheDocument();
    expect(screen.getByText('Hosted a full pod')).toBeInTheDocument();
  });
});
