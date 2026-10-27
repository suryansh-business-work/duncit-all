import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useForm, type UseFormReturn, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DocumentsSection from './DocumentsSection';
import TaxDocumentField from './TaxDocumentField';
import { registerVenueSchema } from '../register-venue/register-venue.schema';
import {
  blankRegisterVenueValues,
  taxDocTypesOf,
  type RegisterVenueMode,
  type RegisterVenueValues,
  type VenueRegistrationConfig,
} from '../register-venue/register-venue.types';
import { renderWithProviders } from '../../../__tests__/render';

/** The dialog uploads through ImageKit; here it hands back one URL (and a file hash on request), and keeps its callback for a late second pick. */
const picker: { pick: ((url: string, meta?: { hash?: string }) => void) | null } = { pick: null };
vi.mock('../../../components/MediaPickerDialog', () => ({
  default: ({ open, onPicked }: Readonly<{ open: boolean; onPicked: (url: string, meta?: { hash?: string }) => void }>) => {
    picker.pick = onPicked;
    return open ? (
      <div>
        <button type="button" onClick={() => onPicked('https://cdn.example.com/gst.pdf', { hash: 'hash-gst' })}>
          pick gst file
        </button>
        <button type="button" onClick={() => onPicked('https://cdn.example.com/other.pdf')}>
          pick file without hash
        </button>
      </div>
    ) : null;
  },
}));

afterEach(() => {
  cleanup();
  picker.pick = null;
});

const config: VenueRegistrationConfig = {
  venue_types: ['Cafe'],
  doc_types: ['PAN Card', 'GST Certificate', 'Trade License'],
  gstin_doc_type: 'GST Certificate',
  pan_doc_type: 'PAN Card',
  capacity_item_limit: 5,
  amenities: [],
  facilities: [],
  security: [],
  food_diets: [],
  food_spice_levels: [],
  food_menu_limit: 5,
  food_image_limit: 2,
  food_price_max: 10000,
  food_discount_max_pct: 50,
  food_video_limit: 2,
  food_table_limit: 10,
};

interface HarnessProps {
  mode: RegisterVenueMode;
  defaults?: Partial<RegisterVenueValues>;
  lockedDocCount?: number;
  formRef: { current: UseFormReturn<RegisterVenueValues> | null };
}

function Harness({ mode, defaults, lockedDocCount, formRef }: Readonly<HarnessProps>) {
  const form = useForm<RegisterVenueValues, any, RegisterVenueValues>({
    resolver: zodResolver(
      registerVenueSchema(undefined, taxDocTypesOf(config)),
    ) as unknown as Resolver<RegisterVenueValues, any, RegisterVenueValues>,
    defaultValues: { ...blankRegisterVenueValues, ...defaults },
    mode: 'onBlur',
  });
  formRef.current = form;
  return <DocumentsSection form={form} config={config} mode={mode} lockedDocCount={lockedDocCount} />;
}

const mount = (props: Omit<HarnessProps, 'formRef'>) => {
  const formRef: HarnessProps['formRef'] = { current: null };
  renderWithProviders(<Harness {...props} formRef={formRef} />);
  return formRef;
};

const GST_DOC = 'register-venue-has_gstin-document';
const PAN_DOC = 'register-venue-has_pan-document';
const gstSwitch = () => screen.getByTestId('register-venue-has_gstin').querySelector('input') as HTMLInputElement;

describe('DocumentsSection — a GSTIN / PAN proof document', () => {
  it('shows the proof document slot only while its switch is on', () => {
    mount({ mode: 'register', defaults: { has_gstin: true, has_pan: false } });
    expect(screen.getByTestId(GST_DOC)).toBeTruthy();
    expect(within(screen.getByTestId(GST_DOC)).getByText('GST Certificate')).toBeTruthy();
    expect(screen.queryByTestId(PAN_DOC)).toBeNull();
  });

  it('adopts the venue’s existing proof document into the slot instead of listing it twice', () => {
    mount({
      mode: 'register',
      defaults: {
        has_gstin: true,
        documents: [
          { type: 'GST Certificate', url: 'https://cdn.example.com/g.pdf' },
          { type: 'Trade License', url: 'https://cdn.example.com/t.pdf' },
        ],
      },
    });
    expect(screen.getByTestId(`${GST_DOC}-uploaded`)).toBeTruthy();
    // The Trade License row is the only one in the list.
    expect(screen.getAllByLabelText('Document type')).toHaveLength(1);
  });

  it('files an uploaded proof under the switch’s document type, remembering its hash', async () => {
    const ref = mount({ mode: 'register', defaults: { has_gstin: true } });
    fireEvent.click(screen.getByTestId(`${GST_DOC}-upload`));
    fireEvent.click(await screen.findByRole('button', { name: 'pick gst file' }));
    await waitFor(() => expect(screen.getByTestId(`${GST_DOC}-uploaded`)).toBeTruthy());
    expect(ref.current?.getValues('documents')).toEqual([
      { type: 'GST Certificate', url: 'https://cdn.example.com/gst.pdf', hash: 'hash-gst' },
    ]);
    expect(screen.queryByRole('button', { name: 'pick gst file' })).toBeNull();
  });

  it('files an uploaded proof that carries no hash', async () => {
    const ref = mount({ mode: 'register', defaults: { has_gstin: true } });
    fireEvent.click(screen.getByTestId(`${GST_DOC}-upload`));
    fireEvent.click(await screen.findByRole('button', { name: 'pick file without hash' }));
    await waitFor(() => expect(ref.current?.getValues('documents')).toHaveLength(1));
    expect(ref.current?.getValues('documents')[0]).toMatchObject({ type: 'GST Certificate', url: 'https://cdn.example.com/other.pdf' });
  });

  it('ignores a second pick that arrives after the dialog already closed', async () => {
    const ref = mount({ mode: 'register', defaults: { has_gstin: true } });
    fireEvent.click(screen.getByTestId(`${GST_DOC}-upload`));
    fireEvent.click(await screen.findByRole('button', { name: 'pick gst file' }));
    await waitFor(() => expect(ref.current?.getValues('documents')).toHaveLength(1));
    // The dialog is closed but still mounted for its exit transition, so it can still call back.
    act(() => picker.pick?.('https://cdn.example.com/late.pdf', { hash: 'late' }));
    expect(ref.current?.getValues('documents')).toHaveLength(1);
  });

  it('removes the proof from its slot', async () => {
    const ref = mount({
      mode: 'register',
      defaults: { has_gstin: true, documents: [{ type: 'GST Certificate', url: 'https://cdn.example.com/g.pdf' }] },
    });
    fireEvent.click(within(screen.getByTestId(`${GST_DOC}-uploaded`)).getByTestId('CancelIcon'));
    await waitFor(() => expect(ref.current?.getValues('documents')).toEqual([]));
    expect(screen.getByTestId(`${GST_DOC}-upload`)).toBeTruthy();
  });

  it('drops the proof together with its switch, leaving the other documents', async () => {
    const ref = mount({
      mode: 'register',
      defaults: {
        has_gstin: true,
        documents: [
          { type: 'GST Certificate', url: 'https://cdn.example.com/g.pdf' },
          { type: 'Trade License', url: 'https://cdn.example.com/t.pdf' },
        ],
      },
    });
    fireEvent.click(gstSwitch());
    await waitFor(() => expect(ref.current?.getValues('documents')).toEqual([{ type: 'Trade License', url: 'https://cdn.example.com/t.pdf' }]));
    expect(screen.queryByTestId(GST_DOC)).toBeNull();
  });

  it('keeps the verified proof locked once the venue is approved: viewable, not removable, switch off limits', () => {
    mount({
      mode: 'edit-approved',
      lockedDocCount: 1,
      defaults: { has_gstin: true, gstin: '22ABCDE1234F1Z5', documents: [{ type: 'GST Certificate', url: 'https://cdn.example.com/g.pdf' }] },
    });
    const uploaded = screen.getByTestId(`${GST_DOC}-uploaded`);
    expect(within(uploaded).queryByTestId('CancelIcon')).toBeNull();
    expect(gstSwitch().disabled).toBe(true);
  });

  it('asks for the proof when the switch is on and none is uploaded, and clears the ask once it is', async () => {
    const ref = mount({
      mode: 'register',
      defaults: { has_gstin: true, gstin: '22ABCDE1234F1Z5' },
    });
    await act(async () => {
      await ref.current?.trigger('has_gstin');
    });
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/Upload the .*GST Certificate/);
    fireEvent.click(screen.getByTestId(`${GST_DOC}-upload`));
    fireEvent.click(await screen.findByRole('button', { name: 'pick gst file' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(screen.getByText('Required while this switch is on. PDF only, max 50 MB.')).toBeTruthy();
  });

  it('offers no proof slot when the registration config names no document type for the switch', () => {
    const formRef: HarnessProps['formRef'] = { current: null };
    function Bare() {
      const form = useForm<RegisterVenueValues, any, RegisterVenueValues>({
        defaultValues: { ...blankRegisterVenueValues, has_gstin: true },
      });
      formRef.current = form;
      return <DocumentsSection form={form} config={{ ...config, gstin_doc_type: '', pan_doc_type: '' }} mode="register" />;
    }
    render(<Bare />);
    expect(screen.queryByTestId(GST_DOC)).toBeNull();
  });
});

describe('TaxDocumentField', () => {
  it('shows a typed error in place of the hint, announced as an alert', () => {
    renderWithProviders(
      <TaxDocumentField type="GST Certificate" url="" locked={false} error="Upload it" onUpload={vi.fn()} onRemove={vi.fn()} testId="tax-doc" />,
    );
    expect(screen.getByRole('alert').textContent).toBe('Upload it');
    expect(screen.queryByText('Required while this switch is on. PDF only, max 50 MB.')).toBeNull();
  });

  it('calls onUpload from the button and onRemove from the chip of an uploaded file', () => {
    const onUpload = vi.fn();
    const onRemove = vi.fn();
    const view = renderWithProviders(
      <TaxDocumentField type="GST Certificate" url="" locked={false} onUpload={onUpload} onRemove={onRemove} testId="tax-doc" />,
    );
    fireEvent.click(screen.getByTestId('tax-doc-upload'));
    expect(onUpload).toHaveBeenCalledTimes(1);
    view.unmount();
    renderWithProviders(
      <TaxDocumentField type="GST Certificate" url="https://cdn.example.com/g.pdf" locked={false} onUpload={onUpload} onRemove={onRemove} testId="tax-doc" />,
    );
    fireEvent.click(screen.getByTestId('CancelIcon'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
