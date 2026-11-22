import { describe, expect, it } from 'vitest';
import { makeRentalProofSchema } from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const schema = makeRentalProofSchema(t);

const issues = (values: unknown) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}:${i.message}`);
};

const photos = (n: number) => Array.from({ length: n }, (_, i) => `https://ik.imagekit.io/duncit/p${i}.jpg`);

describe('makeRentalProofSchema', () => {
  it('takes a note alone, photos alone, or both', () => {
    expect(issues({ note: 'Strings snapped on return', image_urls: [] })).toEqual([]);
    expect(issues({ note: '', image_urls: photos(1) })).toEqual([]);
    expect(issues({ note: 'Cracked frame', image_urls: photos(6) })).toEqual([]);
  });

  it('refuses a proof with neither a note nor a photo, a blank note counting as none', () => {
    expect(issues({ note: '', image_urls: [] })).toEqual(['note:venueRentals.proof.required']);
    expect(issues({ note: '    ', image_urls: [] })).toEqual(['note:venueRentals.proof.required']);
  });

  it('takes a note of exactly the server’s 1000 characters and refuses one more', () => {
    expect(issues({ note: 'a'.repeat(1000), image_urls: [] })).toEqual([]);
    expect(issues({ note: 'a'.repeat(1001), image_urls: [] })).toEqual(['note:venueRentals.proof.noteTooLong:{"max":1000}']);
  });

  it('takes up to six photos and refuses a seventh', () => {
    expect(issues({ note: '', image_urls: photos(7) })).toEqual(['image_urls:venueRentals.proof.tooManyPhotos:{"max":6}']);
  });

  it('hands the note back trimmed', () => {
    const parsed = schema.parse({ note: '  Returned muddy  ', image_urls: [] });
    expect(parsed.note).toBe('Returned muddy');
  });
});
