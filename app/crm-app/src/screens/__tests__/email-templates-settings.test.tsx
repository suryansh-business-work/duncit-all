import { Linking } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import * as docs from '@/graphql/emailTemplates';
import { gqlRequest } from '@/services/graphql.client';
import { uploadFile } from '@/services/upload';
import { renderWithTheme } from '@/test-utils';
import { EmailTemplateSettingsScreen } from '../email-templates/EmailTemplateSettingsScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@/services/upload', () => ({ uploadFile: jest.fn() }));
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
let mockParams: Record<string, unknown> | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: mockParams }),
}));

/** CRM › Email Templates › Settings › Logos & Images: the brand library and every change to it. */

const request = gqlRequest as jest.Mock;
const upload = uploadFile as jest.Mock;
const pick = ImagePicker.launchImageLibraryAsync as jest.Mock;
const THEME = {
  primary_color: '#D92D2D',
  accent_color: '#F59E0B',
  heading_color: '#111827',
  text_color: '#374151',
  muted_color: '#6B7280',
  background_color: '#F3F4F6',
  card_color: '#FFFFFF',
  panel_color: '#FEF2F2',
  border_color: '#E5E7EB',
  body_font: 'inter',
  heading_font: 'poppins',
  base_font_size: 15,
  content_padding: 32,
  button_radius: 8,
  panel_radius: 0,
  color_mode: 'AUTO',
  dark_background_color: '#0B0F19',
  dark_card_color: '#111827',
  dark_heading_color: '#F9FAFB',
  dark_text_color: '#D1D5DB',
  dark_primary_color: '#F87171',
};
const LOGO = {
  id: 'a1',
  kind: 'LOGO',
  url: 'https://ik.duncit.com/logo.png',
  name: 'Dark logo',
  mime_type: 'image/png',
  size_bytes: 2048,
  width: 300,
  height: 80,
};
const SECOND_LOGO = {
  ...LOGO,
  id: 'a3',
  name: 'Light logo',
  url: 'https://ik.duncit.com/light.png',
};
const BANNER = {
  id: 'a2',
  kind: 'BANNER',
  url: 'https://ik.duncit.com/banner.jpg',
  name: '',
  mime_type: 'image/jpeg',
  size_bytes: null,
  width: null,
  height: null,
};
const settingsDoc = (patch: Record<string, unknown> = {}) => ({
  assets: [LOGO, SECOND_LOGO, BANNER],
  primary_logo_id: 'a1',
  theme: THEME,
  defaults: { ...THEME, primary_color: '#4F46E5' },
  fonts: [
    { key: 'inter', label: 'Inter' },
    { key: 'poppins', label: 'Poppins' },
  ],
  ...patch,
});
type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppEmailTemplateSettingsDocument)
      return { crmEmailSettings: settingsDoc() };
    if (doc === docs.CrmAppEmailTemplateSetPrimaryLogoDocument)
      return { setCrmEmailPrimaryLogo: settingsDoc({ primary_logo_id: vars.id }) };
    if (doc === docs.CrmAppEmailTemplateUpdateBrandAssetDocument)
      return {
        updateCrmEmailBrandAsset: settingsDoc({ assets: [LOGO, { ...BANNER, name: 'Hero' }] }),
      };
    if (doc === docs.CrmAppEmailTemplateRemoveBrandAssetDocument)
      return { removeCrmEmailBrandAsset: settingsDoc({ assets: [LOGO] }) };
    if (doc === docs.CrmAppEmailTemplateAddBrandAssetsDocument)
      return {
        addCrmEmailBrandAssets: settingsDoc({
          assets: [LOGO, { ...LOGO, id: 'a9', name: 'new.png' }],
        }),
      };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const press = (testID: string) => act(async () => fireEvent.press(screen.getByTestId(testID)));
const picked = (...assets: Record<string, unknown>[]) =>
  pick.mockResolvedValueOnce({
    canceled: false,
    assets: assets.map((asset) => ({
      uri: `file:///p/${String(asset.fileName)}`,
      width: 600,
      height: 200,
      fileSize: 4096,
      ...asset,
    })),
  });
const open = async () => {
  renderWithTheme(<EmailTemplateSettingsScreen />);
  await screen.findByText('Dark logo');
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = undefined;
  upload.mockResolvedValue('https://ik.duncit.com/new.png');
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  serve();
});

describe('EmailTemplateSettingsScreen › Logos & Images', () => {
  it('shows the three shelves, the email logo and each image with its details', async () => {
    await open();
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Email settings' });
    // The app bar names the page; no web-style intro line under it.
    expect(
      screen.queryByText('The brand images, theme and AI instructions every CRM email uses.'),
    ).toBeNull();
    expect(screen.getByText('Logos')).toBeOnTheScreen();
    expect(screen.getByText('Banners')).toBeOnTheScreen();
    expect(screen.getByText('No images yet.')).toBeOnTheScreen();
    expect(screen.getByText('Email logo')).toBeOnTheScreen();
    expect(screen.getAllByText('PNG · 300×80 · 2 KB')).toHaveLength(2);
    expect(screen.getByText('Untitled image')).toBeOnTheScreen();
  });

  it('switches the email logo back to Duncit, or to another logo', async () => {
    await open();
    fireEvent.press(screen.getByTestId('brand-menu-a1'));
    await press('brand-actions-logo');
    expect(callsTo(docs.CrmAppEmailTemplateSetPrimaryLogoDocument)[0]?.[1]).toEqual({ id: null });
    await waitFor(() => expect(screen.queryByText('Email logo')).toBeNull());
    fireEvent.press(screen.getByTestId('brand-menu-a3'));
    expect(screen.getByText('Use as email logo')).toBeOnTheScreen();
    await press('brand-actions-logo');
    expect(callsTo(docs.CrmAppEmailTemplateSetPrimaryLogoDocument)[1]?.[1]).toEqual({ id: 'a3' });
  });

  it('moves, renames and deletes an image, confirming the delete', async () => {
    await open();
    fireEvent.press(screen.getByTestId('brand-menu-a2'));
    expect(screen.getByText('Actions for Untitled image')).toBeOnTheScreen();
    expect(screen.queryByTestId('brand-actions-logo')).toBeNull();
    await press('brand-actions-move-LOGO');
    expect(callsTo(docs.CrmAppEmailTemplateUpdateBrandAssetDocument)[0]?.[1]).toEqual({
      id: 'a2',
      input: { kind: 'LOGO' },
    });
    fireEvent.press(await screen.findByTestId('brand-menu-a2'));
    fireEvent.press(screen.getByTestId('brand-actions-rename'));
    fireEvent.changeText(screen.getByTestId('media-name-input'), 'Hero');
    await press('media-name-submit');
    expect(callsTo(docs.CrmAppEmailTemplateUpdateBrandAssetDocument)[1]?.[1]).toEqual({
      id: 'a2',
      input: { name: 'Hero' },
    });
    expect(screen.queryByTestId('media-name-input')).toBeNull();
    fireEvent.press(screen.getByTestId('brand-menu-a2'));
    fireEvent.press(screen.getByTestId('brand-actions-delete'));
    expect(
      screen.getByText(
        'Delete "Hero" from the library? Templates already using it keep showing it.',
      ),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('brand-delete-dialog-cancel'));
    expect(callsTo(docs.CrmAppEmailTemplateRemoveBrandAssetDocument)).toHaveLength(0);
    fireEvent.press(screen.getByTestId('brand-menu-a2'));
    fireEvent.press(screen.getByTestId('brand-actions-delete'));
    await press('brand-delete-dialog-confirm');
    expect(callsTo(docs.CrmAppEmailTemplateRemoveBrandAssetDocument)[0]?.[1]).toEqual({ id: 'a2' });
    await waitFor(() => expect(screen.queryByTestId('brand-asset-a2')).toBeNull());
  });

  it('keeps the rename form open with the reason when a rename fails, and shows other failures above', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppEmailTemplateUpdateBrandAssetDocument,
          () => Promise.reject(new Error('Name taken')),
        ],
      ]),
    );
    await open();
    fireEvent.press(screen.getByTestId('brand-menu-a1'));
    fireEvent.press(screen.getByTestId('brand-actions-rename'));
    fireEvent.changeText(screen.getByTestId('media-name-input'), 'Taken');
    await press('media-name-submit');
    expect(await screen.findByText('Name taken')).toBeOnTheScreen();
    expect(screen.queryByTestId('brand-error')).toBeNull();
    fireEvent.press(screen.getByTestId('media-name-cancel'));
    expect(screen.queryByTestId('media-name-input')).toBeNull();
    fireEvent.press(screen.getByTestId('brand-menu-a1'));
    await press('brand-actions-move-IMAGE');
    expect(await screen.findByTestId('brand-error')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('brand-error-close'));
    expect(screen.queryByTestId('brand-error')).toBeNull();
  });

  it('previews an image full size and opens the original', async () => {
    await open();
    fireEvent.press(screen.getByTestId('brand-preview-a1'));
    expect(screen.getByTestId('brand-preview-open')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('brand-preview-open'));
    expect(Linking.openURL).toHaveBeenCalledWith(LOGO.url);
    fireEvent.press(screen.getByTestId('brand-preview-close'));
    fireEvent.press(screen.getByTestId('brand-menu-a2'));
    fireEvent.press(screen.getByTestId('brand-actions-preview'));
    expect(screen.getAllByText('Untitled image').length).toBeGreaterThan(1);
    fireEvent.press(screen.getByTestId('brand-preview-close'));
    expect(screen.queryByTestId('brand-preview-open')).toBeNull();
  });

  it('uploads the PNG, JPG and GIF files picked, naming each file it refused or could not upload', async () => {
    await open();
    await press('brand-upload-LOGO');
    expect(callsTo(docs.CrmAppEmailTemplateAddBrandAssetsDocument)).toHaveLength(0);
    upload
      .mockResolvedValueOnce('https://ik.duncit.com/a.png')
      .mockRejectedValueOnce(new Error('Too big'));
    picked(
      { fileName: 'a.png', mimeType: 'image/png' },
      { fileName: 'b.webp', mimeType: 'image/webp' },
      { fileName: 'c.gif', mimeType: 'image/gif' },
    );
    await press('brand-upload-LOGO');
    expect(upload).toHaveBeenCalledWith(
      { uri: 'file:///p/a.png', name: 'a.png', type: 'image/png' },
      'crm/email-brand',
    );
    expect(callsTo(docs.CrmAppEmailTemplateAddBrandAssetsDocument)[0]?.[1]).toEqual({
      items: [
        {
          kind: 'LOGO',
          name: 'a.png',
          url: 'https://ik.duncit.com/a.png',
          mime_type: 'image/png',
          size_bytes: 4096,
          width: 600,
          height: 200,
        },
      ],
    });
    expect(screen.getByText('b.webp: this file type is not supported here.')).toBeOnTheScreen();
    expect(screen.getByText('c.gif: Too big')).toBeOnTheScreen();
    expect(await screen.findByText('new.png')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('brand-upload-errors-close'));
    expect(screen.queryByText('c.gif: Too big')).toBeNull();
  });

  it('replaces an image file, keeping its name', async () => {
    await open();
    fireEvent.press(screen.getByTestId('brand-menu-a2'));
    await press('brand-actions-replace');
    expect(callsTo(docs.CrmAppEmailTemplateUpdateBrandAssetDocument)).toHaveLength(0);
    picked({ fileName: 'wide.jpg', mimeType: 'image/jpeg' });
    fireEvent.press(screen.getByTestId('brand-menu-a2'));
    await press('brand-actions-replace');
    expect(callsTo(docs.CrmAppEmailTemplateUpdateBrandAssetDocument)[0]?.[1]).toEqual({
      id: 'a2',
      input: {
        url: 'https://ik.duncit.com/new.png',
        mime_type: 'image/jpeg',
        size_bytes: 4096,
        width: 600,
        height: 200,
      },
    });
  });

  it('holds every change while an upload is running', async () => {
    await open();
    upload.mockReturnValueOnce(new Promise(() => undefined));
    picked({ fileName: 'slow.png', mimeType: 'image/png' });
    fireEvent.press(screen.getByTestId('brand-upload-IMAGE'));
    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(screen.getByTestId('brand-upload-LOGO')).toBeDisabled();
    fireEvent.press(screen.getByTestId('brand-menu-a1'));
    fireEvent.press(screen.getByTestId('brand-actions-rename'));
    expect(screen.queryByTestId('media-name-input')).toBeNull();
    fireEvent.press(screen.getByTestId('brand-actions-preview'));
    expect(screen.getByTestId('brand-preview-open')).toBeOnTheScreen();
  });

  it('says when the settings cannot be loaded, and tries again', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEmailTemplateSettingsDocument, () => Promise.reject(new Error(''))],
      ]),
    );
    renderWithTheme(<EmailTemplateSettingsScreen />);
    expect(await screen.findByText('Email settings could not be loaded.')).toBeOnTheScreen();
    serve();
    await press('state-retry');
    expect(await screen.findByText('Dark logo')).toBeOnTheScreen();
  });
});
