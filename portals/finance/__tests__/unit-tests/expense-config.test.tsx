/**
 * The two configured controls every Expense screen is built from:
 * ExpenseOptionSelect (one Finance-edited list) and RelatedEntityPicker (the
 * server-searched entity behind "Expense Related From").
 *
 * The picker is mounted the two ways its callers mount it — the Expense form
 * (stored name + helper text, bound to a form field) and the dashboard filter
 * bar (neither) — through a harness that keeps the value the way a
 * react-hook-form Controller or the filter state does.
 */
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { ExpenseOptionSelect, RelatedEntityPicker } from '../../src/pages/finance/expense-config';
import { renderWithProviders } from '../testkit';
import {
  VENUE_ENTITIES,
  expenseOptionsMock,
  makeRelatedEntity,
  relatedEntitiesMock,
  relatedEntityMock,
} from '../mocks/expense-config.mock';

interface HarnessProps {
  typeKey: string;
  initial: string;
  valueName?: string;
  helperText?: string;
  onChange: (id: string) => void;
}

function PickerHarness({ typeKey, initial, valueName, helperText, onChange }: Readonly<HarnessProps>) {
  const [value, setValue] = useState(initial);
  return (
    <RelatedEntityPicker
      typeKey={typeKey}
      value={value}
      valueName={valueName}
      label="Related entity"
      helperText={helperText}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
}

const renderPicker = (props: Omit<HarnessProps, 'onChange'>, mocks: MockedResponse[]) => {
  const onChange = vi.fn();
  renderWithProviders(<PickerHarness {...props} onChange={onChange} />, { mocks });
  return onChange;
};

const entityBox = () => screen.getByRole('combobox', { name: 'Related entity' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ExpenseOptionSelect', () => {
  it('offers the configured rows, keeps a retired value, and reports a pick', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <ExpenseOptionSelect kind="CATEGORY" label="Category" value="EVENT_MATERIAL" onChange={onChange} allowEmpty />,
      { mocks: [expenseOptionsMock('CATEGORY')] },
    );
    const box = screen.getByRole('combobox', { name: 'Category' });
    // Disabled until the list answers.
    expect(box).toHaveAttribute('aria-disabled', 'true');
    await waitFor(() => expect(box).not.toHaveAttribute('aria-disabled', 'true'));
    expect(box).toHaveTextContent('EVENT_MATERIAL (no longer offered)');

    fireEvent.mouseDown(box);
    const listbox = await screen.findByRole('listbox');
    // No empty label given: a filter's "any" row.
    expect(within(listbox).getByRole('option', { name: 'Any' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: 'EVENT_MATERIAL (no longer offered)' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    fireEvent.click(within(listbox).getByRole('option', { name: 'Marketing' }));
    expect(onChange).toHaveBeenCalledWith('MARKETING');
  });
});

describe('RelatedEntityPicker', () => {
  it('stays disabled until a Related From type is chosen', () => {
    renderPicker({ typeKey: '', initial: '' }, []);
    expect(entityBox()).toBeDisabled();
  });

  it('shows the stored name, then the entity as it is called today, and picks and clears', async () => {
    const renamed = makeRelatedEntity({ id: 'ven-9', name: 'Arena Renamed', reference: 'VEN-000009' });
    const onChange = renderPicker(
      { typeKey: 'VENUE', initial: 'ven-9', valueName: 'Old Arena', helperText: 'What it was spent on' },
      [relatedEntitiesMock('VENUE'), relatedEntityMock(renamed), relatedEntityMock(makeRelatedEntity())],
    );
    // Nothing has answered yet: the name the expense stored, and a spinner.
    expect(entityBox()).toHaveValue('Old Arena');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('What it was spent on')).toBeInTheDocument();

    await waitFor(() => expect(entityBox()).toHaveValue('Arena Renamed'));

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    // Queried afresh each time: a re-search in flight swaps the list for its
    // loading text, so a held listbox node could be a stale one.
    const labels = () => screen.getAllByRole('option').map((option) => option.textContent);
    // The re-read entity leads; a nameless venue reads as its reference, and
    // one with neither as its id.
    await waitFor(() =>
      expect(labels()).toEqual([
        'Arena RenamedVEN-000009',
        'Smash ArenaVEN-000001',
        'VEN-000002VEN-000002',
        'ven-3',
      ]),
    );

    fireEvent.click(screen.getByRole('option', { name: /Smash Arena/ }));
    expect(onChange).toHaveBeenLastCalledWith('ven-1');
    await waitFor(() => expect(entityBox()).toHaveValue('Smash Arena'));

    fireEvent.click(screen.getByRole('button', { name: 'Clear', hidden: true }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('falls back to the id when the filed entity is gone and no name was passed', async () => {
    renderPicker({ typeKey: 'VENUE', initial: 'ven-gone' }, [
      relatedEntitiesMock('VENUE'),
      relatedEntityMock(null, 'ven-gone'),
    ]);
    expect(entityBox()).toHaveValue('ven-gone');
    await waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull());
    expect(entityBox()).toHaveValue('ven-gone');
  });

  it('searches the server as a person types and says when nothing matches', async () => {
    renderPicker({ typeKey: 'VENUE', initial: '' }, [
      relatedEntitiesMock('VENUE', [], 'zzz'),
      relatedEntitiesMock('VENUE', VENUE_ENTITIES, null),
    ]);
    fireEvent.change(entityBox(), { target: { value: 'zzz' } });
    expect(await screen.findByText('Nothing matches that search.', {}, { timeout: 2000 })).toBeInTheDocument();
  });
});
