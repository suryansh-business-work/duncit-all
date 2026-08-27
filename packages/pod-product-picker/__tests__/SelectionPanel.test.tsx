/**
 * The right-hand rail and the card, rendered directly so every state a pick can
 * be in is reachable — the dialog can never hand the rail an out-of-stock
 * product, because its card is disabled, but the rail still has to render one
 * honestly if it ever arrives.
 */
import type { ReactElement } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import { createTranslator } from '@duncit/app-settings';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ProductCard from '../src/ProductCard';
import SelectionPanel from '../src/SelectionPanel';
import { formatMoney } from '../src/format';
import { POD_PRODUCT_FALLBACK_FLAT } from '../src/i18n/useTranslation';

const testTheme = createTheme();
const { t } = createTranslator({ locale: 'en-IN', fallback: POD_PRODUCT_FALLBACK_FLAT });

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
  weight_volume: '250 g',
  tags: ['badminton'],
  ...over,
});

const wrap = (ui: ReactElement) => render(<ThemeProvider theme={testTheme}>{ui}</ThemeProvider>);

const panel = (over: Partial<Parameters<typeof SelectionPanel>[0]> = {}) => (
  <SelectionPanel
    product={product() as never}
    quantity={1}
    onQuantityChange={vi.fn()}
    onAdd={vi.fn()}
    error=""
    t={t}
    {...over}
  />
);

afterEach(() => {
  vi.clearAllMocks();
});

describe('SelectionPanel', () => {
  it('labels an out-of-stock pick instead of counting units', () => {
    wrap(panel({ product: product({ available_count: 0 }) as never }));

    expect(screen.queryByText('Out of stock')).not.toBeNull();
    expect(document.body.textContent).not.toContain('12 left');
  });

  it('falls back from description to short description to the no-description line', () => {
    const { unmount } = wrap(
      panel({ product: product({ description: '   ' }) as never })
    );
    expect(screen.queryByText('Six feather shuttles.')).not.toBeNull();
    unmount();

    wrap(panel({ product: product({ description: '', short_description: null }) as never }));
    expect(screen.queryByText('No description provided.')).not.toBeNull();
  });

  it('shows the placeholder when the catalogue ships no image', () => {
    wrap(panel({ product: product({ image_url: '  ', images: null }) as never }));

    expect(document.body.querySelector('[data-testid="ImageNotSupportedIcon"]')).not.toBeNull();
  });

  it('the stepper stops at stock and says why', () => {
    const onQuantityChange = vi.fn();
    wrap(panel({ product: product({ available_count: 2 }) as never, quantity: 2, onQuantityChange }));

    expect(screen.queryByText('Only 2 available.')).not.toBeNull();
    expect(screen.getByLabelText('Increase quantity')).toHaveProperty('disabled', true);

    fireEvent.click(screen.getByLabelText('Decrease quantity'));
    expect(onQuantityChange).toHaveBeenCalledWith(1);
  });

  it('steps up from one, where stepping down is blocked', () => {
    const onQuantityChange = vi.fn();
    wrap(panel({ onQuantityChange }));

    expect(screen.getByLabelText('Decrease quantity')).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByLabelText('Increase quantity'));
    expect(onQuantityChange).toHaveBeenCalledWith(2);

    expect(document.body.textContent).toContain(`Total: ${formatMoney(450)}`);
  });

  it('surfaces the parent error and keeps Add clickable so the refusal can speak', () => {
    const onAdd = vi.fn();
    wrap(panel({ product: null, error: 'Please select a product to continue.', onAdd }));

    expect(screen.queryByText('Please select a product to continue.')).not.toBeNull();
    fireEvent.click(screen.getByText('Add to pod'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});

describe('ProductCard', () => {
  it('shows the placeholder image and the units-left count', () => {
    wrap(
      <ProductCard
        product={product({ id: 'p-9', image_url: null, images: [], available_count: 7 }) as never}
        selected={false}
        added={false}
        onSelect={vi.fn()}
        t={t}
      />
    );

    expect(document.body.querySelector('[data-testid="ImageNotSupportedIcon"]')).not.toBeNull();
    expect(screen.queryByText('7 left')).not.toBeNull();
  });
});
