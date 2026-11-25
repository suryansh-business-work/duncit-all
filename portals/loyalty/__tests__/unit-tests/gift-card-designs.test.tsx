/**
 * Loyalty > Gift Card Designs — the catalogue list, and one design's editor:
 * adding a design, saving changes, making it the default members buy,
 * switching it off and on, and correcting its printed stock.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { DesignEditorPage, DesignsPage } from '../../src/pages/gift-cards/designs';
import DesignFlipPreview from '../../src/pages/gift-cards/designs/DesignFlipPreview';
import { notifySuccess } from './mocks/dialogs';
import { resetTableControls, tableControls } from './mocks/table';
import { resetUserContext, userContextControls } from './mocks/user-context';
import { renderWithProviders } from '../testkit';
import {
  BACK,
  FRONT,
  adjustStockErrorMock,
  adjustStockMock,
  createDesignErrorMock,
  createDesignMock,
  designCategoriesMock,
  designMissingMock,
  designMock,
  makeDesign,
  setDefaultMock,
  updateDesignErrorMock,
  updateDesignMock,
} from '../mocks/gift-card-order.mock';

vi.mock('@duncit/media-picker', () => ({
  MediaPickerField: ({ label, value, onChange }: any) => (
    <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const asWriter = () => {
  userContextControls.user = { roles: ['LOYALTY_MANAGER'] };
};

beforeEach(() => {
  resetTableControls();
  resetUserContext();
  vi.mocked(notifySuccess).mockClear();
});

const cell = (index: number, field: string) =>
  within(screen.getAllByTestId('table-row')[index]).getByTestId(`cell-${field}`);

const editor = (id: string, mocks: any[]) =>
  renderWithProviders(<DesignEditorPage />, {
    mocks: [designCategoriesMock(), ...mocks],
    path: '/gift-cards/designs/:id',
    entry: `/gift-cards/designs/${id}`,
    extra: <Route path="/gift-cards/designs" element={<div data-testid="designs-list">list</div>} />,
  });

const typeIn = (testId: string, value: string) =>
  fireEvent.change(screen.getByTestId(testId).querySelector('input')!, { target: { value } });

describe('DesignsPage', () => {
  it('lists the catalogue with the default first and offers a new design to a writer', async () => {
    asWriter();
    tableControls.rowsByKey = {
      giftCardDesignsTable: [makeDesign(), makeDesign({ id: 'des-2', name: 'Diwali', category: '', is_default: false, is_active: false, physical_stock: 0 })],
    };
    renderWithProviders(<DesignsPage />, { path: '/', entry: '/', extra: <Route path="/gift-cards/designs/:id" element={<div data-testid="opened">opened</div>} /> });

    expect(await screen.findByRole('heading', { name: 'Gift Card Designs' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    expect(cell(0, 'is_default')).toHaveTextContent('DefaultActive');
    expect(cell(1, 'is_default')).toHaveTextContent('Off');
    expect(cell(1, 'category')).toHaveTextContent('—');
    expect(within(cell(0, 'front_image_url')).getByRole('img')).toHaveAttribute('src', FRONT);
    expect(screen.getByRole('link', { name: 'Add design' })).toHaveAttribute('href', '/gift-cards/designs/new');

    fireEvent.click(within(screen.getAllByTestId('table-row')[1]).getByTestId('row-open'));
    expect(await screen.findByTestId('opened')).toBeInTheDocument();
  });

  it('shows a read-only seat the catalogue without the add button', async () => {
    tableControls.rowsByKey = { giftCardDesignsTable: [] };
    renderWithProviders(<DesignsPage />);
    expect(await screen.findByRole('heading', { name: 'Gift Card Designs' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Add design' })).toBeNull();
  });
});

describe('DesignEditorPage — a new design', () => {
  const input = { name: 'Festive', category: '', front_image_url: FRONT, back_image_url: BACK, sort_order: 0 };
  const fill = () => {
    typeIn('design-name', 'Festive');
    fireEvent.change(screen.getByLabelText('Front of the card'), { target: { value: FRONT } });
    fireEvent.change(screen.getByLabelText('Back of the card'), { target: { value: BACK } });
    fireEvent.click(screen.getByTestId('design-save'));
  };

  // The test gets its own 20 s: the 5 s heading wait below used to equal vitest's default 5 s test
  // timeout, so under coverage on CI the test was killed before the wait could finish.
  it('adds the design and opens it', async () => {
    asWriter();
    // The server answers the create with the design it stored, and the page then reads that same
    // design back. One record for both, as the server would send: a create answer that disagreed
    // with the read (the default fixture's name, category and stock) gave Apollo two versions of
    // GiftCardDesign:des-new, and the page re-read it until every mocked answer was used up.
    const created = makeDesign({ id: 'des-new', ...input, is_default: false });
    editor('new', [createDesignMock(input, created), designMock(created)]);
    expect(screen.getByText('New gift card design')).toBeInTheDocument();
    fill();
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Design added'), { timeout: 5000 });
    // After the save the page navigates and loads the new design: slower than a second on a busy CI box.
    expect(await screen.findByRole('heading', { name: 'Festive' }, { timeout: 10_000 })).toBeInTheDocument();
  }, 20_000);

  it('stays on the form with the server’s reason when the design is refused', async () => {
    asWriter();
    editor('new', [createDesignErrorMock(input, 'Upload an image for this side of the card')]);
    fill();
    expect(await screen.findByText('Upload an image for this side of the card')).toBeInTheDocument();
  });

  it('falls back to its own words when the refusal carries none', async () => {
    asWriter();
    editor('new', [{ request: createDesignMock(input).request, error: new Error('') }]);
    fill();
    expect(await screen.findByText('The design could not be saved. Please try again.')).toBeInTheDocument();
  });

  it('stays on the new-design page when the server answers without the new design', async () => {
    asWriter();
    editor('new', [{ request: createDesignMock(input).request, result: { data: { createGiftCardDesign: null } } }]);
    fill();
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Design added'));
    expect(screen.getByText('New gift card design')).toBeInTheDocument();
  });

  it('goes back to the list on cancel', async () => {
    editor('new', []);
    fireEvent.click(screen.getByText('Cancel'));
    expect(await screen.findByTestId('designs-list')).toBeInTheDocument();
  });
});

describe('DesignEditorPage — an existing design', () => {
  it('saves changes to the default design, which offers no default or switch-off', async () => {
    asWriter();
    const design = makeDesign();
    editor(design.id, [
      designMock(design),
      updateDesignMock(design.id, { name: 'Classic Gold', category: 'Evergreen', front_image_url: FRONT, back_image_url: BACK, sort_order: 0 }),
    ]);
    expect(await screen.findByRole('heading', { name: 'Classic' })).toBeInTheDocument();
    expect(screen.getByText('40 printed cards in stock')).toBeInTheDocument();
    expect(screen.queryByTestId('design-make-default')).toBeNull();
    expect(screen.queryByText('Switch off')).toBeNull();
    typeIn('design-name', 'Classic Gold');
    fireEvent.click(screen.getByTestId('design-save'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Design saved'));
  });

  it('makes another design the default and switches it off and on', async () => {
    asWriter();
    const design = makeDesign({ id: 'des-2', name: 'Diwali', is_default: false, is_active: true });
    editor(design.id, [
      designMock(design),
      setDefaultMock(design.id),
      updateDesignMock(design.id, { is_active: false }, { ...design, is_active: false }),
      updateDesignMock(design.id, { is_active: true }, { ...design, is_active: true }),
    ]);
    expect(await screen.findByText('40 in stock')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Switch off'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Design switched off'));
    fireEvent.click(await screen.findByText('Switch on'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Design switched on'));
    fireEvent.click(screen.getByTestId('design-make-default'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('This is now the card members buy'));
  });

  it('shows a refused action above the form', async () => {
    asWriter();
    const design = makeDesign({ id: 'des-3', is_default: false });
    editor(design.id, [designMock(design), updateDesignErrorMock(design.id, { is_active: false }, 'Make another design the default first')]);
    fireEvent.click(await screen.findByText('Switch off'));
    expect(await screen.findByText('Make another design the default first')).toBeInTheDocument();
  });

  it('adds a print run, and keeps the dialog open with the reason a removal was refused', async () => {
    asWriter();
    const design = makeDesign({ id: 'des-4' });
    editor(design.id, [
      designMock(design),
      adjustStockMock(design.id, 100, 'Print run', 140),
      adjustStockErrorMock(design.id, -5, 'Lost', 'Only 4 cards are in stock'),
    ]);
    fireEvent.click(await screen.findByTestId('design-adjust-stock'));
    typeIn('stock-quantity', '100');
    fireEvent.change(screen.getByTestId('stock-reason').querySelector('textarea')!, { target: { value: 'Print run' } });
    fireEvent.click(screen.getByTestId('stock-confirm'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Stock updated'));
    await waitFor(() => expect(screen.queryByTestId('stock-adjust-form')).toBeNull());

    fireEvent.click(screen.getByTestId('design-adjust-stock'));
    fireEvent.click(screen.getByTestId('stock-remove'));
    typeIn('stock-quantity', '5');
    fireEvent.change(screen.getByTestId('stock-reason').querySelector('textarea')!, { target: { value: 'Lost' } });
    fireEvent.click(screen.getByTestId('stock-confirm'));
    expect(await screen.findByText('Only 4 cards are in stock')).toBeInTheDocument();
    expect(screen.getByTestId('stock-adjust-form')).toBeInTheDocument();
  });

  it('shows a read-only seat the design with no actions', async () => {
    const design = makeDesign({ id: 'des-5', is_default: false });
    editor(design.id, [designMock(design)]);
    expect(await screen.findByRole('heading', { name: 'Classic' })).toBeInTheDocument();
    expect(screen.queryByTestId('design-adjust-stock')).toBeNull();
  });

  it('says so when the design does not exist', async () => {
    editor('missing', [designMissingMock('missing')]);
    await waitFor(() => expect(screen.queryByTestId('design-form')).toBeNull());
    expect(await screen.findByText('This record does not exist, or it was removed.')).toBeInTheDocument();
  });
});

describe('DesignFlipPreview', () => {
  it('flips to the back and says which faces are still missing', () => {
    renderWithProviders(<DesignFlipPreview front="" back={BACK} />);
    expect(screen.getByText('Front of the card')).toBeInTheDocument();
    const card = screen.getByTestId('design-preview-card');
    expect(card).toHaveAttribute('data-flipped', 'false');
    fireEvent.click(screen.getByTestId('design-preview-flip'));
    expect(card).toHaveAttribute('data-flipped', 'true');
    expect(screen.getByTestId('design-preview-flip')).toHaveTextContent('Show front');
  });

  it('draws a compact preview with no flip control', () => {
    renderWithProviders(<DesignFlipPreview front={FRONT} back={BACK} compact />);
    expect(screen.queryByTestId('design-preview-flip')).toBeNull();
  });
});
