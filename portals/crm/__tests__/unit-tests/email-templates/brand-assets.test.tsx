import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { DocumentNode } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import BrandAssetsPanel from '@/pages/email-templates/settings/BrandAssetsPanel';
import {
  ADD_CRM_EMAIL_BRAND_ASSETS,
  REMOVE_CRM_EMAIL_BRAND_ASSET,
  SET_CRM_EMAIL_PRIMARY_LOGO,
  UPDATE_CRM_EMAIL_BRAND_ASSET,
  type CrmEmailSettings,
} from '@/api/emailSettings.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { HERO_BANNER, MONOGRAM, WORDMARK, mutationMock, settingsDoc, settingsMock } from './settingsFixtures';

const media = vi.hoisted(() => ({ upload: vi.fn() }));

// ImageKit is reached through the upload hook; everything else in the package is real.
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  useImagekitBase64Upload: () => ({ upload: media.upload, uploading: false }),
}));

const NEW_URL = 'https://cdn.duncit.com/crm/email-brand/new.png';

const file = (name: string, type: string, sizeBytes = 2048) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: sizeBytes });
  return f;
};

const pick = (testId: string, files: File[]) => fireEvent.change(screen.getByTestId(testId), { target: { files } });

/** Every brand-library mutation answers with the whole settings document (or fails). */
const libraryMutation = (query: DocumentNode, field: string, outcome: Error | CrmEmailSettings = settingsDoc()) =>
  mutationMock(query, field, outcome);

const renderPanel = (mocks: MockedResponse[] = [], settings = settingsDoc()) =>
  renderWithApollo(<BrandAssetsPanel settings={settings} />, [settingsMock(), ...mocks]);

const openActions = async (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Actions for ${name}` }));
  return within(await screen.findByRole('menu'));
};

const choose = async (name: string, action: string) => {
  const menu = await openActions(name);
  fireEvent.click(menu.getByRole('menuitem', { name: action }));
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
};

beforeEach(() => {
  media.upload.mockReset();
});

describe('BrandAssetsPanel — shelves', () => {
  it('files each asset on its own shelf and badges the email logo', () => {
    renderPanel();

    expect(screen.getByText(/Pick an email logo to replace the Duncit logo/)).toBeInTheDocument();
    const logos = within(screen.getByRole('region', { name: 'Logos' }));
    expect(logos.getByRole('img', { name: 'Acme wordmark' })).toHaveAttribute('src', WORDMARK.url);
    expect(logos.getByRole('img', { name: 'Acme monogram' })).toBeInTheDocument();
    expect(logos.getAllByText('Email logo')).toHaveLength(1);
    const wordmarkCard = logos.getByRole('img', { name: 'Acme wordmark' }).closest('.MuiCard-root') as HTMLElement;
    expect(within(wordmarkCard).getByText('Email logo')).toBeInTheDocument();

    expect(within(screen.getByRole('region', { name: 'Banners' })).getByRole('img', { name: 'Hero banner' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Images' })).getByText('No images yet.')).toBeInTheDocument();
  });

  it('says each shelf is empty, and that emails keep the Duncit logo, on an empty library', () => {
    renderPanel([], settingsDoc({ assets: [], primary_logo_id: null }));

    expect(screen.getByText('No logos yet. Emails use the Duncit logo.')).toBeInTheDocument();
    expect(screen.getByText('No banners yet.')).toBeInTheDocument();
    expect(screen.getByText('No images yet.')).toBeInTheDocument();
    expect(screen.queryByText('Email logo')).toBeNull();
  });

  it('offers the logo switch on logos only, and moves to the other two shelves', async () => {
    renderPanel();

    let menu = await openActions('Acme wordmark');
    expect(menu.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Preview',
      'Use the Duncit logo instead',
      'Replace file',
      'Rename',
      'Move to Banners',
      'Move to Images',
      'Delete',
    ]);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

    menu = await openActions('Hero banner');
    expect(menu.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Preview',
      'Replace file',
      'Rename',
      'Move to Logos',
      'Move to Images',
      'Delete',
    ]);
  });

  it('previews an asset full size with a link to the original', async () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Preview Hero banner' }));

    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('PNG · 1200×400')).toBeInTheDocument();
    expect(dialog.getByRole('link', { name: 'Open original' })).toHaveAttribute('href', HERO_BANNER.url);
    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('BrandAssetsPanel — uploads', () => {
  it('uploads picked logos to the brand folder and files them as logos', async () => {
    media.upload.mockResolvedValue({ url: NEW_URL });
    const add = libraryMutation(ADD_CRM_EMAIL_BRAND_ASSETS, 'addCrmEmailBrandAssets');
    renderPanel([add.mock]);

    pick('brand-upload-LOGO', [file('new.png', 'image/png')]);

    await waitFor(() =>
      expect(add.answer).toHaveBeenCalledWith({
        items: [{ kind: 'LOGO', url: NEW_URL, name: 'new.png', mime_type: 'image/png', size_bytes: 2048, width: null, height: null }],
      }),
    );
    expect(media.upload).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ folder: 'crm/email-brand' }));
  });

  it('refuses SVG and WebP before uploading, naming each file, and the warning can be dismissed', async () => {
    const add = libraryMutation(ADD_CRM_EMAIL_BRAND_ASSETS, 'addCrmEmailBrandAssets');
    renderPanel([add.mock]);

    pick('brand-upload-IMAGE', [file('mark.svg', 'image/svg+xml'), file('photo.webp', 'image/webp')]);

    expect(await screen.findByText('mark.svg: this file type is not supported here.')).toBeInTheDocument();
    expect(screen.getByText('photo.webp: this file type is not supported here.')).toBeInTheDocument();
    expect(media.upload).not.toHaveBeenCalled();
    expect(add.answer).not.toHaveBeenCalled();

    fireEvent.click(within(screen.getByText('mark.svg: this file type is not supported here.').closest('.MuiAlert-root') as HTMLElement).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('mark.svg: this file type is not supported here.')).toBeNull());
  });

  it('uploads the good files of a batch and reports the one that failed', async () => {
    media.upload.mockImplementation((picked: File) =>
      picked.name === 'broken.gif' ? Promise.reject(new Error('ImageKit is down')) : Promise.resolve({ url: NEW_URL }),
    );
    const add = libraryMutation(ADD_CRM_EMAIL_BRAND_ASSETS, 'addCrmEmailBrandAssets');
    renderPanel([add.mock]);

    pick('brand-upload-BANNER', [file('broken.gif', 'image/gif'), file('wide.jpg', 'image/jpeg')]);

    expect(await screen.findByText('broken.gif: ImageKit is down')).toBeInTheDocument();
    await waitFor(() =>
      expect(add.answer).toHaveBeenCalledWith({
        items: [{ kind: 'BANNER', url: NEW_URL, name: 'wide.jpg', mime_type: 'image/jpeg', size_bytes: 2048, width: null, height: null }],
      }),
    );
  });

  it('saves nothing when every file of a batch fails', async () => {
    media.upload.mockRejectedValue(new Error('ImageKit is down'));
    const add = libraryMutation(ADD_CRM_EMAIL_BRAND_ASSETS, 'addCrmEmailBrandAssets');
    renderPanel([add.mock]);

    pick('brand-upload-LOGO', [file('logo.png', 'image/png')]);

    expect(await screen.findByText('logo.png: ImageKit is down')).toBeInTheDocument();
    expect(add.answer).not.toHaveBeenCalled();
  });

  it('reports a library the server would not save to', async () => {
    media.upload.mockResolvedValue({ url: NEW_URL });
    const add = libraryMutation(ADD_CRM_EMAIL_BRAND_ASSETS, 'addCrmEmailBrandAssets', new Error('Library is full'));
    renderPanel([add.mock]);

    pick('brand-upload-LOGO', [file('new.png', 'image/png')]);

    expect(await screen.findByText('Library is full')).toBeInTheDocument();
  });
});

describe('BrandAssetsPanel — actions', () => {
  it('makes a logo the email logo', async () => {
    const logo = libraryMutation(SET_CRM_EMAIL_PRIMARY_LOGO, 'setCrmEmailPrimaryLogo');
    renderPanel([logo.mock]);

    await choose('Acme monogram', 'Use as email logo');

    await waitFor(() => expect(logo.answer).toHaveBeenCalledWith({ id: MONOGRAM.id }));
  });

  it('puts the Duncit logo back when the current email logo is unstarred', async () => {
    const logo = libraryMutation(SET_CRM_EMAIL_PRIMARY_LOGO, 'setCrmEmailPrimaryLogo');
    renderPanel([logo.mock]);

    await choose('Acme wordmark', 'Use the Duncit logo instead');

    await waitFor(() => expect(logo.answer).toHaveBeenCalledWith({ id: null }));
  });

  it('moves an asset to another shelf', async () => {
    const update = libraryMutation(UPDATE_CRM_EMAIL_BRAND_ASSET, 'updateCrmEmailBrandAsset');
    renderPanel([update.mock]);

    await choose('Hero banner', 'Move to Images');

    await waitFor(() => expect(update.answer).toHaveBeenCalledWith({ id: HERO_BANNER.id, input: { kind: 'IMAGE' } }));
  });

  it('renames an asset and closes the dialog once saved', async () => {
    const update = libraryMutation(UPDATE_CRM_EMAIL_BRAND_ASSET, 'updateCrmEmailBrandAsset');
    renderPanel([update.mock]);

    await choose('Acme wordmark', 'Rename');
    expect(await screen.findByTestId('media-name-input')).toHaveValue('Acme wordmark');
    fireEvent.change(screen.getByTestId('media-name-input'), { target: { value: 'Acme logo' } });
    fireEvent.click(screen.getByTestId('media-name-submit'));

    await waitFor(() => expect(update.answer).toHaveBeenCalledWith({ id: WORDMARK.id, input: { name: 'Acme logo' } }));
    await waitFor(() => expect(screen.queryByTestId('media-name-form')).toBeNull());
  });

  it('keeps the rename dialog open with the reason when the server refuses, and forgets it on cancel', async () => {
    const update = libraryMutation(UPDATE_CRM_EMAIL_BRAND_ASSET, 'updateCrmEmailBrandAsset', new Error('That name is taken'));
    renderPanel([update.mock]);

    await choose('Acme wordmark', 'Rename');
    fireEvent.change(await screen.findByTestId('media-name-input'), { target: { value: 'Acme logo' } });
    fireEvent.click(screen.getByTestId('media-name-submit'));

    const form = within(screen.getByTestId('media-name-form'));
    expect(await form.findByText('That name is taken')).toBeInTheDocument();
    // Shown once, in the dialog, not again on the page behind it.
    expect(screen.getAllByText('That name is taken')).toHaveLength(1);

    fireEvent.click(form.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('media-name-form')).toBeNull());
    expect(screen.queryByText('That name is taken')).toBeNull();
  });

  it('replaces the file behind an asset and keeps its name', async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click');
    media.upload.mockResolvedValue({ url: NEW_URL });
    const update = libraryMutation(UPDATE_CRM_EMAIL_BRAND_ASSET, 'updateCrmEmailBrandAsset');
    renderPanel([update.mock]);

    await choose('Acme monogram', 'Replace file');
    expect(click).toHaveBeenCalled();
    click.mockRestore();
    pick('brand-replace-input', [file('monogram-v2.png', 'image/png', 4096)]);

    await waitFor(() =>
      expect(update.answer).toHaveBeenCalledWith({
        id: MONOGRAM.id,
        input: { url: NEW_URL, mime_type: 'image/png', size_bytes: 4096, width: null, height: null },
      }),
    );
  });

  it('does not replace a file with one mail apps cannot show', async () => {
    const update = libraryMutation(UPDATE_CRM_EMAIL_BRAND_ASSET, 'updateCrmEmailBrandAsset');
    renderPanel([update.mock]);

    await choose('Acme monogram', 'Replace file');
    pick('brand-replace-input', [file('monogram.svg', 'image/svg+xml')]);

    expect(await screen.findByText('monogram.svg: this file type is not supported here.')).toBeInTheDocument();
    expect(update.answer).not.toHaveBeenCalled();
  });

  it('ignores a replacement file picked without choosing an asset first', async () => {
    const update = libraryMutation(UPDATE_CRM_EMAIL_BRAND_ASSET, 'updateCrmEmailBrandAsset');
    renderPanel([update.mock]);

    pick('brand-replace-input', [file('stray.png', 'image/png')]);

    await waitFor(() => expect(screen.getByTestId('brand-replace-input')).toHaveValue(''));
    expect(media.upload).not.toHaveBeenCalled();
    expect(update.answer).not.toHaveBeenCalled();
  });

  it('deletes an asset only after confirmation', async () => {
    const remove = libraryMutation(REMOVE_CRM_EMAIL_BRAND_ASSET, 'removeCrmEmailBrandAsset');
    renderPanel([remove.mock]);

    await choose('Hero banner', 'Delete');
    expect(await screen.findByText('Delete "Hero banner" from the library? Templates already using it keep showing it.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(remove.answer).not.toHaveBeenCalled();

    await choose('Hero banner', 'Delete');
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(remove.answer).toHaveBeenCalledWith({ id: HERO_BANNER.id }));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
  });

  it('reports a delete the server refused, and the message can be dismissed', async () => {
    const remove = libraryMutation(REMOVE_CRM_EMAIL_BRAND_ASSET, 'removeCrmEmailBrandAsset', new Error('Asset not found'));
    renderPanel([remove.mock]);

    await choose('Hero banner', 'Delete');
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    const alert = await screen.findByText('Asset not found');
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    fireEvent.click(within(alert.closest('.MuiAlert-root') as HTMLElement).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Asset not found')).toBeNull());
  });
});
