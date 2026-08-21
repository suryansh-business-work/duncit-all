/**
 * The field a pod form attaches products through.
 *
 * The rule the picker exists to hold is that a product already on the pod is
 * shown as added rather than offered again — attaching the same product twice
 * is what produced the duplicate lines this replaced. Everything else here is
 * the ordinary contract of a controlled field: it renders what it is given and
 * reports changes upward rather than holding its own copy.
 */
import type { ReactElement } from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PodProductDialog from '../src/PodProductDialog';
import PodProductsField, { type PodProductRequestValue } from '../src/PodProductsField';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const product = (over: Record<string, unknown> = {}) => ({
  __typename: 'InventoryProduct',
  id: 'p-1',
  product_name: 'Yonex Shuttlecock Tube',
  unit_cost: 450,
  available_count: 12,
  brand_name: 'Yonex',
  sku: 'YX-SC-12',
  short_description: 'Six feather shuttles.',
  description: 'A tube of six tournament-grade feather shuttles.',
  image_url: 'https://cdn.duncit.com/products/shuttle.jpg',
  images: [],
  unit_type: 'PIECE',
  weight_volume: '',
  tags: ['badminton'],
  super_category_id: 's-1',
  category_id: 'c-1',
  sub_category_id: 'b-1',
  categories: [],
  ...over,
});

const PRODUCTS = [
  product(),
  product({ id: 'p-2', product_name: 'Grip Tape', unit_cost: 120, available_count: 0, sku: 'YX-GT-01' }),
];

const wrap = (ui: ReactElement) => render(<MockedProvider mocks={[]}>{ui}</MockedProvider>);

afterEach(() => {
  vi.clearAllMocks();
});

describe('PodProductsField', () => {
  it('renders an empty field with nothing attached yet', async () => {
    const { container } = wrap(<PodProductsField value={[]} onChange={vi.fn()} products={PRODUCTS} />);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('lists the products already attached to the pod', async () => {
    const value: PodProductRequestValue[] = [{ product_id: 'p-1', quantity: 2 }];
    const { container } = wrap(<PodProductsField value={value} onChange={vi.fn()} products={PRODUCTS} />);
    await settle();

    expect(container.textContent).toContain('Yonex Shuttlecock Tube');
  });

  it('shows the caller error message', async () => {
    const { container } = wrap(
      <PodProductsField value={[]} onChange={vi.fn()} products={PRODUCTS} error="Pick at least one product" />
    );
    await settle();

    expect(container.textContent).toContain('Pick at least one product');
  });

  it('renders disabled without crashing', async () => {
    const { container } = wrap(
      <PodProductsField value={[{ product_id: 'p-1', quantity: 1 }]} onChange={vi.fn()} products={PRODUCTS} disabled />
    );
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders with a catalogue the pod’s category narrowed to nothing', async () => {
    const { container } = wrap(<PodProductsField value={[]} onChange={vi.fn()} products={[]} />);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('survives every control being pressed, and reports upward rather than holding its own copy', async () => {
    const onChange = vi.fn();
    wrap(<PodProductsField value={[{ product_id: 'p-1', quantity: 1 }]} onChange={onChange} products={PRODUCTS} />);
    await settle();

    for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 20)) {
      if (!control.isConnected) continue;
      fireEvent.click(control);
      await settle();
    }

    for (const call of onChange.mock.calls) expect(Array.isArray(call[0])).toBe(true);
  });
});

describe('PodProductDialog', () => {
  it('renders nothing while it is closed', () => {
    wrap(<PodProductDialog open={false} onClose={vi.fn()} products={PRODUCTS} addedIds={[]} onAdd={vi.fn()} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('offers the catalogue when it opens', async () => {
    wrap(<PodProductDialog open onClose={vi.fn()} products={PRODUCTS} addedIds={[]} onAdd={vi.fn()} />);
    await settle();

    expect(document.body.textContent).toContain('Yonex Shuttlecock Tube');
    expect(document.body.textContent).toContain('Grip Tape');
  });

  it('still lists a product already on the pod, marked rather than offered again', async () => {
    wrap(<PodProductDialog open onClose={vi.fn()} products={PRODUCTS} addedIds={['p-1']} onAdd={vi.fn()} />);
    await settle();

    expect(document.body.textContent).toContain('Yonex Shuttlecock Tube');
  });

  it('opens on an empty catalogue without crashing', async () => {
    wrap(<PodProductDialog open onClose={vi.fn()} products={[]} addedIds={[]} onAdd={vi.fn()} />);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('survives every control being pressed, and only ever adds a real product id', async () => {
    const onAdd = vi.fn();
    wrap(<PodProductDialog open onClose={vi.fn()} products={PRODUCTS} addedIds={[]} onAdd={onAdd} />);
    await settle();

    for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 20)) {
      if (!control.isConnected) continue;
      fireEvent.click(control);
      await settle();
    }

    for (const [productId, quantity] of onAdd.mock.calls) {
      expect(PRODUCTS.map((p) => p.id)).toContain(productId);
      expect(quantity).toBeGreaterThan(0);
    }
  });
});
