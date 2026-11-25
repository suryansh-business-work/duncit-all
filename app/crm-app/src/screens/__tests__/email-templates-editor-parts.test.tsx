import { Linking, Share } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import * as docs from '@/graphql/emailTemplates';
import { gqlRequest } from '@/services/graphql.client';
import { uploadFile } from '@/services/upload';
import { renderWithTheme } from '@/test-utils';
import { EmailTemplateEditorScreen } from '../email-templates/EmailTemplateEditorScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@/services/upload', () => ({ uploadFile: jest.fn() }));
const mockNav = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  dispatch: jest.fn(),
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: { id: 't1' } }),
}));

/** CRM › Email Templates › editor: the Variables tab, the image library and the attachments. */

const request = gqlRequest as jest.Mock;
const upload = uploadFile as jest.Mock;
const pick = ImagePicker.launchImageLibraryAsync as jest.Mock;
const HERO = { url: 'https://ik.duncit.com/hero.png', name: 'hero.png' };
const BASE = {
  template_id: 't1',
  slug: 'venue-welcome',
  name: 'Venue welcome',
  description: null,
  subject: 'Hi',
  target: 'VENUE',
  mjml: '<mjml><mj-body><mj-section><mj-column><mj-text>Hi</mj-text></mj-column></mj-section></mj-body></mjml>',
  is_active: true,
  variables: [{ key: 'venue_name', description: null, sample: 'Grand Hall' }],
  images: [HERO],
  attachments: [{ url: 'https://ik.duncit.com/files/brochure.mp4', name: null }],
};
let template: Record<string, unknown> = BASE;
let detected = ['venue_name', 'coupon'];
type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppEmailTemplateDetailDocument) return { crmEmailTemplate: template };
    if (doc === docs.CrmAppEmailTemplateRenderDocument)
      return {
        renderCrmEmailTemplate: {
          html: `<p>${String(vars.vars)}</p>`,
          errors: [],
          detected_variables: detected,
        },
      };
    if (doc === docs.CrmAppEmailTemplateAddImageDocument)
      return { addCrmEmailTemplateImage: { template_id: 't1', images: [HERO, vars.image] } };
    if (doc === docs.CrmAppEmailTemplateRemoveImageDocument)
      return { removeCrmEmailTemplateImage: { template_id: 't1', images: [] } };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const press = (testID: string) => act(async () => fireEvent.press(screen.getByTestId(testID)));
const SLOW = { timeout: 3000 };
const picked = (asset: Record<string, unknown>) =>
  pick.mockResolvedValueOnce({
    canceled: false,
    assets: [{ uri: 'file:///p/one.png', width: 640, height: 480, ...asset }],
  });
const openVariables = async () => {
  renderWithTheme(<EmailTemplateEditorScreen />);
  await screen.findByTestId('template-name');
  await waitFor(
    () => expect(callsTo(docs.CrmAppEmailTemplateRenderDocument).length).toBeGreaterThan(0),
    SLOW,
  );
  fireEvent.press(screen.getByTestId('editor-tab-variables'));
};

beforeEach(() => {
  jest.clearAllMocks();
  template = BASE;
  detected = ['venue_name', 'coupon'];
  upload.mockResolvedValue('https://ik.duncit.com/new.png');
  jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  serve();
});

describe('Variables tab', () => {
  it('shows what the MJML uses and what the audience offers, and warns about the rest', async () => {
    await openVariables();
    expect(await screen.findByTestId('detected-chip-coupon')).toBeOnTheScreen();
    expect(
      screen.getByText(
        "1 placeholder (coupon) is not an available Venue variable — it won't be filled from the lead.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Available for Venue')).toBeOnTheScreen();
    expect(screen.getByText('Venue name · venue_name')).toBeOnTheScreen();
    expect(screen.getByTestId('variable-sample-0').props.value).toBe('Grand Hall');
    expect(screen.getByTestId('variable-sample-0').props.placeholder).toBe(
      'Value for {{ venue_name }}',
    );
  });

  it('adds and removes variables from the chips, syncs the detected ones, and re-renders with new values', async () => {
    await openVariables();
    await screen.findByTestId('detected-chip-coupon');
    fireEvent.press(screen.getByTestId('available-chip-city'));
    expect(screen.getByTestId('variable-key-1').props.value).toBe('city');
    fireEvent.press(screen.getByTestId('available-chip-venue_name'));
    expect(screen.getByTestId('variable-key-0').props.value).toBe('city');
    fireEvent.press(screen.getByTestId('variables-sync'));
    expect(screen.getByTestId('variable-key-1').props.value).toBe('venue_name');
    expect(screen.getByTestId('variable-key-2').props.value).toBe('coupon');
    fireEvent.press(screen.getByTestId('variables-sync'));
    expect(screen.queryByTestId('variable-key-3')).toBeNull();
    fireEvent.changeText(screen.getByTestId('variable-sample-0'), 'Pune');
    fireEvent.changeText(screen.getByTestId('variable-description-0'), 'The city');
    expect(screen.getByTestId('variable-sample-0').props.placeholder).toBe('The city');
    fireEvent.press(screen.getByTestId('variable-remove-2'));
    await waitFor(
      () =>
        expect(callsTo(docs.CrmAppEmailTemplateRenderDocument).at(-1)?.[1].vars).toBe(
          '{"city":"Pune","venue_name":""}',
        ),
      SLOW,
    );
    expect(screen.getByText('Unsaved changes')).toBeOnTheScreen();
  });

  it('shares a placeholder from a chip or a declared variable', async () => {
    await openVariables();
    fireEvent.press(await screen.findByTestId('detected-chip-coupon-share'));
    expect(Share.share).toHaveBeenCalledWith({ message: '{{ coupon }}' });
    fireEvent.press(screen.getByTestId('variable-share-0'));
    expect(Share.share).toHaveBeenCalledWith({ message: '{{ venue_name }}' });
  });

  it('expects no lead variables in a static template, and offers host fields to a host one', async () => {
    template = { ...BASE, target: 'STATIC', variables: [] };
    const { unmount } = renderWithTheme(<EmailTemplateEditorScreen />);
    await screen.findByTestId('template-name');
    fireEvent.press(screen.getByTestId('editor-tab-variables'));
    expect(
      await screen.findByText(
        "2 placeholders (venue_name, coupon) are not expected in a static template — they won't be filled from the lead.",
        {},
        SLOW,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Static template — no lead variables. Detected placeholders show red.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Add variables above to set default values.')).toBeOnTheScreen();
    expect(screen.getByText('Add from the chips above.')).toBeOnTheScreen();
    unmount();
    template = { ...BASE, target: 'HOST' };
    detected = [];
    renderWithTheme(<EmailTemplateEditorScreen />);
    await screen.findByTestId('template-name');
    fireEvent.press(screen.getByTestId('editor-tab-variables'));
    expect(screen.getByText('Available for Host')).toBeOnTheScreen();
    expect(screen.getByText('No {{ var }} placeholders found.')).toBeOnTheScreen();
    expect(screen.getByTestId('variables-sync')).toBeDisabled();
  });
});

describe('Image library', () => {
  it('inserts an image into the MJML, shares its URL and removes it', async () => {
    renderWithTheme(<EmailTemplateEditorScreen />);
    await screen.findByTestId('template-name');
    fireEvent.press(screen.getByTestId('mjml-images'));
    expect(screen.getByText('hero.png')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('image-share-0'));
    expect(Share.share).toHaveBeenCalledWith({ message: HERO.url });
    fireEvent.press(screen.getByTestId('image-insert-0'));
    expect(screen.getByTestId('mjml-source').props.value).toContain(
      `<mj-image src="${HERO.url}" alt="" />`,
    );
    fireEvent.press(screen.getByTestId('mjml-images'));
    await press('image-remove-0');
    expect(callsTo(docs.CrmAppEmailTemplateRemoveImageDocument)[0]?.[1]).toEqual({
      id: 't1',
      url: HERO.url,
    });
    expect(await screen.findByText('No images yet. Click "Upload".')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('images-close'));
    expect(screen.queryByText('No images yet. Click "Upload".')).toBeNull();
  });

  it('uploads a picked image to the library at once, and says when it could not', async () => {
    renderWithTheme(<EmailTemplateEditorScreen />);
    await screen.findByTestId('template-name');
    fireEvent.press(screen.getByTestId('mjml-images'));
    await press('images-upload');
    expect(upload).not.toHaveBeenCalled();
    picked({ fileName: 'banner.png', mimeType: 'image/png' });
    await press('images-upload');
    expect(upload).toHaveBeenCalledWith(
      { uri: 'file:///p/one.png', name: 'banner.png', type: 'image/png' },
      'crm/email-templates',
    );
    expect(callsTo(docs.CrmAppEmailTemplateAddImageDocument)[0]?.[1]).toEqual({
      id: 't1',
      image: { url: 'https://ik.duncit.com/new.png', name: 'banner.png' },
    });
    expect(await screen.findByText('banner.png')).toBeOnTheScreen();
    upload.mockRejectedValueOnce(new Error('Upload failed (HTTP 413)'));
    picked({ fileName: null, mimeType: undefined, width: 0, height: 0 });
    await press('images-upload');
    expect(upload).toHaveBeenLastCalledWith(
      { uri: 'file:///p/one.png', name: 'one.png', type: 'application/octet-stream' },
      'crm/email-templates',
    );
    expect(await screen.findByText('Upload failed (HTTP 413)')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('images-error-close'));
    expect(screen.queryByText('Upload failed (HTTP 413)')).toBeNull();
  });
});

describe('Attachments', () => {
  it('opens and removes an attachment, and adds an image or video to save with the template', async () => {
    renderWithTheme(<EmailTemplateEditorScreen />);
    await screen.findByTestId('template-name');
    expect(screen.getByText('brochure.mp4')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('attachment-open-0'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://ik.duncit.com/files/brochure.mp4');
    fireEvent.press(screen.getByTestId('attachment-remove-0'));
    expect(screen.queryByText('brochure.mp4')).toBeNull();
    await press('attachments-add');
    expect(upload).not.toHaveBeenCalled();
    picked({ fileName: 'tour.mp4', mimeType: 'video/mp4', fileSize: 1024 });
    await press('attachments-add');
    expect(pick).toHaveBeenLastCalledWith(
      expect.objectContaining({ mediaTypes: ['images', 'videos'] }),
    );
    expect(upload).toHaveBeenCalledWith(
      { uri: 'file:///p/one.png', name: 'tour.mp4', type: 'video/mp4' },
      'crm/email-attachments',
    );
    expect(await screen.findByText('tour.mp4')).toBeOnTheScreen();
    expect(screen.getByText('Unsaved changes')).toBeOnTheScreen();
  });

  it('refuses a file that is not an image or video, or is over 25 MB, and says when an upload fails', async () => {
    renderWithTheme(<EmailTemplateEditorScreen />);
    await screen.findByTestId('template-name');
    picked({ fileName: 'deck.pdf', mimeType: 'application/pdf' });
    await press('attachments-add');
    expect(screen.getByText('Only image or video files are allowed.')).toBeOnTheScreen();
    picked({ fileName: 'big.mp4', mimeType: 'video/mp4', fileSize: 26 * 1024 * 1024 });
    await press('attachments-add');
    expect(screen.getByText('Max 25MB per attachment.')).toBeOnTheScreen();
    expect(upload).not.toHaveBeenCalled();
    upload.mockRejectedValueOnce(new Error('Network down'));
    picked({ fileName: 'ok.png', mimeType: 'image/png' });
    await press('attachments-add');
    expect(await screen.findByText('Network down')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('attachments-error-close'));
    expect(screen.queryByText('Network down')).toBeNull();
  });
});

describe('Preview renders', () => {
  it('keeps the newest render when an older one answers late, whether it succeeds or fails', async () => {
    const late: { resolve: (v: unknown) => void; reject: (e: Error) => void }[] = [];
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppEmailTemplateRenderDocument,
          () => new Promise((resolve, reject) => late.push({ resolve, reject })),
        ],
      ]),
    );
    renderWithTheme(<EmailTemplateEditorScreen />);
    await screen.findByTestId('template-name');
    await waitFor(() => expect(late).toHaveLength(1), SLOW);
    fireEvent.press(screen.getByTestId('mjml-verify'));
    fireEvent.press(screen.getByTestId('mjml-verify'));
    await act(async () => {
      late[2]?.resolve({
        renderCrmEmailTemplate: { html: '<p>newest</p>', errors: [], detected_variables: [] },
      });
      late[0]?.resolve({
        renderCrmEmailTemplate: { html: '<p>stale</p>', errors: [], detected_variables: [] },
      });
      late[1]?.reject(new Error('Old render failed'));
    });
    expect(screen.getByTestId('preview-frame').props.source.html).toBe('<p>newest</p>');
    expect(screen.queryByText('Old render failed')).toBeNull();
  });
});
