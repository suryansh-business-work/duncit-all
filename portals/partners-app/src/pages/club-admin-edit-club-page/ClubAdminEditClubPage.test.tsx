import { useState } from 'react';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ClubEditorPageProps } from '@duncit/club-form';
import ClubAdminEditClubPage from './ClubAdminEditClubPage';
import { renderWithProviders } from '../../__tests__/render';
import { STAY_PENDING, scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';
import { PICKED_MEDIA_URL } from '../../__tests__/groupC-media-picker';
import { recordNotices } from '../../__tests__/groupC-notices';

/**
 * The club editor has its own suite in @duncit/club-form. This stand-in shows
 * what the page seeds it with and exposes the three things it calls back.
 */
function ClubEditorStub({
  eyebrow,
  heading,
  backLabel,
  initialValues,
  error,
  onBack,
  onSubmit,
  onPickImage,
}: Readonly<ClubEditorPageProps>) {
  const [picked, setPicked] = useState('');
  const pick = (folder?: string) => {
    onPickImage?.(folder).then((url) => setPicked(url ?? 'Nothing picked'));
  };
  return (
    <main>
      <p>{eyebrow}</p>
      <h1>{heading}</h1>
      <p>{`Prefilled: ${initialValues.club_name} / ${initialValues.locality}`}</p>
      {error && <p>{error}</p>}
      {picked && <p>{`Picked: ${picked}`}</p>}
      <button type="button" onClick={onBack}>
        {backLabel}
      </button>
      <button type="button" onClick={() => onSubmit(initialValues, { draft: false })}>
        Save club
      </button>
      <button type="button" onClick={() => pick()}>
        Add cover
      </button>
      <button type="button" onClick={() => pick('/clubs/moments')}>
        Add moment
      </button>
    </main>
  );
}

vi.mock(import('@duncit/club-form'), async (importOriginal) => ({
  ...(await importOriginal()),
  ClubEditorPage: ClubEditorStub,
}));
vi.mock('../../components/MediaPickerDialog', () => import('../../__tests__/groupC-media-picker'));

const recorder = recordNotices();
afterEach(() => {
  cleanup();
  recorder.notices.length = 0;
});
afterAll(recorder.stop);

const club = {
  __typename: 'Club',
  id: 'club-1',
  club_id: 'DUN-CLUB-104',
  club_name: 'Sunrise Tennis Club',
  club_description: 'Weekend doubles for every level.',
  super_category_id: 'super-sports',
  category_id: 'cat-tennis',
  location_id: 'loc-blr',
  locality: 'Indiranagar',
  club_feature_images_and_videos: [
    { __typename: 'ClubMedia', url: 'https://ik.imagekit.io/duncit/clubs/sunrise.jpg', type: 'IMAGE' },
  ],
  club_moments: [],
  club_whats_app_community_link: '',
  club_whats_app_group_link: '',
  who_we_are: ['Weekend players'],
  what_we_do: ['Doubles ladders'],
  perks: [],
  values: [],
  faqs: [{ __typename: 'ClubFaq', question: 'Do I need a racquet?', answer: 'We lend one.' }],
  admin_user_ids: ['user-1'],
  club_admins: [{ __typename: 'ClubActor', id: 'user-1', name: 'Asha Rao', avatar_url: null }],
  is_verified: true,
  is_active: true,
};

const mount = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) =>
  renderWithProviders(<ClubAdminEditClubPage />, {
    path: '/club-admin/clubs/:clubId/edit',
    route: '/club-admin/clubs/club-1/edit',
    link: scriptedLink({ ClubForEdit: { club }, ...answers }, sent),
  });

const updated = { clubAdminUpdateClub: { __typename: 'Club', id: 'club-1' } };

describe('ClubAdminEditClubPage', () => {
  it('spins while the club loads', () => {
    mount({ ClubForEdit: STAY_PENDING });
    expect(screen.getByTestId('loader')).toBeTruthy();
  });

  it('shows the load failure', async () => {
    mount({ ClubForEdit: new Error('Club lookup failed') });
    expect(await screen.findByText('Club lookup failed')).toBeTruthy();
  });

  it('says so when the club does not exist', async () => {
    mount({ ClubForEdit: { club: null } });
    expect(await screen.findByText('Club not found.')).toBeTruthy();
  });

  it('opens the editor prefilled with the club and named after it', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent);

    expect(await screen.findByRole('heading', { name: 'Sunrise Tennis Club' })).toBeTruthy();
    expect(screen.getByText('Club Admin · Edit')).toBeTruthy();
    expect(screen.getByText('Prefilled: Sunrise Tennis Club / Indiranagar')).toBeTruthy();
    expect(sent[0]?.variables).toEqual({ club_doc_id: 'club-1' });
  });

  it('saves the page content only, confirms and returns to the club', async () => {
    const sent: SentOperation[] = [];
    mount({ ClubAdminUpdateClub: updated }, sent);

    fireEvent.click(await screen.findByRole('button', { name: 'Save club' }));

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/club-admin/clubs/club-1'));
    expect(recorder.notices).toEqual([{ message: 'Club details updated.', severity: 'success' }]);
    const save = sent.find((op) => op.name === 'ClubAdminUpdateClub');
    expect(save?.variables.club_doc_id).toBe('club-1');
    const input = save?.variables.input as Record<string, unknown>;
    expect(input.club_name).toBe('Sunrise Tennis Club');
    // Governance stays with Duncit admins.
    expect(input).not.toHaveProperty('admin_user_ids');
    expect(input).not.toHaveProperty('is_verified');
  });

  it('keeps the editor open with the server’s reason when the save fails', async () => {
    mount({ ClubAdminUpdateClub: new Error('Club name already taken') });

    fireEvent.click(await screen.findByRole('button', { name: 'Save club' }));

    expect(await screen.findByText('Club name already taken')).toBeTruthy();
    expect(screen.getByTestId('location').textContent).toBe('/club-admin/clubs/club-1/edit');
    expect(recorder.notices).toHaveLength(0);
  });

  it('goes back to the club without saving', async () => {
    mount({});
    fireEvent.click(await screen.findByRole('button', { name: 'Back to pods' }));
    expect(screen.getByTestId('location').textContent).toBe('/club-admin/clubs/club-1');
  });

  it('hands a picked image back to the editor, and nothing when the picker is dismissed', async () => {
    mount({});

    fireEvent.click(await screen.findByRole('button', { name: 'Add cover' }));
    let picker = screen.getByRole('region', { name: 'Media picker' });
    expect(picker.getAttribute('data-folder')).toBe('/clubs');
    expect(within(picker).getByText('Add club image')).toBeTruthy();
    fireEvent.click(within(picker).getByRole('button', { name: 'Choose media' }));
    expect(await screen.findByText(`Picked: ${PICKED_MEDIA_URL}`)).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Media picker' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Add moment' }));
    picker = screen.getByRole('region', { name: 'Media picker' });
    expect(picker.getAttribute('data-folder')).toBe('/clubs/moments');
    fireEvent.click(within(picker).getByRole('button', { name: 'Dismiss picker' }));
    expect(await screen.findByText('Picked: Nothing picked')).toBeTruthy();
  });
});
