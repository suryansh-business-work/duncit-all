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
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
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
        request: { query: EDIT_ADJUSTMENT, variables: (variables) => {
          onEdit(variables);
          return true;
        } },
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
      { request: { query: EDIT_ADJUSTMENT, variables: () => true }, error: new Error('Adjustment locked') },
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
      { request: { query: ADJUST_HEALTH, variables: () => true }, error: new Error('') },
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
        request: { query: DELETE_ADJUSTMENT, variables: (variables) => {
          onDeleteVars(variables);
          return true;
        } },
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
    // The confirm dialog fades out before it unmounts.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('leaves the adjustment in place when the confirm dialog is cancelled', async () => {
    const { onUpdated } = card([]);

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await settle();

    expect(onUpdated).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // Both adjustments are still listed — nothing was removed.
    expect(screen.getByText('No-showed twice in a month')).toBeInTheDocument();
    expect(screen.getByText('Hosted a full pod')).toBeInTheDocument();
  });
});

describe('AdjustHealthDialog — editing an adjustment saved without a remark', () => {
  it('seeds an empty remark and sends it back as an empty string', async () => {
    const onEdit = vi.fn();
    // The server stores no remark as null even though the type says string.
    const editing = adjustment({ delta: 4, remark: null as unknown as string });
    const mocks: MockedResponse[] = [
      {
        request: { query: EDIT_ADJUSTMENT, variables: (variables) => {
          onEdit(variables);
          return true;
        } },
        result: { data: { editAdjustment: score() } },
      },
    ];
    renderWithProviders(
      <AdjustHealthDialog
        open
        subjectType="USER"
        subjectId="u-1"
        subjectLabel="Meera N"
        currentScore={62}
        editing={editing}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
      { mocks },
    );
    await settle();

    expect(screen.getByRole('textbox', { name: 'Remark (optional)' })).toHaveValue('');
    expect(screen.getByText('0/500 · The user sees this when they tap the meter.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save adjustment' }));
    await settle();

    expect(onEdit).toHaveBeenCalledWith({ input: { id: 'adj-1', delta: 4, remark: '' } });
  });
});

describe('HealthScoreCard — the adjust dialog it owns', () => {
  it('labels a venue score with the Venue chip in its band colour', () => {
    renderWithProviders(
      <HealthScoreCard score={score({ subject_type: 'VENUE', subject_label: 'Court 7', band: 'GREEN' })} onUpdated={vi.fn()} />,
    );

    const chip = screen.getByText('Venue').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-colorSuccess');
    expect(screen.queryByText('User')).toBeNull();
  });

  it('closes the dialog on cancel without touching the score', async () => {
    const onUpdated = vi.fn();
    renderWithProviders(<HealthScoreCard score={score()} onUpdated={onUpdated} />);

    fireEvent.click(screen.getByRole('button', { name: 'Adjust' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Adjust user health/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it('hands the saved score up and closes the dialog after a new adjustment', async () => {
    const onAdd = vi.fn();
    const onUpdated = vi.fn();
    renderWithProviders(<HealthScoreCard score={score()} onUpdated={onUpdated} />, {
      mocks: [
        {
          request: { query: ADJUST_HEALTH, variables: (variables) => {
            onAdd(variables);
            return true;
          } },
          result: { data: { adjustHealth: score({ delta_sum: -3, total_score: 67 }) } },
        },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Adjust' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save adjustment' }));
    await settle();

    expect(onAdd).toHaveBeenCalledWith({
      input: { subject_type: 'USER', subject_id: 'u-1', delta: 5, remark: '' },
    });
    expect(onUpdated).toHaveBeenCalledTimes(1);
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ total_score: 67 }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('AdjustHealthDialog — direction and remark inputs', () => {
  it('applies a decrease with the trimmed remark, and re-clicking the selected side keeps it', async () => {
    const onAdd = vi.fn();
    renderWithProviders(
      <AdjustHealthDialog
        open
        subjectType="VENUE"
        subjectId="v-9"
        subjectLabel="Court 7"
        currentScore={62}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
      {
        mocks: [
          {
            request: { query: ADJUST_HEALTH, variables: (variables) => {
              onAdd(variables);
              return true;
            } },
            result: { data: { adjustHealth: score({ subject_type: 'VENUE' }) } },
          },
        ],
      },
    );
    await settle();

    expect(screen.getByText('Applied as +5. Projected score: 67/100.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Decrease' }));
    expect(screen.getByText('Applied as -5. Projected score: 57/100.')).toBeInTheDocument();
    // An exclusive group reports null when the pressed button is clicked again.
    fireEvent.click(screen.getByRole('button', { name: 'Decrease' }));
    expect(screen.getByRole('button', { name: 'Decrease' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(screen.getByRole('textbox', { name: 'Remark (optional)' }), {
      target: { value: '  Late cancellations  ' },
    });
    expect(screen.getByText('22/500 · The user sees this when they tap the meter.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save adjustment' }));
    await settle();

    expect(onAdd).toHaveBeenCalledWith({
      input: { subject_type: 'VENUE', subject_id: 'v-9', delta: -5, remark: 'Late cancellations' },
    });
  });
});
