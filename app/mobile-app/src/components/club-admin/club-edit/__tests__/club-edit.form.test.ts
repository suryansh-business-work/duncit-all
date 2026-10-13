import { makeClubEditSchema, type ClubEditFormValues } from '../club-edit.form';

const FAQ_MESSAGE = 'faq-incomplete';
const t = ((key: string) =>
  key === 'mweb.clubEdit.validation.faqIncomplete' ? FAQ_MESSAGE : key) as never;

const validValues = (): ClubEditFormValues => ({
  club_name: 'Bakers',
  club_description: 'We bake',
  super_category_id: 'S1',
  category_id: 'C1',
  location_id: 'L1',
  locality: '',
  feature_text: 'https://cdn.example/a.jpg',
  moments_text: '',
  community_link: 'https://chat.whatsapp.com/community',
  group_link: 'https://chat.whatsapp.com/group',
  announcement_link: '',
  who_we_are: ['Bakers'],
  what_we_do: ['Bake'],
  perks: ['Bread'],
  values: ['Kind'],
  faqs: [],
});

const messages = (values: ClubEditFormValues) => {
  const result = makeClubEditSchema(t).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('makeClubEditSchema — FAQs', () => {
  it('accepts a club with no FAQs, complete FAQs and a fully blank row', () => {
    const faqs = [
      { id: 'a', question: 'When?', answer: 'Sundays' },
      { id: 'b', question: ' ', answer: '' },
    ];
    expect(messages({ ...validValues(), faqs })).toEqual([]);
  });

  it.each([
    ['only a question', { id: 'a', question: 'When?', answer: '  ' }],
    ['only an answer', { id: 'a', question: '', answer: 'Sundays' }],
  ])('rejects a FAQ with %s', (_label, row) => {
    expect(messages({ ...validValues(), faqs: [row] })).toEqual([FAQ_MESSAGE]);
  });
});
