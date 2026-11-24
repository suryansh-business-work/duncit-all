import sharp from 'sharp';
import { googleWalletLogo, walletPassImages } from '../../wallet-images';

const size = async (png: Buffer) => {
  const meta = await sharp(png).metadata();
  return [meta.format, meta.width, meta.height];
};

describe('walletPassImages', () => {
  it('renders Apple\'s icon and logo files at 1x, 2x and 3x from the brand art', async () => {
    const images = await walletPassImages();

    expect(Object.keys(images).sort()).toEqual([
      'icon.png',
      'icon@2x.png',
      'icon@3x.png',
      'logo.png',
      'logo@2x.png',
      'logo@3x.png',
    ]);
    expect(await size(images['icon.png'])).toEqual(['png', 29, 29]);
    expect(await size(images['icon@3x.png'])).toEqual(['png', 87, 87]);
    expect(await size(images['logo.png'])).toEqual(['png', 160, 50]);
    expect(await size(images['logo@2x.png'])).toEqual(['png', 320, 100]);
  });

  it('renders once and reuses the result', () => {
    expect(walletPassImages()).toBe(walletPassImages());
  });
});

describe('googleWalletLogo', () => {
  it('is a 660px square PNG, reused across calls', async () => {
    expect(await size(await googleWalletLogo())).toEqual(['png', 660, 660]);
    expect(googleWalletLogo()).toBe(googleWalletLogo());
  });
});

describe('a failed render', () => {
  it('is retried on the next call instead of being cached', async () => {
    const real = jest.requireActual<typeof import('sharp')>('sharp');
    let broken = true;
    await jest.isolateModulesAsync(async () => {
      jest.doMock('sharp', () => {
        const flaky = (...args: Parameters<typeof real>) => {
          if (broken) throw new Error('sharp unavailable');
          return real(...args);
        };
        return { __esModule: true, default: flaky };
      });
      const fresh = await import('../../wallet-images');
      await expect(fresh.googleWalletLogo()).rejects.toThrow('sharp unavailable');
      await expect(fresh.walletPassImages()).rejects.toThrow('sharp unavailable');
      broken = false;
      await expect(fresh.googleWalletLogo()).resolves.toBeInstanceOf(Buffer);
      await expect(fresh.walletPassImages()).resolves.toHaveProperty('icon.png');
    });
  });
});
