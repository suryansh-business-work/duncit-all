import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import VenueTypeCapacitySection from './VenueTypeCapacitySection';
import { mountSection, sectionConfig } from './__tests__/sectionHarness';

afterEach(cleanup);

describe('VenueTypeCapacitySection — venue type', () => {
  it('offers the configured venue types with a hint while registering', async () => {
    const { form } = mountSection((sectionForm) => (
      <VenueTypeCapacitySection form={sectionForm} config={sectionConfig} mode="register" />
    ));

    expect(screen.getByText('Closest match for your space')).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Venue type/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Banquet hall' }));

    await waitFor(() => expect(form().getValues('venue_type')).toBe('Banquet hall'));
  });

  it('locks the venue type after approval but keeps the capacity list editable', () => {
    mountSection(
      (form) => <VenueTypeCapacitySection form={form} config={sectionConfig} mode="edit-approved" />,
      { venue_type: 'Cafe', capacity_items: [{ label: 'Main hall', capacity: 30 }] }
    );

    expect(screen.getByRole('combobox', { name: /Venue type/ }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('Locked after approval')).toBeTruthy();
    expect(screen.getByLabelText(/What is this capacity for\?/)).toHaveProperty('disabled', false);
  });
});

describe('VenueTypeCapacitySection — capacity list', () => {
  it('starts empty with no total, and adds blank rows up to the configured limit', () => {
    const { form } = mountSection((sectionForm) => (
      <VenueTypeCapacitySection form={sectionForm} config={sectionConfig} mode="register" />
    ));

    expect(screen.queryByText(/^Total:/)).toBeNull();
    const add = screen.getByRole('button', { name: 'Add capacity entry' });
    fireEvent.click(add);
    fireEvent.click(add);

    expect(form().getValues('capacity_items')).toEqual([
      { label: '', capacity: '' },
      { label: '', capacity: '' },
    ]);
    expect(screen.getByText('At most 2 capacity entries are allowed.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add capacity entry' })).toHaveProperty('disabled', true);
  });

  it('totals the typed capacities, ignoring a row that is not a number yet', () => {
    mountSection((form) => <VenueTypeCapacitySection form={form} config={sectionConfig} mode="register" />, {
      capacity_items: [
        { label: 'Main hall', capacity: 30 },
        { label: 'Terrace', capacity: '' },
      ],
    });

    expect(screen.getByText('Total: 30')).toBeTruthy();
  });

  it('removes a row', () => {
    const { form } = mountSection(
      (sectionForm) => <VenueTypeCapacitySection form={sectionForm} config={sectionConfig} mode="register" />,
      { capacity_items: [{ label: 'Main hall', capacity: 30 }] }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove capacity entry' }));

    expect(form().getValues('capacity_items')).toEqual([]);
    expect(screen.queryByText('Total: 30')).toBeNull();
  });

  it('says an empty list needs at least one entry', async () => {
    const { form } = mountSection((sectionForm) => (
      <VenueTypeCapacitySection form={sectionForm} config={sectionConfig} mode="register" />
    ));

    await act(async () => {
      await form().trigger(['venue_type', 'capacity_items']);
    });

    expect(await screen.findByText('Add at least one capacity entry for your venue')).toBeTruthy();
    expect(screen.getByText('Select a venue type')).toBeTruthy();
  });

  it('flags a row with no label and a capacity below one', async () => {
    const { form } = mountSection(
      (sectionForm) => <VenueTypeCapacitySection form={sectionForm} config={sectionConfig} mode="register" />,
      { venue_type: 'Cafe', capacity_items: [{ label: '', capacity: 0 }] }
    );

    await act(async () => {
      await form().trigger(['venue_type', 'capacity_items']);
    });

    expect(await screen.findByText('Give this capacity a label (e.g. Banquet hall)')).toBeTruthy();
    expect(screen.getByText('Capacity must be at least 1')).toBeTruthy();
    expect(screen.queryByText('e.g. Banquet hall, Rooftop tables')).toBeNull();
    expect(screen.queryByText('People it holds')).toBeNull();
  });
});
