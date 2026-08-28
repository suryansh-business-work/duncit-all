import { describe, expect, it, vi } from 'vitest';
import { blankClubFormValues, type ClubFormValues } from '@duncit/club-form';
import { applyAiFillToClubForm } from '../clubFormAi';

const prev = (over: Partial<ClubFormValues> = {}): ClubFormValues => ({
  ...blankClubFormValues,
  ...over,
});

/** Runs the fill and returns the value handed to setValues. */
const fill = (d: any, base: ClubFormValues): ClubFormValues => {
  const setValues = vi.fn();
  applyAiFillToClubForm(d, base, setValues);
  expect(setValues).toHaveBeenCalledTimes(1);
  return setValues.mock.calls[0][0];
};

describe('applyAiFillToClubForm — plain text/chip/faq fields', () => {
  it('takes the copy the model wrote', () => {
    const next = fill(
      {
        club_name: 'Sunset Runners',
        club_description: 'A weekly running club.',
        feature_text: 'https://cdn.test/a.jpg',
        moments_text: 'https://cdn.test/b.jpg',
        community_link: 'https://chat.test/x',
        group_link: 'https://chat.test/y',
        who_we_are: ['Friendly', 'Active'],
        what_we_do: ['Group runs'],
        perks: ['Free water'],
        values: ['Consistency'],
      },
      prev()
    );

    expect(next.club_name).toBe('Sunset Runners');
    expect(next.club_description).toBe('A weekly running club.');
    expect(next.feature_text).toBe('https://cdn.test/a.jpg');
    expect(next.moments_text).toBe('https://cdn.test/b.jpg');
    expect(next.community_link).toBe('https://chat.test/x');
    expect(next.group_link).toBe('https://chat.test/y');
    expect(next.who_we_are).toEqual(['Friendly', 'Active']);
    expect(next.what_we_do).toEqual(['Group runs']);
    expect(next.perks).toEqual(['Free water']);
    expect(next.values).toEqual(['Consistency']);
  });

  it('keeps everything the admin already typed when the model wrote nothing', () => {
    const existing = prev({
      club_name: 'Typed by hand',
      who_we_are: ['Already there'],
    });
    const next = fill({}, existing);

    expect(next.club_name).toBe('Typed by hand');
    expect(next.who_we_are).toEqual(['Already there']);
  });

  it('trims, drops incomplete rows and caps FAQs at ten', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      question: `  Q${i}?  `,
      answer: `  A${i}.  `,
    }));
    const next = fill({ faqs: [{ question: 'only a question' }, ...rows] }, prev());

    expect(next.faqs).toHaveLength(10);
    expect(next.faqs[0]).toEqual({ question: 'Q0?', answer: 'A0.' });
  });

  it('keeps existing FAQs when the model sent something that is not a list', () => {
    const existing = prev({ faqs: [{ question: 'Existing?', answer: 'Yes.' }] });
    const next = fill({ faqs: 'not a list' }, existing);

    expect(next.faqs).toEqual([{ question: 'Existing?', answer: 'Yes.' }]);
  });

  it('treats a non-string question or answer as blank, dropping that row', () => {
    const next = fill(
      {
        faqs: [
          { question: 42, answer: 'A valid answer' },
          { question: 'A valid question', answer: null },
        ],
      },
      prev()
    );
    expect(next.faqs).toEqual([]);
  });
});

describe('applyAiFillToClubForm — category resolution', () => {
  it('fills super + sub category when the form has neither yet', () => {
    const next = fill({ super_category_id: 'sup-1', category_id: 'cat-1' }, prev());
    expect(next.super_category_id).toBe('sup-1');
    expect(next.category_id).toBe('cat-1');
  });

  it('fills an empty sub-category when the model named only the super', () => {
    const next = fill({ super_category_id: 'sup-1' }, prev());
    expect(next.super_category_id).toBe('sup-1');
    expect(next.category_id).toBe('');
  });

  it('never overwrites a super_category_id the admin already picked', () => {
    const existing = prev({ super_category_id: 'sup-existing' });
    const next = fill({ super_category_id: 'sup-1', category_id: 'cat-1' }, existing);
    expect(next.super_category_id).toBe('sup-existing');
    expect(next.category_id).toBe(existing.category_id);
  });

  it('never overwrites when only category_id was already picked', () => {
    const existing = prev({ category_id: 'cat-existing' });
    const next = fill({ super_category_id: 'sup-1', category_id: 'cat-1' }, existing);
    expect(next.super_category_id).toBe(existing.super_category_id);
    expect(next.category_id).toBe('cat-existing');
  });

  it('leaves category alone when the model gave no super_category_id', () => {
    const next = fill({ category_id: 'cat-1' }, prev());
    expect(next.super_category_id).toBe('');
    expect(next.category_id).toBe('');
  });

  it('ignores a blank/whitespace super_category_id from the model', () => {
    const next = fill({ super_category_id: '   ' }, prev());
    expect(next.super_category_id).toBe('');
  });
});

describe('applyAiFillToClubForm — location resolution', () => {
  it('fills location + locality when the form has none yet', () => {
    const next = fill({ location_id: 'loc-1', locality: 'Koramangala' }, prev());
    expect(next.location_id).toBe('loc-1');
    expect(next.locality).toBe('Koramangala');
  });

  it('fills an empty locality when the model gave none', () => {
    const next = fill({ location_id: 'loc-1' }, prev());
    expect(next.location_id).toBe('loc-1');
    expect(next.locality).toBe('');
  });

  it('never overwrites a location the admin already picked', () => {
    const existing = prev({ location_id: 'loc-existing', locality: 'HSR' });
    const next = fill({ location_id: 'loc-1', locality: 'Koramangala' }, existing);
    expect(next.location_id).toBe('loc-existing');
    expect(next.locality).toBe('HSR');
  });

  it('leaves location alone when the model gave no location_id', () => {
    const next = fill({ locality: 'Koramangala' }, prev());
    expect(next.location_id).toBe('');
    expect(next.locality).toBe('');
  });
});

describe('applyAiFillToClubForm — admin resolution', () => {
  it('assigns the single admin the model named', () => {
    const next = fill({ admin_user_ids: ['admin-1'] }, prev());
    expect(next.admin_user_ids).toEqual(['admin-1']);
  });

  it('coerces a non-string admin id to a string', () => {
    const next = fill({ admin_user_ids: [42] }, prev());
    expect(next.admin_user_ids).toEqual(['42']);
  });

  it('never replaces an admin the form already has', () => {
    const existing = prev({ admin_user_ids: ['admin-existing'] });
    const next = fill({ admin_user_ids: ['admin-1'] }, existing);
    expect(next.admin_user_ids).toEqual(['admin-existing']);
  });

  it('assigns nothing when the model sent an empty list', () => {
    const next = fill({ admin_user_ids: [] }, prev());
    expect(next.admin_user_ids).toEqual([]);
  });

  it('assigns nothing when the model sent something that is not a list', () => {
    const next = fill({ admin_user_ids: 'admin-1' }, prev());
    expect(next.admin_user_ids).toEqual([]);
  });
});

describe('applyAiFillToClubForm — survives an empty/nullish fill', () => {
  it('keeps every previous value when handed nothing at all', () => {
    const existing = prev({ club_name: 'Existing Club' });
    const next = fill(null, existing);
    expect(next).toEqual(existing);
  });
});
