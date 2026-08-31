import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm, type UseFormReturn , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DocumentsSection from './DocumentsSection';
import { registerVenueSchema } from '../register-venue/register-venue.schema';
import {
  blankRegisterVenueValues,
  type RegisterVenueMode,
  type RegisterVenueValues,
  type VenueRegistrationConfig,
} from '../register-venue/register-venue.types';

const PICKED_URL = 'https://cdn.example.com/picked.pdf';

// The real dialog uploads through ImageKit; the section's own behaviour is what
// it does with the URL the dialog hands back, so the dialog is stubbed with a
// button that returns one.
vi.mock('../../../components/MediaPickerDialog', () => ({
  default: ({ open, onPicked, title }: Readonly<{ open: boolean; onPicked: (url: string) => void; title: string }>) =>
    open ? (
      <button type="button" onClick={() => onPicked(PICKED_URL)}>
        {`pick from ${title}`}
      </button>
    ) : null,
}));

afterEach(cleanup);

const config: VenueRegistrationConfig = {
  venue_types: ['Cafe'],
  doc_types: ['PAN Card', 'Trade License', 'Fire NOC'],
  capacity_item_limit: 5,
  amenities: [],
  facilities: [],
  security: [],
};

interface HarnessProps {
  mode: RegisterVenueMode;
  defaults?: Partial<RegisterVenueValues>;
  lockedDocCount?: number;
  docTypes?: string[];
  formRef: { current: UseFormReturn<RegisterVenueValues> | null };
}

function Harness({ mode, defaults, lockedDocCount, docTypes, formRef }: Readonly<HarnessProps>) {
  const form = useForm<RegisterVenueValues, any, RegisterVenueValues>({
    resolver: zodResolver(registerVenueSchema) as unknown as Resolver<RegisterVenueValues, any, RegisterVenueValues>,
    defaultValues: { ...blankRegisterVenueValues, ...defaults },
    mode: 'onBlur',
  });
  formRef.current = form;
  const sectionConfig = docTypes ? { ...config, doc_types: docTypes } : config;
  return <DocumentsSection form={form} config={sectionConfig} mode={mode} lockedDocCount={lockedDocCount} />;
}

const mount = (props: Omit<HarnessProps, 'formRef'>) => {
  const formRef: HarnessProps['formRef'] = { current: null };
  render(<Harness {...props} formRef={formRef} />);
  return formRef;
};

const typeAndBlur = (label: string, value: string) => {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

const GSTIN_ERROR = 'GSTIN must follow format like 22ABCDE1234F1Z5';

describe('DocumentsSection — GSTIN rule', () => {
  it('enforces the 15-character Z-at-position-14 GSTIN, not the 14-character checkout variant', async () => {
    mount({ mode: 'register' });

    // 14 characters — accepted by the checkout GSTIN pattern, rejected here.
    typeAndBlur('GSTIN (optional)', '22ABCDE1234F1Z');
    expect(await screen.findByText(GSTIN_ERROR)).toBeTruthy();

    // 15 characters but the 14th is not the literal Z this form insists on.
    typeAndBlur('GSTIN (optional)', '22ABCDE1234F1A5');
    expect(await screen.findByText(GSTIN_ERROR)).toBeTruthy();

    // The canonical 15-character GSTIN clears the error.
    typeAndBlur('GSTIN (optional)', '22ABCDE1234F1Z5');
    await waitFor(() => expect(screen.queryByText(GSTIN_ERROR)).toBeNull());
    expect(screen.getByText('15-character GST number, e.g. 22ABCDE1234F1Z5')).toBeTruthy();
  });

  it('accepts a lowercase GSTIN and an empty GSTIN, and rejects a malformed PAN', async () => {
    mount({ mode: 'register' });

    typeAndBlur('GSTIN (optional)', '22abcde1234f1z5');
    await waitFor(() => expect(screen.queryByText(GSTIN_ERROR)).toBeNull());

    typeAndBlur('GSTIN (optional)', '');
    await waitFor(() => expect(screen.queryByText(GSTIN_ERROR)).toBeNull());

    typeAndBlur('PAN (optional)', 'ABCD12345F');
    expect(await screen.findByText('PAN must follow format ABCDE1234F')).toBeTruthy();

    typeAndBlur('PAN (optional)', 'ABCDE1234F');
    await waitFor(() => expect(screen.queryByText('PAN must follow format ABCDE1234F')).toBeNull());
  });
});

describe('DocumentsSection — document rows', () => {
  it('appends a row typed with the first configured doc type and an empty file', async () => {
    const formRef = mount({ mode: 'register' });
    expect(screen.queryByRole('button', { name: 'Upload file' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Add document' }));

    await waitFor(() => expect(formRef.current?.getValues('documents')).toEqual([{ type: 'PAN Card', url: '' }]));
    expect(screen.getByRole('button', { name: 'Upload file' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Document type' }).textContent).toBe('PAN Card');
  });

  it('appends an untyped row when the config carries no document types', async () => {
    const formRef = mount({ mode: 'register', docTypes: [] });

    fireEvent.click(screen.getByRole('button', { name: 'Add document' }));

    await waitFor(() => expect(formRef.current?.getValues('documents')).toEqual([{ type: '', url: '' }]));
    expect(screen.queryByText('PAN Card')).toBeNull();
    expect(screen.getByRole('button', { name: 'Upload file' })).toBeTruthy();
  });

  it('stores the picked file URL on the row that opened the picker', async () => {
    const formRef = mount({ mode: 'register', defaults: { documents: [{ type: 'PAN Card', url: '' }] } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));
    fireEvent.click(screen.getByRole('button', { name: 'pick from Upload document (PDF, max 50 MB)' }));

    await waitFor(() => expect(formRef.current?.getValues('documents.0.url')).toBe(PICKED_URL));
    expect(screen.getByText('Uploaded')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Upload file' })).toBeNull();
  });

  it('opens the stored document in a new tab when its chip is clicked', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    mount({
      mode: 'register',
      defaults: { documents: [{ type: 'PAN Card', url: 'https://cdn.example.com/pan.pdf' }] },
    });

    fireEvent.click(screen.getByText('Uploaded'));

    expect(open).toHaveBeenCalledWith('https://cdn.example.com/pan.pdf', '_blank');
    open.mockRestore();
  });

  it('removes a row entirely with the delete icon', async () => {
    const formRef = mount({
      mode: 'register',
      defaults: {
        documents: [
          { type: 'PAN Card', url: 'https://cdn.example.com/pan.pdf' },
          { type: 'Fire NOC', url: '' },
        ],
      },
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove document' })[0]);

    await waitFor(() => expect(formRef.current?.getValues('documents')).toEqual([{ type: 'Fire NOC', url: '' }]));
    expect(screen.getAllByRole('button', { name: 'Remove document' })).toHaveLength(1);
  });

  it('surfaces the list-level "at least one document" error', async () => {
    const formRef = mount({ mode: 'register' });
    expect(screen.queryByText('Upload at least one document')).toBeNull();

    await act(async () => {
      await formRef.current?.trigger('documents');
    });

    expect(await screen.findByText('Upload at least one document')).toBeTruthy();
  });

  it('surfaces the per-row "upload the document file" error under its row', async () => {
    const formRef = mount({ mode: 'register', defaults: { documents: [{ type: 'PAN Card', url: '' }] } });

    await act(async () => {
      await formRef.current?.trigger('documents');
    });

    expect(await screen.findByText('Upload the document file')).toBeTruthy();
  });
});

describe('DocumentsSection — edit-approved mode', () => {
  const approvedDefaults = {
    gstin: '22ABCDE1234F1Z5',
    documents: [
      { type: 'PAN Card', url: 'https://cdn.example.com/pan.pdf' },
      { type: 'Fire NOC', url: 'https://cdn.example.com/noc.pdf' },
    ],
  };

  it('locks the verified rows and the tax ids, leaving appended rows editable', () => {
    mount({ mode: 'edit-approved', lockedDocCount: 1, defaults: approvedDefaults });

    const [lockedType, addedType] = screen.getAllByRole('combobox', { name: 'Document type' });
    expect(lockedType.getAttribute('aria-disabled')).toBe('true');
    expect(addedType.getAttribute('aria-disabled')).toBeNull();
    expect(screen.getByText('Verified document')).toBeTruthy();
    // Only the appended row can be removed.
    expect(screen.getAllByRole('button', { name: 'Remove document' })).toHaveLength(1);

    expect(screen.getByLabelText('GSTIN (optional)')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('PAN (optional)')).toHaveProperty('disabled', true);
    expect(screen.getAllByText('Locked after approval')).toHaveLength(2);
    expect(
      screen.getByText(
        'Verified documents are locked — you can add new documents, not replace them. PDF only, max 50 MB.'
      )
    ).toBeTruthy();
  });

  it('keeps every row editable in register mode', () => {
    mount({ mode: 'register', lockedDocCount: 1, defaults: approvedDefaults });

    expect(screen.getAllByRole('button', { name: 'Remove document' })).toHaveLength(2);
    expect(screen.queryByText('Verified document')).toBeNull();
    expect(screen.getByLabelText('GSTIN (optional)')).toHaveProperty('disabled', false);
    expect(
      screen.getByText('Upload at least one document with its type. PDF only, max 50 MB.')
    ).toBeTruthy();
  });

  it('clears the file of an unlocked row through the chip delete action', async () => {
    const formRef = mount({ mode: 'edit-approved', lockedDocCount: 1, defaults: approvedDefaults });

    const deletableChips = screen.getAllByTestId('CancelIcon');
    // The locked row's chip has no delete affordance — only the appended row's.
    expect(deletableChips).toHaveLength(1);
    fireEvent.click(deletableChips[0]);

    await waitFor(() => expect(formRef.current?.getValues('documents.1.url')).toBe(''));
    expect(formRef.current?.getValues('documents.0.url')).toBe('https://cdn.example.com/pan.pdf');
  });
});
