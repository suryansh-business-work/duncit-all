import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import type { Lead } from '@/features/leads/useLead';
import * as docs from '@/graphql/leadTabsB';
import { gqlRequest } from '@/services/graphql.client';
import { uploadFile } from '@/services/upload';
import { renderWithTheme } from '@/test-utils';
import { MediaTab } from '../lead/tabs/MediaTab';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@/services/upload', () => ({ uploadFile: jest.fn() }));

/** Lead › Logos & Images: the two groups, uploads from the phone, and each picture's actions. */

const request = gqlRequest as jest.Mock;
const upload = uploadFile as jest.Mock;
const pick = ImagePicker.launchImageLibraryAsync as jest.Mock;
const ITEMS = [
  {
    id: 'm1',
    kind: 'LOGO',
    url: 'https://ik.duncit.com/logo.png',
    name: 'Dark logo',
    mime_type: 'image/png',
    size_bytes: 2048,
    width: 512,
    height: 256,
  },
  {
    id: 'm2',
    kind: 'IMAGE',
    url: 'https://ik.duncit.com/hall.jpg',
    name: '',
    mime_type: 'image/jpeg',
    size_bytes: null,
    width: null,
    height: null,
  },
];
const LEAD: Lead = {
  id: 'h1',
  name: 'Run Club',
  city: 'Pune',
  lead_status: 'New',
  priority: 'Medium',
  assigned_to: null,
  next_follow_up_date: null,
  contacts: [],
  activity_log: [],
};

type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppLeadMediaDocument) return { crmLeadMedia: ITEMS };
    if (doc === docs.CrmAppAddLeadMediaDocument) return { addCrmLeadMedia: [{ id: 'm3' }] };
    if (doc === docs.CrmAppUpdateLeadMediaDocument)
      return { updateCrmLeadMedia: { id: vars.id, kind: 'LOGO', name: 'x' } };
    if (doc === docs.CrmAppDeleteLeadMediaDocument) return { deleteCrmLeadMedia: true };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const renderTab = () =>
  renderWithTheme(<MediaTab kind="HOST_LEAD" id="h1" lead={LEAD} onChanged={jest.fn()} />);
const picked = (asset: Record<string, unknown>) =>
  pick.mockResolvedValueOnce({
    canceled: false,
    assets: [{ uri: 'file:///p/one.png', width: 640, height: 480, ...asset }],
  });

beforeEach(() => {
  jest.clearAllMocks();
  upload.mockResolvedValue('https://ik.duncit.com/new.png');
  serve();
});

describe('MediaTab', () => {
  it('shows logos and images apart, with their caps, details and empty states', async () => {
    renderTab();
    expect(await screen.findByText('Dark logo')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppLeadMediaDocument)[0]?.[1]).toEqual({
      entity_type: 'HOST_LEAD',
      lead_id: 'h1',
    });
    expect(screen.getByText('PNG · 512×256 · 2 KB')).toBeOnTheScreen();
    expect(screen.getByText('Untitled image')).toBeOnTheScreen();
    expect(screen.getAllByText('1 of 10')).toHaveLength(1);
    expect(screen.getByText('1 of 50')).toBeOnTheScreen();
    expect(screen.getByText('Logos & Images')).toBeOnTheScreen();
  });

  it('uploads pictures from the library into a group, skipping a type it does not take', async () => {
    renderTab();
    await screen.findByText('Dark logo');
    pick.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///p/one.png',
          fileName: 'one.png',
          mimeType: 'image/png',
          fileSize: 1000,
          width: 640,
          height: 480,
        },
        {
          uri: 'file:///p/clip.mov',
          fileName: 'clip.mov',
          mimeType: 'video/quicktime',
          width: 0,
          height: 0,
        },
      ],
    });
    await act(async () => fireEvent.press(screen.getByTestId('lead-media-upload-IMAGE')));
    expect(pick).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    expect(upload).toHaveBeenCalledWith(
      { uri: 'file:///p/one.png', name: 'one.png', type: 'image/png' },
      'crm/leads/host_lead',
    );
    expect(callsTo(docs.CrmAppAddLeadMediaDocument)[0]?.[1]).toEqual({
      entity_type: 'HOST_LEAD',
      lead_id: 'h1',
      items: [
        {
          kind: 'IMAGE',
          url: 'https://ik.duncit.com/new.png',
          name: 'one.png',
          mime_type: 'image/png',
          size_bytes: 1000,
          width: 640,
          height: 480,
        },
      ],
    });
    expect(
      await screen.findByText('clip.mov: this file type is not supported here.'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('media-upload-errors-close'));
    expect(screen.queryByText(/not supported/)).toBeNull();
  });

  it('attaches nothing when the library is closed or every upload fails', async () => {
    renderTab();
    await screen.findByText('Dark logo');
    await act(async () => fireEvent.press(screen.getByTestId('lead-media-upload-LOGO')));
    upload.mockRejectedValueOnce(new Error('Upload failed (HTTP 500)'));
    picked({ mimeType: 'image/png', fileName: undefined });
    await act(async () => fireEvent.press(screen.getByTestId('lead-media-upload-LOGO')));
    expect(callsTo(docs.CrmAppAddLeadMediaDocument)).toHaveLength(0);
    expect(await screen.findByText('one.png: Upload failed (HTTP 500)')).toBeOnTheScreen();
  });

  it('replaces, moves and previews a picture from its actions', async () => {
    renderTab();
    fireEvent.press(await screen.findByTestId('media-actions-m1'));
    expect(screen.getByText('Actions for Dark logo')).toBeOnTheScreen();
    picked({ fileName: 'new.png', mimeType: 'image/png', fileSize: 10 });
    await act(async () => fireEvent.press(screen.getByTestId('media-menu-replace')));
    expect(pick).toHaveBeenLastCalledWith({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    expect(callsTo(docs.CrmAppUpdateLeadMediaDocument)[0]?.[1]).toEqual({
      id: 'm1',
      input: {
        url: 'https://ik.duncit.com/new.png',
        mime_type: 'image/png',
        size_bytes: 10,
        width: 640,
        height: 480,
      },
    });

    fireEvent.press(screen.getByTestId('media-actions-m1'));
    expect(screen.getByText('Move to Images')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('media-menu-move')));
    expect(callsTo(docs.CrmAppUpdateLeadMediaDocument)[1]?.[1]).toEqual({
      id: 'm1',
      input: { kind: 'IMAGE' },
    });

    fireEvent.press(screen.getByTestId('media-actions-m2'));
    fireEvent.press(screen.getByTestId('media-menu-preview'));
    expect(screen.getByTestId('media-preview')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('media-preview-close'));
    fireEvent.press(screen.getByTestId('media-preview-m1'));
    // The sheet repeats the tile's name and details.
    expect(screen.getAllByText('Dark logo')).toHaveLength(2);
    expect(screen.getAllByText('PNG · 512×256 · 2 KB')).toHaveLength(2);
  });

  it('renames a picture, refusing a blank name and showing a refusal in the form', async () => {
    renderTab();
    fireEvent.press(await screen.findByTestId('media-actions-m1'));
    fireEvent.press(screen.getByTestId('media-menu-rename'));
    fireEvent.changeText(screen.getByTestId('media-name-input'), '   ');
    await act(async () => fireEvent.press(screen.getByTestId('media-name-submit')));
    expect(screen.getByText('Give the image a name')).toBeOnTheScreen();

    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppUpdateLeadMediaDocument, () => Promise.reject(new Error('Image not found'))],
      ]),
    );
    fireEvent.changeText(screen.getByTestId('media-name-input'), 'Primary logo');
    await act(async () => fireEvent.press(screen.getByTestId('media-name-submit')));
    expect(callsTo(docs.CrmAppUpdateLeadMediaDocument)[0]?.[1]).toEqual({
      id: 'm1',
      input: { name: 'Primary logo' },
    });
    expect(await screen.findByText('Image not found')).toBeOnTheScreen();

    serve();
    await act(async () => fireEvent.press(screen.getByTestId('media-name-submit')));
    await waitFor(() => expect(screen.queryByTestId('media-name-input')).toBeNull());
  });

  it('deletes only after confirming, keeping the reason on the tab when it fails', async () => {
    renderTab();
    fireEvent.press(await screen.findByTestId('media-actions-m2'));
    fireEvent.press(screen.getByTestId('media-menu-delete'));
    expect(
      screen.getByText('Delete "Untitled image" from this lead? This cannot be undone.'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('media-delete-cancel'));
    expect(callsTo(docs.CrmAppDeleteLeadMediaDocument)).toHaveLength(0);

    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppDeleteLeadMediaDocument, () => Promise.reject(new Error('Locked'))],
      ]),
    );
    fireEvent.press(screen.getByTestId('media-actions-m2'));
    fireEvent.press(screen.getByTestId('media-menu-delete'));
    await act(async () => fireEvent.press(screen.getByTestId('media-delete-confirm')));
    expect(callsTo(docs.CrmAppDeleteLeadMediaDocument)[0]?.[1]).toEqual({ id: 'm2' });
    expect(await screen.findByText('Locked')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('media-error-close'));
    expect(screen.queryByText('Locked')).toBeNull();
  });

  it('offers a retry when the pictures cannot be read', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppLeadMediaDocument, () => Promise.reject(new Error('Network down'))],
      ]),
    );
    renderTab();
    expect(await screen.findByText('Network down')).toBeOnTheScreen();
    serve(
      new Map<unknown, Handler>([[docs.CrmAppLeadMediaDocument, () => ({ crmLeadMedia: [] })]]),
    );
    fireEvent.press(screen.getByTestId('state-retry'));
    expect(await screen.findByText('No logos yet.')).toBeOnTheScreen();
    expect(screen.getByText('No images yet.')).toBeOnTheScreen();
  });
});
