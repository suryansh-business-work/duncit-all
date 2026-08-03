import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BrandReviewDetails from '../../src/pages/ecomm/BrandReviewDetails';
import { makeEcommBrandRow } from '../mocks/ecommBrand.mock';

describe('BrandReviewDetails', () => {
  it('lays out everything the partner submitted', () => {
    render(
      <BrandReviewDetails
        brand={makeEcommBrandRow({
          cover_image_url: 'http://img/cover.png',
          product_categories: ['Decor', 'Apparel'],
          website_url: 'https://acme.test',
          instagram_url: 'https://instagram.test/acme',
          documents: [{ type: 'GST Certificate', url: 'http://doc/gst.pdf' }],
        })}
      />,
    );
    expect(screen.getByText('BRD-000001')).toBeInTheDocument();
    expect(screen.getByText('Fresh goods')).toBeInTheDocument();
    expect(screen.getByText('A demo brand.')).toBeInTheDocument();
    expect(screen.getByText('Decor, Apparel')).toBeInTheDocument();
    expect(screen.getByText('Asha · sales@acme.com')).toBeInTheDocument();
    expect(screen.getByText('Pune, MH')).toBeInTheDocument();
    expect(
      screen.getByText('Acme Pvt Ltd · GSTIN 27ABCDE1234F1Z5 · PAN ABCDE1234F'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument();
    expect(screen.getByText('GST Certificate')).toBeInTheDocument();
  });

  it('dashes every field the partner left blank', () => {
    render(
      <BrandReviewDetails
        brand={makeEcommBrandRow({
          brand_no: null,
          cover_image_url: '',
          tagline: '',
          description: '',
          product_categories: null,
          contact_person: '',
          contact_email: '',
          contact_phone: '',
          city: '',
          state: '',
          registered_business_name: '',
          gstin: '',
          pan: '',
          website_url: '',
          instagram_url: '',
          documents: null,
        })}
      />,
    );
    expect(screen.getAllByText('—')).toHaveLength(7);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders only the link the brand actually has', () => {
    render(
      <BrandReviewDetails
        brand={makeEcommBrandRow({ website_url: '', instagram_url: 'https://instagram.test/acme' })}
      />,
    );
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument();
  });
});
