/**
 * The pieces a per-table sticker is made of: the caption under its QR, the
 * menu address the QR opens, and the PDF — one page per table.
 */
import { FOOD_TABLE_PARAM, tableCaption, tableMenuUrl } from '../../publicPage.service';
import { renderVenueTableLabel, renderVenueTableStickers } from '../../publicPage.tableLabel';

const pageCount = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

describe('tableCaption', () => {
  it('puts the heading before a table that starts with a digit, and prints a named table as the owner wrote it', () => {
    expect(tableCaption('Table', '5')).toBe('Table 5');
    expect(tableCaption('Mesa', '12B')).toBe('Mesa 12B');
    expect(tableCaption('Table', 'Patio')).toBe('Patio');
    expect(tableCaption('Table', 'Patio 2')).toBe('Patio 2');
  });

  it('prints a bare number when there is no heading', () => {
    expect(tableCaption('', '5')).toBe('5');
  });
});

describe('tableMenuUrl', () => {
  const menu = 'https://app.duncit.test/venue/v1?selectedtab=menu';

  it("adds the table and the share link's code, keeping the menu's own query", () => {
    const url = new URL(tableMenuUrl(menu, 'Patio 2', 'abc123'));
    expect(url.origin + url.pathname).toBe('https://app.duncit.test/venue/v1');
    expect(url.searchParams.get('selectedtab')).toBe('menu');
    expect(url.searchParams.get(FOOD_TABLE_PARAM)).toBe('Patio 2');
    expect(url.searchParams.get('dl')).toBe('abc123');
  });

  it('encodes a table name safely and leaves the code out when the link has none', () => {
    const url = tableMenuUrl(menu, 'A&B=1', null);
    expect(new URL(url).searchParams.get(FOOD_TABLE_PARAM)).toBe('A&B=1');
    expect(new URL(url).searchParams.has('dl')).toBe(false);
  });

  it('replaces a table already on the address rather than adding a second', () => {
    const url = new URL(tableMenuUrl(`${menu}&table=old`, '9', null));
    expect(url.searchParams.getAll(FOOD_TABLE_PARAM)).toEqual(['9']);
  });

  it('throws on a menu address that is not absolute', () => {
    expect(() => tableMenuUrl('/venue/v1', '1', null)).toThrow();
  });
});

describe('renderVenueTableStickers', () => {
  it('draws one page per table', async () => {
    const pdf = await renderVenueTableStickers({
      url: 'https://duncit.test/s/menu1',
      headline: 'Scan to order',
      stickers: ['Table 1', 'Table 2', 'Patio'].map((caption, index) => ({
        caption,
        qrUrl: `https://app.duncit.test/venue/v1?table=${index + 1}`,
      })),
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(pdf)).toBe(3);
  });

  it('still makes the single table label on one page', async () => {
    const pdf = await renderVenueTableLabel({ title: 'Cafe Uno', url: 'https://duncit.test/s/menu1', headline: 'Scan to order' });
    expect(pageCount(pdf)).toBe(1);
  });
});
