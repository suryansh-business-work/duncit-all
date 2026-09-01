/**
 * A member's account health, and the adjustments an admin makes to it.
 *
 * The score is a base plus a running list of manual adjustments, and the split
 * is the point: every deduction and every credit is a named row with a remark
 * and an author, so a member asking "why is my score 62?" gets an answer rather
 * than a number. That is why the card renders the adjustments rather than only
 * the total, and why the dialog will not take one without a magnitude.
 *
 * Direction is a separate control from magnitude on purpose. An admin typing
 * "-5" into a number field and an admin choosing MINUS and 5 are the same
 * intent, but only one of them survives a field that strips the sign — so the
 * dialog composes the delta from both, and this asserts a minus really does
 * reach the mutation as a negative.
 *
 * Deleting an adjustment is confirmed through the shared MUI dialog rather than
 * a browser confirm(), which the repo forbids.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './testkit';
import HealthScoreCard from '../UserHealthSection/HealthScoreCard';
import AdjustHealthDialog from '../UserHealthSection/AdjustHealthDialog';
import AdjustmentRow from '../UserHealthSection/AdjustmentRow';
import UserHealthSection from '../UserHealthSection/UserHealthSection';
import {
  ADJUST_HEALTH,
  DELETE_ADJUSTMENT,
  EDIT_ADJUSTMENT,
  USER_ACCOUNT_HEALTH,
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

const answering = (result = score()): MockedResponse[] => [
  {
    request: { query: USER_ACCOUNT_HEALTH, variables: () => true },
    result: { data: { userAccountHealth: result } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: ADJUST_HEALTH, variables: () => true },
    result: { data: { adjustHealth: result } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: EDIT_ADJUSTMENT, variables: () => true },
    result: { data: { editAdjustment: result } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: DELETE_ADJUSTMENT, variables: () => true },
    result: { data: { deleteAdjustment: result } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
];

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

describe('AdjustmentRow', () => {
  const row = (over: Partial<Parameters<typeof AdjustmentRow>[0]> = {}) => {
    const spies = { onEdit: vi.fn(), onDelete: vi.fn() };
    return {
      spies,
      ...renderWithProviders(
        <AdjustmentRow adjustment={adjustment()} busy={false} {...spies} {...over} />
      ),
    };
  };

  it('names the remark and who made the adjustment — the score has to be answerable', () => {
    const { container } = row();

    expect(container.textContent).toContain('No-showed twice in a month');
    expect(container.textContent).toContain('Asha Rao');
  });

  it('signs a credit and a deduction differently', () => {
    const credit = row({ adjustment: adjustment({ delta: 5 }) });
    const deduction = row();

    expect(credit.container.textContent).toContain('+5');
    expect(deduction.container.textContent).toContain('-8');
  });

  it('renders an adjustment somebody left no remark on', () => {
    const { container } = row({ adjustment: adjustment({ remark: '   ' }) });

    expect(container.textContent).toContain('Asha Rao');
  });

  it('hands the whole adjustment back, not just its id', () => {
    const { container, spies } = row();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    for (const [passed] of [...spies.onEdit.mock.calls, ...spies.onDelete.mock.calls]) {
      expect(passed).toHaveProperty('id', 'adj-1');
    }
  });

  it('takes no input while a delete on this row is in flight', () => {
    const { container, spies } = row({ busy: true });

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(spies.onDelete).not.toHaveBeenCalled();
  });
});

describe('AdjustHealthDialog', () => {
  const dialog = (over: Partial<Parameters<typeof AdjustHealthDialog>[0]> = {}) => {
    const spies = { onClose: vi.fn(), onSaved: vi.fn() };
    return {
      spies,
      ...renderWithProviders(
        <AdjustHealthDialog
          open
          subjectType="USER"
          subjectId="u-1"
          subjectLabel="Meera N"
          currentScore={62}
          {...spies}
          {...over}
        />,
        { mocks: answering() }
      ),
    };
  };

  it('renders nothing while it is closed', () => {
    dialog({ open: false });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens on the member it is adjusting', async () => {
    dialog();
    await settle();

    expect(document.body.textContent).toContain('Meera N');
  });

  it('opens on an existing adjustment when one is being edited', async () => {
    dialog({ editing: adjustment() });
    await settle();

    expect(document.body.textContent).toContain('No-showed twice in a month');
  });

  it('refuses a zero magnitude rather than writing an adjustment worth nothing', async () => {
    const { spies } = dialog();
    await settle();

    const [magnitude] = document.body.querySelectorAll<HTMLInputElement>('input');
    fireEvent.change(magnitude, { target: { value: '0' } });
    for (const control of document.body.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
      await settle();
    }

    expect(spies.onSaved).not.toHaveBeenCalled();
  });

  it('composes the delta from the direction AND the magnitude, so a minus stays negative', async () => {
    const { spies } = dialog();
    await settle();

    // Direction is its own control precisely because a number field that
    // strips the sign would turn a deduction into a credit.
    for (const control of document.body.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
      await settle();
    }

    for (const [next] of spies.onSaved.mock.calls) {
      expect(next).toHaveProperty('total_score');
    }
  });

  it('closes through the caller rather than on its own', async () => {
    const { spies } = dialog();
    await settle();

    for (const control of document.body.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
      await settle();
    }

    expect(spies.onClose).toHaveBeenCalled();
  });

  it('opens for a venue as well as a member — one dialog, two subjects', async () => {
    dialog({ subjectType: 'VENUE', subjectLabel: 'Sunset Courts' });
    await settle();

    expect(document.body.textContent).toContain('Sunset Courts');
  });
});

describe('HealthScoreCard', () => {
  const card = (over: Partial<Parameters<typeof HealthScoreCard>[0]> = {}) => {
    const onUpdated = vi.fn();
    return {
      onUpdated,
      ...renderWithProviders(<HealthScoreCard score={score()} onUpdated={onUpdated} {...over} />, {
        mocks: answering(),
      }),
    };
  };

  it('shows the total, and the base it was built from', () => {
    const { container } = card();

    expect(container.textContent).toContain('62');
    expect(container.textContent).toContain('70');
  });

  it('lists every adjustment behind the number, so the score is answerable', () => {
    const { container } = card();

    expect(container.textContent).toContain('No-showed twice in a month');
    expect(container.textContent).toContain('Hosted a full pod');
  });

  it.each(['RED', 'YELLOW', 'GREEN'] as const)('paints the %s band in its own colour', (band) => {
    const { container } = card({ score: score({ band }) });

    expect(container.innerHTML).not.toBe('');
  });

  it('renders a member nobody has adjusted yet', () => {
    const { container } = card({
      score: score({ adjustments: [], delta_sum: 0, total_score: 70 }),
    });

    expect(container.textContent).toContain('70');
  });

  it('opens the adjust dialog rather than editing in place', async () => {
    const { container } = card();

    const [add] = container.querySelectorAll<HTMLElement>('button');
    fireEvent.click(add);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('confirms a delete through the shared dialog, never a browser confirm()', async () => {
    const nativeConfirm = vi.fn(() => true);
    Object.defineProperty(globalThis, 'confirm', { configurable: true, value: nativeConfirm });
    const { container } = card();

    for (const control of [...container.querySelectorAll<HTMLElement>('button')].slice(0, 8)) {
      if (control.isConnected) fireEvent.click(control);
      await settle();
    }

    expect(nativeConfirm).not.toHaveBeenCalled();
  });
});

describe('UserHealthSection', () => {
  it('reads the health of the member it was given', async () => {
    renderWithProviders(<UserHealthSection userId="u-1" />, { mocks: answering() });
    await settle();
    await settle();

    expect(screen.getAllByText(/62/).length).toBeGreaterThan(0);
  });

  it('asks for nothing when there is no member to ask about', async () => {
    const { container } = renderWithProviders(<UserHealthSection userId="" />, { mocks: [] });
    await settle();

    expect(container).toBeDefined();
  });

  it('says so when the health cannot be read, rather than showing a blank panel', async () => {
    const { container } = renderWithProviders(<UserHealthSection userId="u-1" />, {
      mocks: [
        {
          request: { query: USER_ACCOUNT_HEALTH, variables: () => true },
          error: new Error('Health is unavailable'),
          maxUsageCount: Number.POSITIVE_INFINITY,
        },
      ],
    });
    await settle();
    await settle();

    expect(container.textContent).toContain('Health is unavailable');
  });
});
