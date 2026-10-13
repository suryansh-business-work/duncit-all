import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { EDIT, fieldInput, mountWizard, wizardBrand } from './__tests__/harness';

vi.mock('../../../components/MediaPickerDialog', () => ({
  default: ({ open, onClose, onPicked }: { open: boolean; onClose: () => void; onPicked: (url: string) => void }) =>
    open ? (
      <div role="dialog" aria-label="Media picker">
        <button type="button" onClick={() => onPicked('https://cdn.example.com/picked.png')}>
          Pick stub
        </button>
        <button type="button" onClick={onClose}>
          Close stub
        </button>
      </div>
    ) : null,
}));

afterEach(cleanup);

const open = (step: string, brand = wizardBrand()) => mountWizard({ route: `${EDIT}?step=${step}`, brand });

const setCategory = (value: string) =>
  fireEvent.change(screen.getByTestId('brand-wizard-category-input'), { target: { value } });

describe('categories step', () => {
  it('adds a category from the button and from Enter, ignoring blanks and duplicates', async () => {
    open('categories', wizardBrand({ product_categories: [] }));
    const add = await screen.findByTestId('brand-wizard-category-add');
    expect((add as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('No categories yet.')).toBeTruthy();

    setCategory('Toys');
    fireEvent.click(add);
    setCategory('Beds');
    fireEvent.keyDown(screen.getByTestId('brand-wizard-category-input'), { key: 'Enter' });
    setCategory('Toys');
    fireEvent.click(add);

    const list = within(await screen.findByTestId('brand-wizard-category-list'));
    expect(list.getAllByText(/^(Toys|Beds)$/).map((el) => el.textContent)).toEqual(['Toys', 'Beds']);
  });

  it('removes a category from its chip', async () => {
    open('categories', wizardBrand({ product_categories: ['Treats', 'Toys'] }));
    const list = within(await screen.findByTestId('brand-wizard-category-list'));
    const chip = list.getByText('Treats').closest('.MuiChip-root') as HTMLElement;
    fireEvent.click(chip.querySelector('.MuiChip-deleteIcon') as Element);
    await waitFor(() => expect(screen.queryByText('Treats')).toBeNull());
    expect(screen.getByText('Toys')).toBeTruthy();
  });
});

describe('media step', () => {
  it('asks for a logo, previews the picked one and lets it be removed', async () => {
    open('media');
    expect(await screen.findByText('Upload a logo to continue.')).toBeTruthy();
    fireEvent.click(within(screen.getByTestId('brand-wizard-logo')).getByRole('button', { name: 'Upload' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Pick stub' }));

    const logo = within(screen.getByTestId('brand-wizard-logo'));
    expect((await logo.findByRole('img')).getAttribute('src')).toBe('https://cdn.example.com/picked.png');
    expect(screen.queryByText('Upload a logo to continue.')).toBeNull();
    expect(logo.getByRole('button', { name: 'Change' })).toBeTruthy();

    fireEvent.click(logo.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(within(screen.getByTestId('brand-wizard-logo')).queryByRole('img')).toBeNull());
  });

  it('leaves the cover untouched when the picker is closed without a choice', async () => {
    open('media');
    fireEvent.click(within(await screen.findByTestId('brand-wizard-cover')).getByRole('button', { name: 'Upload' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Close stub' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(within(screen.getByTestId('brand-wizard-cover')).queryByRole('img')).toBeNull();
  });
});

describe('documents step', () => {
  it('adds, renames and removes a document', async () => {
    open('documents');
    expect(await screen.findByText('No documents yet.')).toBeTruthy();
    fireEvent.click(screen.getByTestId('brand-wizard-document-add'));
    fireEvent.click(await screen.findByRole('button', { name: 'Pick stub' }));

    const list = within(await screen.findByTestId('brand-wizard-document-list'));
    expect(list.getByText('https://cdn.example.com/picked.png')).toBeTruthy();
    const type = list.getByLabelText('Document type') as HTMLInputElement;
    expect(type.value).toBe('DOCUMENT');
    fireEvent.change(type, { target: { value: 'GST certificate' } });
    await waitFor(() => expect((screen.getByLabelText('Document type') as HTMLInputElement).value).toBe('GST certificate'));

    fireEvent.click(screen.getByTestId('brand-wizard-document-remove'));
    expect(await screen.findByText('No documents yet.')).toBeTruthy();
  });
});

describe('payout step', () => {
  it('confirms Razorpay once it is connected', async () => {
    const connected = wizardBrand();
    connected.integrations.razorpay.connected = true;
    open('payout', connected);
    expect((await screen.findByTestId('brand-wizard-razorpay-confirmation')).textContent).toContain('Razorpay is connected');
    expect(fieldInput('brand-wizard-ifsc').value).toBe('');
  });
});

describe('business step of a locked brand', () => {
  it('shows the fields read-only', async () => {
    open('business', wizardBrand({ status: 'APPROVED', gstin: '22AAAAA0000A1Z5' }));
    await screen.findByTestId('brand-wizard-gstin');
    expect(fieldInput('brand-wizard-gstin').disabled).toBe(true);
    await waitFor(() => expect(fieldInput('brand-wizard-gstin').value).toBe('22AAAAA0000A1Z5'));
  });
});
