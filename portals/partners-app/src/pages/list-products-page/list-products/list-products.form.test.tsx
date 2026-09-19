import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import ListProductsForm from './list-products.form';
import { MODERATE_PRODUCT_CONTENT, UPDATE_PRODUCT_LISTING, moderationMock, updateMock } from './__tests__/formMocks';
import { categoriesMock, listingRow, warehouseRow, warehousesMock } from '../../../__tests__/groupB-fixtures';
import { renderWithProviders } from '../../../__tests__/render';

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);

/** A saved listing whose every step is already valid. */
const savedProduct = listingRow({
  variants: [
    {
      __typename: 'ProductVariant',
      option_label: 'Default',
      option_values: [],
      color: '#000000',
      size_label: 'M',
      description: 'Soft cotton tee for weekend pods.',
      unit_cost: 499,
      inventory_count: 12,
      images: ['https://cdn.test/alpha.jpg'],
      height_cm: 2,
      breadth_cm: 25,
      length_cm: 30,
      weight_kg: 0.3,
    },
  ],
  free_delivery_above: 999,
});

const baseMocks = [categoriesMock, warehousesMock([warehouseRow()])];

const renderForm = (mocks: MockedResponse[]) => {
  const onSaved = vi.fn();
  renderWithProviders(<ListProductsForm brandId="b1" product={savedProduct} onSaved={onSaved} />, {
    mocks: [...baseMocks, ...mocks],
  });
  return onSaved;
};

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

/** Step through every (already valid) step to the preview. */
const goToPreview = async () => {
  next();
  await screen.findByRole('textbox', { name: /Product title/ });
  next();
  await screen.findByText('Options (e.g. Size, Colour)');
  next();
  await screen.findByText('Duncit commission: 12%');
  next();
  await screen.findByRole('radio', { name: 'ShipRocket delivery' });
  next();
  return screen.findByRole('button', { name: 'Update listing' });
};

describe('ListProductsForm — editing a listing', () => {
  it('walks every step, moves back and forth, and updates the listing', async () => {
    let moderated: Record<string, unknown> | null = null;
    let updated: Record<string, unknown> | null = null;
    const onSaved = renderForm([
      moderationMock(
        [],
        (variables) => {
          moderated = variables;
        },
        50,
      ),
      updateMock((variables) => {
        updated = variables;
      }),
    ]);

    // Step 1 starts on the saved category; Back is not offered yet.
    expect((screen.getByRole('button', { name: 'Back' }) as HTMLButtonElement).disabled).toBe(true);
    next();
    const title = (await screen.findByRole('textbox', { name: /Product title/ })) as HTMLInputElement;
    expect(title.value).toBe('Alpha Tee');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Which categories do you want to sell your product in?')).toBeTruthy();

    const submit = await goToPreview();
    expect(screen.getByRole('heading', { name: 'Alpha Tee' })).toBeTruthy();
    expect(screen.getByTestId('ai-monitoring-chip')).toBeTruthy();
    fireEvent.click(submit);

    // The AI preflight runs before anything is saved.
    expect(await screen.findByTestId('ai-checking-indicator')).toBeTruthy();
    expect(screen.getByText('Saving...')).toBeTruthy();

    expect(await screen.findByText(/Product updated\. Products portal approval is required/)).toBeTruthy();
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(moderated).toEqual({
      input: {
        product_name: 'Alpha Tee',
        variants: [{ option_label: 'Default', size_label: 'M', description: 'Soft cotton tee for weekend pods.' }],
        image_urls: ['https://cdn.test/alpha.jpg'],
      },
    });
    expect(updated).toMatchObject({
      product_doc_id: 'p1',
      input: {
        brand_id: 'b1',
        product_name: 'Alpha Tee',
        pickup_location_id: 'w1',
        free_delivery_above: 999,
        commission_pct: 12,
        inventory_count: 12,
      },
    });
    // An edit keeps what was saved on screen.
    expect(screen.getByRole('heading', { name: 'Alpha Tee' })).toBeTruthy();
  });

  it('shows why the server refused the update', async () => {
    const onSaved = renderForm([
      moderationMock(),
      {
        request: { query: UPDATE_PRODUCT_LISTING, variables: () => true },
        result: { errors: [new GraphQLError('Warehouse is no longer approved')] },
      },
    ]);

    fireEvent.click(await goToPreview());

    expect(await screen.findByText('Warehouse is no longer approved')).toBeTruthy();
    expect(screen.queryByText(/Product updated\./)).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows why the AI check could not run, and saves nothing', async () => {
    const onSaved = renderForm([
      {
        request: { query: MODERATE_PRODUCT_CONTENT, variables: () => true },
        result: { errors: [new GraphQLError('Moderation service unavailable')] },
      },
    ]);

    fireEvent.click(await goToPreview());

    expect(await screen.findByText('Moderation service unavailable')).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe('ListProductsForm — AI check blocks the listing', () => {
  const violations = [
    { field: 'product_name', step: 'REGEX' as const, type: 'PHONE', message: 'Remove the phone number from the title.', evidence: '98765' },
    { field: 'image', step: 'AI' as const, type: 'NUDITY', message: 'One image is not allowed on Duncit.', evidence: null },
  ];

  it('lists every problem, flags the title and jumps to the earliest step', async () => {
    const onSaved = renderForm([moderationMock(violations)]);

    fireEvent.click(await goToPreview());

    const dialog = await screen.findByTestId('moderation-blocked-dialog');
    expect(within(dialog).getByText('Remove the phone number from the title.')).toBeTruthy();
    expect(within(dialog).getByText('One image is not allowed on Duncit.')).toBeTruthy();
    expect(within(dialog).getByText(/Our AI check found content that breaks the community guidelines/)).toBeTruthy();
    expect(within(dialog).getByTestId('moderation-fix-product_name-0').textContent).toContain('Fix in Product');
    expect(within(dialog).getByTestId('moderation-fix-image-1').textContent).toContain('Fix in Variants');
    expect(onSaved).not.toHaveBeenCalled();

    // Behind the dialog the wizard already sits on the Product step, with the
    // title marked.
    fireEvent.click(within(dialog).getByTestId('moderation-blocked-close'));
    await waitFor(() => expect(screen.queryByTestId('moderation-blocked-dialog')).toBeNull());
    expect(screen.getByText('Remove the phone number from the title.')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /Product title/ }).getAttribute('aria-invalid')).toBe('true');
  });

  it('opens the step a problem belongs to from its Fix link', async () => {
    renderForm([moderationMock(violations)]);

    fireEvent.click(await goToPreview());
    fireEvent.click(await screen.findByTestId('moderation-fix-image-1'));

    await waitFor(() => expect(screen.queryByTestId('moderation-blocked-dialog')).toBeNull());
    expect(screen.getByText('Options (e.g. Size, Colour)')).toBeTruthy();
  });
});
