import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import FontRow from '../../src/pages/cms/design-tab/fonts/FontRow';
import type { DesignFormValues, FontValues } from '../../src/pages/cms/design-tab/design-form/design.types';
import { renderWithProviders } from '../testkit';
import { en } from '../en';

/** A FontFace stand-in: jsdom has no font loading. A url containing "broken" fails to load. */
const faces: { family: string; source: string; descriptors: FontFaceDescriptors }[] = [];
class FakeFontFace {
  private readonly source: string;

  constructor(family: string, source: string, descriptors: FontFaceDescriptors) {
    this.source = source;
    faces.push({ family, source, descriptors });
  }

  load(): Promise<FakeFontFace> {
    return this.source.includes('broken') ? Promise.reject(new Error('404')) : Promise.resolve(this);
  }
}

const addFont = vi.fn();

function Harness({ fonts, index, onRemove = vi.fn() }: Readonly<{ fonts: FontValues[]; index: number; onRemove?: () => void }>) {
  const { control } = useForm<DesignFormValues>({ defaultValues: { tokens: [], fonts, font_urls: [], base_css: '' } });
  return <FontRow control={control} index={index} onRemove={onRemove} />;
}

const font = (over: Partial<FontValues>): FontValues => ({
  family: 'Inter',
  source: 'GOOGLE',
  weights: [400],
  italic: false,
  role: 'BODY',
  variable: '',
  fallback: 'sans-serif',
  files: [],
  ...over,
});

const stylesheets = () => [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((link) => link.href);

beforeEach(() => {
  faces.length = 0;
  addFont.mockReset();
  vi.stubGlobal('FontFace', FakeFontFace);
  Object.defineProperty(document, 'fonts', { configurable: true, value: { add: addFont } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'fonts');
  vi.restoreAllMocks();
});

describe('FontRow — a Google family', () => {
  it('names the family, its source and weights, and loads only its preview glyphs', () => {
    renderWithProviders(<Harness fonts={[font({ family: 'Rowtest Serif', weights: [400, 700], italic: true })]} index={0} />);
    expect(screen.getByRole('heading', { name: 'Rowtest Serif' })).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.cms.fonts.google'))).toBeInTheDocument();
    expect(screen.getByText(`${en('websiteApp.cms.fonts.weights')}: 400, 700 · ${en('websiteApp.cms.fonts.italic')}`)).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.cms.fonts.preview'))).toBeInTheDocument();
    const links = stylesheets().filter((href) => href.includes('family=Rowtest%20Serif'));
    expect(links).toHaveLength(1);
    expect(links[0]).toContain('&text=');
    expect(faces).toHaveLength(0);
  });

  it('leaves out italics when the family has none, and removes itself on request', () => {
    const onRemove = vi.fn();
    renderWithProviders(<Harness fonts={[font({ family: 'Plain Sans', weights: [300] })]} index={0} onRemove={onRemove} />);
    expect(screen.getByText(`${en('websiteApp.cms.fonts.weights')}: 300`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `${en('websiteApp.cms.fonts.remove')}: Plain Sans` }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe('FontRow — an uploaded family', () => {
  it('registers each uploaded file once, skips a row not uploaded yet, and loads no Google stylesheet', async () => {
    const fonts = [
      font({
        family: 'Upload Sans',
        source: 'CUSTOM',
        weights: [400, 700],
        files: [
          { weight: 400, style: 'normal', url: 'https://ik.test/up-r.woff2' },
          { weight: 700, style: 'italic', url: 'https://ik.test/up-bi.woff2' },
          { weight: 900, style: 'normal', url: '' },
        ],
      }),
    ];
    const view = renderWithProviders(<Harness fonts={fonts} index={0} />);
    expect(screen.getByText(en('websiteApp.cms.fonts.custom'))).toBeInTheDocument();
    expect(faces).toEqual([
      { family: 'Upload Sans', source: 'url("https://ik.test/up-r.woff2")', descriptors: { weight: '400', style: 'normal' } },
      { family: 'Upload Sans', source: 'url("https://ik.test/up-bi.woff2")', descriptors: { weight: '700', style: 'italic' } },
    ]);
    await waitFor(() => expect(addFont).toHaveBeenCalledTimes(2));
    expect(stylesheets().some((href) => href.includes('Upload'))).toBe(false);

    // The same files shown again (another row, a remount) are not registered twice.
    view.unmount();
    renderWithProviders(<Harness fonts={fonts} index={0} />);
    expect(faces).toHaveLength(2);
  });

  it('warns the developer, without failing the row, when a file cannot be loaded', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fonts = [font({ family: 'Broken Face', source: 'CUSTOM', files: [{ weight: 400, style: 'normal', url: 'https://ik.test/broken.woff2' }] })];
    renderWithProviders(<Harness fonts={fonts} index={0} />);
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith('[cms-fonts] preview could not load', expect.objectContaining({ family: 'Broken Face', url: 'https://ik.test/broken.woff2' })),
    );
    expect(addFont).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Broken Face' })).toBeInTheDocument();
  });

  it('registers nothing for an uploaded family that has no name yet', () => {
    const fonts = [font({ family: '', source: 'CUSTOM', files: [{ weight: 400, style: 'normal', url: 'https://ik.test/nameless.woff2' }] })];
    renderWithProviders(<Harness fonts={fonts} index={0} />);
    expect(faces).toHaveLength(0);
  });
});

describe('FontRow — a row whose font is gone', () => {
  it('renders blank and loads nothing while the list catches up with a removal', () => {
    const before = stylesheets().length;
    renderWithProviders(<Harness fonts={[]} index={0} />);
    expect(screen.getByRole('heading')).toHaveTextContent('');
    expect(screen.getByText(`${en('websiteApp.cms.fonts.weights')}:`)).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.cms.fonts.custom'))).toBeInTheDocument();
    expect(stylesheets()).toHaveLength(before);
    expect(faces).toHaveLength(0);
  });
});
