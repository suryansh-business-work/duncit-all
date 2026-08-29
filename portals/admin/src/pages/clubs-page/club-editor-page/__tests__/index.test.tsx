import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router-dom';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { blankClubFormValues, buildClubInput, clubToFormValues, type ClubFormValues } from '@duncit/club-form';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { CLUB_FOR_EDIT, CREATE, UPDATE } from '../../queries';
import AdminClubEditorPage from '../index';

interface FakeEditorPageProps {
  eyebrow: string;
  backLabel: string;
  initialValues: ClubFormValues;
  initialAdmins: unknown[];
  config: Record<string, unknown>;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (values: ClubFormValues, options: { draft: boolean }) => void | Promise<void>;
  onPickImage?: (folder?: string) => Promise<string | null>;
  onReady?: (methods: { getValues: () => ClubFormValues; reset: (v: ClubFormValues) => void }) => void;
  titleExtras?: ReactNode;
}

const harness = vi.hoisted(() => ({
  pickImagePromise: null as Promise<string | null> | null,
  fakeMethods: { getValues: (() => ({})) as () => unknown, reset: vi.fn() },
  submitValues: {} as unknown,
}));

vi.mock('@duncit/club-form', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/club-form')>();
  return {
    ...actual,
    ClubEditorPage: (props: FakeEditorPageProps) => (
      <div data-testid="club-editor-page">
        {props.titleExtras}
        <span data-testid="eyebrow">{props.eyebrow}</span>
        <span data-testid="back-label">{props.backLabel}</span>
        <span data-testid="busy">{String(props.busy)}</span>
        <span data-testid="error">{props.error ?? ''}</span>
        <span data-testid="initial-values">{JSON.stringify(props.initialValues)}</span>
        <span data-testid="initial-admins">{JSON.stringify(props.initialAdmins)}</span>
        <span data-testid="config">{JSON.stringify(props.config)}</span>
        <button type="button" onClick={props.onBack}>
          editor-back
        </button>
        <button
          type="button"
          onClick={() => {
            harness.pickImagePromise = props.onPickImage?.() ?? null;
          }}
        >
          editor-pick-image
        </button>
        <button type="button" onClick={() => props.onReady?.(harness.fakeMethods as never)}>
          editor-ready
        </button>
        <button
          type="button"
          onClick={() => props.onSubmit(harness.submitValues as ClubFormValues, { draft: false })}
        >
          editor-submit-publish
        </button>
        <button
          type="button"
          onClick={() => props.onSubmit(harness.submitValues as ClubFormValues, { draft: true })}
        >
          editor-submit-draft
        </button>
      </div>
    ),
  };
});

vi.mock('../../../../components/MediaPickerDialog', () => ({
  default: (props: {
    open: boolean;
    title: string;
    folder: string;
    onClose: () => void;
    onPicked: (url: string) => void;
  }) => (
    <div data-testid="media-picker" data-open={String(props.open)} data-title={props.title} data-folder={props.folder}>
      <button type="button" onClick={() => props.onPicked('https://cdn.test/picked.jpg')}>
        picker-pick
      </button>
      <button type="button" onClick={props.onClose}>
        picker-close
      </button>
    </div>
  ),
}));

vi.mock('../../../../components/AiFillButton', () => ({
  default: (props: { entity: string; onFill: (data: Record<string, unknown>) => void | Promise<void> }) => (
    <button type="button" onClick={() => props.onFill({ club_name: 'AI Named Club' })}>
      ai-fill-{props.entity}
    </button>
  ),
}));

/** A full `CLUB_FOR_EDIT` row — every field the fragment selects, so Apollo's
 * cache write never warns about a field the mock left out. */
const makeClubRow = (over: Record<string, unknown> = {}) => ({
  __typename: 'Club',
  id: 'c1',
  club_id: 'bengaluru-hikers',
  club_name: 'Bengaluru Hikers',
  club_description: 'Sunday hikes around the city.',
  club_feature_images_and_videos: [{ __typename: 'ClubMedia', url: 'https://cdn.test/cover.jpg', type: 'IMAGE' }],
  club_whats_app_community_link: 'https://chat.whatsapp.com/community',
  club_whats_app_group_link: 'https://chat.whatsapp.com/group',
  club_moments: [],
  who_we_are: ['Weekend explorers'],
  what_we_do: ['We hike every Sunday'],
  perks: ['Free trail snacks'],
  values: ['Leave no trace'],
  faqs: [{ __typename: 'ClubFaq', question: 'When?', answer: 'Sundays' }],
  location_id: 'loc-1',
  locality: 'Indiranagar',
  matched_venues_count: 3,
  category_id: 'sub-1',
  super_category_id: 'super-1',
  admin_user_ids: ['admin-1'],
  club_admins: [{ __typename: 'ClubActor', id: 'admin-1', name: 'Asha', avatar_url: null }],
  is_verified: true,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

function ClubsListRouteProbe() {
  return <div>CLUBS LIST ROUTE</div>;
}

const renderPage = (entry: string, extraMocks: MockedResponse[] = []) =>
  renderWithProviders(<></>, {
    mocks: extraMocks,
    initialEntries: [entry],
    routes: (
      <>
        <Route path="/clubs/new" element={<AdminClubEditorPage />} />
        <Route path="/clubs/:id/edit" element={<AdminClubEditorPage />} />
        <Route path="/clubs" element={<ClubsListRouteProbe />} />
      </>
    ),
  });

beforeEach(() => {
  harness.pickImagePromise = null;
  harness.fakeMethods = { getValues: () => blankClubFormValues, reset: vi.fn() };
  harness.submitValues = { ...blankClubFormValues, club_name: 'From editor' };
});

describe('AdminClubEditorPage / new club', () => {
  it('renders immediately with blank initial values and no admins', () => {
    renderPage('/clubs/new');
    expect(screen.getByTestId('club-editor-page')).toBeInTheDocument();
    expect(screen.getByTestId('eyebrow')).toHaveTextContent('Admin · Clubs');
    expect(screen.getByTestId('back-label')).toHaveTextContent('Back to clubs');
    expect(JSON.parse(screen.getByTestId('initial-values').textContent ?? '{}')).toEqual(blankClubFormValues);
    expect(JSON.parse(screen.getByTestId('initial-admins').textContent ?? '[]')).toEqual([]);
    expect(JSON.parse(screen.getByTestId('config').textContent ?? '{}')).toEqual({
      showAdmins: true,
      showVerified: true,
      showIsActive: true,
    });
    expect(screen.getByTestId('busy')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });

  it('navigates back to the clubs list from the back action', () => {
    renderPage('/clubs/new');
    fireEvent.click(screen.getByText('editor-back'));
    expect(screen.getByText('CLUBS LIST ROUTE')).toBeInTheDocument();
  });

  it('opens the media picker dialog with the /clubs folder and the translated title', () => {
    renderPage('/clubs/new');
    fireEvent.click(screen.getByText('editor-pick-image'));
    const dialog = screen.getByTestId('media-picker');
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(dialog).toHaveAttribute('data-folder', '/clubs');
    expect(dialog).toHaveAttribute('data-title', 'Add club image');
  });

  it('resolves the image picker promise with the picked url and closes the dialog', async () => {
    renderPage('/clubs/new');
    fireEvent.click(screen.getByText('editor-pick-image'));
    fireEvent.click(screen.getByText('picker-pick'));
    await expect(harness.pickImagePromise).resolves.toBe('https://cdn.test/picked.jpg');
    await waitFor(() => expect(screen.getByTestId('media-picker')).toHaveAttribute('data-open', 'false'));
  });

  it('resolves the image picker promise with null when closed without picking', async () => {
    renderPage('/clubs/new');
    fireEvent.click(screen.getByText('editor-pick-image'));
    fireEvent.click(screen.getByText('picker-close'));
    await expect(harness.pickImagePromise).resolves.toBeNull();
  });

  it('does nothing when AI fill runs before the form has reported its methods', () => {
    renderPage('/clubs/new');
    fireEvent.click(screen.getByText('ai-fill-CLUB'));
    expect(harness.fakeMethods.reset).not.toHaveBeenCalled();
  });

  it('merges an AI fill into the form once onReady has registered the methods', () => {
    renderPage('/clubs/new');
    fireEvent.click(screen.getByText('editor-ready'));
    fireEvent.click(screen.getByText('ai-fill-CLUB'));
    expect(harness.fakeMethods.reset).toHaveBeenCalledTimes(1);
    expect((harness.fakeMethods.reset as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      club_name: 'AI Named Club',
    });
  });
});

describe('AdminClubEditorPage / submit pipeline (create)', () => {
  it('creates through the create mutation with the real buildClubInput shape, then announces and navigates', async () => {
    let sentVariables: unknown;
    const createMock: MockedResponse = {
      request: { query: CREATE },
      variableMatcher: (variables) => {
        sentVariables = variables;
        return true;
      },
      result: { data: { createClub: { __typename: 'Club', id: 'new-1' } } },
    };
    renderPage('/clubs/new', [createMock]);

    await act(async () => {
      fireEvent.click(screen.getByText('editor-submit-publish'));
    });

    const expectedInput = buildClubInput(harness.submitValues as ClubFormValues, {
      draft: false,
      config: { showAdmins: true, showVerified: true, showIsActive: true },
    });
    expect(sentVariables).toEqual({ input: expectedInput });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(await screen.findByText('CLUBS LIST ROUTE')).toBeInTheDocument();
  });

  it('saves a draft with the draft copy and draft input shape', async () => {
    let sentVariables: unknown;
    const createMock: MockedResponse = {
      request: { query: CREATE },
      variableMatcher: (variables) => {
        sentVariables = variables;
        return true;
      },
      result: { data: { createClub: { __typename: 'Club', id: 'new-2' } } },
    };
    renderPage('/clubs/new', [createMock]);

    await act(async () => {
      fireEvent.click(screen.getByText('editor-submit-draft'));
    });

    const expectedInput = buildClubInput(harness.submitValues as ClubFormValues, {
      draft: true,
      config: { showAdmins: true, showVerified: true, showIsActive: true },
    });
    expect(sentVariables).toEqual({ input: expectedInput });
    expect(await screen.findByText('Draft saved')).toBeInTheDocument();
  });

  it('shows the server error and stays on the editor when the create mutation fails', async () => {
    const failMock: MockedResponse = {
      request: { query: CREATE },
      variableMatcher: () => true,
      result: { errors: [new GraphQLError('Duplicate club id')] },
    };
    renderPage('/clubs/new', [failMock]);

    await act(async () => {
      fireEvent.click(screen.getByText('editor-submit-publish'));
    });

    expect(await screen.findByTestId('error')).toHaveTextContent('Duplicate club id');
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.getByTestId('club-editor-page')).toBeInTheDocument();
  });
});

describe('AdminClubEditorPage / query guard', () => {
  it('shows a spinner while the existing club is loading', () => {
    const mock: MockedResponse = {
      request: { query: CLUB_FOR_EDIT, variables: { id: 'c1' } },
      delay: 50,
      result: { data: { club: null } },
    };
    renderPage('/clubs/c1/edit', [mock]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('club-editor-page')).not.toBeInTheDocument();
  });

  it('shows the not-found alert once the club resolves to nothing', async () => {
    const mock: MockedResponse = {
      request: { query: CLUB_FOR_EDIT, variables: { id: 'missing' } },
      result: { data: { club: null } },
    };
    renderPage('/clubs/missing/edit', [mock]);
    expect(await screen.findByText('Club not found.')).toBeInTheDocument();
    expect(screen.queryByTestId('club-editor-page')).not.toBeInTheDocument();
  });

  it("shows the query's own error message when the fetch fails", async () => {
    const mock: MockedResponse = {
      request: { query: CLUB_FOR_EDIT, variables: { id: 'c1' } },
      result: { errors: [new GraphQLError('Not allowed')] },
    };
    renderPage('/clubs/c1/edit', [mock]);
    expect(await screen.findByText('Not allowed')).toBeInTheDocument();
    expect(screen.queryByTestId('club-editor-page')).not.toBeInTheDocument();
  });
});

describe('AdminClubEditorPage / editing an existing club', () => {
  it('hydrates initial values and admins from the fetched club via the real clubToFormValues mapping', async () => {
    const row = makeClubRow();
    const mock: MockedResponse = {
      request: { query: CLUB_FOR_EDIT, variables: { id: 'c1' } },
      result: { data: { club: row } },
    };
    renderPage('/clubs/c1/edit', [mock]);

    expect(await screen.findByTestId('club-editor-page')).toBeInTheDocument();
    const expectedValues = clubToFormValues(row);
    expect(JSON.parse(screen.getByTestId('initial-values').textContent ?? '{}')).toEqual(expectedValues);
    expect(JSON.parse(screen.getByTestId('initial-admins').textContent ?? '[]')).toEqual(row.club_admins);
  });

  it('updates through the update mutation, keyed on the editing club id', async () => {
    const row = makeClubRow({ id: 'c1' });
    const editMock: MockedResponse = {
      request: { query: CLUB_FOR_EDIT, variables: { id: 'c1' } },
      result: { data: { club: row } },
    };
    let sentVariables: unknown;
    const updateMock: MockedResponse = {
      request: { query: UPDATE },
      variableMatcher: (variables) => {
        sentVariables = variables;
        return true;
      },
      result: { data: { updateClub: { __typename: 'Club', id: 'c1' } } },
    };
    renderPage('/clubs/c1/edit', [editMock, updateMock]);
    await screen.findByTestId('club-editor-page');

    harness.submitValues = { ...clubToFormValues(row), club_name: 'Bengaluru Hikers Updated' };
    await act(async () => {
      fireEvent.click(screen.getByText('editor-submit-publish'));
    });

    const expectedInput = buildClubInput(harness.submitValues as ClubFormValues, {
      draft: false,
      config: { showAdmins: true, showVerified: true, showIsActive: true },
    });
    expect(sentVariables).toEqual({ id: 'c1', input: expectedInput });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(await screen.findByText('CLUBS LIST ROUTE')).toBeInTheDocument();
  });

  it('shows the server error when the update mutation fails, without navigating away', async () => {
    const row = makeClubRow({ id: 'c1' });
    const editMock: MockedResponse = {
      request: { query: CLUB_FOR_EDIT, variables: { id: 'c1' } },
      result: { data: { club: row } },
    };
    const failMock: MockedResponse = {
      request: { query: UPDATE },
      variableMatcher: () => true,
      result: { errors: [new GraphQLError('Club still has pods')] },
    };
    renderPage('/clubs/c1/edit', [editMock, failMock]);
    await screen.findByTestId('club-editor-page');

    harness.submitValues = clubToFormValues(row);
    await act(async () => {
      fireEvent.click(screen.getByText('editor-submit-publish'));
    });

    expect(await screen.findByTestId('error')).toHaveTextContent('Club still has pods');
    expect(screen.getByTestId('club-editor-page')).toBeInTheDocument();
  });
});
