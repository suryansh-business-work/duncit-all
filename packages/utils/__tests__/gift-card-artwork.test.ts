import { describe, expect, it } from 'vitest';
import { canFlipGiftCard, giftCardArtwork } from '../src/gift-card-artwork';

describe('giftCardArtwork', () => {
  it('normalises the two snapshot URLs, trimming what the admin pasted', () => {
    expect(giftCardArtwork('  https://ik.imagekit.io/duncit/gift-front.png  ', 'https://ik.imagekit.io/duncit/gift-back.png')).toEqual({
      front: 'https://ik.imagekit.io/duncit/gift-front.png',
      back: 'https://ik.imagekit.io/duncit/gift-back.png',
    });
  });

  it('reads a missing face as an empty string rather than null, on either side', () => {
    expect(giftCardArtwork(null, undefined)).toEqual({ front: '', back: '' });
    expect(giftCardArtwork()).toEqual({ front: '', back: '' });
    expect(giftCardArtwork('   ', '   ')).toEqual({ front: '', back: '' });
  });
});

describe('canFlipGiftCard', () => {
  it('offers the flip once either face carries artwork', () => {
    expect(canFlipGiftCard({ front: 'https://ik.imagekit.io/duncit/gift-front.png', back: '' })).toBe(true);
    expect(canFlipGiftCard({ front: '', back: 'https://ik.imagekit.io/duncit/gift-back.png' })).toBe(true);
  });

  it('keeps a gradient-only card flat — flipping it would show the same card again', () => {
    expect(canFlipGiftCard({ front: '', back: '' })).toBe(false);
    expect(canFlipGiftCard(giftCardArtwork(null, null))).toBe(false);
  });
});
