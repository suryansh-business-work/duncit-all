import { cacheGet, cacheSet } from '@config/redis';
import { importRemoteMedia } from '@modules/platform/upload/upload.service';
import { assertKindFits, cachedSearch, configError, importLibraryFile, providerOf } from '../../reel.library';

jest.mock('@config/redis', () => ({ cacheGet: jest.fn(), cacheSet: jest.fn() }));
jest.mock('@modules/platform/upload/upload.service', () => ({ importRemoteMedia: jest.fn() }));

const get = cacheGet as jest.Mock;
const set = cacheSet as jest.Mock;

describe('cachedSearch', () => {
  it('loads and keeps an answer for a day the first time it is asked', async () => {
    get.mockResolvedValue(null);
    const load = jest.fn().mockResolvedValue({ hits: [1] });
    await expect(cachedSearch('reel:x', load)).resolves.toEqual({ hits: [1] });
    expect(set).toHaveBeenCalledWith('reel:x', { hits: [1] }, 86_400);
  });

  it('answers from the cache without loading again', async () => {
    get.mockResolvedValue({ hits: [2] });
    const load = jest.fn();
    await expect(cachedSearch('reel:x', load)).resolves.toEqual({ hits: [2] });
    expect(load).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it('keeps nothing when the load fails', async () => {
    get.mockResolvedValue(null);
    await expect(cachedSearch('reel:x', () => Promise.reject(new Error('down')))).rejects.toThrow('down');
    expect(set).not.toHaveBeenCalled();
  });
});

describe('importLibraryFile', () => {
  it('copies the file into the reel stock folder under a safe name and returns its new address', async () => {
    (importRemoteMedia as jest.Mock).mockResolvedValue({ url: 'https://ik.imagekit.io/duncit/reels/stock/a.mp3' });
    await expect(importLibraryFile('https://prod-1.storage.jamendo.com/9', 'JAMENDO', '9/../x')).resolves.toBe('https://ik.imagekit.io/duncit/reels/stock/a.mp3');
    expect(importRemoteMedia).toHaveBeenCalledWith({
      remoteUrl: 'https://prod-1.storage.jamendo.com/9',
      folder: '/reels/stock',
      fileName: 'jamendo-9____x',
      tags: ['reel', 'jamendo'],
      surface: 'PORTALS',
    });
  });
});

describe('providers', () => {
  it('reads a missing provider as Pexels, the only library older clients knew', () => {
    expect(providerOf(undefined)).toBe('PEXELS');
    expect(providerOf(null)).toBe('PEXELS');
    expect(providerOf('JAMENDO')).toBe('JAMENDO');
  });

  it('keeps music to Jamendo and pictures to the footage libraries', () => {
    expect(assertKindFits('JAMENDO', 'AUDIO')).toBeNull();
    expect(assertKindFits('PIXABAY', 'VIDEO')).toBeNull();
    expect(assertKindFits('JAMENDO', 'IMAGE')).toContain('music only');
    expect(assertKindFits('PEXELS', 'AUDIO')).toContain('Jamendo');
  });

  it('names the Tech portal category a missing key belongs to', () => {
    expect(configError('Pixabay', 'PIXABAY')).toMatchObject({ message: expect.stringContaining('(PIXABAY)'), extensions: { code: 'CONFIG_ERROR', env_category: 'PIXABAY' } });
  });
});
