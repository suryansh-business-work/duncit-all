import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseFormReturn } from 'react-hook-form';
import AboutSection from '../../src/sections/AboutSection';
import OffersSection from '../../src/sections/OffersSection';
import PerksSection from '../../src/sections/PerksSection';
import ProductsSection from '../../src/sections/ProductsSection';
import { Harness, makeConfig, makeData } from './helpers';
import type { PodFormValues } from '../../src/types';

describe('AboutSection', () => {
  it('renders the description and info fields', async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <AboutSection />
      </Harness>,
    );
    const desc = screen.getByLabelText(/Description/);
    await user.type(desc, 'A good pod description');
    expect(desc).toHaveValue('A good pod description');
    expect(screen.getByText(/Logistics, what to bring/)).toBeInTheDocument();
  });
});

describe('OffersSection', () => {
  it('adds an amenity chip through the chip field', async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <OffersSection />
      </Harness>,
    );
    expect(screen.getByText('Amenities & facilities')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox'), 'Free WiFi{Enter}');
    expect(screen.getByText('Free WiFi')).toBeInTheDocument();
  });
});

describe('PerksSection', () => {
  it('adds a perk chip through the chip field', async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <PerksSection />
      </Harness>,
    );
    expect(screen.getByText('Available perks')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox'), 'VIP{Enter}');
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });
});

describe('ProductsSection', () => {
  // The club's Sub-category is stored in `category_id`; a product matches when a
  // category row carries the same Super + Sub.
  const CLUB = { id: 'c1', club_name: 'Badminton Club', super_category_id: 'sup-1', category_id: 'sub-1' };
  const inCategory = {
    id: 'p1',
    product_name: 'Shuttlecocks',
    unit_cost: 100,
    available_count: 5,
    categories: [{ super_category_id: 'sup-1', sub_category_id: 'sub-1' }],
  };
  const otherCategory = {
    id: 'p2',
    product_name: 'Football',
    unit_cost: 200,
    available_count: 5,
    categories: [{ super_category_id: 'sup-2', sub_category_id: 'sub-2' }],
  };

  it('offers only the products in the pod club category', () => {
    render(
      <Harness
        data={makeData({ clubs: [CLUB] as never, products: [inCategory, otherCategory] as never })}
        defaultValues={{ club_id: 'c1' }}
      >
        <ProductsSection />
      </Harness>,
    );
    expect(screen.getByRole('button', { name: 'Add a Product' })).toBeEnabled();
    expect(screen.queryByText('No products available for this category.')).not.toBeInTheDocument();
  });

  // A club with no category has nothing to match against, so it offers nothing
  // rather than the whole catalogue — the picker used to show every product here.
  it('offers nothing when the pod club carries no category', () => {
    render(
      <Harness
        data={makeData({ clubs: [{ id: 'c1', club_name: 'Legacy' }] as never, products: [inCategory] as never })}
        defaultValues={{ club_id: 'c1' }}
      >
        <ProductsSection />
      </Harness>,
    );
    expect(screen.getByRole('button', { name: 'Add a Product' })).toBeDisabled();
    expect(screen.getByText('No products available for this category.')).toBeInTheDocument();
  });

  it('surfaces the product-request validation error under the picker', () => {
    const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
    render(
      <Harness
        data={makeData({ clubs: [CLUB] as never, products: [inCategory] as never })}
        defaultValues={{ club_id: 'c1' }}
        methodsRef={methodsRef}
      >
        <ProductsSection />
      </Harness>,
    );
    act(() => {
      methodsRef.current?.setError('product_requests', { type: 'custom', message: 'A virtual pod cannot carry products' });
    });
    expect(screen.getByText('A virtual pod cannot carry products')).toBeInTheDocument();
  });
});

describe('ProductsSection (autoPod)', () => {
  // An Auto Pod has no club: the category pair the form holds is what the
  // products must match, so the picker offers exactly what a club with that
  // pair would.
  const inCategory = {
    id: 'p1',
    product_name: 'Shuttlecocks',
    unit_cost: 100,
    available_count: 5,
    categories: [{ super_category_id: 'sup-1', sub_category_id: 'sub-1' }],
  };

  it('offers the products of the category the template carries', () => {
    render(
      <Harness
        data={makeData({ config: makeConfig({ autoPod: true, showProducts: true }), products: [inCategory] as never })}
        defaultValues={{ super_category_id: 'sup-1', sub_category_id: 'sub-1' }}
      >
        <ProductsSection />
      </Harness>,
    );
    expect(screen.getByRole('button', { name: 'Add a Product' })).toBeEnabled();
  });

  it('offers nothing until the category is chosen', () => {
    render(
      <Harness data={makeData({ config: makeConfig({ autoPod: true, showProducts: true }), products: [inCategory] as never })}>
        <ProductsSection />
      </Harness>,
    );
    expect(screen.getByText('No products available for this category.')).toBeInTheDocument();
  });
});
