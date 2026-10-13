import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import VenueDetailsSection from '../sections/VenueDetailsSection';
import TypeCapacitySection from '../sections/TypeCapacitySection';
import type { VenueFormValues } from '../types';
import { CATAN, catalogueMocks, registrationConfig } from './catalogues';
import { renderForm } from './harness';
import { sectionCard, venueValues, type PickMedia } from './sectionKit';

/**
 * The first two sections of the venue form — the same two, in the same order
 * and under the same names, as the owner's registration form.
 */

/** True when `first` comes before `second` in the document. */
const precedes = (first: Element, second: Element) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('VenueDetailsSection', () => {
  const mount = (onPick: PickMedia, over: Partial<VenueFormValues> = {}, minCategories = 0) =>
    renderForm<VenueFormValues>(
      venueValues(over),
      ({ control }) => (
        <VenueDetailsSection control={control} onPick={onPick} categoryLimit={5} minCategories={minCategories} />
      ),
      catalogueMocks,
    );

  it('holds the name, description, photos, categories and address — in the owner form order', () => {
    mount(vi.fn());
    const section = within(sectionCard('details', 'Venue Details'));

    const inOrder = [
      section.getByRole('textbox', { name: /Venue name/ }),
      section.getByRole('textbox', { name: 'Description' }),
      section.getByRole('textbox', { name: 'Cover image' }),
      section.getByRole('button', { name: 'Add a photo' }),
      section.getByRole('group', { name: 'Venue categories' }),
      section.getByRole('textbox', { name: /Address line 1/ }),
      section.getByRole('group', { name: 'City and area' }),
    ];
    for (let index = 1; index < inOrder.length; index += 1) {
      expect(precedes(inOrder[index - 1], inOrder[index])).toBe(true);
    }
  });

  it('writes what is typed into the name, the description and both address lines', () => {
    const { form } = mount(vi.fn());

    fireEvent.change(screen.getByRole('textbox', { name: /Venue name/ }), { target: { value: 'Third Wave' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), { target: { value: 'Two floors.' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Address line 1/ }), { target: { value: '100 Feet Road' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Address line 2' }), { target: { value: 'Above Blue Tokai' } });

    expect(form().getValues()).toMatchObject({
      venue_name: 'Third Wave',
      description: 'Two floors.',
      address_line1: '100 Feet Road',
      address_line2: 'Above Blue Tokai',
    });
  });

  it('uploads the cover and a gallery photo into the venues folder', async () => {
    const onPick = vi
      .fn<PickMedia>()
      .mockResolvedValueOnce('https://cdn.example.test/cover.jpg')
      .mockResolvedValueOnce('https://cdn.example.test/hall.jpg');
    const { form } = mount(onPick);

    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    await waitFor(() => expect(form().getValues('cover_image_url')).toBe('https://cdn.example.test/cover.jpg'));
    fireEvent.click(screen.getByRole('button', { name: 'Add a photo' }));
    await waitFor(() => expect(form().getValues('gallery')).toEqual(['https://cdn.example.test/hall.jpg']));
    expect(onPick.mock.calls).toEqual([['/venues'], ['/venues']]);
  });

  it('passes the category floor through to the rows', () => {
    mount(vi.fn(), { categories: [CATAN] }, 1);
    expect(screen.getByRole('button', { name: 'Remove category 1' })).toBeDisabled();
  });
});

describe('TypeCapacitySection', () => {
  const mount = (over: Partial<VenueFormValues> = {}) =>
    renderForm<VenueFormValues>(venueValues(over), ({ control, setValue }) => (
      <TypeCapacitySection control={control} setValue={setValue} config={registrationConfig()} />
    ));
  const total = () => screen.getByRole('spinbutton', { name: /Total capacity/ });

  it('offers the venue types the registration config lists', async () => {
    const { form } = mount();
    sectionCard('type-capacity', 'Type & Capacity');

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Venue type/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Turf' }));

    expect(form().getValues('venue_type')).toBe('Turf');
  });

  it('lets the total be typed for a venue with no named spaces', () => {
    const { form } = mount({ capacity: 40 });

    expect(total()).not.toHaveAttribute('readonly');
    expect(total()).toBeRequired();
    expect(screen.queryByText('The sum of the spaces below.')).not.toBeInTheDocument();

    fireEvent.change(total(), { target: { value: '75' } });
    expect(form().getValues('capacity')).toBe('75');
  });

  it('shows the total as the sum of the spaces, read-only, overriding a stale stored number', async () => {
    const { form } = mount({
      capacity: 999,
      capacity_items: [
        { label: 'Ground floor', capacity: 40 },
        { label: 'Terrace', capacity: 20 },
      ],
    });

    await waitFor(() => expect(form().getValues('capacity')).toBe(60));
    expect(total()).toHaveValue(60);
    expect(total()).toHaveAttribute('readonly');
    expect(total()).not.toBeRequired();
    expect(screen.getByText('The sum of the spaces below.')).toBeInTheDocument();
  });

  it('keeps the total in step as a space is resized, added and removed', async () => {
    const { form } = mount({ capacity: 40, capacity_items: [{ label: 'Ground floor', capacity: 40 }] });

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Seats' }), { target: { value: '55' } });
    await waitFor(() => expect(form().getValues('capacity')).toBe(55));

    fireEvent.click(screen.getByRole('button', { name: 'Add a space' }));
    await waitFor(() => expect(form().getValues('capacity')).toBe(56));

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove this space' })[0]);
    await waitFor(() => expect(form().getValues('capacity')).toBe(1));
  });

  it('hands the total back to the keyboard once the last space is removed, keeping the last sum', async () => {
    const { form } = mount({ capacity: 40, capacity_items: [{ label: 'Ground floor', capacity: 40 }] });
    await waitFor(() => expect(total()).toHaveAttribute('readonly'));

    fireEvent.click(screen.getByRole('button', { name: 'Remove this space' }));

    await waitFor(() => expect(total()).not.toHaveAttribute('readonly'));
    expect(form().getValues('capacity')).toBe(40);
  });

  it('stops adding spaces at the limit the config states', () => {
    mount({
      capacity_items: [
        { label: 'A', capacity: 1 },
        { label: 'B', capacity: 1 },
        { label: 'C', capacity: 1 },
      ],
    });
    expect(screen.getByRole('button', { name: 'Add a space' })).toBeDisabled();
  });
});
