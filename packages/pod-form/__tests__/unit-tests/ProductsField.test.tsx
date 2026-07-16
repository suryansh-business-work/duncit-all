import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import ProductsField from '../../src/components/ProductsField';
import { blankPodFormValues, type PodFormValues } from '../../src/types';

const PRODUCTS = [
  { id: 'p1', product_name: 'Tea', unit_cost: 100, available_count: 5 },
  { id: 'p2', product_name: 'Coffee', unit_cost: 50, available_count: 0 },
  { id: 'p3', product_name: 'Cake', unit_cost: 200, available_count: 3 },
];

function Wrapper({
  products = PRODUCTS,
  defaults,
  methodsRef,
}: Readonly<{
  products?: any[];
  defaults?: Partial<PodFormValues>;
  methodsRef?: { current: UseFormReturn<PodFormValues> | null };
}>) {
  const methods = useForm<PodFormValues>({ defaultValues: { ...blankPodFormValues, ...defaults } });
  if (methodsRef) methodsRef.current = methods;
  return (
    <FormProvider {...methods}>
      <ProductsField products={products} />
    </FormProvider>
  );
}

describe('ProductsField', () => {
  it('shows an empty total and disables Add with no products', () => {
    render(<Wrapper products={[]} />);
    expect(screen.getByRole('button', { name: 'Add approved product' })).toBeDisabled();
    expect(screen.getByText(/Total product price/)).toBeInTheDocument();
  });

  it('appends a request row and enables the picker', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.click(screen.getByRole('button', { name: 'Add approved product' }));
    expect(screen.getByLabelText('Approved product')).toBeInTheDocument();
    expect(screen.getByLabelText('Qty')).toBeInTheDocument();
  });

  it('computes the row cost and grand total from a selected product', async () => {
    const user = userEvent.setup();
    render(<Wrapper defaults={{ product_requests: [{ product_id: 'p1', quantity: 2 }] }} />);
    // p1 unit_cost 100 * qty 2 = 200
    expect(screen.getByText('Total product price: ₹200.00')).toBeInTheDocument();
  });

  it('updates product selection and quantity', async () => {
    const user = userEvent.setup();
    const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
    render(
      <Wrapper
        defaults={{ product_requests: [{ product_id: 'p1', quantity: 1 }] }}
        methodsRef={methodsRef}
      />,
    );
    const qty = screen.getByLabelText('Qty');
    await user.clear(qty);
    await user.type(qty, '3');
    expect(methodsRef.current?.getValues('product_requests')[0].quantity).toBe(3);
  });

  it('selects a product through the dropdown', async () => {
    const user = userEvent.setup();
    const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
    render(
      <Wrapper
        defaults={{ product_requests: [{ product_id: '', quantity: 1 }] }}
        methodsRef={methodsRef}
      />,
    );
    await user.click(screen.getByLabelText('Approved product'));
    await user.click(await screen.findByRole('option', { name: /Tea/ }));
    expect(methodsRef.current?.getValues('product_requests')[0].product_id).toBe('p1');
  });

  it('removes a request row', async () => {
    const user = userEvent.setup();
    const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
    render(
      <Wrapper
        defaults={{ product_requests: [{ product_id: 'p1', quantity: 1 }] }}
        methodsRef={methodsRef}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Remove product' }));
    expect(methodsRef.current?.getValues('product_requests')).toHaveLength(0);
  });

  it('shows validation errors for a row', () => {
    const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
    render(
      <Wrapper
        defaults={{ product_requests: [{ product_id: '', quantity: 0 }] }}
        methodsRef={methodsRef}
      />,
    );
    act(() => {
      methodsRef.current?.setError('product_requests.0.product_id', {
        type: 'custom',
        message: 'Select product',
      });
      methodsRef.current?.setError('product_requests.0.quantity', {
        type: 'custom',
        message: 'Quantity required',
      });
    });
    expect(screen.getByText('Select product')).toBeInTheDocument();
    expect(screen.getByText('Quantity required')).toBeInTheDocument();
  });

  it('disables out-of-stock and already-selected products in the menu', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper
        defaults={{
          product_requests: [
            { product_id: 'p1', quantity: 1 },
            { product_id: 'p3', quantity: 1 },
          ],
        }}
      />,
    );
    // Open the second row's product select (p3 chosen here).
    await user.click(screen.getAllByLabelText('Approved product')[1]);
    // Coffee (p2) has 0 available -> disabled.
    expect(screen.getByRole('option', { name: /Coffee/ })).toHaveAttribute('aria-disabled', 'true');
    // Tea (p1) is selected in the first row and differs from this row -> disabled.
    expect(screen.getByRole('option', { name: /Tea/ })).toHaveAttribute('aria-disabled', 'true');
    // Cake (p3) is this row's own selection -> enabled.
    expect(screen.getByRole('option', { name: /Cake/ })).not.toHaveAttribute('aria-disabled', 'true');
  });
});
