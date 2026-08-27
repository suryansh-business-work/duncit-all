import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import CascadeEffect from '../../src/CascadeEffect';
import { Harness, makeData } from './helpers';
import type { PodFormData, PodFormValues } from '../../src/types';

function mount(defaults: Partial<PodFormValues>, data: PodFormData = makeData()) {
  const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
  render(
    <Harness data={data} defaultValues={defaults} methodsRef={methodsRef}>
      <CascadeEffect />
    </Harness>,
  );
  return methodsRef;
}

describe('CascadeEffect', () => {
  it('clears meeting fields on mount for a physical pod', () => {
    const ref = mount({
      pod_mode: 'PHYSICAL',
      meeting_platform: 'Zoom',
      meeting_url: 'https://z',
      meeting_notes: 'notes',
    });
    expect(ref.current?.getValues('meeting_platform')).toBe('');
    expect(ref.current?.getValues('meeting_url')).toBe('');
    expect(ref.current?.getValues('meeting_notes')).toBe('');
  });

  it('clears all physical/product fields when switching to virtual', () => {
    const ref = mount(
      {
        pod_mode: 'PHYSICAL',
        venue_id: 'v1',
        venue_slot_id: 's1',
        location_id: 'l1',
        zone_name: 'z1',
        place_charges: [{ label: 'Entry', amount: 10, note: '' }],
        products_enabled: true,
        club_id: 'c1',
        product_requests: [{ product_id: 'p1', quantity: 1 }],
      },
      // The club must offer p1 (or the category prune empties the list before
      // the mode switch can) AND link v1 (or the venue-link effect clears the
      // venue fields on mount) — either would stop this testing what it means to.
      makeData({
        clubs: [{ id: 'c1', club_name: 'Club', super_category_id: 'sup-1', category_id: 'sub-1' }],
        products: [
          { id: 'p1', product_name: 'Shuttles', categories: [{ super_category_id: 'sup-1', sub_category_id: 'sub-1' }] },
        ],
        getClubVenueIds: () => ['v1'],
      } as never),
    );
    act(() => ref.current?.setValue('pod_mode', 'VIRTUAL'));
    expect(ref.current?.getValues('venue_id')).toBe('');
    expect(ref.current?.getValues('venue_slot_id')).toBe('');
    expect(ref.current?.getValues('location_id')).toBe('');
    expect(ref.current?.getValues('zone_name')).toBe('');
    expect(ref.current?.getValues('place_charges')).toEqual([]);
    // `products_enabled` is no longer a field the cascade clears: buildPodInput
    // derives it from the rows, so dropping the rows is what disables products.
    expect(ref.current?.getValues('product_requests')).toEqual([]);
  });

  it('is a no-op switching to virtual when physical fields are already empty', () => {
    const ref = mount({ pod_mode: 'PHYSICAL' });
    act(() => ref.current?.setValue('pod_mode', 'VIRTUAL'));
    expect(ref.current?.getValues('venue_id')).toBe('');
    expect(ref.current?.getValues('product_requests')).toEqual([]);
  });

  it('resets the venue when it is no longer linked to the club', () => {
    const data = makeData({ clubs: [{ id: 'c1' }], getClubVenueIds: () => ['v-linked'] });
    const ref = mount({ club_id: 'c1', venue_id: 'v1', venue_slot_id: 's1', location_id: 'l1' }, data);
    expect(ref.current?.getValues('venue_id')).toBe('');
    expect(ref.current?.getValues('venue_slot_id')).toBe('');
  });

  it('keeps the venue when it stays linked to the club', () => {
    const data = makeData({ clubs: [{ id: 'c1' }], getClubVenueIds: () => ['v1'] });
    const ref = mount({ club_id: 'c1', venue_id: 'v1' }, data);
    expect(ref.current?.getValues('venue_id')).toBe('v1');
  });

  it('skips the link check when club or venue is unset', () => {
    const data = makeData({ clubs: [{ id: 'c1' }], getClubVenueIds: () => [] });
    const ref = mount({ club_id: '', venue_id: '' }, data);
    expect(ref.current?.getValues('venue_id')).toBe('');
  });

  it('forces the amount to 0 for a free pod type', () => {
    const ref = mount({ pod_type: 'NATIVE_FREE', pod_amount: 500 });
    expect(ref.current?.getValues('pod_amount')).toBe(0);
  });

  it('leaves a paid amount untouched', () => {
    const ref = mount({ pod_type: 'NATIVE_PAID', pod_amount: 500 });
    expect(ref.current?.getValues('pod_amount')).toBe(500);
  });

  it('clears product requests when products are disabled', () => {
    const ref = mount({ products_enabled: false, product_requests: [{ product_id: 'p1', quantity: 2 }] });
    expect(ref.current?.getValues('product_requests')).toEqual([]);
  });

  // A club stores its Sub-category in `category_id`; a product belongs when a
  // category row carries the same Super + Sub.
  const badmintonData = (clubSub: string) =>
    makeData({
      clubs: [{ id: 'c1', club_name: 'Club', super_category_id: 'sup-1', category_id: clubSub }],
      products: [
        { id: 'p1', product_name: 'Shuttles', categories: [{ super_category_id: 'sup-1', sub_category_id: 'sub-1' }] },
      ],
    } as never);

  it('keeps product requests while products are enabled and the club still offers them', () => {
    const ref = mount(
      { products_enabled: true, club_id: 'c1', product_requests: [{ product_id: 'p1', quantity: 2 }] },
      badmintonData('sub-1'),
    );
    expect(ref.current?.getValues('product_requests')).toEqual([{ product_id: 'p1', quantity: 2 }]);
  });

  // Picking a club in another category has to take its products with it —
  // otherwise the row renders blank and the save dies on the server gate.
  it('drops a product row the selected club does not offer', () => {
    const ref = mount(
      { products_enabled: true, club_id: 'c1', product_requests: [{ product_id: 'p1', quantity: 2 }] },
      badmintonData('sub-2'),
    );
    expect(ref.current?.getValues('product_requests')).toEqual([]);
  });

  it('leaves an empty request list alone', () => {
    const ref = mount({ products_enabled: true, club_id: 'c1', product_requests: [] }, badmintonData('sub-1'));
    expect(ref.current?.getValues('product_requests')).toEqual([]);
  });
});
