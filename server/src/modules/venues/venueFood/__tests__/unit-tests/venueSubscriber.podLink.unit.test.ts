/**
 * `podLink` — the link a venue subscriber's announcement and an answered event
 * request both carry: the pod's tracked share link, or the app's home when the
 * link cannot be minted (a send must never fail for want of a link).
 */
jest.mock('@modules/crm/marketing/shortLink.service', () => ({ shortLinkService: { share: jest.fn() } }));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));

import { getUrlConfigs } from '@config/url-configs';
import { shortLinkService } from '@modules/crm/marketing/shortLink.service';
import { logs } from '@observability/log';
import { podLink } from '../../venueSubscriber.service';

const share = jest.mocked(shortLinkService.share);
const urls = jest.mocked(getUrlConfigs);

describe('podLink', () => {
  it("returns the pod's tracked share link", async () => {
    share.mockResolvedValue({ url: 'https://duncit.test/s/abc123' } as Awaited<ReturnType<typeof shortLinkService.share>>);
    await expect(podLink('pod-1')).resolves.toBe('https://duncit.test/s/abc123');
    expect(share).toHaveBeenCalledWith('POD', 'pod-1');
    expect(urls).not.toHaveBeenCalled();
  });

  it('falls back to the app home without its trailing slash, and logs why, when the link cannot be minted', async () => {
    share.mockRejectedValue(new Error('short link store down'));
    urls.mockResolvedValue({ mwebUrl: 'https://app.duncit.test/' } as Awaited<ReturnType<typeof getUrlConfigs>>);
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);

    await expect(podLink('pod-2')).resolves.toBe('https://app.duncit.test');
    expect(warn).toHaveBeenCalledWith('venue-subscriber', 'podLink', expect.objectContaining({ podId: 'pod-2' }));
    warn.mockRestore();
  });
});
