import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import EcommBrandForm from './EcommBrandForm';
import { blankBrand, type BrandFormValues } from './schema';

// Apollo + MUI transitions are slow on a loaded CI box.
configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);

const filled: BrandFormValues = {
  ...blankBrand,
  brand_name: 'Chai Point',
  description: 'Small-batch masala chai kits.',
  contact_email: 'hello@chaipoint.in',
  product_categories: ['Beverages'],
};

interface Handlers {
  onSave: Mock;
  onSubmitForReview: Mock;
  onPickImage: Mock<[], Promise<string | null>>;
}

const handlers = (pickedUrl: string | null = 'https://cdn.test/logo.png'): Handlers => ({
  onSave: vi.fn(),
  onSubmitForReview: vi.fn(),
  onPickImage: vi.fn<[], Promise<string | null>>().mockResolvedValue(pickedUrl),
});

function renderForm(
  values: BrandFormValues,
  locked = false,
  busy = false,
  fns: Handlers = handlers(),
) {
  const utils = render(
    <EcommBrandForm
      defaultValues={values}
      busy={busy}
      locked={locked}
      onSave={fns.onSave}
      onSubmitForReview={fns.onSubmitForReview}
      onPickImage={fns.onPickImage}
    />,
  );
  return { ...utils, ...fns };
}

describe('EcommBrandForm sections', () => {
  it('groups the brand fields into the six onboarding sections', () => {
    renderForm(blankBrand);
    for (const title of [
      'Brand identity',
      'Online presence',
      'Contact',
      'Business & legal',
      'Address',
      'Payout (optional)',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    }
  });

  it('prefills every field from defaultValues', () => {
    renderForm(filled);
    expect((screen.getByLabelText(/Brand name/) as HTMLInputElement).value).toBe('Chai Point');
    expect((screen.getByLabelText(/Contact email/) as HTMLInputElement).value).toBe(
      'hello@chaipoint.in',
    );
    expect((screen.getByLabelText(/^Country/) as HTMLInputElement).value).toBe('India');
  });

  it('re-prefills when the caller swaps in another brand', () => {
    const { rerender } = renderForm(filled);
    rerender(
      <EcommBrandForm
        defaultValues={{ ...blankBrand, brand_name: 'Filter Co' }}
        busy={false}
        locked={false}
        onSave={vi.fn()}
        onSubmitForReview={vi.fn()}
        onPickImage={vi.fn()}
      />,
    );
    expect((screen.getByLabelText(/Brand name/) as HTMLInputElement).value).toBe('Filter Co');
  });
});

describe('EcommBrandForm submission', () => {
  it('hands the edited values to onSave when the draft is saved', async () => {
    const { onSave } = renderForm(filled);
    fireEvent.change(screen.getByLabelText(/Tagline/), { target: { value: 'Chai, delivered' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      brand_name: 'Chai Point',
      tagline: 'Chai, delivered',
      contact_email: 'hello@chaipoint.in',
    });
  });

  it('routes Submit for review to its own handler, not to onSave', async () => {
    const { onSave, onSubmitForReview } = renderForm(filled);
    fireEvent.click(screen.getByRole('button', { name: /Submit for review/ }));
    await waitFor(() => expect(onSubmitForReview).toHaveBeenCalledTimes(1));
    expect(onSubmitForReview.mock.calls[0][0]).toMatchObject({ brand_name: 'Chai Point' });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('blocks submission and shows a field error for a malformed contact email', async () => {
    const { onSave } = renderForm(filled);
    fireEvent.change(screen.getByLabelText(/Contact email/), { target: { value: 'hello@' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Enter a valid email')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('accepts an empty contact email as a valid draft', async () => {
    const { onSave } = renderForm(filled);
    fireEvent.change(screen.getByLabelText(/Contact email/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].contact_email).toBe('');
  });

  it('disables both actions while a mutation is in flight', () => {
    renderForm(filled, false, true);
    expect(screen.getByRole('button', { name: 'Save draft' }).hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByRole('button', { name: /Submit for review/ }).hasAttribute('disabled'),
    ).toBe(true);
  });
});

describe('EcommBrandForm product categories', () => {
  it('adds a trimmed category and clears the draft input', async () => {
    renderForm(blankBrand);
    const input = screen.getByLabelText('Add a category') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  Snacks  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Snacks')).toBeTruthy();
    expect(input.value).toBe('');
  });

  it('adds on Enter without submitting the form', async () => {
    const { onSave } = renderForm(blankBrand);
    const input = screen.getByLabelText('Add a category');
    fireEvent.change(input, { target: { value: 'Tea' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByText('Tea')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('ignores a blank or duplicate category', () => {
    renderForm(filled);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.queryAllByText('Beverages')).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('Add a category'), { target: { value: 'Beverages' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.queryAllByText('Beverages')).toHaveLength(1);
  });

  it('removes a category through its chip delete icon', async () => {
    renderForm(filled);
    fireEvent.click(screen.getByTestId('CancelIcon'));
    await waitFor(() => expect(screen.queryByText('Beverages')).toBeNull());
  });

  it('submits the categories the user actually assembled', async () => {
    const { onSave } = renderForm(filled);
    fireEvent.change(screen.getByLabelText('Add a category'), { target: { value: 'Snacks' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].product_categories).toEqual(['Beverages', 'Snacks']);
  });
});

describe('EcommBrandForm media and documents', () => {
  it('stores the picked URL as the logo and offers to change or remove it', async () => {
    const { onPickImage } = renderForm(blankBrand);
    fireEvent.click(screen.getAllByRole('button', { name: 'Upload' })[0]);
    await waitFor(() => expect(onPickImage).toHaveBeenCalledTimes(1));
    const logo = (await screen.findByAltText('Logo')) as HTMLImageElement;
    expect(logo.src).toBe('https://cdn.test/logo.png');
    expect(screen.getByRole('button', { name: 'Change' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByAltText('Logo')).toBeNull());
  });

  it('leaves the media untouched when the picker is dismissed', async () => {
    const { onPickImage } = renderForm(blankBrand, false, false, handlers(null));
    fireEvent.click(screen.getAllByRole('button', { name: 'Upload' })[1]);
    await waitFor(() => expect(onPickImage).toHaveBeenCalledTimes(1));
    expect(screen.queryByAltText('Cover image')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull();
  });

  it('shows the documents hint until a document is attached', async () => {
    renderForm(blankBrand);
    expect(
      screen.getByText('Brand registration, trademark, GST certificate, etc.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add document' }));
    expect(await screen.findByText('https://cdn.test/logo.png')).toBeTruthy();
    expect(
      screen.queryByText('Brand registration, trademark, GST certificate, etc.'),
    ).toBeNull();
  });

  it('retypes only the document that was edited', async () => {
    const { onSave } = renderForm({
      ...filled,
      documents: [
        { type: 'DOCUMENT', url: 'https://cdn.test/gst.pdf' },
        { type: 'DOCUMENT', url: 'https://cdn.test/tm.pdf' },
      ],
    });
    fireEvent.change(screen.getAllByLabelText('Type')[1], { target: { value: 'TRADEMARK' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].documents).toEqual([
      { type: 'DOCUMENT', url: 'https://cdn.test/gst.pdf' },
      { type: 'TRADEMARK', url: 'https://cdn.test/tm.pdf' },
    ]);
  });

  it('submits a retyped document type and drops a deleted document', async () => {
    const { onSave } = renderForm({
      ...filled,
      documents: [{ type: 'DOCUMENT', url: 'https://cdn.test/gst.pdf' }],
    });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'GST' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].documents).toEqual([
      { type: 'GST', url: 'https://cdn.test/gst.pdf' },
    ]);

    fireEvent.click(screen.getByTestId('DeleteIcon'));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave.mock.calls[1][0].documents).toEqual([]);
  });
});

describe('EcommBrandForm locked (submitted or approved brand)', () => {
  const lockedValues: BrandFormValues = {
    ...filled,
    logo_url: 'https://cdn.test/logo.png',
    documents: [{ type: 'GST', url: 'https://cdn.test/gst.pdf' }],
  };

  it('hides both save actions', () => {
    renderForm(lockedValues, true);
    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Submit for review/ })).toBeNull();
  });

  it('disables every editable control', () => {
    renderForm(lockedValues, true);
    expect(screen.getByLabelText(/Brand name/).hasAttribute('disabled')).toBe(true);
    expect(screen.getByLabelText('Add a category').hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Add' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Add document' }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('removes the category, media and document delete affordances', () => {
    renderForm(lockedValues, true);
    expect(screen.queryByTestId('CancelIcon')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
    expect(screen.queryByTestId('DeleteIcon')).toBeNull();
    expect(screen.getByAltText('Logo')).toBeTruthy();
  });
});
