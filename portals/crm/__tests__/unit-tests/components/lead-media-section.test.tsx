import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import LeadMediaSection from '@/components/lead-media/LeadMediaSection';
import { leadMediaTab } from '@/components/lead-media/leadMediaTab';
import {
  ADD_CRM_LEAD_MEDIA,
  CRM_LEAD_MEDIA,
  DELETE_CRM_LEAD_MEDIA,
  UPDATE_CRM_LEAD_MEDIA,
  type CrmLeadMedia,
} from '@/api/leadMedia.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { englishT } from '../helpers/englishT';

const { upload, MB } = vi.hoisted(() => ({ upload: vi.fn(), MB: 1024 * 1024 }));

// ImageKit and the admin's upload caps are the boundary here: uploads resolve to
// a URL the test chooses, and images are capped at 2 MB.
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  useImagekitBase64Upload: () => ({ upload, uploading: false }),
  useUploadCaps: () => ({ maxImageBytes: 2 * MB }),
}));

const vars = { entity_type: 'HOST_LEAD', lead_id: 'host-1' };

const item = (overrides: Partial<CrmLeadMedia> = {}): CrmLeadMedia => ({
  id: 'm1',
  kind: 'LOGO',
  url: 'https://ik.imagekit.io/duncit/crm/brand.png',
  name: 'Brand logo',
  mime_type: 'image/png',
  size_bytes: 24 * 1024,
  width: 512,
  height: 512,
  sort_order: 0,
  created_at: '2026-11-01T10:00:00.000Z',
  ...overrides,
});

const listMock = (items: CrmLeadMedia[]): MockedResponse => ({
  request: { query: CRM_LEAD_MEDIA, variables: vars },
  result: { data: { crmLeadMedia: items } },
});

const updateMock = (input: Record<string, unknown>, result: MockedResponse['result']): MockedResponse => ({
  request: { query: UPDATE_CRM_LEAD_MEDIA, variables: { id: 'm1', input } },
  result,
});

const image = (name: string, type: string, size: number) => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const renderSection = (mocks: MockedResponse[]) => renderWithApollo(<LeadMediaSection entity="HOST_LEAD" leadId="host-1" />, mocks);

const region = (name: 'Logos' | 'Images') => within(screen.getByRole('region', { name }));
/** The same, once the list has loaded (the groups render after the spinner). */
const findRegion = async (name: 'Logos' | 'Images') => within(await screen.findByRole('region', { name }));

const openAction = async (tileName: string, action: string) => {
  fireEvent.click(await screen.findByRole('button', { name: `Actions for ${tileName}` }));
  fireEvent.click(await screen.findByRole('menuitem', { name: action }));
};

let createObjectURL: PropertyDescriptor | undefined;
beforeEach(() => {
  upload.mockReset();
  // No object URLs, so image dimensions read as unknown (jsdom cannot decode images anyway).
  createObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  Object.defineProperty(URL, 'createObjectURL', { value: undefined, configurable: true, writable: true });
});
afterEach(() => {
  if (createObjectURL) Object.defineProperty(URL, 'createObjectURL', createObjectURL);
  else delete (URL as { createObjectURL?: unknown }).createObjectURL;
});

describe('LeadMediaSection — loading', () => {
  it('shows a labelled spinner, then both empty groups with their limits', async () => {
    renderSection([listMock([])]);

    expect(screen.getByRole('progressbar', { name: 'Loading logos and images' })).toBeInTheDocument();
    expect(await (await findRegion('Logos')).findByText('No logos yet.')).toBeInTheDocument();
    expect(region('Logos').getByText('0 of 10')).toBeInTheDocument();
    expect(region('Images').getByText('No images yet.')).toBeInTheDocument();
    expect(region('Images').getByText('0 of 50')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('shows the server error with a retry that reloads the list', async () => {
    renderSection([
      { request: { query: CRM_LEAD_MEDIA, variables: vars }, result: { errors: [new GraphQLError('Lead not found')] } },
      listMock([item()]),
    ]);

    expect(await screen.findByText('Lead not found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await (await findRegion('Logos')).findByText('Brand logo')).toBeInTheDocument();
    expect(screen.queryByText('Lead not found')).toBeNull();
  });

  it('sorts logos and images into their own groups with type, size and dimensions', async () => {
    renderSection([
      listMock([
        item(),
        item({ id: 'm2', kind: 'IMAGE', name: 'Hall front', mime_type: 'image/jpeg', width: null, height: null, size_bytes: 3 * MB }),
      ]),
    ]);

    expect(await (await findRegion('Logos')).findByText('Brand logo')).toBeInTheDocument();
    expect(region('Logos').getByText('PNG · 512×512 · 24 KB')).toBeInTheDocument();
    expect(region('Logos').getByText('1 of 10')).toBeInTheDocument();
    expect(region('Images').getByText('Hall front')).toBeInTheDocument();
    expect(region('Images').getByText('JPEG · 3.0 MB')).toBeInTheDocument();
    expect(region('Logos').queryByText('Hall front')).toBeNull();
  });

  it('disables the upload once a group is at its limit', async () => {
    const logos = Array.from({ length: 10 }, (_, i) => item({ id: `logo-${i}`, name: `Logo ${i}` }));
    renderSection([listMock(logos)]);

    expect(await (await findRegion('Logos')).findByText('10 of 10')).toBeInTheDocument();
    expect(region('Logos').getByRole('button', { name: 'Upload logos' })).toBeDisabled();
    expect(region('Images').getByRole('button', { name: 'Upload images' })).toBeEnabled();
  });
});

describe('LeadMediaSection — upload', () => {
  it('uploads the picked logos to the lead folder and attaches them', async () => {
    upload.mockResolvedValue({ url: 'https://ik.imagekit.io/duncit/crm/new-logo.png' });
    const added = item({ id: 'm9', name: 'new-logo.png', url: 'https://ik.imagekit.io/duncit/crm/new-logo.png' });
    const addResult = vi.fn(() => ({ data: { addCrmLeadMedia: [added] } }));
    renderSection([
      listMock([]),
      {
        request: {
          query: ADD_CRM_LEAD_MEDIA,
          variables: {
            ...vars,
            items: [
              {
                kind: 'LOGO',
                url: 'https://ik.imagekit.io/duncit/crm/new-logo.png',
                name: 'new-logo.png',
                mime_type: 'image/png',
                size_bytes: 4096,
                width: null,
                height: null,
              },
            ],
          },
        },
        result: addResult,
      },
      listMock([added]),
    ]);
    await (await findRegion('Logos')).findByText('No logos yet.');

    const file = image('new-logo.png', 'image/png', 4096);
    fireEvent.change(screen.getByTestId('lead-media-upload-LOGO'), { target: { files: [file] } });

    expect(await (await findRegion('Logos')).findByText('new-logo.png')).toBeInTheDocument();
    expect(upload).toHaveBeenCalledWith(file, { folder: 'crm/leads/host_lead', entityId: 'host-1', fallbackMimeType: 'image/png' });
    expect(addResult).toHaveBeenCalledTimes(1);
  });

  it('refuses a wrong type and an oversize file by name, uploads the rest, and the warning can be dismissed', async () => {
    upload.mockResolvedValue({ url: 'https://ik.imagekit.io/duncit/crm/hall.jpg' });
    const added = item({ id: 'm9', kind: 'IMAGE', name: 'hall.jpg', mime_type: 'image/jpeg' });
    renderSection([
      listMock([]),
      {
        request: {
          query: ADD_CRM_LEAD_MEDIA,
          variables: {
            ...vars,
            items: [{ kind: 'IMAGE', url: 'https://ik.imagekit.io/duncit/crm/hall.jpg', name: 'hall.jpg', mime_type: 'image/jpeg', size_bytes: MB, width: null, height: null }],
          },
        },
        result: { data: { addCrmLeadMedia: [added] } },
      },
      listMock([added]),
    ]);
    await (await findRegion('Images')).findByText('No images yet.');

    fireEvent.change(screen.getByTestId('lead-media-upload-IMAGE'), {
      target: {
        files: [image('menu.pdf', 'application/pdf', 1000), image('huge.png', 'image/png', 2 * MB + 1), image('hall.jpg', 'image/jpeg', MB)],
      },
    });

    const warning = await screen.findByText('menu.pdf: this file type is not supported here.');
    expect(screen.getByText('huge.png is over 2 MB. Compress it and try again.')).toBeInTheDocument();
    expect(await (await findRegion('Images')).findByText('hall.jpg')).toBeInTheDocument();
    expect(upload).toHaveBeenCalledTimes(1);

    fireEvent.click(within(warning.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('menu.pdf: this file type is not supported here.')).toBeNull());
  });

  it('attaches nothing when every file fails to upload, and names each failure', async () => {
    upload.mockRejectedValue(new Error('ImageKit is unavailable'));
    renderSection([listMock([])]);
    await (await findRegion('Logos')).findByText('No logos yet.');

    fireEvent.change(screen.getByTestId('lead-media-upload-LOGO'), { target: { files: [image('a.png', 'image/png', 10)] } });

    expect(await screen.findByText('a.png: ImageKit is unavailable')).toBeInTheDocument();
    expect(region('Logos').getByText('No logos yet.')).toBeInTheDocument();
  });

  it('shows the server error when attaching the uploads fails', async () => {
    upload.mockResolvedValue({ url: 'https://ik.imagekit.io/duncit/crm/a.png' });
    renderSection([
      listMock([]),
      {
        request: {
          query: ADD_CRM_LEAD_MEDIA,
          variables: {
            ...vars,
            items: [{ kind: 'LOGO', url: 'https://ik.imagekit.io/duncit/crm/a.png', name: 'a.png', mime_type: 'image/png', size_bytes: 10, width: null, height: null }],
          },
        },
        result: { errors: [new GraphQLError('This lead already has 10 logos')] },
      },
    ]);
    await (await findRegion('Logos')).findByText('No logos yet.');

    fireEvent.change(screen.getByTestId('lead-media-upload-LOGO'), { target: { files: [image('a.png', 'image/png', 10)] } });

    const alert = await screen.findByText('This lead already has 10 logos');
    fireEvent.click(within(alert.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('This lead already has 10 logos')).toBeNull());
  });
});

describe('LeadMediaSection — item actions', () => {
  it('previews an image full size with a link to the original', async () => {
    renderSection([listMock([item()])]);

    fireEvent.click(await screen.findByRole('button', { name: 'Preview Brand logo' }));

    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByRole('img', { name: 'Brand logo' })).toHaveAttribute('src', 'https://ik.imagekit.io/duncit/crm/brand.png');
    expect(dialog.getByText('PNG · 512×512 · 24 KB')).toBeInTheDocument();
    expect(dialog.getByRole('link', { name: 'Open original' })).toHaveAttribute('href', 'https://ik.imagekit.io/duncit/crm/brand.png');
    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('replaces the file in place, keeping the name the operator gave it', async () => {
    upload.mockResolvedValue({ url: 'https://ik.imagekit.io/duncit/crm/brand-v2.webp' });
    const replaced = item({ url: 'https://ik.imagekit.io/duncit/crm/brand-v2.webp', mime_type: 'image/webp', size_bytes: 2048 });
    const updateResult = vi.fn(() => ({ data: { updateCrmLeadMedia: replaced } }));
    renderSection([
      listMock([item()]),
      updateMock(
        { url: 'https://ik.imagekit.io/duncit/crm/brand-v2.webp', mime_type: 'image/webp', size_bytes: 2048, width: null, height: null },
        updateResult,
      ),
      listMock([replaced]),
    ]);

    await openAction('Brand logo', 'Replace file');
    fireEvent.change(screen.getByTestId('lead-media-replace-input'), {
      target: { files: [image('brand-v2.webp', 'image/webp', 2048)] },
    });

    expect(await (await findRegion('Logos')).findByText('WEBP · 512×512 · 2 KB')).toBeInTheDocument();
    expect(region('Logos').getByText('Brand logo')).toBeInTheDocument();
    expect(updateResult).toHaveBeenCalledTimes(1);
  });

  it('does not touch the item when the replacement file is refused', async () => {
    renderSection([listMock([item()])]);

    await openAction('Brand logo', 'Replace file');
    fireEvent.change(screen.getByTestId('lead-media-replace-input'), {
      target: { files: [image('brand.tiff', 'image/tiff', 2048)] },
    });

    expect(await screen.findByText('brand.tiff: this file type is not supported here.')).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
    expect(region('Logos').getByText('PNG · 512×512 · 24 KB')).toBeInTheDocument();
  });

  it('renames an item, refusing a blank name first', async () => {
    renderSection([
      listMock([item()]),
      updateMock({ name: 'Primary logo' }, { data: { updateCrmLeadMedia: item({ name: 'Primary logo' }) } }),
      listMock([item({ name: 'Primary logo' })]),
    ]);

    await openAction('Brand logo', 'Rename');
    const input = await screen.findByTestId('media-name-input');
    expect(input).toHaveValue('Brand logo');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('media-name-submit'));
    expect(await screen.findByText('Give the image a name')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Primary logo' } });
    fireEvent.click(screen.getByTestId('media-name-submit'));

    await waitFor(() => expect(screen.queryByTestId('media-name-form')).toBeNull());
    expect(await (await findRegion('Logos')).findByText('Primary logo')).toBeInTheDocument();
  });

  it('keeps the rename dialog open with the server error, and clears it on cancel', async () => {
    renderSection([
      listMock([item()]),
      updateMock({ name: 'Hall logo' }, { errors: [new GraphQLError('Another image already has this name')] }),
    ]);

    await openAction('Brand logo', 'Rename');
    fireEvent.change(await screen.findByTestId('media-name-input'), { target: { value: 'Hall logo' } });
    fireEvent.click(screen.getByTestId('media-name-submit'));

    const dialog = within(screen.getByRole('dialog'));
    expect(await dialog.findByText('Another image already has this name')).toBeInTheDocument();
    // Shown in the dialog only, not repeated above the groups.
    expect(screen.getAllByText('Another image already has this name')).toHaveLength(1);

    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('Another image already has this name')).toBeNull();
  });

  it('moves a logo to Images', async () => {
    const moved = item({ kind: 'IMAGE' });
    renderSection([listMock([item()]), updateMock({ kind: 'IMAGE' }, { data: { updateCrmLeadMedia: moved } }), listMock([moved])]);

    await openAction('Brand logo', 'Move to Images');

    expect(await (await findRegion('Images')).findByText('Brand logo')).toBeInTheDocument();
    expect(region('Logos').getByText('No logos yet.')).toBeInTheDocument();
  });

  it('offers to move an image to Logos', async () => {
    renderSection([listMock([item({ kind: 'IMAGE' })])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Actions for Brand logo' }));
    expect(await screen.findByRole('menuitem', { name: 'Move to Logos' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Move to Images' })).toBeNull();
  });

  it('deletes an item only after the operator confirms', async () => {
    const deleteResult = vi.fn(() => ({ data: { deleteCrmLeadMedia: true } }));
    renderSection([
      listMock([item()]),
      { request: { query: DELETE_CRM_LEAD_MEDIA, variables: { id: 'm1' } }, result: deleteResult },
      listMock([]),
    ]);

    await openAction('Brand logo', 'Delete');
    expect(await screen.findByText('Delete "Brand logo" from this lead? This cannot be undone.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(deleteResult).not.toHaveBeenCalled();

    await openAction('Brand logo', 'Delete');
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    expect(await (await findRegion('Logos')).findByText('No logos yet.')).toBeInTheDocument();
    expect(deleteResult).toHaveBeenCalledTimes(1);
  });

  it('names an unnamed item "Untitled image" in the delete question', async () => {
    renderSection([listMock([item({ name: '' })])]);
    await openAction('Untitled image', 'Delete');
    expect(await screen.findByText('Delete "Untitled image" from this lead? This cannot be undone.')).toBeInTheDocument();
  });

  it('shows the server error when a delete fails and keeps the item', async () => {
    renderSection([
      listMock([item()]),
      { request: { query: DELETE_CRM_LEAD_MEDIA, variables: { id: 'm1' } }, result: { errors: [new GraphQLError('You cannot edit this lead')] } },
    ]);

    await openAction('Brand logo', 'Delete');
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    expect(await screen.findByText('You cannot edit this lead')).toBeInTheDocument();
    expect(region('Logos').getByText('Brand logo')).toBeInTheDocument();
  });
});

describe('leadMediaTab', () => {
  it('builds the Logos & Images tab around the section for the given lead', async () => {
    const tab = leadMediaTab('HOST_LEAD', 'host-1', englishT());
    expect(tab.value).toBe('media');
    expect(tab.label).toBe('Logos & Images');

    renderWithApollo(<>{tab.render()}</>, [listMock([])]);
    expect(screen.getByText('Saved as soon as you upload, rename, replace or delete.')).toBeInTheDocument();
    expect(await screen.findByText('No logos yet.')).toBeInTheDocument();
  });
});
