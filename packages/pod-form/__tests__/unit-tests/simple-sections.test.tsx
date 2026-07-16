import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AboutSection from '../../src/sections/AboutSection';
import OffersSection from '../../src/sections/OffersSection';
import PerksSection from '../../src/sections/PerksSection';
import ProductsSection from '../../src/sections/ProductsSection';
import { Harness, makeData } from './helpers';

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
  it('renders the products field wired to the context products', () => {
    render(
      <Harness data={makeData({ products: [{ id: 'p1', product_name: 'Tea', unit_cost: 100, available_count: 5 }] })}>
        <ProductsSection />
      </Harness>,
    );
    expect(screen.getByRole('button', { name: 'Add approved product' })).toBeEnabled();
  });
});
