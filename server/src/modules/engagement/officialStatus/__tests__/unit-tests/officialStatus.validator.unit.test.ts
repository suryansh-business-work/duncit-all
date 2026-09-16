import {
  officialStatusInputSchema,
  CAPTION_MAX,
  TITLE_MAX,
  TITLE_MIN,
  URL_MAX,
} from '../../officialStatus.validator';

const validInput = (over: Record<string, unknown> = {}) => ({
  title: 'Diwali Mega Sale',
  media_url: 'https://ik.imagekit.io/duncit/status1.jpg',
  scope: 'GLOBAL',
  expiry: 'NEVER',
  ...over,
});

describe('officialStatusInputSchema', () => {
  it('accepts a minimal GLOBAL/NEVER status and fills in the defaults', async () => {
    const parsed = await officialStatusInputSchema.validate(validInput());
    expect(parsed).toMatchObject({
      title: 'Diwali Mega Sale',
      media_type: 'IMAGE',
      caption: '',
      link_url: '',
      scope: 'GLOBAL',
      location_ids: [],
      expiry: 'NEVER',
      custom_expires_at: null,
      is_active: true,
    });
  });

  it('trims the title', async () => {
    const parsed = await officialStatusInputSchema.validate(validInput({ title: '  Diwali Sale  ' }));
    expect(parsed.title).toBe('Diwali Sale');
  });

  it('requires a title', async () => {
    await expect(
      officialStatusInputSchema.validate(validInput({ title: undefined }))
    ).rejects.toThrow(/title is required/i);
  });

  it(`rejects a title shorter than ${TITLE_MIN} characters`, async () => {
    await expect(officialStatusInputSchema.validate(validInput({ title: 'A' }))).rejects.toThrow(
      /longer title/i
    );
  });

  it(`rejects a title longer than ${TITLE_MAX} characters`, async () => {
    await expect(
      officialStatusInputSchema.validate(validInput({ title: 'A'.repeat(TITLE_MAX + 1) }))
    ).rejects.toThrow(new RegExp(`under ${TITLE_MAX} characters`, 'i'));
  });

  it('requires a media url', async () => {
    await expect(
      officialStatusInputSchema.validate(validInput({ media_url: '' }))
    ).rejects.toThrow(/pick an image or a video/i);
  });

  it(`rejects a media url longer than ${URL_MAX} characters`, async () => {
    await expect(
      officialStatusInputSchema.validate(
        validInput({ media_url: `https://x/${'a'.repeat(URL_MAX)}` })
      )
    ).rejects.toThrow(new RegExp(`at most ${URL_MAX}`, 'i'));
  });

  it(`rejects a caption longer than ${CAPTION_MAX} characters`, async () => {
    await expect(
      officialStatusInputSchema.validate(validInput({ caption: 'A'.repeat(CAPTION_MAX + 1) }))
    ).rejects.toThrow(new RegExp(`under ${CAPTION_MAX} characters`, 'i'));
  });

  describe('link_url', () => {
    it('accepts an empty link', async () => {
      const parsed = await officialStatusInputSchema.validate(validInput({ link_url: '' }));
      expect(parsed.link_url).toBe('');
    });

    it('accepts an in-app path', async () => {
      const parsed = await officialStatusInputSchema.validate(validInput({ link_url: '/pod-ideas' }));
      expect(parsed.link_url).toBe('/pod-ideas');
    });

    it('accepts a full https address', async () => {
      const parsed = await officialStatusInputSchema.validate(
        validInput({ link_url: 'https://duncit.com/promo' })
      );
      expect(parsed.link_url).toBe('https://duncit.com/promo');
    });

    it('rejects a plain http address', async () => {
      await expect(
        officialStatusInputSchema.validate(validInput({ link_url: 'http://duncit.com/promo' }))
      ).rejects.toThrow(/in-app path/i);
    });
  });

  describe('scope', () => {
    it('requires a scope', async () => {
      await expect(
        officialStatusInputSchema.validate(validInput({ scope: undefined }))
      ).rejects.toThrow(/choose who sees this status/i);
    });

    it('rejects a scope outside GLOBAL/LOCATION', async () => {
      await expect(
        officialStatusInputSchema.validate(validInput({ scope: 'CITY' }))
      ).rejects.toThrow(/must be one of/i);
    });
  });

  describe('location_ids', () => {
    it('is not required for a GLOBAL status', async () => {
      const parsed = await officialStatusInputSchema.validate(validInput({ scope: 'GLOBAL' }));
      expect(parsed.location_ids).toEqual([]);
    });

    it('is required for a LOCATION status', async () => {
      await expect(
        officialStatusInputSchema.validate(
          validInput({ scope: 'LOCATION', location_ids: [] })
        )
      ).rejects.toThrow(/pick at least one city/i);
    });

    it('is satisfied at the schema level once a city is picked', async () => {
      const parsed = await officialStatusInputSchema.validate(
        validInput({ scope: 'LOCATION', location_ids: ['64abc00000000000000000aa'] })
      );
      expect(parsed.location_ids).toEqual(['64abc00000000000000000aa']);
    });
  });

  describe('expiry', () => {
    it('requires an expiry', async () => {
      await expect(
        officialStatusInputSchema.validate(validInput({ expiry: undefined }))
      ).rejects.toThrow(/choose when this status expires/i);
    });

    it('rejects an expiry outside the known choices', async () => {
      await expect(
        officialStatusInputSchema.validate(validInput({ expiry: 'WHENEVER' }))
      ).rejects.toThrow(/must be one of/i);
    });

    it('does not require a custom date for HOURS_24', async () => {
      const parsed = await officialStatusInputSchema.validate(validInput({ expiry: 'HOURS_24' }));
      expect(parsed.custom_expires_at).toBeNull();
    });

    it('requires a custom date when expiry is CUSTOM', async () => {
      await expect(
        officialStatusInputSchema.validate(
          validInput({ expiry: 'CUSTOM', custom_expires_at: null })
        )
      ).rejects.toThrow(/pick the date and time it expires/i);
    });

    it('accepts a custom date when expiry is CUSTOM', async () => {
      const parsed = await officialStatusInputSchema.validate(
        validInput({ expiry: 'CUSTOM', custom_expires_at: '2027-01-01T00:00:00.000Z' })
      );
      expect(parsed.custom_expires_at).toBe('2027-01-01T00:00:00.000Z');
    });
  });

  describe('is_active', () => {
    it('defaults to true', async () => {
      const parsed = await officialStatusInputSchema.validate(validInput());
      expect(parsed.is_active).toBe(true);
    });

    it('accepts an explicit false', async () => {
      const parsed = await officialStatusInputSchema.validate(validInput({ is_active: false }));
      expect(parsed.is_active).toBe(false);
    });
  });
});
