import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DuncitTabs } from '../src/DuncitTabs';
import type { DuncitTabItem } from '../src/types';

const ITEMS: DuncitTabItem<string>[] = [
  { value: 'upcoming', label: 'Upcoming', testId: 'tab-upcoming' },
  { value: 'previous', label: 'Previous', testId: 'tab-previous' },
];

describe('DuncitTabs', () => {
  it('renders one tab per item and marks the selected one', () => {
    render(<DuncitTabs items={ITEMS} value="previous" onChange={vi.fn()} />);

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { selected: true }).textContent).toBe('Previous');
  });

  it('selects by item value rather than by position, which is what makes ?selectedtab= a slug', () => {
    const items: DuncitTabItem<string>[] = [
      { value: 'zulu', label: 'Zulu' },
      { value: 'alpha', label: 'Alpha' },
      { value: 'mike', label: 'Mike' },
    ];

    render(<DuncitTabs items={items} value="mike" onChange={vi.fn()} />);

    expect(screen.getByRole('tab', { selected: true }).textContent).toBe('Mike');
  });

  it('puts the caller testId on each tab', () => {
    render(<DuncitTabs items={ITEMS} value="upcoming" onChange={vi.fn()} />);

    expect(screen.getByTestId('tab-upcoming').textContent).toBe('Upcoming');
    expect(screen.getByTestId('tab-previous').textContent).toBe('Previous');
  });

  it('reports the item value, not the MUI event, when a tab is clicked', async () => {
    const onChange = vi.fn();
    render(<DuncitTabs items={ITEMS} value="upcoming" onChange={onChange} />);

    await userEvent.click(screen.getByRole('tab', { name: 'Previous' }));

    expect(onChange).toHaveBeenCalledWith('previous');
  });

  it('does not fire for a disabled tab', async () => {
    const onChange = vi.fn();
    render(
      <DuncitTabs
        items={[ITEMS[0] as DuncitTabItem<string>, { value: 'previous', label: 'Previous', disabled: true }]}
        value="upcoming"
        onChange={onChange}
      />
    );

    const disabledTab = screen.getByRole('tab', { name: 'Previous' });
    expect(disabledTab).toHaveProperty('disabled', true);

    // MUI styles a disabled tab `pointer-events: none`, which user-event refuses
    // to click by default — bypass the guard so the click actually dispatches and
    // proves the disabled tab swallows it.
    await userEvent.setup({ pointerEventsCheck: 0 }).click(disabledTab);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('passes layout props straight through to MUI', () => {
    const { container } = render(
      <DuncitTabs items={ITEMS} value="upcoming" onChange={vi.fn()} variant="scrollable" aria-label="Pod views" />
    );

    expect(container.querySelector('[aria-label="Pod views"]')).not.toBeNull();
  });

  it('renders an icon and a caller-supplied React key for index-valued tabs', () => {
    const items: DuncitTabItem<number>[] = [
      { value: 0, label: 'First', key: 'first', icon: <span data-testid="ic-0" />, iconPosition: 'start' },
      { value: 1, label: 'Second', key: 'second', sx: { fontWeight: 700 } },
    ];

    render(<DuncitTabs items={items} value={0} onChange={vi.fn()} />);

    expect(screen.getByTestId('ic-0')).toBeDefined();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('renders an empty strip without crashing while the items load', () => {
    render(<DuncitTabs items={[]} value="upcoming" onChange={vi.fn()} />);

    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });
});
