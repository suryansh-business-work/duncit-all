import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PodIdeasPage from '../PodIdeasPage';
import {
  POD_IDEAS,
  POD_IDEA_DETAILS,
  CREATE_IDEA,
  TOGGLE_LIKE,
  SHARE,
  DELETE_IDEA,
} from '../queries';

// Mock the category cascade so the page test does not depend on the CATEGORIES
// query / Autocomplete internals. Each instance renders a button that emits a
// fixed scope + labels; `allowAll` distinguishes the filter from the composer.
const PICK_SCOPE = { super_category_id: 's1', category_id: 'c1', sub_category_id: 'sub1' };
const PICK_LABELS = {
  super_category_name: 'Sports',
  category_name: 'Football',
  sub_category_name: '5s',
};
vi.mock('../CategoryCascade', () => ({
  EMPTY_CATEGORY_SCOPE: { super_category_id: '', category_id: '', sub_category_id: '' },
  default: ({
    onChange,
    allowAll,
  }: {
    onChange: (s: typeof PICK_SCOPE, l: typeof PICK_LABELS) => void;
    allowAll?: boolean;
  }) => (
    <button type="button" onClick={() => onChange(PICK_SCOPE, PICK_LABELS)}>
      {allowAll ? 'filter-pick' : 'composer-pick'}
    </button>
  ),
}));

const meObj = { user_id: 'u1', full_name: 'Me', first_name: 'Me', profile_photo: null };

const idea = (over: Record<string, unknown> = {}) => ({
  id: 'i1',
  idea_no: 'DUN-001',
  author_id: 'u2',
  title: 'Rooftop yoga',
  description: 'A calm morning pod',
  super_category_id: 's1',
  category_id: 'c1',
  sub_category_id: 'sub1',
  super_category_name: 'Sports',
  category_name: 'Football',
  sub_category_name: '5s',
  likes_count: 5,
  liked_by_me: false,
  shares_count: 3,
  comments_count: 1,
  status: 'APPROVED',
  created_at: '2026-07-22T00:00:00.000Z',
  author: { user_id: 'u2', full_name: 'Alice', first_name: 'Alice', profile_photo: null },
  ...over,
});

function baseMocks({
  me = meObj,
  ideas = [idea()],
  mine = [] as ReturnType<typeof idea>[],
}: {
  me?: typeof meObj | null;
  ideas?: ReturnType<typeof idea>[];
  mine?: ReturnType<typeof idea>[];
} = {}): MockedResponse[] {
  const mocks: MockedResponse[] = [
    {
      request: { query: POD_IDEAS, variables: { filter: { status: 'APPROVED' } } },
      maxUsageCount: Number.POSITIVE_INFINITY,
      result: { data: { podIdeas: ideas, me } },
    },
  ];
  if (me) {
    mocks.push({
      request: { query: POD_IDEAS, variables: { filter: { author_id: me.user_id } } },
      maxUsageCount: Number.POSITIVE_INFINITY,
      result: { data: { podIdeas: mine, me } },
    });
  }
  return mocks;
}

function renderPage(mocks: MockedResponse[]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <PodIdeasPage />
    </MockedProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('PodIdeasPage', () => {
  it('shows a loading spinner before the ideas resolve', () => {
    renderPage(baseMocks());
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the header, approved ideas, and the "Your submissions" section', async () => {
    renderPage(
      baseMocks({
        ideas: [idea()],
        mine: [idea({ id: 'm1', author_id: 'u1', title: 'My pending pod', status: 'PENDING' })],
      }),
    );
    expect(await screen.findByText('Rooftop yoga')).toBeInTheDocument();
    expect(screen.getByText('Pod Ideas')).toBeInTheDocument();
    expect(screen.getByText('Your submissions')).toBeInTheDocument();
    expect(screen.getByText('My pending pod')).toBeInTheDocument();
    // status chip for the non-approved own submission
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('shows the empty-state alert when there are no ideas', async () => {
    renderPage(baseMocks({ ideas: [] }));
    expect(
      await screen.findByText('No ideas yet — be the first to share one!'),
    ).toBeInTheDocument();
  });

  it('refetches with a search filter when typing in the search box', async () => {
    const searchMock: MockedResponse = {
      request: {
        query: POD_IDEAS,
        variables: { filter: { status: 'APPROVED', search: 'apple' } },
      },
      result: {
        data: { podIdeas: [idea({ id: 'i2', title: 'Apple picking pod' })], me: meObj },
      },
    };
    renderPage([...baseMocks(), searchMock]);
    await screen.findByText('Rooftop yoga');
    fireEvent.change(screen.getByPlaceholderText('Search ideas…'), {
      target: { value: 'apple' },
    });
    expect(await screen.findByText('Apple picking pod')).toBeInTheDocument();
    expect(screen.queryByText('Rooftop yoga')).not.toBeInTheDocument();
  });

  it('narrows the list client-side when a category filter is picked', async () => {
    renderPage(
      baseMocks({
        ideas: [
          idea({ id: 'i1', title: 'Matching', sub_category_id: 'sub1' }),
          idea({ id: 'i2', title: 'Other cat', sub_category_id: 'zzz' }),
        ],
      }),
    );
    await screen.findByText('Matching');
    expect(screen.getByText('Other cat')).toBeInTheDocument();
    fireEvent.click(screen.getByText('filter-pick'));
    await waitFor(() => expect(screen.queryByText('Other cat')).not.toBeInTheDocument());
    expect(screen.getByText('Matching')).toBeInTheDocument();
  });

  it('prompts to sign in when a signed-out user taps "Share idea"', async () => {
    renderPage(baseMocks({ me: null }));
    await screen.findByText('Rooftop yoga');
    fireEvent.click(screen.getByRole('button', { name: 'Share idea' }));
    expect(await screen.findByText('Please sign in to share an idea')).toBeInTheDocument();
    // composer stays closed
    expect(screen.queryByText('Share a pod idea')).not.toBeInTheDocument();
  });

  it('validates the composer: missing text then missing category', async () => {
    renderPage(baseMocks());
    await screen.findByText('Rooftop yoga');
    fireEvent.click(screen.getByRole('button', { name: 'Share idea' }));
    const dialog = await screen.findByRole('dialog');

    // empty title/description
    fireEvent.click(within(dialog).getByRole('button', { name: 'Submit' }));
    expect(
      await within(dialog).findByText('Title and description are both required'),
    ).toBeInTheDocument();

    // fill text but leave category unset
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Title/i }), {
      target: { value: 'New idea' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Description/i }), {
      target: { value: 'A description' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Submit' }));
    expect(
      await within(dialog).findByText('Please select a Super Category, Category and Sub Category'),
    ).toBeInTheDocument();
  });

  it('submits a valid idea, closes the composer, and toasts success', async () => {
    const createMock: MockedResponse = {
      request: {
        query: CREATE_IDEA,
        variables: {
          input: {
            title: 'New idea',
            description: 'A description',
            ...PICK_SCOPE,
            ...PICK_LABELS,
          },
        },
      },
      result: { data: { createPodIdea: { id: 'new1' } } },
    };
    renderPage([...baseMocks(), createMock]);
    await screen.findByText('Rooftop yoga');
    fireEvent.click(screen.getByRole('button', { name: 'Share idea' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByRole('textbox', { name: /Title/i }), {
      target: { value: 'New idea' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Description/i }), {
      target: { value: 'A description' },
    });
    fireEvent.click(within(dialog).getByText('composer-pick'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Submit' }));

    expect(
      await screen.findByText('Idea submitted! It will appear publicly once approved.'),
    ).toBeInTheDocument();
  });

  it('surfaces the mutation error message when create fails', async () => {
    const createErr: MockedResponse = {
      request: {
        query: CREATE_IDEA,
        variables: {
          input: {
            title: 'New idea',
            description: 'A description',
            ...PICK_SCOPE,
            ...PICK_LABELS,
          },
        },
      },
      error: new Error('server exploded'),
    };
    renderPage([...baseMocks(), createErr]);
    await screen.findByText('Rooftop yoga');
    fireEvent.click(screen.getByRole('button', { name: 'Share idea' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Title/i }), {
      target: { value: 'New idea' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Description/i }), {
      target: { value: 'A description' },
    });
    fireEvent.click(within(dialog).getByText('composer-pick'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Submit' }));
    expect(await within(dialog).findByText('server exploded')).toBeInTheDocument();
  });

  it('toasts the error when toggling a like fails', async () => {
    const likeErr: MockedResponse = {
      request: { query: TOGGLE_LIKE, variables: { id: 'i1' } },
      error: new Error('like failed'),
    };
    renderPage([...baseMocks(), likeErr]);
    await screen.findByText('Rooftop yoga');
    fireEvent.click(screen.getByRole('button', { name: '5' })); // likes_count button
    expect(await screen.findByText('like failed')).toBeInTheDocument();
  });

  it('copies the link and records a share when navigator.share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    // ensure the share API is absent so the clipboard branch runs
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });

    const shareMock: MockedResponse = {
      request: { query: SHARE, variables: { id: 'i1' } },
      result: { data: { sharePodIdea: { id: 'i1', shares_count: 4 } } },
    };
    renderPage([...baseMocks(), shareMock]);
    await screen.findByText('Rooftop yoga');
    fireEvent.click(screen.getByRole('button', { name: '3' })); // shares_count button
    expect(await screen.findByText('Link copied to clipboard')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/pod-ideas?id=i1'));
  });

  it('deletes an idea through the confirmation dialog', async () => {
    const deleteMock: MockedResponse = {
      request: { query: DELETE_IDEA, variables: { id: 'i1' } },
      result: { data: { deletePodIdea: true } },
    };
    // idea authored by me so the delete icon renders
    renderPage([...baseMocks({ ideas: [idea({ author_id: 'u1' })] }), deleteMock]);
    await screen.findByText('Rooftop yoga');
    const deleteBtn = screen.getByTestId('DeleteIcon').closest('button');
    fireEvent.click(deleteBtn as HTMLElement);
    expect(await screen.findByText('Delete this idea?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
  });

  it('opens the details dialog when an idea is tapped', async () => {
    const detailsMock: MockedResponse = {
      request: { query: POD_IDEA_DETAILS, variables: { id: 'i1' } },
      result: {
        data: {
          podIdea: {
            id: 'i1',
            author_id: 'u2',
            title: 'Rooftop yoga',
            description: 'A calm morning pod',
            likes_count: 5,
            liked_by_me: false,
            shares_count: 3,
            comments_count: 0,
            status: 'APPROVED',
            created_at: '2026-07-22T00:00:00.000Z',
            author: {
              user_id: 'u2',
              full_name: 'Alice',
              first_name: 'Alice',
              profile_photo: null,
            },
            comments: [],
          },
        },
      },
    };
    renderPage([...baseMocks(), detailsMock]);
    await screen.findByText('Rooftop yoga');
    fireEvent.click(screen.getByText('Rooftop yoga'));
    // the dialog renders the description inside a modal dialog
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByText('Comments (0)')).toBeInTheDocument();
  });
});
