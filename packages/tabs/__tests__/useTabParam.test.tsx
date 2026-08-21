import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { TAB_PARAM, useTabParam } from '../src/useTabParam';
import type { DuncitTabItem } from '../src/types';

const ITEMS: DuncitTabItem<string>[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'previous', label: 'Previous' },
];

function Probe({ items = ITEMS, param }: Readonly<{ items?: DuncitTabItem<string>[]; param?: string }>) {
  const tabs = useTabParam({ items, fallback: 'upcoming', param });
  const { search } = useLocation();

  return (
    <div>
      <output data-testid="value">{tabs.value}</output>
      <output data-testid="search">{search}</output>
      <output data-testid="count">{tabs.items.length}</output>
      {ITEMS.map((item) => (
        <button key={item.value} type="button" onClick={() => tabs.onChange(item.value)}>
          go {item.value}
        </button>
      ))}
    </div>
  );
}

const renderAt = (entry: string, props: Readonly<{ items?: DuncitTabItem<string>[]; param?: string }> = {}) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe {...props} />
    </MemoryRouter>
  );

const valueOf = () => screen.getByTestId('value').textContent;
const searchOf = () => screen.getByTestId('search').textContent;

describe('useTabParam', () => {
  it('names the shared query key', () => {
    expect(TAB_PARAM).toBe('selectedtab');
  });

  it('reads the open tab out of the URL', () => {
    renderAt('/pods?selectedtab=previous');

    expect(valueOf()).toBe('previous');
  });

  it('falls back when the URL carries nothing', () => {
    renderAt('/pods');

    expect(valueOf()).toBe('upcoming');
  });

  it('falls back when the URL names a tab the strip no longer offers', () => {
    renderAt('/pods?selectedtab=deleted-category');

    expect(valueOf()).toBe('upcoming');
  });

  it('falls back while the items are still loading from the server', () => {
    renderAt('/pods?selectedtab=previous', { items: [] });

    expect(valueOf()).toBe('upcoming');
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('writes the selection to the query string on change', async () => {
    renderAt('/pods');

    await userEvent.click(screen.getByRole('button', { name: 'go previous' }));

    expect(searchOf()).toBe('?selectedtab=previous');
    expect(valueOf()).toBe('previous');
  });

  it('keeps every other query param when it writes', async () => {
    renderAt('/pods?city=blr&page=2');

    await userEvent.click(screen.getByRole('button', { name: 'go previous' }));

    const params = new URLSearchParams(searchOf() ?? '');
    expect(params.get('city')).toBe('blr');
    expect(params.get('page')).toBe('2');
    expect(params.get('selectedtab')).toBe('previous');
  });

  it('replaces rather than pushes, so Back leaves the page instead of walking the tabs', async () => {
    renderAt('/pods');

    await userEvent.click(screen.getByRole('button', { name: 'go previous' }));
    await userEvent.click(screen.getByRole('button', { name: 'go upcoming' }));

    // A push would have stacked two entries; a replace leaves the original.
    expect(valueOf()).toBe('upcoming');
    expect(searchOf()).toBe('?selectedtab=upcoming');
  });

  it('uses the caller key so a second strip on the same route keeps its own selection', async () => {
    renderAt('/pods?selectedtab=previous', { param: 'selectedtab_side' });

    expect(valueOf()).toBe('upcoming');

    await userEvent.click(screen.getByRole('button', { name: 'go previous' }));

    const params = new URLSearchParams(searchOf() ?? '');
    expect(params.get('selectedtab')).toBe('previous');
    expect(params.get('selectedtab_side')).toBe('previous');
  });

  it('matches a numeric tab value against the string the URL carries', () => {
    function NumberProbe() {
      const tabs = useTabParam({
        items: [
          { value: 0, label: 'One', key: 'one' },
          { value: 1, label: 'Two', key: 'two' },
        ],
        fallback: 0,
      });
      return <output data-testid="value">{tabs.value}</output>;
    }

    render(
      <MemoryRouter initialEntries={['/variants?selectedtab=1']}>
        <NumberProbe />
      </MemoryRouter>
    );

    expect(screen.getByTestId('value').textContent).toBe('1');
  });
});
