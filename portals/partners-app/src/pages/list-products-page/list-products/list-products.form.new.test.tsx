import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPortal } from 'react-dom';
import { cleanup, configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import ListProductsForm from './list-products.form';
import { moderationMock, submitMock } from './__tests__/formMocks';
import { categoriesMock, warehouseRow, warehousesMock } from '../../../__tests__/groupB-fixtures';
import { renderWithProviders } from '../../../__tests__/render';

const picker = vi.hoisted(() => ({ url: 'https://cdn.test/cold-brew.jpg' }));

/** The real picker uploads to ImageKit; this one hands back a fixed URL (or
 * nothing when dismissed), portalled like the real dialog. */
vi.mock('../../../components/MediaPickerDialog', () => ({
  default: ({
    open,
    onClose,
    onPicked,
  }: Readonly<{ open: boolean; onClose: () => void; onPicked: (url: string) => void }>) =>
    open
      ? createPortal(
          <div>
            <button type="button" onClick={() => onPicked(picker.url)}>
              Confirm pick
            </button>
            <button type="button" onClick={onClose}>
              Dismiss picker
            </button>
          </div>,
          document.body,
        )
      : null,
}));

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);

const renderNewForm = (mocks = [categoriesMock, warehousesMock([warehouseRow()])]) => {
  const onSaved = vi.fn();
  renderWithProviders(<ListProductsForm brandId="b1" onSaved={onSaved} />, { mocks });
  return onSaved;
};

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

const pick = async (label: RegExp, option: string) => {
  fireEvent.keyDown(screen.getByRole('combobox', { name: label }), { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name: option }));
};

const setField = (role: 'textbox' | 'spinbutton', name: string, value: string) =>
  fireEvent.change(screen.getByRole(role, { name }), { target: { value } });

describe('ListProductsForm — a new listing', () => {
  it('will not leave the category step until a full category path is picked', async () => {
    renderNewForm();

    next();
    expect(await screen.findByText('Select a Super category, Category and Sub category')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: /Product title/ })).toBeNull();
  });

  it('adds nothing when the image picker is dismissed', async () => {
    renderNewForm();
    await pick(/^Super Category/, 'Apparel');
    await pick(/^Category/, 'Tops');
    await pick(/^Sub Category/, 'T-shirts');
    next();
    fireEvent.change(await screen.findByRole('textbox', { name: /Product title/ }), { target: { value: 'Cold brew kit' } });
    next();

    fireEvent.click(await screen.findByRole('button', { name: 'Add variant image' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss picker' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Dismiss picker' })).toBeNull());
    expect(screen.queryByRole('img', { name: 'Variant' })).toBeNull();
  });

  it('builds a listing step by step and submits it for approval', async () => {
    let submitted: Record<string, unknown> | null = null;
    const onSaved = renderNewForm([
      categoriesMock,
      warehousesMock([warehouseRow()]),
      moderationMock(),
      submitMock((variables) => {
        submitted = variables;
      }),
    ]);

    // Category
    await pick(/^Super Category/, 'Apparel');
    await pick(/^Category/, 'Tops');
    await pick(/^Sub Category/, 'T-shirts');
    next();

    // Product
    fireEvent.change(await screen.findByRole('textbox', { name: /Product title/ }), { target: { value: 'Cold brew kit' } });
    next();

    // Variants: one image from the picker, then the variant's copy and figures.
    fireEvent.click(await screen.findByRole('button', { name: 'Add variant image' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm pick' }));
    expect(((await screen.findByRole('img', { name: 'Variant' })) as HTMLImageElement).src).toBe('https://cdn.test/cold-brew.jpg');
    setField('textbox', 'Variant name (e.g. Default)', 'Starter box');
    setField('textbox', 'Description', 'A complete cold brew kit for hosts to add to their pods.');
    setField('spinbutton', 'Height (cm)', '24');
    setField('spinbutton', 'Weight (kg)', '1.2');
    setField('spinbutton', 'Length (cm)', '20');
    setField('spinbutton', 'Breadth (cm)', '15');
    setField('spinbutton', 'Price (₹)', '499');
    setField('spinbutton', 'Stock', '12');
    next();

    // Commission keeps its default.
    expect(await screen.findByText('Duncit commission: 15%')).toBeTruthy();
    next();

    // Delivery: pick the approved warehouse.
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Ship-from warehouse/ }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Delhi warehouse — New Delhi' }));
    next();

    // Preview, then submit.
    expect(await screen.findByRole('heading', { name: 'Cold brew kit' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Submit for approval' }));

    expect(await screen.findByText(/Product submitted\. Products portal approval is required/)).toBeTruthy();
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(submitted).toMatchObject({
      input: {
        brand_id: 'b1',
        product_name: 'Cold brew kit',
        super_category_id: 's1',
        category_id: 'c1',
        sub_category_id: 'sc1',
        image_url: 'https://cdn.test/cold-brew.jpg',
        unit_cost: 499,
        inventory_count: 12,
        commission_pct: 15,
        delivery_target: 'SHIPROCKET',
        pickup_location_id: 'w1',
        free_delivery_above: null,
      },
    });
    expect(submitted).not.toHaveProperty('product_doc_id');
    // A new listing clears the wizard for the next product.
    expect(await screen.findByRole('heading', { name: 'Product preview' })).toBeTruthy();
  });
});
