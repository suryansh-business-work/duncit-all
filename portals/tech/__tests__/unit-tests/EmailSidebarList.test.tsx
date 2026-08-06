import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmailSidebarList from '../../src/components/EmailSidebarList';

/**
 * Replaces TemplateList.test — that component was two near-identical lists
 * (templates and fragments) and became this one. The behaviours it proved are
 * kept; the search and the row numbers are what it gained.
 */
const items = [
  { key: 't1', primary: 'Welcome', secondary: 'welcome' },
  { key: 't2', primary: 'Receipt', secondary: 'payment-receipt', off: true },
];

const renderList = (onSelect = vi.fn()) => {
  render(
    <EmailSidebarList
      items={items}
      selected="t1"
      onSelect={onSelect}
      searchPlaceholder="Search name or slug"
      emptyText="No templates yet."
    />
  );
  return onSelect;
};

describe('EmailSidebarList', () => {
  it('renders each row, marks an inactive one, and fires onSelect', () => {
    const onSelect = renderList();

    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('payment-receipt')).toBeInTheDocument();
    expect(screen.getByText('off')).toBeInTheDocument(); // only the inactive row

    fireEvent.click(screen.getByText('Receipt'));
    expect(onSelect).toHaveBeenCalledWith('t2');
  });

  it('numbers the rows, so a long list can be talked about', () => {
    renderList();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('filters on name and on slug, and says how much of the list is showing', () => {
    renderList();
    const box = screen.getByPlaceholderText('Search name or slug');

    expect(screen.getByText('2 total')).toBeInTheDocument();

    fireEvent.change(box, { target: { value: 'payment' } });
    expect(screen.queryByText('Welcome')).not.toBeInTheDocument();
    expect(screen.getByText('Receipt')).toBeInTheDocument();
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    // The surviving row is renumbered from 1 — the number is a position in
    // what you can see, not in a list you cannot.
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('says a filter found nothing rather than looking like an empty list', () => {
    renderList();
    fireEvent.change(screen.getByPlaceholderText('Search name or slug'), {
      target: { value: 'zzz' },
    });
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
    expect(screen.queryByText('No templates yet.')).not.toBeInTheDocument();
  });

  it('shows the empty text when there is genuinely nothing', () => {
    render(
      <EmailSidebarList
        items={[]}
        selected={null}
        onSelect={vi.fn()}
        searchPlaceholder="Search"
        emptyText="No templates yet."
      />
    );
    expect(screen.getByText('No templates yet.')).toBeInTheDocument();
  });
});
