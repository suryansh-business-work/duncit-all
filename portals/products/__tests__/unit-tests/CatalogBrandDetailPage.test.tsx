import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { notifySuccess } from '@duncit/dialogs';

const m = vi.hoisted(() => ({
  query: { data: undefined as unknown, loading: false, refetch: vi.fn() },
  update: vi.fn(),
  updateState: { loading: false },
}));

vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return {
    ...actual,
    useQuery: () => m.query,
    useMutation: () => [m.update, m.updateState],
  };
});

vi.mock('@duncit/dialogs', () => ({ notifySuccess: vi.fn() }));

vi.mock('../../src/pages/catalog-brands/BrandSummaryCard', () => ({
  default: ({ brand, productsTo }: any) => (
    <div data-testid="summary">{`${brand.brand_name}|${productsTo}`}</div>
  ),
}));

vi.mock('../../src/pages/catalog-brands/BrandCommercePanel', () => ({
  default: () => <div data-testid="commerce" />,
}));

const form = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
vi.mock('../../src/pages/catalog-brands/brand-form', async (io) => ({
  ...(await io<typeof import('../../src/pages/catalog-brands/brand-form')>()),
  BrandForm: (props: Record<string, any>) => {
    form.props = props;
    return <div data-testid="brand-form" />;
  },
}));

import CatalogBrandDetailPage from '../../src/pages/catalog-brands/CatalogBrandDetailPage';

const brand = {
  __typename: 'EcommBrand',
  id: 'b1',
  brand_name: 'Acme Attire',
  status: 'SUBMITTED',
  is_active: true,
  approved_product_count: 2,
  product_commission_pct: 12,
  city: 'Pune',
  product_categories: ['Decor'],
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/catalog/brands/b1']}>
      <Routes>
        <Route path="/catalog/brands/:brandId" element={<CatalogBrandDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  m.query = { data: { ecommBrand: brand }, loading: false, refetch: vi.fn() };
  m.update = vi.fn().mockResolvedValue({});
  m.updateState = { loading: false };
  form.props = null;
  vi.mocked(notifySuccess).mockClear();
});

describe('CatalogBrandDetailPage', () => {
  it('shows a spinner while the first load is in flight', () => {
    m.query = { data: undefined, loading: true, refetch: vi.fn() };
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('warns when the brand does not exist', () => {
    m.query = { data: { ecommBrand: null }, loading: false, refetch: vi.fn() };
    renderPage();
    expect(screen.getByText('Brand not found.')).toBeInTheDocument();
  });

  it('renders the summary, commercial panel and a seeded edit form', () => {
    renderPage();
    expect(screen.getByTestId('summary')).toHaveTextContent(
      'Acme Attire|/catalog/brands/b1/products',
    );
    expect(screen.getByTestId('commerce')).toBeInTheDocument();
    expect(form.props?.initialValues).toMatchObject({
      brand_name: 'Acme Attire',
      product_categories: 'Decor',
      city: 'Pune',
    });
  });

  it('saves the brand without ever sending a status', async () => {
    renderPage();
    await act(async () => {
      await form.props?.onSubmit({ ...form.props.initialValues, tagline: 'Fresh' });
    });
    expect(m.update).toHaveBeenCalledTimes(1);
    const variables = m.update.mock.calls[0][0].variables;
    expect(variables.id).toBe('b1');
    expect(variables.input).toMatchObject({ tagline: 'Fresh', product_categories: ['Decor'] });
    expect(variables).not.toHaveProperty('status');
    expect(variables.input).not.toHaveProperty('status');
    expect(m.query.refetch).toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith('Brand details saved');
  });

  it('surfaces a failed save and lets the admin dismiss it', async () => {
    m.update = vi.fn().mockRejectedValue(new Error('Brand not found'));
    renderPage();
    await act(async () => {
      await form.props?.onSubmit(form.props.initialValues);
    });
    const alert = await screen.findByText('Brand not found');
    expect(notifySuccess).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(alert).not.toBeInTheDocument());
  });

  it('passes the in-flight save state down to the form', () => {
    m.updateState = { loading: true };
    renderPage();
    expect(form.props?.saving).toBe(true);
  });
});
