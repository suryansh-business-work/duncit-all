/**
 * The poster end to end: whatever the venue is called and whatever happens to
 * its photo, the owner gets one printable A4 sheet back.
 */
import { renderPublicPagePoster, type PosterData } from '../../publicPage.poster';

const pageCount = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

const base: PosterData = {
  title: 'Dek Cafe',
  subtitle: 'Indiranagar, Bengaluru',
  image_url: null,
  url: 'https://duncit.com/s/dK3fQ9',
  copy: { headline: 'Scan to see the pods happening here', footer: 'Find your people on Duncit' },
};

describe('renderPublicPagePoster', () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('renders a single-page PDF without fetching anything when there is no photo', async () => {
    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const pdf = await renderPublicPagePoster(base);

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(pdf)).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('stays on one page when every field is far longer than the layout expects', async () => {
    const pdf = await renderPublicPagePoster({
      ...base,
      title: 'The Extraordinarily Long Named Rooftop Brewery and Community Social House '.repeat(4),
      subtitle: 'Fourth Floor, Above the Old Bookshop, 80 Feet Road, Koramangala '.repeat(6),
      url: `https://duncit.com/s/${'a-very-long-code-'.repeat(12)}`,
      copy: { headline: 'Scan this code with your phone '.repeat(4), footer: 'Find your people '.repeat(8) },
    });

    expect(pageCount(pdf)).toBe(1);
  });

  it('still renders when the name and the subtitle are missing', async () => {
    const pdf = await renderPublicPagePoster({ ...base, title: '', subtitle: null });

    expect(pageCount(pdf)).toBe(1);
  });

  it('falls back to the designed hero when the photo cannot be decoded', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
    }) as unknown as typeof fetch;

    const broken = await renderPublicPagePoster({ ...base, image_url: 'https://cdn.example/x.jpg' });
    const none = await renderPublicPagePoster(base);

    expect(pageCount(broken)).toBe(1);
    // No image stream was embedded: the sheet weighs what the photo-less one does.
    expect(Math.abs(broken.length - none.length)).toBeLessThan(512);
  });

  it('asks ImageKit for a JPEG the PDF engine can decode', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: false });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await renderPublicPagePoster({ ...base, image_url: 'https://ik.imagekit.io/duncit/cover.webp' });

    expect(fetchSpy).toHaveBeenCalledWith('https://ik.imagekit.io/duncit/cover.webp?tr=f-jpg');
  });
});
