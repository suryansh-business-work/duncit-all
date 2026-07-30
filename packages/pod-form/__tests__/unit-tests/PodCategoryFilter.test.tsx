import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PodForm, { type PodFormProps } from '../../src/PodForm';
import { blankPodFormValues, type PodFormValues } from '../../src/types';
import { makeConfig } from './helpers';

vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ label }: any) => <span>picker:{label}</span>,
}));

// The category cascade reads the admin tree through useQuery; the venue slot
// query shares the mock, so return both shapes.
const CATEGORIES = [
  { id: 'sup-sports', name: 'Sports', slug: 'sports', level: 'SUPER', parent_id: null },
  { id: 'cat-racket', name: 'Racket', slug: 'racket', level: 'CATEGORY', parent_id: 'sup-sports' },
  { id: 'sub-badminton', name: 'Badminton', slug: 'bad', level: 'SUB', parent_id: 'cat-racket', min_pax: 4 },
  { id: 'sup-pets', name: 'Pets', slug: 'pets', level: 'SUPER', parent_id: null },
  { id: 'cat-dogs', name: 'Dogs', slug: 'dogs', level: 'CATEGORY', parent_id: 'sup-pets' },
  { id: 'sub-walks', name: 'Walks', slug: 'walks', level: 'SUB', parent_id: 'cat-dogs', min_pax: 0 },
];
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
  useQuery: () => ({
    data: { venueAvailableSlots: [], categories: CATEGORIES },
    loading: false,
    error: undefined,
  }),
}));

// A club stores its SUB in `category_id`.
const BADMINTON_CLUB = {
  id: 'c1',
  club_name: 'Badminton Club',
  super_category_id: 'sup-sports',
  category_id: 'sub-badminton',
};
const DOG_CLUB = {
  id: 'c2',
  club_name: 'Dog Club',
  super_category_id: 'sup-pets',
  category_id: 'sub-walks',
};

const values = (): PodFormValues => ({
  ...blankPodFormValues,
  pod_title: 'A Valid Pod Title',
  pod_mode: 'PHYSICAL',
  pod_description: 'A sufficiently long description of the pod',
  pod_date_time: new Date(Date.now() + 86_400_000),
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  pod_occurrence: 'ONE_TIME',
  no_of_spots: 10,
  media_text: 'https://cdn.example.com/cover.jpg',
});

function renderForm(over: Partial<PodFormProps> = {}) {
  const props: PodFormProps = {
    initialValues: values(),
    config: makeConfig(),
    clubs: [BADMINTON_CLUB, DOG_CLUB],
    venues: [],
    getClubVenueIds: () => ['v1'],
    onCancel: vi.fn(),
    onSubmit: vi.fn(),
    ...over,
  };
  return render(<PodForm {...props} />);
}

/** Open the Club select and read back the option labels it offers. */
async function clubOptions(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText(/Club/i));
  const options = screen.getAllByRole('option').map((o) => o.textContent);
  await user.keyboard('{Escape}');
  return options;
}

describe('PodCategoryFilter', () => {
  it('sits above the form and offers every club until a category is picked', async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.getByTestId('pod-category-filter')).toBeInTheDocument();
    expect(await clubOptions(user)).toEqual(['Badminton Club', 'Dog Club']);
  });

  // The pod's category comes from its club, so picking it first simply narrows
  // what the club dropdown may offer.
  it('narrows the club list to the picked Super + Sub, dropping uncategorised clubs', async () => {
    const user = userEvent.setup();
    // Legacy clubs: one with no category ids at all, one with only half the
    // pair. Neither can match, so both drop out once a category is picked.
    const LEGACY = { id: 'c3', club_name: 'Legacy Club' };
    const HALF = { id: 'c4', club_name: 'Half Club', super_category_id: 'sup-sports' };
    renderForm({ clubs: [BADMINTON_CLUB, DOG_CLUB, LEGACY, HALF] });
    expect(await clubOptions(user)).toEqual([
      'Badminton Club',
      'Dog Club',
      'Legacy Club',
      'Half Club',
    ]);

    await user.click(screen.getByLabelText('Super Category'));
    await user.click(screen.getByRole('option', { name: 'Sports' }));
    await user.click(screen.getByLabelText('Category'));
    await user.click(screen.getByRole('option', { name: 'Racket' }));
    await user.click(screen.getByLabelText('Sub Category'));
    await user.click(screen.getByRole('option', { name: 'Badminton' }));

    expect(await clubOptions(user)).toEqual(['Badminton Club']);
    expect(screen.queryByTestId('pod-category-no-clubs')).not.toBeInTheDocument();
  });

  it('warns when the picked category has no clubs yet', async () => {
    const user = userEvent.setup();
    renderForm({ clubs: [DOG_CLUB] });

    await user.click(screen.getByLabelText('Super Category'));
    await user.click(screen.getByRole('option', { name: 'Sports' }));
    await user.click(screen.getByLabelText('Category'));
    await user.click(screen.getByRole('option', { name: 'Racket' }));
    await user.click(screen.getByLabelText('Sub Category'));
    await user.click(screen.getByRole('option', { name: 'Badminton' }));

    expect(screen.getByTestId('pod-category-no-clubs')).toBeInTheDocument();
  });

  it('shows no warning when there are no clubs at all to filter', () => {
    renderForm({ clubs: [] });
    expect(screen.queryByTestId('pod-category-no-clubs')).not.toBeInTheDocument();
  });
});
