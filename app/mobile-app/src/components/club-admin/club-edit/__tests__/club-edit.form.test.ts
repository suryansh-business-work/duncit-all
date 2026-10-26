import { CategoryMediaType } from '@/generated/graphql/graphql';
import {
  buildClubEditInput,
  clubToEditValues,
  makeClubEditSchema,
  nextFaqId,
  type ClubEditFormValues,
  type EditableClubFields,
} from '../club-edit.form';

const t = (key: string) => key;
const V = 'mweb.clubEdit.validation.';
const schema = makeClubEditSchema(t);

const valid = (patch: Partial<ClubEditFormValues> = {}): ClubEditFormValues => ({
  club_name: 'Smash Club',
  club_description: 'We play',
  super_category_id: 's1',
  category_id: 'u1',
  location_id: 'loc1',
  locality: '',
  feature_text: 'https://cdn/a.jpg',
  moments_text: '',
  community_link: 'https://chat.whatsapp.com/community',
  group_link: 'https://chat.whatsapp.com/group',
  announcement_link: '',
  who_we_are: ['Players'],
  what_we_do: ['Play'],
  perks: ['Free tea'],
  values: ['Fun'],
  faqs: [],
  ...patch,
});

const problems = (values: ClubEditFormValues) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}|${i.message}`);
};

describe('makeClubEditSchema', () => {
  it('accepts a complete club', () => {
    expect(problems(valid())).toEqual([]);
  });

  it.each([
    ['club_name', '   ', `${V}nameRequired`],
    ['club_description', '', `${V}descriptionRequired`],
    ['super_category_id', '', `${V}superCategoryRequired`],
    ['category_id', '', `${V}subCategoryRequired`],
    ['location_id', '', `${V}locationRequired`],
    ['feature_text', ' \n ', `${V}imageRequired`],
  ] as const)('requires %s', (field, value, message) => {
    expect(problems(valid({ [field]: value }))).toEqual([`${field}|${message}`]);
  });

  it.each(['community_link', 'group_link'] as const)('requires %s, saying so first', (field) => {
    expect(problems(valid({ [field]: '' }))[0]).toBe(
      `${field}|${V}${field === 'community_link' ? 'communityLinkRequired' : 'groupLinkRequired'}`,
    );
  });

  it('requires the two WhatsApp links to be real links', () => {
    expect(problems(valid({ community_link: 'not a link' }))).toEqual([
      `community_link|${V}linkInvalid`,
    ]);
    expect(problems(valid({ group_link: 'ftp://x' }))).toEqual([`group_link|${V}linkInvalid`]);
    expect(problems(valid({ community_link: '  HTTP://chat.example/x  ' }))).toEqual([]);
  });

  it('lets the announcement link and the moments be blank, but not a bad link', () => {
    expect(problems(valid({ announcement_link: '   ', moments_text: '' }))).toEqual([]);
    expect(problems(valid({ announcement_link: 'nope' }))).toEqual([
      `announcement_link|${V}linkInvalid`,
    ]);
    expect(problems(valid({ announcement_link: 'https://chat.example/a' }))).toEqual([]);
  });

  it.each([
    ['who_we_are', `${V}whoWeAreRequired`],
    ['what_we_do', `${V}whatWeDoRequired`],
    ['perks', `${V}perksRequired`],
    ['values', `${V}valuesRequired`],
  ] as const)('needs at least one non-blank entry in %s', (field, message) => {
    expect(problems(valid({ [field]: [] }))).toEqual([`${field}|${message}`]);
    expect(problems(valid({ [field]: ['  ', ''] }))).toEqual([`${field}|${message}`]);
  });

  it('wants each FAQ filled on both sides or on neither', () => {
    const row = (question: string, answer: string) => ({ id: nextFaqId(), question, answer });
    expect(problems(valid({ faqs: [row('Q?', 'A.'), row('', ' ')] }))).toEqual([]);
    expect(problems(valid({ faqs: [row('Q?', '')] }))).toEqual([`faqs|${V}faqIncomplete`]);
    expect(problems(valid({ faqs: [row('', 'A.')] }))).toEqual([`faqs|${V}faqIncomplete`]);
  });
});

describe('nextFaqId', () => {
  it('hands out a different id each time', () => {
    expect(nextFaqId()).not.toBe(nextFaqId());
  });
});

describe('clubToEditValues', () => {
  const club: EditableClubFields = {
    club_name: 'Smash Club',
    club_description: 'We play',
    super_category_id: 's1',
    category_id: 'u1',
    location_id: 'loc1',
    locality: 'Gomti Nagar',
    club_feature_images_and_videos: [{ url: 'https://cdn/a.jpg' }, { url: 'https://cdn/b.mp4' }],
    club_moments: [{ url: 'https://cdn/m.jpg' }],
    club_whats_app_community_link: 'https://c',
    club_whats_app_group_link: 'https://g',
    club_whats_app_announcement_link: 'https://a',
    who_we_are: ['Players'],
    what_we_do: ['Play'],
    perks: ['Tea'],
    values: ['Fun'],
    faqs: [{ question: 'Q?', answer: 'A.' }],
  };

  it('prefills every field, one media URL per line', () => {
    const values = clubToEditValues(club);
    expect(values).toMatchObject({
      club_name: 'Smash Club',
      club_description: 'We play',
      super_category_id: 's1',
      category_id: 'u1',
      location_id: 'loc1',
      locality: 'Gomti Nagar',
      feature_text: 'https://cdn/a.jpg\nhttps://cdn/b.mp4',
      moments_text: 'https://cdn/m.jpg',
      community_link: 'https://c',
      group_link: 'https://g',
      announcement_link: 'https://a',
      who_we_are: ['Players'],
      what_we_do: ['Play'],
      perks: ['Tea'],
      values: ['Fun'],
    });
    expect(values.faqs).toEqual([
      { id: expect.stringMatching(/^faq-/), question: 'Q?', answer: 'A.' },
    ]);
  });

  it('turns every missing optional field into a blank, never null', () => {
    const values = clubToEditValues({
      ...club,
      club_description: null,
      super_category_id: null,
      category_id: null,
      location_id: null,
      locality: null,
      club_whats_app_community_link: null,
      club_whats_app_group_link: null,
      club_whats_app_announcement_link: null,
      club_feature_images_and_videos: [],
      club_moments: [],
      faqs: [],
    });
    expect(values).toMatchObject({
      club_description: '',
      super_category_id: '',
      category_id: '',
      location_id: '',
      locality: '',
      community_link: '',
      group_link: '',
      announcement_link: '',
      feature_text: '',
      moments_text: '',
      faqs: [],
    });
  });

  it('copies the lists so editing the form never edits the club', () => {
    const values = clubToEditValues(club);
    expect(values.who_we_are).not.toBe(club.who_we_are);
  });

  it('gives each FAQ its own row id', () => {
    const values = clubToEditValues({
      ...club,
      faqs: [
        { question: 'Q1', answer: 'A1' },
        { question: 'Q2', answer: 'A2' },
      ],
    });
    expect(new Set(values.faqs.map((faq) => faq.id)).size).toBe(2);
  });
});

describe('buildClubEditInput', () => {
  it('trims text, sends the category and location, and types each media URL', () => {
    const input = buildClubEditInput(
      valid({
        club_name: '  Smash Club ',
        club_description: ' We play ',
        locality: 'Gomti Nagar',
        feature_text: 'https://cdn/a.jpg\n\n  https://cdn/b.mp4  ',
        moments_text: 'https://cdn/m.png\nhttps://cdn/m.mp4',
        community_link: ' https://c ',
        group_link: ' https://g ',
        announcement_link: ' https://a ',
      }),
    );
    expect(input).toMatchObject({
      club_name: 'Smash Club',
      club_description: 'We play',
      super_category_id: 's1',
      category_id: 'u1',
      location_id: 'loc1',
      locality: 'Gomti Nagar',
      club_whats_app_community_link: 'https://c',
      club_whats_app_group_link: 'https://g',
      club_whats_app_announcement_link: 'https://a',
    });
    expect(input.club_feature_images_and_videos).toEqual([
      { url: 'https://cdn/a.jpg', type: CategoryMediaType.Image },
      { url: 'https://cdn/b.mp4', type: CategoryMediaType.Video },
    ]);
    expect(input.club_moments).toEqual([
      { url: 'https://cdn/m.png', type: CategoryMediaType.Image },
      { url: 'https://cdn/m.mp4', type: CategoryMediaType.Video },
    ]);
  });

  it('drops blank entries from the lists and incomplete FAQs', () => {
    const input = buildClubEditInput(
      valid({
        who_we_are: [' Players ', ' '],
        what_we_do: ['Play', ''],
        perks: ['', 'Tea'],
        values: ['Fun '],
        faqs: [
          { id: 'f1', question: ' Q? ', answer: ' A. ' },
          { id: 'f2', question: 'Q only', answer: ' ' },
          { id: 'f3', question: '', answer: '' },
          { id: 'f4', question: '', answer: 'Answer only' },
        ],
      }),
    );
    expect(input.who_we_are).toEqual(['Players']);
    expect(input.what_we_do).toEqual(['Play']);
    expect(input.perks).toEqual(['Tea']);
    expect(input.values).toEqual(['Fun']);
    expect(input.faqs).toEqual([{ question: 'Q?', answer: 'A.' }]);
  });

  it('sends no moments for a club without any', () => {
    expect(buildClubEditInput(valid()).club_moments).toEqual([]);
  });
});
