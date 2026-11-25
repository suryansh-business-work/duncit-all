jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { outboundFetch } from '@utils/outboundFetch';
import { mediaReachProblems } from '../../social.media.check';

const fetchMock = outboundFetch as jest.Mock;
const IMAGE = { url: 'https://ik.imagekit.io/duncit/a.jpg', type: 'IMAGE' as const };
const VIDEO = { url: 'https://ik.imagekit.io/duncit/b.mp4', type: 'VIDEO' as const };
const answer = (status: number, contentType = '') => ({ ok: status >= 200 && status < 300, status, headers: new Headers(contentType ? { 'content-type': contentType } : {}) });

beforeEach(() => {
  fetchMock.mockReset();
  (logs.server.warn as jest.Mock).mockClear();
});

describe('mediaReachProblems', () => {
  it('asks each address with HEAD only, and finds nothing wrong with media that is there and of its kind', async () => {
    fetchMock.mockResolvedValueOnce(answer(200, 'image/jpeg')).mockResolvedValueOnce(answer(200, 'video/mp4'));
    await expect(mediaReachProblems([IMAGE, VIDEO])).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith('Media check', IMAGE.url, expect.objectContaining({ method: 'HEAD' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refuses media no longer at its address, naming which piece', async () => {
    fetchMock.mockResolvedValueOnce(answer(200, 'image/png')).mockResolvedValueOnce(answer(404)).mockResolvedValueOnce(answer(410));
    await expect(mediaReachProblems([IMAGE, VIDEO, IMAGE])).resolves.toEqual([
      'Media 2 is no longer at its address — pick it again',
      'Media 3 is no longer at its address — pick it again',
    ]);
  });

  it('refuses a file of the other kind or an HTML error page', async () => {
    fetchMock.mockResolvedValueOnce(answer(200, 'image/jpeg')).mockResolvedValueOnce(answer(200, 'text/html; charset=utf-8'));
    await expect(mediaReachProblems([VIDEO, IMAGE])).resolves.toEqual(['Media 1 is not a video (image/jpeg)', 'Media 2 is not an image (text/html; charset=utf-8)']);
  });

  it('lets through a type it cannot judge, a host that will not answer HEAD, and one it cannot reach — logging the last two', async () => {
    fetchMock
      .mockResolvedValueOnce(answer(200, 'application/octet-stream'))
      .mockResolvedValueOnce(answer(200))
      .mockResolvedValueOnce(answer(405))
      .mockRejectedValueOnce(new GraphQLError('Media check is unreachable (ECONNRESET)', { extensions: { code: 'BAD_GATEWAY' } }));
    await expect(mediaReachProblems([VIDEO, IMAGE, IMAGE, VIDEO])).resolves.toEqual([]);
    expect(logs.server.warn).toHaveBeenCalledTimes(2);
    expect(logs.server.warn).toHaveBeenCalledWith('social-publish', 'mediaCheck', expect.objectContaining({ status: 405 }));
  });

  it('checks nothing for a post without media', async () => {
    await expect(mediaReachProblems([])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
