import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EcommBrandsTable from './EcommBrandsTable';

const full = {
  id: '1', brand_name: 'Acme', logo_url: 'https://img/acme.png', tagline: 'Quality goods',
  product_categories: ['Apparel', 'Decor'], contact_person: 'Asha', contact_email: 'a@b.com',
  contact_phone: '999', status: 'SUBMITTED', submitted_at: '2026-01-02',
};
const sparse = {
  id: '2', brand_name: '', logo_url: '', tagline: '', product_categories: [],
  contact_person: '', contact_email: '', contact_phone: '', status: 'DRAFT', submitted_at: null,
};
// product_categories omitted (nullish fallback) + phone-only contact (email empty).
const phoneOnly = {
  id: '3', brand_name: 'PhoneCo', logo_url: '', tagline: '',
  contact_person: 'Ravi', contact_email: '', contact_phone: '999', status: 'APPROVED', submitted_at: '2026-02-02',
};

describe('EcommBrandsTable', () => {
  it('renders brands with fallbacks and fires review', () => {
    const onReview = vi.fn();
    render(<EcommBrandsTable brands={[full, sparse, phoneOnly]} onReview={onReview} />);
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Apparel, Decor')).toBeInTheDocument();
    expect(screen.getByText('Untitled brand')).toBeInTheDocument();
    expect(screen.getByText('999')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onReview).toHaveBeenCalledWith(full);
  });

  it('shows an empty state', () => {
    render(<EcommBrandsTable brands={[]} onReview={vi.fn()} />);
    expect(screen.getByText('No brands found.')).toBeInTheDocument();
  });
});
