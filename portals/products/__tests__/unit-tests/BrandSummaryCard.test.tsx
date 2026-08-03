import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import BrandSummaryCard from '../../src/pages/catalog-brands/BrandSummaryCard';
import type { CatalogBrandDetail } from '../../src/pages/catalog-brands/queries';
import { renderWithProviders } from '../testkit';

const makeBrand = (over: Partial<CatalogBrandDetail> = {}): CatalogBrandDetail => ({
  id: 'b1',
  brand_name: 'Acme Attire',
  status: 'APPROVED',
  is_active: true,
  approved_product_count: 2,
  product_commission_pct: 10,
  ...over,
});

const renderCard = (brand: CatalogBrandDetail) =>
  renderWithProviders(<BrandSummaryCard brand={brand} productsTo="/catalog/brands/b1/products" />);

describe('BrandSummaryCard', () => {
  it('shows an approved active brand with its contact, location and product count', () => {
    renderCard(
      makeBrand({
        brand_no: 'BRD-000001',
        logo_url: 'https://cdn/logo.png',
        contact_person: 'Asha',
        contact_email: 'sales@acme.com',
        city: 'Pune',
        state: 'MH',
        country: 'India',
      }),
    );
    expect(screen.getByText('Acme Attire')).toBeInTheDocument();
    expect(screen.getByText('BRD-000001')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Asha · sales@acme.com')).toBeInTheDocument();
    expect(screen.getByText('Pune, MH, India')).toBeInTheDocument();
    expect(screen.getByText('2 approved products in the marketplace.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /products/i })).toHaveAttribute(
      'href',
      '/catalog/brands/b1/products',
    );
  });

  it('never offers approve or reject — it links a submitted brand to Brands Review', () => {
    renderCard(makeBrand({ status: 'SUBMITTED', is_active: false, approved_product_count: 1 }));
    expect(screen.getByText(/waiting for a decision/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /brands review/i })).toHaveAttribute(
      'href',
      '/ecomm/brands',
    );
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    expect(screen.getByText('Deactivated')).toBeInTheDocument();
    expect(screen.getByText('1 approved product in the marketplace.')).toBeInTheDocument();
  });

  it('falls back when the brand has no name, contact, address or brand number', () => {
    renderCard(makeBrand({ brand_name: '', status: 'DRAFT' }));
    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.getByText('No contact on file')).toBeInTheDocument();
    expect(screen.getByText('No address on file')).toBeInTheDocument();
    expect(screen.getByText(/still a draft/i)).toBeInTheDocument();
  });

  it('explains a rejected brand without offering the decision here', () => {
    renderCard(makeBrand({ status: 'REJECTED' }));
    expect(screen.getByText(/was rejected/i)).toBeInTheDocument();
  });
});
