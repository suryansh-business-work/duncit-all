import { candidateFacts, candidateKeys, cleanCandidate } from '../../leadResearch.candidate';

/**
 * A researched lead is cleaned and checked like the CRM form checks a lead,
 * must be traceable to a public page when an AI hands it in, and is keyed on
 * the identities a second sighting would share.
 */

const base = {
  name: '  The Barn Cafe ',
  city: 'Lucknow',
  area: 'Gomti Nagar',
  phones: ['+91 98765 43210'],
  emails: ['Hello@TheBarn.in'],
  website: 'https://thebarn.in/menu/',
  instagram: 'https://www.instagram.com/TheBarn/',
  sources: [{ kind: 'INSTAGRAM' as const, url: 'https://www.instagram.com/thebarn/', title: 'The Barn', text: 'Open mic every Friday' }],
};

describe('cleanCandidate', () => {
  it('cleans every field and keys the candidate on its identities', () => {
    const { candidate, problems } = cleanCandidate(base, true);
    expect(problems).toEqual([]);
    expect(candidate).toMatchObject({
      name: 'The Barn Cafe',
      emails: ['hello@thebarn.in'],
      instagram_handle: 'thebarn',
      website: 'https://thebarn.in/menu/',
      sources: [{ kind: 'INSTAGRAM', url: 'https://www.instagram.com/thebarn/', title: 'The Barn', text: 'Open mic every Friday' }],
    });
    expect(candidate?.keys).toEqual(['ig:thebarn', 'phone:9876543210', 'email:hello@thebarn.in', 'web:thebarn.in/menu']);
  });

  it('refuses an AI-supplied candidate with no public source', () => {
    const { candidate, problems } = cleanCandidate({ ...base, sources: [] }, true);
    expect(candidate).toBeNull();
    expect(problems).toContain('at least one public source link (where this lead was found) is required');
    expect(cleanCandidate({ ...base, sources: [] }, false).candidate).not.toBeNull();
  });

  it('refuses a candidate nobody could verify', () => {
    const { problems } = cleanCandidate({ name: 'Mystery Venue', sources: base.sources }, true);
    expect(problems).toContain('at least one way to verify it is required: Instagram, website, phone or email');
  });

  it('lists every bad value instead of fixing it', () => {
    const { candidate, problems } = cleanCandidate(
      {
        name: 'X',
        phones: ['12'],
        emails: ['not-an-email'],
        website: 'javascript:alert(1)',
        instagram: 'https://example.com/foo',
        sources: [{ url: 'ftp://files.example.com' }],
      },
      true
    );
    expect(candidate).toBeNull();
    expect(problems).toEqual(
      expect.arrayContaining([
        'a name of at least 2 characters is required',
        expect.stringContaining('phone "12"'),
        expect.stringContaining('email "not-an-email"'),
        'the website must be an http(s) link',
        'the Instagram value is not a profile link or handle',
        expect.stringContaining('is not an http(s) link'),
      ])
    );
  });

  it('treats an unknown source kind as a web page and caps the lists', () => {
    const { candidate } = cleanCandidate(
      { ...base, phones: Array.from({ length: 8 }, (_v, i) => `98765 4321${i}`), sources: [{ kind: 'TIKTOK' as never, url: 'https://example.com/barn' }] },
      true
    );
    expect(candidate?.sources[0].kind).toBe('WEB');
    expect(candidate?.phones).toHaveLength(5);
  });
});

describe('candidateKeys', () => {
  it('skips values too short or malformed to identify anyone', () => {
    expect(candidateKeys({ instagram_handle: '', phones: ['123'], emails: ['nope'], website: '' })).toEqual([]);
  });
});

describe('candidateFacts', () => {
  it('gives the quality checks the same facts a CRM lead does', () => {
    const { candidate } = cleanCandidate(base, true);
    expect(candidateFacts('VENUE_LEAD', 'c1', candidate!)).toEqual({
      id: 'c1',
      entity_type: 'VENUE_LEAD',
      name: 'The Barn Cafe',
      city: 'Lucknow',
      area: 'Gomti Nagar',
      address: '',
      emails: ['hello@thebarn.in'],
      phones: ['+91 98765 43210'],
      website: 'https://thebarn.in/menu/',
      instagram_handle: 'thebarn',
      lead_status: '',
    });
  });
});
