import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { DEFAULT_IMAGE_MAX_MB, MB } from '@duncit/media-picker';
import ImageLibraryDialog from '@/pages/email-templates/ImageLibraryDialog';
import AttachmentsSection from '@/pages/email-templates/AttachmentsSection';
import { insertMjmlImage } from '@/pages/email-templates/insertMjmlImage';
import { ADD_TEMPLATE_IMAGE, REMOVE_TEMPLATE_IMAGE, type EmailAsset } from '@/api/emailTemplates.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

const media = vi.hoisted(() => ({ upload: vi.fn() }));

// ImageKit is reached through the upload hook; everything else in the package is real.
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  useImagekitBase64Upload: () => ({ upload: media.upload, uploading: false }),
}));

const HERO: EmailAsset = { url: 'https://cdn.duncit.com/hero.png', name: 'Hero' };
const BANNER: EmailAsset = { url: 'https://cdn.duncit.com/banner.png', name: null };

const file = (name: string, type: string, sizeBytes = 1024) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: sizeBytes });
  return f;
};

const pick = (input: HTMLInputElement, files: File[]) => fireEvent.change(input, { target: { files } });
const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;

const writeText = vi.fn(() => Promise.resolve());

beforeEach(() => {
  media.upload.mockReset();
  Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
});

afterEach(() => {
  writeText.mockReset();
  writeText.mockImplementation(() => Promise.resolve());
});

describe('insertMjmlImage', () => {
  it('drops the image into the first column, else a new section, else the end', () => {
    expect(insertMjmlImage('<mj-column><mj-text/></mj-column>', 'u')).toBe(
      '<mj-column><mj-text/>      <mj-image src="u" alt="" />\n    </mj-column>',
    );
    expect(insertMjmlImage('<mjml><mj-body></mj-body></mjml>', 'u')).toContain(
      '<mj-section><mj-column>\n      <mj-image src="u" alt="" />\n    </mj-column></mj-section>\n  </mj-body>',
    );
    expect(insertMjmlImage('<mjml></mjml>', 'u')).toBe('<mjml></mjml>\n      <mj-image src="u" alt="" />\n');
  });
});

describe('ImageLibraryDialog', () => {
  const renderLibrary = (images: EmailAsset[], mocks: MockedResponse[] = []) => {
    const props = { onClose: vi.fn(), onChangeImages: vi.fn(), onInsert: vi.fn() };
    renderWithApollo(<ImageLibraryDialog open templateId="tpl-venue" images={images} {...props} />, mocks);
    return props;
  };

  it('invites the first upload', () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click');
    renderLibrary([]);
    expect(screen.getByText('No images yet. Click "Upload".')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('uploads a picked image and saves it to the template straight away', async () => {
    media.upload.mockResolvedValue({ url: 'https://cdn.duncit.com/new.png' });
    const { onChangeImages } = renderLibrary([HERO], [
      {
        request: { query: ADD_TEMPLATE_IMAGE, variables: { id: 'tpl-venue', image: { url: 'https://cdn.duncit.com/new.png', name: 'new.png' } } },
        result: { data: { addCrmEmailTemplateImage: { template_id: 'tpl-venue', images: [HERO, { url: 'https://cdn.duncit.com/new.png', name: 'new.png' }] } } },
      },
    ]);

    pick(fileInput(), [file('new.png', 'image/png')]);

    await waitFor(() => expect(onChangeImages).toHaveBeenCalledWith([HERO, { url: 'https://cdn.duncit.com/new.png', name: 'new.png' }]));
    expect(media.upload).toHaveBeenCalledWith(expect.any(File), { folder: 'crm/email-templates', fallbackMimeType: 'image/png' });
    expect(fileInput().value).toBe('');
  });

  it('refuses an image over the upload cap, and ignores an empty pick', () => {
    renderLibrary([]);

    pick(fileInput(), []);
    expect(screen.queryByRole('alert')).toBeNull();

    pick(fileInput(), [file('huge.png', 'image/png', (DEFAULT_IMAGE_MAX_MB + 1) * MB)]);
    expect(screen.getByText(`Max ${DEFAULT_IMAGE_MAX_MB} MB. Compress and try again.`)).toBeInTheDocument();
    expect(media.upload).not.toHaveBeenCalled();
  });

  it('shows an upload failure until dismissed', async () => {
    media.upload.mockRejectedValue(new Error('ImageKit rejected the file'));
    renderLibrary([]);

    pick(fileInput(), [file('new.png', 'image/png')]);

    expect(await screen.findByText('ImageKit rejected the file')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('ImageKit rejected the file')).toBeNull());
  });

  it('removes an image from the library, and reports a failed removal', async () => {
    const { onChangeImages } = renderLibrary([HERO, BANNER], [
      {
        request: { query: REMOVE_TEMPLATE_IMAGE, variables: { id: 'tpl-venue', url: HERO.url } },
        result: { data: { removeCrmEmailTemplateImage: { template_id: 'tpl-venue', images: [BANNER] } } },
      },
      { request: { query: REMOVE_TEMPLATE_IMAGE, variables: { id: 'tpl-venue', url: BANNER.url } }, error: new Error('Image in use') },
    ]);
    expect(screen.getByRole('img', { name: 'Hero' })).toBeInTheDocument();

    const [removeHero, removeBanner] = screen.getAllByRole('button', { name: 'Remove from library' });
    fireEvent.click(removeHero);
    await waitFor(() => expect(onChangeImages).toHaveBeenCalledWith([BANNER]));

    fireEvent.click(removeBanner);
    expect(await screen.findByText('Image in use')).toBeInTheDocument();
  });

  it('copies an image URL, confirms it briefly, and inserts on request', async () => {
    const { onInsert, onClose } = renderLibrary([HERO]);

    fireEvent.click(screen.getByRole('button', { name: 'Copy URL' }));
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(HERO.url);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy URL' })).toBeInTheDocument(), { timeout: 3000 });

    fireEvent.click(screen.getByRole('button', { name: 'Insert <mj-image>' }));
    expect(onInsert).toHaveBeenCalledWith(HERO.url);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('stays put when the clipboard refuses the URL', async () => {
    writeText.mockImplementation(() => Promise.reject(new Error('denied')));
    renderLibrary([HERO]);

    fireEvent.click(screen.getByRole('button', { name: 'Copy URL' }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Copied!' })).toBeNull();
  });
});

describe('AttachmentsSection', () => {
  const renderSection = (attachments: EmailAsset[]) => {
    const onChange = vi.fn();
    renderWithApollo(<AttachmentsSection attachments={attachments} onChange={onChange} />);
    return onChange;
  };

  it('uploads an image or video and appends it', async () => {
    media.upload.mockResolvedValue({ url: 'https://cdn.duncit.com/tour.mp4' });
    const onChange = renderSection([HERO]);

    pick(fileInput(), [file('tour.mp4', 'video/mp4')]);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([HERO, { url: 'https://cdn.duncit.com/tour.mp4', name: 'tour.mp4' }]));
    expect(media.upload).toHaveBeenCalledWith(expect.any(File), { folder: 'crm/email-attachments' });
  });

  it('opens the picker from Add file and ignores an empty pick', () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click');
    const onChange = renderSection([]);

    fireEvent.click(screen.getByRole('button', { name: 'Add file' }));
    pick(fileInput(), []);

    expect(click).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    click.mockRestore();
  });

  const refused: Array<[string, string, number, string]> = [
    ['rate-card.pdf', 'application/pdf', 1024, 'Only image or video files are allowed.'],
    ['unknown', '', 1024, 'Only image or video files are allowed.'],
    ['walkthrough.mp4', 'video/mp4', 26 * 1024 * 1024, 'Max 25MB per attachment.'],
  ];

  it.each(refused)('refuses %s', (name, type, size, message) => {
    renderSection([]);
    pick(fileInput(), [file(name, type, size)]);
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(media.upload).not.toHaveBeenCalled();
  });

  it('shows an upload failure until dismissed', async () => {
    media.upload.mockRejectedValue(new Error('Upload quota reached'));
    renderSection([]);

    pick(fileInput(), [file('hero.png', 'image/png')]);

    expect(await screen.findByText('Upload quota reached')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Upload quota reached')).toBeNull());
  });

  it('names unnamed attachments by their file and removes one', () => {
    const onChange = renderSection([HERO, BANNER]);

    expect(screen.getByRole('link', { name: 'banner.png' })).toBeInTheDocument();
    const heroChip = screen.getByRole('link', { name: 'Hero' }).closest('.MuiChip-root') as HTMLElement;
    fireEvent.click(within(heroChip).getByTestId('CancelIcon'));

    expect(onChange).toHaveBeenCalledWith([BANNER]);
  });
});
