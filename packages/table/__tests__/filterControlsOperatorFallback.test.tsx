import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Every operator the shipped TEXT_OPS / NUMBER_OPS lists offer has its own copy,
// so the condition dropdown's `OPERATOR_KEYS[op] ?? op` fallback is only reached
// by an operator added to a list without a label. Extending the list here is the
// one way to show what a reader would then see: the operator itself, never a
// blank option.
vi.mock('../src/columnTypes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/columnTypes')>();
  return { ...actual, TEXT_OPS: [...actual.TEXT_OPS, 'in'] };
});

// eslint-disable-next-line import/first -- must import after the columnTypes mock is registered
import { FilterControl } from '../src/toolbar/filterControls';
import { emptyDraft } from '../src/toolbar/filterState';
import type { DuncitColumn } from '../src/types';

type Pod = Record<string, unknown>;

const title: DuncitColumn<Pod> = { field: 'pod_title', headerName: 'Title', type: 'text' };

describe('condition dropdown copy', () => {
  it('names an operator that has no label of its own by the operator', () => {
    render(<FilterControl<Pod> column={title} label="Title" draft={emptyDraft(title)} onChange={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Condition/ }));
    const listbox = within(screen.getByRole('listbox'));
    expect(listbox.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Contains',
      'Equals',
      'Does not equal',
      'in',
    ]);
  });
});
