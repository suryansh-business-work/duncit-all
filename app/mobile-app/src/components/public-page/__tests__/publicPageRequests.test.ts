import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import {
  fetchPosterBase64,
  fetchPublicPage,
  fetchTableLabelBase64,
  fetchTableStickersBase64,
  publicPageNativeErrorKey,
  publishPublicPage,
  qrBase64,
  shareBase64File,
} from '@/components/public-page/publicPageRequests';
import { graphqlRequest } from '@/services/graphql.client';
import { ApiError } from '@/utils/errors';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const mockAvailable = Sharing.isAvailableAsync as jest.Mock;
const mockShare = Sharing.shareAsync as jest.Mock;
const mockWrite = FileSystem.writeAsStringAsync as jest.Mock;

/** The operation name of the parsed document handed to the client. */
const opName = (doc: { definitions?: { name?: { value?: string } }[] }) =>
  doc?.definitions?.[0]?.name?.value;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('publicPageRequests', () => {
  it('reads the insights for a page with its window, signed in', async () => {
    const insights = { published: true, link: null };
    mockRequest.mockResolvedValue({ myPublicPage: insights });
    await expect(fetchPublicPage('VENUE', 'v1', 30)).resolves.toBe(insights);
    const [doc, vars, opts] = mockRequest.mock.calls[0];
    expect(opName(doc)).toBe('MyPublicPage');
    expect(vars).toEqual({ kind: 'VENUE', refId: 'v1', days: 30 });
    expect(opts).toEqual({ auth: true });
  });

  it('publishes the page and returns its link', async () => {
    const link = {
      url: 'https://duncit.com/p/x',
      code: 'x',
      qr_data_url: 'data:image/png;base64,AAA',
    };
    mockRequest.mockResolvedValue({ publishPublicPage: link });
    await expect(publishPublicPage('HOST', null)).resolves.toBe(link);
    const [doc, vars] = mockRequest.mock.calls[0];
    expect(opName(doc)).toBe('PublishPublicPage');
    expect(vars).toEqual({ kind: 'HOST', refId: null });
  });

  it('fetches the poster PDF with the copy printed on it', async () => {
    mockRequest.mockResolvedValue({ myPublicPagePosterPdfBase64: 'POSTER' });
    const copy = { headline: 'Scan me', footer: 'duncit.com' };
    await expect(fetchPosterBase64('VENUE', 'v1', copy)).resolves.toBe('POSTER');
    const [doc, vars] = mockRequest.mock.calls[0];
    expect(opName(doc)).toBe('MyPublicPagePoster');
    expect(vars).toEqual({ kind: 'VENUE', refId: 'v1', copy });
  });

  it('fetches the single table label for a venue', async () => {
    mockRequest.mockResolvedValue({ myVenueTableLabelPdfBase64: 'LABEL' });
    await expect(fetchTableLabelBase64('v1', 'Order here')).resolves.toBe('LABEL');
    const [doc, vars, opts] = mockRequest.mock.calls[0];
    expect(opName(doc)).toBe('MyVenueTableLabel');
    expect(vars).toEqual({ venueId: 'v1', headline: 'Order here' });
    expect(opts).toEqual({ auth: true });
  });

  it("fetches every table's sticker in one PDF, with the headline and table heading", async () => {
    mockRequest.mockResolvedValue({ myVenueTableStickersPdfBase64: 'STICKERS' });
    await expect(fetchTableStickersBase64('v1', 'Scan to order', 'Table')).resolves.toBe(
      'STICKERS',
    );
    const [doc, vars, opts] = mockRequest.mock.calls[0];
    expect(opName(doc)).toBe('MyVenueTableStickers');
    expect(vars).toEqual({ venueId: 'v1', headline: 'Scan to order', tableHeading: 'Table' });
    expect(opts).toEqual({ auth: true });
  });

  it('passes a failed stickers request through to the caller', async () => {
    mockRequest.mockRejectedValue(new ApiError('nope', 403, { code: 'FORBIDDEN' }));
    await expect(fetchTableStickersBase64('v1', 'Scan', 'Table')).rejects.toThrow('nope');
  });

  describe('shareBase64File', () => {
    it('writes the file to the cache and opens the share sheet', async () => {
      mockAvailable.mockResolvedValue(true);
      await expect(shareBase64File('UERG', 'stickers.pdf', 'application/pdf')).resolves.toBe(true);
      expect(mockWrite).toHaveBeenCalledWith('file:///cache/stickers.pdf', 'UERG', {
        encoding: 'base64',
      });
      expect(mockShare).toHaveBeenCalledWith('file:///cache/stickers.pdf', {
        mimeType: 'application/pdf',
      });
    });

    it('reports false and writes nothing for an empty file', async () => {
      mockAvailable.mockResolvedValue(true);
      await expect(shareBase64File('', 'a.pdf', 'application/pdf')).resolves.toBe(false);
      expect(mockAvailable).not.toHaveBeenCalled();
      expect(mockWrite).not.toHaveBeenCalled();
    });

    it('reports false when the device has no share sheet', async () => {
      mockAvailable.mockResolvedValue(false);
      await expect(shareBase64File('UERG', 'a.pdf', 'application/pdf')).resolves.toBe(false);
      expect(mockWrite).not.toHaveBeenCalled();
      expect(mockShare).not.toHaveBeenCalled();
    });
  });

  it('strips the PNG data-URL prefix from a QR, leaving bare base64 untouched', () => {
    expect(qrBase64('data:image/png;base64,QUJD')).toBe('QUJD');
    expect(qrBase64('QUJD')).toBe('QUJD');
  });

  describe('publicPageNativeErrorKey', () => {
    it('maps the API error codes to their sentences', () => {
      expect(
        publicPageNativeErrorKey(
          new ApiError('x', 400, { code: 'FAILED_PRECONDITION' }),
          'fallback',
        ),
      ).toBe('publicPage.card.notApproved');
      expect(
        publicPageNativeErrorKey(new ApiError('x', 403, { code: 'FORBIDDEN' }), 'fallback'),
      ).toBe('publicPage.card.notHost');
    });

    it('falls back for any other failure', () => {
      expect(publicPageNativeErrorKey(new ApiError('x', 500), 'fallback')).toBe('fallback');
      expect(publicPageNativeErrorKey(new Error('offline'), 'fallback')).toBe('fallback');
    });
  });
});
