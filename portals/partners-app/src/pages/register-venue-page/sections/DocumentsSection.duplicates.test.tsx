import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { fallbackT } from '@duncit/shell';
import DocumentsSection from './DocumentsSection';
import { mountSection, sectionConfig } from './__tests__/sectionHarness';

const PICKED_URL = 'https://cdn.duncit.com/venues/docs/picked.pdf';

/**
 * The real dialog uploads to ImageKit and, with `detectDuplicates`, hands back
 * the file's SHA-256 alongside its URL. The stub offers a pick of a file the
 * venue already uploaded (hash `h-pan`), a new one (`h-new`), and closing.
 */
vi.mock('../../../components/MediaPickerDialog', () => ({
  default: ({
    open,
    onPicked,
    onClose,
  }: Readonly<{ open: boolean; onPicked: (url: string, meta?: { hash?: string }) => void; onClose: () => void }>) =>
    open ? (
      <div role="dialog" aria-label="Upload document">
        <button type="button" onClick={() => onPicked(PICKED_URL, { hash: 'h-pan' })}>
          pick the PAN again
        </button>
        <button type="button" onClick={() => onPicked(PICKED_URL, { hash: 'h-new' })}>
          pick a new file
        </button>
        <button type="button" onClick={onClose}>
          close picker
        </button>
      </div>
    ) : null,
}));

afterEach(cleanup);

const twoRows = {
  documents: [
    { type: 'PAN Card', url: 'https://cdn.duncit.com/venues/docs/pan.pdf', hash: 'h-pan' },
    { type: 'Trade License', url: '' },
  ],
};

// Read through the shipped translator, so the assertion follows the catalogue copy.
const DUPLICATE_MESSAGE = fallbackT('partners.registerVenuePage.duplicateDocumentError', {
  vars: { type: 'PAN Card' },
});

describe('DocumentsSection — duplicate uploads', () => {
  it('refuses a file already uploaded under another heading and leaves the row empty', async () => {
    const { form } = mountSection(
      (sectionForm) => <DocumentsSection form={sectionForm} config={sectionConfig} mode="register" />,
      twoRows
    );

    fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));
    fireEvent.click(screen.getByRole('button', { name: 'pick the PAN again' }));

    const alert = (await screen.findByText(DUPLICATE_MESSAGE)).closest('[role="alert"]') as HTMLElement;
    expect(form().getValues('documents.1.url')).toBe('');
    expect(screen.queryByRole('dialog')).toBeNull();

    // The warning can be dismissed.
    fireEvent.click(within(alert).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText(DUPLICATE_MESSAGE)).toBeNull());
  });

  it('stores a new file with its hash and clears an earlier duplicate warning', async () => {
    const { form } = mountSection(
      (sectionForm) => <DocumentsSection form={sectionForm} config={sectionConfig} mode="register" />,
      twoRows
    );

    fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));
    fireEvent.click(screen.getByRole('button', { name: 'pick the PAN again' }));
    expect(await screen.findByText(DUPLICATE_MESSAGE)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));
    fireEvent.click(screen.getByRole('button', { name: 'pick a new file' }));

    await waitFor(() => expect(form().getValues('documents.1')).toEqual({
      type: 'Trade License',
      url: PICKED_URL,
      hash: 'h-new',
    }));
    expect(screen.queryByText(DUPLICATE_MESSAGE)).toBeNull();
  });

  it('closes the picker without touching the row', () => {
    const { form } = mountSection(
      (sectionForm) => <DocumentsSection form={sectionForm} config={sectionConfig} mode="register" />,
      twoRows
    );

    fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));
    fireEvent.click(screen.getByRole('button', { name: 'close picker' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(form().getValues('documents.1.url')).toBe('');
  });

  it('flags a row whose type was never chosen', async () => {
    const { form } = mountSection(
      (sectionForm) => <DocumentsSection form={sectionForm} config={sectionConfig} mode="register" />,
      { documents: [{ type: '', url: 'https://cdn.duncit.com/venues/docs/pan.pdf' }] }
    );

    await act(async () => {
      await form().trigger('documents');
    });

    expect(await screen.findByText('Document type is required')).toBeTruthy();
  });
});
