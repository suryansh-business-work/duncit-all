import { renderHook, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import * as Font from 'expo-font';

import { extractFontUrl, useBrandFont } from '@/hooks/useBrandFont';

const mockUseBranding = jest.fn();
jest.mock('@/hooks/useBranding', () => ({ useBranding: () => mockUseBranding() }));
jest.mock('expo-font', () => ({ loadAsync: jest.fn() }));
const mockLoadAsync = Font.loadAsync as jest.Mock;

const CSS_WITH_TTF =
  "@font-face { font-family: 'Poppins'; src: url(https://fonts.gstatic.com/s/poppins/v20/p.ttf) format('truetype'); }";

const branding = (family: string | null) =>
  mockUseBranding.mockReturnValue({ data: { branding: { mobile_font_family: family } } });

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest
    .fn()
    .mockResolvedValue({ text: () => Promise.resolve(CSS_WITH_TTF) }) as never;
});

describe('extractFontUrl', () => {
  it('pulls the first ttf/otf url and returns null when none exists', () => {
    expect(extractFontUrl(CSS_WITH_TTF)).toBe('https://fonts.gstatic.com/s/poppins/v20/p.ttf');
    expect(extractFontUrl('body { color: red; }')).toBeNull();
  });
});

describe('useBrandFont', () => {
  it('returns undefined when no font is configured (or branding has not loaded)', () => {
    branding('');
    const { result } = renderHook(() => useBrandFont());
    expect(result.current).toBeUndefined();
    expect(mockLoadAsync).not.toHaveBeenCalled();

    mockUseBranding.mockReturnValue({ data: undefined });
    const { result: noData } = renderHook(() => useBrandFont());
    expect(noData.current).toBeUndefined();
  });

  it('downloads and registers the configured font on native', async () => {
    branding('Poppins');
    mockLoadAsync.mockResolvedValue(undefined);
    const { result } = renderHook(() => useBrandFont());
    await waitFor(() => expect(result.current).toBe('Poppins'));
    expect(mockLoadAsync).toHaveBeenCalledWith({
      Poppins: 'https://fonts.gstatic.com/s/poppins/v20/p.ttf',
    });
  });

  it('keeps the default when the stylesheet has no font file', async () => {
    branding('Poppins');
    (global.fetch as jest.Mock).mockResolvedValue({ text: () => Promise.resolve('no fonts here') });
    const { result } = renderHook(() => useBrandFont());
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
    expect(mockLoadAsync).not.toHaveBeenCalled();
  });

  it('tolerates a failed download (default typeface stays)', async () => {
    branding('Poppins');
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useBrandFont());
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });

  it('ignores a late load after unmount', async () => {
    branding('Poppins');
    let resolveLoad: () => void = () => undefined;
    mockLoadAsync.mockReturnValue(
      new Promise<void>((r) => {
        resolveLoad = () => r();
      }),
    );
    const { unmount } = renderHook(() => useBrandFont());
    await waitFor(() => expect(mockLoadAsync).toHaveBeenCalled());
    unmount();
    resolveLoad();
  });

  it('injects the stylesheet on web and cleans it up', async () => {
    const originalOS = Platform.OS;
    (Platform as { OS: string }).OS = 'web';
    // The RN jest env has no DOM — fake the small document surface the hook uses.
    const fakeLink = { rel: '', href: '', remove: jest.fn() };
    (globalThis as { document?: unknown }).document = {
      createElement: jest.fn(() => fakeLink),
      head: { appendChild: jest.fn() },
    };
    try {
      branding('Poppins');
      const { result, unmount } = renderHook(() => useBrandFont());
      await waitFor(() => expect(result.current).toBe('Poppins'));
      expect(fakeLink.href).toContain('family=Poppins');
      unmount();
      expect(fakeLink.remove).toHaveBeenCalled();
    } finally {
      (Platform as { OS: string }).OS = originalOS;
      delete (globalThis as { document?: unknown }).document;
    }
  });
});
