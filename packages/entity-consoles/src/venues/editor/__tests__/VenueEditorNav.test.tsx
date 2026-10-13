import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import VenueEditorNav from '../VenueEditorNav';
import {
  sectionAnchor,
  venueEditorSections,
  type VenueEditorSectionKey,
} from '../sections/venue-editor-sections';

/**
 * The section strip above the venue form. The form stays one page, so the strip
 * scrolls to a section's card rather than swapping panels — jsdom has no layout,
 * so each anchored card records the scroll it was asked for.
 */
const scrolls: { id: string; options: ScrollIntoViewOptions }[] = [];
const original = Element.prototype.scrollIntoView;

const reducedMotion = (query: string): MediaQueryList => ({
  matches: query.includes('prefers-reduced-motion'),
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});

function Search() {
  return <output data-testid="search">{useLocation().search}</output>;
}

const mount = (
  entry = '/venues/v-1/edit',
  anchors: readonly VenueEditorSectionKey[] = ['details', 'payout', 'status'],
) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <VenueEditorNav />
      <Search />
      {anchors.map((key) => (
        <section key={key} id={sectionAnchor(key)} />
      ))}
    </MemoryRouter>,
  );

beforeEach(() => {
  scrolls.length = 0;
  Element.prototype.scrollIntoView = function record(this: Element, options?: boolean | ScrollIntoViewOptions) {
    scrolls.push({ id: this.id, options: options as ScrollIntoViewOptions });
  };
});

afterEach(() => {
  Element.prototype.scrollIntoView = original;
  vi.restoreAllMocks();
});

describe('venueEditorSections', () => {
  it("lists the owner form's eight sections first, in its order, then the staff-only three", () => {
    const labels = venueEditorSections((key) => key).map((item) => item.value);
    expect(labels).toEqual([
      'details',
      'type-capacity',
      'food',
      'amenities',
      'documents',
      'owner',
      'payout',
      'leaves',
      'operations',
      'cancellation',
      'status',
    ]);
  });
});

describe('VenueEditorNav', () => {
  it('names every section the way the owner form does, and opens on the first without scrolling', () => {
    mount();

    expect(screen.getByRole('tablist', { name: 'Venue form sections' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Venue Details',
      'Type & Capacity',
      'Food Menu',
      'Amenities & Security',
      'Venue Documents',
      'Owner Details',
      'Payout Method',
      'Leaves & Holidays',
      'How it operates',
      'Cancellations',
      'Status and money',
    ]);
    expect(screen.getByRole('tab', { name: 'Venue Details' })).toHaveAttribute('aria-selected', 'true');
    expect(scrolls).toEqual([]);
  });

  it('scrolls to the picked section and records it in the address', async () => {
    mount();

    fireEvent.click(screen.getByRole('tab', { name: 'Payout Method' }));

    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?selectedtab=payout'));
    expect(screen.getByRole('tab', { name: 'Payout Method' })).toHaveAttribute('aria-selected', 'true');
    expect(scrolls).toEqual([{ id: 'venue-editor-payout', options: { block: 'start', behavior: 'smooth' } }]);
  });

  it('goes back to the first section when it is picked again', async () => {
    mount();

    fireEvent.click(screen.getByRole('tab', { name: 'Status and money' }));
    await waitFor(() => expect(scrolls).toHaveLength(1));
    fireEvent.click(screen.getByRole('tab', { name: 'Venue Details' }));

    await waitFor(() => expect(scrolls.map((scroll) => scroll.id)).toEqual(['venue-editor-status', 'venue-editor-details']));
  });

  it('opens on the section a link names', () => {
    mount('/venues/v-1/edit?selectedtab=status');

    expect(screen.getByRole('tab', { name: 'Status and money' })).toHaveAttribute('aria-selected', 'true');
    expect(scrolls.map((scroll) => scroll.id)).toEqual(['venue-editor-status']);
  });

  it('reads a link naming no real section as the first one, and stays put', () => {
    mount('/venues/v-1/edit?selectedtab=nonsense');

    expect(screen.getByRole('tab', { name: 'Venue Details' })).toHaveAttribute('aria-selected', 'true');
    expect(scrolls).toEqual([]);
  });

  it('jumps without animation for a reader who asked for reduced motion', async () => {
    vi.spyOn(globalThis, 'matchMedia').mockImplementation(reducedMotion);
    mount();

    fireEvent.click(screen.getByRole('tab', { name: 'Payout Method' }));

    await waitFor(() => expect(scrolls).toHaveLength(1));
    expect(scrolls[0].options).toEqual({ block: 'start', behavior: 'auto' });
  });

  it('selects a section whose card is not on the page without failing', async () => {
    mount('/venues/v-1/edit', ['details']);

    fireEvent.click(screen.getByRole('tab', { name: 'Payout Method' }));

    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?selectedtab=payout'));
    expect(scrolls).toEqual([]);
  });
});
