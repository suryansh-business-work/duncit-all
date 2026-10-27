/**
 * The small pure helpers behind the WhatsApp funnel: the template's link
 * button and what fills it, the entity a state change is filed under, a
 * document's file name, a registry scenario's arity, a draft's placeholder
 * count and a venue's picture.
 */
import { buttonsFor, cachedLinkButton, linkButtonFields, linkButtonOf } from '../../whatsapp.button';
import { transitionEntityId } from '../../whatsapp.entity';
import { waEventArity, WA_EVENTS } from '../../whatsapp.events';
import { mediaFilename } from '../../whatsapp.media';
import { draftParamCount } from '../../whatsapp.drafts';
import { venueImageAssets } from '../../whatsapp.assets';

const url = (over: Record<string, unknown> = {}) => ({ type: 'URL', text: 'Open', url: 'https://mweb.duncit.com/{{1}}', url_param: 1, ...over }) as never;

describe('linkButtonOf', () => {
  it('finds the first URL button whose link carries a placeholder, by its position among all buttons', () => {
    const buttons = [
      { type: 'PHONE_NUMBER', text: 'Call', url: '', url_param: 0 },
      url({ url: 'https://static.example.com', url_param: 0 }),
      url(),
    ] as never;
    expect(linkButtonOf(buttons)).toEqual({ index: 2, url: 'https://mweb.duncit.com/{{1}}' });
  });

  it('is null for no buttons, a missing list or none with a placeholder', () => {
    expect(linkButtonOf([])).toBeNull();
    expect(linkButtonOf(undefined)).toBeNull();
    expect(linkButtonOf(null)).toBeNull();
    expect(linkButtonOf([url({ url_param: 0 })])).toBeNull();
    expect(linkButtonOf([{ type: 'PHONE_NUMBER', text: 'c', url: '{{1}}', url_param: 1 }] as never)).toBeNull();
  });
});

describe('linkButtonFields / cachedLinkButton', () => {
  it('caches the pair, or blank markers when the template has none', () => {
    expect(linkButtonFields([url()])).toEqual({ template_link_url: 'https://mweb.duncit.com/{{1}}', template_link_index: 0 });
    expect(linkButtonFields(null)).toEqual({ template_link_url: '', template_link_index: -1 });
  });

  it('reads the pair back only when both halves are usable', () => {
    expect(cachedLinkButton('https://x/{{1}}', 2)).toEqual({ index: 2, url: 'https://x/{{1}}' });
    expect(cachedLinkButton('https://x/{{1}}', 0)).toEqual({ index: 0, url: 'https://x/{{1}}' });
    expect(cachedLinkButton('', 1)).toBeNull();
    expect(cachedLinkButton(null, 1)).toBeNull();
    expect(cachedLinkButton('https://x/{{1}}', -1)).toBeNull();
    expect(cachedLinkButton('https://x/{{1}}', null)).toBeNull();
    expect(cachedLinkButton('https://x/{{1}}')).toBeNull();
  });
});

describe('buttonsFor', () => {
  const button = { index: 1, url: 'https://mweb.duncit.com/p/{{1}}/join' };

  it('fills the button with the part of the link the template leaves open', () => {
    expect(buttonsFor('https://mweb.duncit.com/p/jazz-night/join', button)).toEqual([{ index: 1, value: 'jazz-night' }]);
    expect(buttonsFor('  https://mweb.duncit.com/p/a/join  ', button)).toEqual([{ index: 1, value: 'a' }]);
  });

  it.each([
    ['no link', undefined, button],
    ['a blank link', '   ', button],
    ['no button', 'https://mweb.duncit.com/p/a/join', null],
    ['a template link with no placeholder', 'https://mweb.duncit.com/p/a/join', { index: 0, url: 'https://mweb.duncit.com' }],
    ['a placeholder that is never closed', 'https://mweb.duncit.com/p/a', { index: 0, url: 'https://mweb.duncit.com/{{1' }],
    ['a link that does not start with the fixed head', 'https://other.example/p/a/join', button],
    ['a link that does not end with the fixed tail', 'https://mweb.duncit.com/p/a/leave', button],
    ['a link with nothing in the open part', 'https://mweb.duncit.com/p//join', button],
  ])('fills nothing for %s', (_label, link, given) => {
    expect(buttonsFor(link as string | undefined, given)).toEqual([]);
  });
});

describe('transitionEntityId', () => {
  it('joins the record and the moment it changed', () => {
    expect(transitionEntityId('u1', new Date('2026-03-01T10:00:00.000Z'))).toBe('u1:1772359200000');
  });

  it('uses the current time when no moment is given', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-01T10:00:00.000Z'));
    try {
      expect(transitionEntityId('u1')).toBe('u1:1772359200000');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('waEventArity', () => {
  it('counts the placeholders of a registry scenario and answers zero for an unknown key', () => {
    const event = WA_EVENTS[0];
    expect(waEventArity(event.key)).toBe(event.params.length);
    expect(waEventArity('NOT_A_SCENARIO')).toBe(0);
  });
});

describe('mediaFilename', () => {
  it('prefers the name it was given, trimmed', () => {
    expect(mediaFilename('https://x/a.pdf', '  Invoice.pdf ')).toBe('Invoice.pdf');
  });

  it('takes the name from the url path, ignoring a query or fragment', () => {
    expect(mediaFilename('https://x/files/ticket.pdf?sig=1#top')).toBe('ticket.pdf');
    expect(mediaFilename('https://x/files/ticket.pdf', '   ')).toBe('ticket.pdf');
    expect(mediaFilename('https://x/files/ticket.pdf', null)).toBe('ticket.pdf');
  });

  it('is never blank: a path that ends in nothing is called attachment', () => {
    expect(mediaFilename('https://x/files/')).toBe('attachment');
    expect(mediaFilename('https://x/files/  ?a=1')).toBe('attachment');
  });
});

describe('draftParamCount', () => {
  it('is the highest placeholder number in the body', () => {
    expect(draftParamCount('Hi {{1}}, {{3}} and {{2}}')).toBe(3);
  });

  it('is zero for a body with no placeholders', () => {
    expect(draftParamCount('No variables here')).toBe(0);
  });
});

describe('venueImageAssets', () => {
  it('prefers a given picture, then the cover, then the first gallery picture', () => {
    const venue = { cover_image_url: ' https://c/cover.jpg ', gallery: ['https://c/g1.jpg'] };
    expect(venueImageAssets(venue, 'https://c/dish.jpg').IMAGE?.url).toBe('https://c/dish.jpg');
    expect(venueImageAssets(venue, null, '  ').IMAGE?.url).toBe('https://c/cover.jpg');
    expect(venueImageAssets({ cover_image_url: '', gallery: ['', 'https://c/g1.jpg'] }).IMAGE?.url).toBe('https://c/g1.jpg');
  });

  it('offers nothing when the venue has no picture at all, or is missing', () => {
    expect(venueImageAssets({ cover_image_url: null, gallery: null }).IMAGE).toBeNull();
    expect(venueImageAssets({}).IMAGE).toBeNull();
    expect(venueImageAssets(null).IMAGE).toBeNull();
    expect(venueImageAssets(undefined).IMAGE).toBeNull();
  });
});
