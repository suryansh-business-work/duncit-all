import { firstImageUrl } from '@utils/media';
import { assetFor, defaultFor, type WaDefaults } from '../../whatsapp.media';
import { podImageAssets } from '../../whatsapp.assets';

const POD_IMAGE = 'https://ik.imagekit.io/duncit/pods/jazz-night.jpg';
const POD_VIDEO = 'https://ik.imagekit.io/duncit/pods/jazz-night.mp4';

const DEFAULTS: WaDefaults = {
  IMAGE: { url: 'https://cdn.duncit.com/wa/default.jpg', filename: 'default.jpg' },
  DOCUMENT: { url: 'https://cdn.duncit.com/wa/default.html', filename: 'default.html' },
};

describe('firstImageUrl', () => {
  it('takes the first IMAGE and never a video, whatever the order', () => {
    expect(
      firstImageUrl([
        { url: POD_VIDEO, type: 'VIDEO' },
        { url: POD_IMAGE, type: 'IMAGE' },
      ])
    ).toBe(POD_IMAGE);
  });

  it('answers empty for a list with no picture in it', () => {
    expect(firstImageUrl([{ url: POD_VIDEO, type: 'VIDEO' }])).toBe('');
    expect(firstImageUrl([{ url: '', type: 'IMAGE' }])).toBe('');
    expect(firstImageUrl([])).toBe('');
    expect(firstImageUrl()).toBe('');
    expect(firstImageUrl(null)).toBe('');
  });
});

describe('podImageAssets', () => {
  it('offers the pod picture as the IMAGE asset, named after the file', () => {
    expect(podImageAssets([{ url: POD_IMAGE, type: 'IMAGE' }])).toEqual({
      IMAGE: { url: POD_IMAGE, filename: 'jazz-night.jpg' },
    });
  });

  it('offers nothing for a pod with no picture — the send falls back as before', () => {
    expect(podImageAssets([]).IMAGE).toBeNull();
  });
});

describe('assetFor', () => {
  const assets = podImageAssets([{ url: POD_IMAGE, type: 'IMAGE' }]);

  it('gives an IMAGE header this send\u2019s own picture, not the platform default', () => {
    expect(assetFor('IMAGE', assets)?.url).toBe(POD_IMAGE);
    expect(defaultFor('IMAGE', DEFAULTS)?.url).toBe(DEFAULTS.IMAGE?.url);
  });

  it('gives a FILE/DOCUMENT header nothing when the send only brought a picture', () => {
    expect(assetFor('FILE', assets)).toBeNull();
    expect(assetFor('DOCUMENT', assets)).toBeNull();
  });

  it('matches AiSensy FILE and Meta DOCUMENT to the same asset', () => {
    const ticket = { DOCUMENT: { url: 'https://server.duncit.com/tickets/t/ticket.pdf', filename: 't.pdf' } };
    expect(assetFor('FILE', ticket)?.filename).toBe('t.pdf');
    expect(assetFor('DOCUMENT', ticket)?.filename).toBe('t.pdf');
  });

  it('attaches nothing to a header kind that takes no asset, or to no assets at all', () => {
    expect(assetFor('TEXT', assets)).toBeNull();
    expect(assetFor('VIDEO', assets)).toBeNull();
    expect(assetFor('', assets)).toBeNull();
    expect(assetFor('IMAGE', null)).toBeNull();
    expect(assetFor('IMAGE', undefined)).toBeNull();
  });
});
