/**
 * The search box at the head of every strip, wired into the strip itself: the
 * tabs narrow to the typed word, the open tab never disappears, and a word
 * nothing carries says so instead of leaving an unexplained gap.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DuncitTabs } from '../src/DuncitTabs';
import type { DuncitTabItem } from '../src/types';

const ITEMS: DuncitTabItem<string>[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'previous', label: 'Previous' },
  { value: 'cancelled', label: 'Cancelled' },
];

const tabNames = () => screen.getAllByRole('tab').map((tab) => tab.textContent);

describe('DuncitTabs search', () => {
  it('puts a search box at the head of every strip, named by its placeholder', () => {
    render(<DuncitTabs items={ITEMS} value="upcoming" onChange={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: 'Search tabs' })).toBe(screen.getByTestId('tabs-search'));
  });

  it('narrows the strip to the tabs the word matches, keeping the open one', async () => {
    render(<DuncitTabs items={ITEMS} value="upcoming" onChange={vi.fn()} idPrefix="pods" />);

    await userEvent.type(screen.getByTestId('pods-tabs-search'), 'canc');

    await waitFor(() => expect(tabNames()).toEqual(['Upcoming', 'Cancelled']));
    expect(screen.getByTestId('pods-tabs-search-empty').textContent).toBe('');
  });

  it('says so when the word matches no tab, and leaves the open tab in place', async () => {
    render(<DuncitTabs items={ITEMS} value="previous" onChange={vi.fn()} />);

    await userEvent.type(screen.getByTestId('tabs-search'), 'zzz');

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('No tab matches “zzz”.'));
    expect(tabNames()).toEqual(['Previous']);
  });

  it('clears the word with the button beside it and restores every tab', async () => {
    render(<DuncitTabs items={ITEMS} value="upcoming" onChange={vi.fn()} />);
    const box = screen.getByTestId<HTMLInputElement>('tabs-search');

    await userEvent.type(box, 'prev');
    await waitFor(() => expect(tabNames()).toEqual(['Upcoming', 'Previous']));

    await userEvent.click(screen.getByRole('button', { name: 'Clear tab search' }));

    expect(box.value).toBe('');
    await waitFor(() => expect(tabNames()).toEqual(['Upcoming', 'Previous', 'Cancelled']));
  });

  it('takes a placeholder of the strip’s own', () => {
    render(
      <DuncitTabs items={ITEMS} value="upcoming" onChange={vi.fn()} searchPlaceholder="Find a pod" />
    );

    expect(screen.getByRole('textbox', { name: 'Find a pod' })).toBeTruthy();
  });

  it('renders a bare strip, with no box, when told it is not searchable', () => {
    render(<DuncitTabs items={ITEMS} value="upcoming" onChange={vi.fn()} searchable={false} />);

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(tabNames()).toEqual(['Upcoming', 'Previous', 'Cancelled']);
  });
});
