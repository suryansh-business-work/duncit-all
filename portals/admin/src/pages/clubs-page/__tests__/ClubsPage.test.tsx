import { useState, type MutableRefObject, type ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router-dom';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import type { ClubAdmin, ClubFormValues } from '@duncit/club-form';
import { renderWithProviders } from '../../../__tests__/testkit';
import { CATEGORIES, CLUB_FOR_EDIT, CREATE, DELETE, UPDATE, type ClubRow } from '../queries';
import ClubsPage from '../ClubsPage';

const refetchSpy = vi.hoisted(() => vi.fn());

vi.mock('@duncit/table', () => import('../../../__tests__/table-mock'));

/** The values the stubbed form hands back on submit — a fully populated club so
 * the mutation input the page builds is worth asserting. */
const SUBMITTED: ClubFormValues = {
  club_id: 'CLB-1',
  club_name: 'Chess Club',
  club_description: 'We play chess',
  super_category_id: 'sc1',
  category_id: 'cat-1',
  location_id: 'loc1',
  locality: 'Indiranagar',
  feature_text: 'https://cdn.test/a.jpg\nhttps://cdn.test/b.mp4',
  moments_text: '',
  community_link: 'https://chat.whatsapp.com/community',
  group_link: '',
  who_we_are: [' Friendly ', '  '],
  what_we_do: ['Play'],
  perks: [],
  values: [],
  faqs: [{ question: 'When?', answer: 'Sundays' }],
  admin_user_ids: ['u1'],
  is_verified: true,
  is_active: true,
};

/** What ClubsPage must send for a non-draft create with the admin config
 * (admins + verified sections shown, club_id only on create). */
const CREATE_INPUT = {
  club_name: 'Chess Club',
  club_description: 'We play chess',
  club_feature_images_and_videos: [
    { url: 'https://cdn.test/a.jpg', type: 'IMAGE' },
    { url: 'https://cdn.test/b.mp4', type: 'VIDEO' },
  ],
  club_moments: [],
  club_whats_app_community_link: 'https://chat.whatsapp.com/community',
  club_whats_app_group_link: '',
  who_we_are: ['Friendly'],
  what_we_do: ['Play'],
  perks: [],
  values: [],
  faqs: [{ question: 'When?', answer: 'Sundays' }],
  location_id: 'loc1',
  locality: 'Indiranagar',
  category_id: 'cat-1',
  super_category_id: 'sc1',
  is_active: true,
  admin_user_ids: ['u1'],
  is_verified: true,
  club_id: 'CLB-1',
};

const ROW: ClubRow = {
  id: 'c1',
  club_id: 'CLB-1',
  club_name: 'Chess Club',
  locality: 'Indiranagar',
  category_id: 'cat-1',
  is_verified: true,
  is_active: true,
  created_at: '2026-02-01T00:00:00.000Z',
};

const CLUB_FOR_EDIT_RESULT = {
  __typename: 'Club',
  id: 'c9',
  club_id: 'CLB-9',
  club_name: 'Deep Linked Club',
  club_description: 'From the URL',
  club_feature_images_and_videos: [],
  club_whats_app_community_link: '',
  club_whats_app_group_link: '',
  club_moments: [],
  who_we_are: [],
  what_we_do: [],
  perks: [],
  values: [],
  faqs: [],
  location_id: 'loc1',
  locality: 'Indiranagar',
  matched_venues_count: 0,
  category_id: 'cat-1',
  super_category_id: 'sc1',
  admin_user_ids: ['u7'],
  club_admins: [{ __typename: 'ClubAdmin', id: 'u7', name: 'Ravi', avatar_url: null }],
  is_verified: false,
  is_active: true,
  created_at: '2026-02-01T00:00:00.000Z',
  updated_at: '2026-02-02T00:00:00.000Z',
};

vi.mock('../ClubsTable', () => ({
  default: ({
    toolbarActions,
    catName,
    refetchRef,
    onEdit,
    onRemove,
    onView,
  }: {
    toolbarActions?: ReactNode;
    catName: (id: string) => string;
    refetchRef: MutableRefObject<(() => void) | null>;
    onEdit: (c: ClubRow) => void;
    onRemove: (c: ClubRow) => void;
    onView: (c: ClubRow) => void;
  }) => (
    <div>
      {toolbarActions}
      <span data-testid="cat-known">{catName('cat-1')}</span>
      <span data-testid="cat-unknown">{catName('nope')}</span>
      <button type="button" onClick={() => onEdit(ROW)}>
        row-edit
      </button>
      <button type="button" onClick={() => onRemove(ROW)}>
        row-remove
      </button>
      <button type="button" onClick={() => onView(ROW)}>
        row-view
      </button>
      <button
        type="button"
        onClick={() => {
          refetchRef.current = refetchSpy;
        }}
      >
        set-refetch
      </button>
    </div>
  ),
}));

vi.mock('../ClubFormDialog', () => ({
  default: ({
    open,
    initialValues,
    initialAdmins,
    busy,
    opError,
    onSubmit,
    onClose,
    onPickImage,
  }: {
    open: boolean;
    initialValues: ClubFormValues;
    initialAdmins: ClubAdmin[];
    busy: boolean;
    opError: string | null;
    onSubmit: (values: ClubFormValues, options: { draft: boolean }) => void;
    onClose: () => void;
    onPickImage: (folder?: string) => Promise<string | null>;
  }) => {
    const [picked, setPicked] = useState('');
    if (!open) return null;
    const submit = (draft: boolean) => onSubmit({ ...SUBMITTED, id: initialValues.id }, { draft });
    return (
      <div>
        <span data-testid="form-club-name">{initialValues.club_name || 'blank'}</span>
        <span data-testid="form-club-id">{initialValues.id ?? 'new'}</span>
        <span data-testid="form-admins">{initialAdmins.map((a) => a.name).join(',') || 'none'}</span>
        <span data-testid="form-busy">{busy ? 'busy' : 'idle'}</span>
        <span data-testid="form-error">{opError ?? ''}</span>
        <span data-testid="form-picked">{picked}</span>
        <button type="button" onClick={() => submit(false)}>
          form-save
        </button>
        <button type="button" onClick={() => submit(true)}>
          form-draft
        </button>
        <button
          type="button"
          onClick={() => {
            onPickImage('/club-covers').then((url) => setPicked(url === null ? 'cancelled' : url));
          }}
        >
          form-pick
        </button>
        <button type="button" onClick={onClose}>
          form-close
        </button>
      </div>
    );
  },
}));

vi.mock('../../../components/MediaPickerDialog', () => ({
  default: ({
    open,
    folder,
    onPicked,
    onClose,
  }: {
    open: boolean;
    folder?: string;
    onPicked: (url: string) => void;
    onClose: () => void;
  }) =>
    open ? (
      <div>
        <span data-testid="picker-folder">{folder}</span>
        <button type="button" onClick={() => onPicked('https://cdn.test/cover.jpg')}>
          picker-pick
        </button>
        <button type="button" onClick={onClose}>
          picker-close
        </button>
      </div>
    ) : null,
}));

const categoriesMock = (): MockedResponse => ({
  request: { query: CATEGORIES },
  result: {
    data: {
      categories: [
        { __typename: 'Category', id: 'cat-1', name: 'Board Games', level: 2, parent_id: 'sc1' },
      ],
    },
  },
  maxUsageCount: 5,
});

const renderPage = (mocks: MockedResponse[] = [], entry = '/clubs') =>
  renderWithProviders(<ClubsPage />, {
    mocks: [categoriesMock(), ...mocks],
    initialEntries: [entry],
    routes: (
      <>
        <Route path="/clubs" element={<ClubsPage />} />
        <Route path="/clubs/:id" element={<div>club-details-page</div>} />
      </>
    ),
  });

describe('ClubsPage', () => {
  beforeEach(() => {
    refetchSpy.mockReset();
  });

  it('resolves category names for the table and dashes out unknown ids', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('cat-known')).toHaveTextContent('Board Games'));
    expect(screen.getByTestId('cat-unknown')).toHaveTextContent('—');
  });

  it('opens a blank form from "New Club" and closes it again', () => {
    renderPage();
    expect(screen.queryByTestId('form-club-name')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New Club' }));
    expect(screen.getByTestId('form-club-name')).toHaveTextContent('blank');
    expect(screen.getByTestId('form-club-id')).toHaveTextContent('new');
    expect(screen.getByTestId('form-admins')).toHaveTextContent('none');

    fireEvent.click(screen.getByText('form-close'));
    expect(screen.queryByTestId('form-club-name')).not.toBeInTheDocument();
  });

  it('prefills the form from the row being edited', () => {
    renderPage();
    fireEvent.click(screen.getByText('row-edit'));
    expect(screen.getByTestId('form-club-name')).toHaveTextContent('Chess Club');
    expect(screen.getByTestId('form-club-id')).toHaveTextContent('c1');
  });

  it('creates a club with the admin-config input and refetches the table', async () => {
    renderPage([
      {
        request: { query: CREATE, variables: { input: CREATE_INPUT } },
        result: { data: { createClub: { __typename: 'Club', id: 'new-1' } } },
      },
    ]);
    fireEvent.click(screen.getByText('set-refetch'));
    fireEvent.click(screen.getByRole('button', { name: 'New Club' }));
    fireEvent.click(screen.getByText('form-save'));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.queryByTestId('form-club-name')).not.toBeInTheDocument();
    expect(refetchSpy).toHaveBeenCalledTimes(1);
    // The toast clears itself after its auto-hide window.
    await waitFor(() => expect(screen.queryByText('Saved')).not.toBeInTheDocument(), {
      timeout: 5000,
    });
  });

  it('saves a draft as inactive', async () => {
    renderPage([
      {
        request: { query: CREATE, variables: { input: { ...CREATE_INPUT, is_active: false } } },
        result: { data: { createClub: { __typename: 'Club', id: 'new-2' } } },
      },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'New Club' }));
    fireEvent.click(screen.getByText('form-draft'));

    expect(await screen.findByText('Draft saved')).toBeInTheDocument();
  });

  it('updates an existing club by id instead of creating one', async () => {
    // club_id is a create-only field; an edit must not resend it.
    const updateInput = Object.fromEntries(
      Object.entries(CREATE_INPUT).filter(([key]) => key !== 'club_id'),
    );
    renderPage([
      {
        request: { query: UPDATE, variables: { id: 'c1', input: updateInput } },
        result: { data: { updateClub: { __typename: 'Club', id: 'c1' } } },
      },
    ]);
    fireEvent.click(screen.getByText('row-edit'));
    fireEvent.click(screen.getByText('form-save'));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('keeps the form open and shows the error when the save fails', async () => {
    renderPage([
      {
        request: { query: CREATE, variables: { input: CREATE_INPUT } },
        result: { errors: [new GraphQLError('Club name already taken')] },
      },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'New Club' }));
    fireEvent.click(screen.getByText('form-save'));

    await waitFor(() =>
      expect(screen.getByTestId('form-error')).toHaveTextContent('Club name already taken'),
    );
    expect(screen.getByTestId('form-club-name')).toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('deletes a club after the confirmation is accepted', async () => {
    renderPage([
      {
        request: { query: DELETE, variables: { id: 'c1' } },
        result: { data: { deleteClub: true } },
      },
    ]);
    fireEvent.click(screen.getByText('set-refetch'));
    fireEvent.click(screen.getByText('row-remove'));
    expect(await screen.findByText('Delete club "Chess Club"?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
    expect(refetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does not delete when the confirmation is cancelled', async () => {
    renderPage();
    fireEvent.click(screen.getByText('row-remove'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Delete club "Chess Club"?')).not.toBeInTheDocument());
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });

  it('notifies when the delete mutation fails', async () => {
    renderPage([
      {
        request: { query: DELETE, variables: { id: 'c1' } },
        result: { errors: [new GraphQLError('Club still has pods')] },
      },
    ]);
    fireEvent.click(screen.getByText('row-remove'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Club still has pods')).toBeInTheDocument();
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });

  it('navigates to the club details page from the row view action', async () => {
    renderPage();
    fireEvent.click(screen.getByText('row-view'));
    expect(await screen.findByText('club-details-page')).toBeInTheDocument();
  });

  it('opens the edit form for a /clubs?edit=<id> deep link', async () => {
    renderPage(
      [
        {
          request: { query: CLUB_FOR_EDIT, variables: { id: 'c9' } },
          result: { data: { club: CLUB_FOR_EDIT_RESULT } },
        },
      ],
      '/clubs?edit=c9',
    );

    expect(await screen.findByTestId('form-club-name')).toHaveTextContent('Deep Linked Club');
    expect(screen.getByTestId('form-club-id')).toHaveTextContent('c9');
    expect(screen.getByTestId('form-admins')).toHaveTextContent('Ravi');
  });

  it('notifies when the deep-linked club cannot be fetched', async () => {
    renderPage(
      [
        {
          request: { query: CLUB_FOR_EDIT, variables: { id: 'c404' } },
          error: new Error('Club not found'),
        },
      ],
      '/clubs?edit=c404',
    );

    expect(await screen.findByText('Club not found')).toBeInTheDocument();
    expect(screen.queryByTestId('form-club-name')).not.toBeInTheDocument();
  });

  it('bridges the form image picker to the media dialog and resolves the URL', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'New Club' }));
    fireEvent.click(screen.getByText('form-pick'));

    expect(await screen.findByTestId('picker-folder')).toHaveTextContent('/club-covers');
    fireEvent.click(screen.getByText('picker-pick'));

    expect(await screen.findByTestId('form-picked')).toHaveTextContent('https://cdn.test/cover.jpg');
    expect(screen.queryByTestId('picker-folder')).not.toBeInTheDocument();
  });

  it('resolves the image picker with null when the media dialog is dismissed', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'New Club' }));
    fireEvent.click(screen.getByText('form-pick'));
    fireEvent.click(await screen.findByText('picker-close'));

    expect(await screen.findByTestId('form-picked')).toHaveTextContent('cancelled');
  });
});
