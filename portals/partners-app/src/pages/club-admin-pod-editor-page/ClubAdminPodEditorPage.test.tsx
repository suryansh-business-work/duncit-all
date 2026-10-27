import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import ClubAdminPodEditorPage from './index';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer } from '../../__tests__/groupC-link';

const mocks = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  onSaved: null as null | ((result: { created: boolean; draft: boolean }) => void),
  editing: null as null | boolean,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notifySuccess: mocks.notifySuccess,
}));
vi.mock('@duncit/media-picker', () => ({ MediaPickerDialog: () => null }));
vi.mock('@duncit/pod-form', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useMediaPickerBridge: () => ({ pickImage: vi.fn(), pickVideo: vi.fn(), settlePicker: vi.fn(), pickerOpen: false }),
  useClubAdminPodEditor: (args: { onSaved: typeof mocks.onSaved }) => {
    mocks.onSaved = args.onSaved;
    return { initialValues: {}, busy: false, opError: null, hostSeed: [], searchHosts: vi.fn(), editingPodDocId: null, submit: vi.fn() };
  },
  PodEditorPage: (props: { editing: boolean; eyebrow: string; onBack: () => void; intro: React.ReactNode }) => {
    mocks.editing = props.editing;
    return (
      <div>
        <p data-testid="eyebrow">{props.eyebrow}</p>
        <button type="button" onClick={props.onBack}>
          back
        </button>
        {props.intro}
      </div>
    );
  },
}));

afterEach(cleanup);
beforeEach(() => {
  mocks.notifySuccess.mockReset();
  mocks.onSaved = null;
});

const lookups = {
  myAdminClubs: [{ __typename: 'Club', id: 'c1', club_name: 'Sunrise Club' }],
  availablePodProducts: [],
  publicVenues: [],
  myVenues: [],
};

const mount = (path: string, answers: Record<string, ScriptedAnswer>) =>
  renderWithProviders(<ClubAdminPodEditorPage />, {
    route: path,
    path: '/club-admin/clubs/:clubId/pods/:id?',
    link: scriptedLink({ ClubAdminPodLookups: lookups, ...answers }),
  });

describe('ClubAdminPodEditorPage', () => {
  it('names the club in the eyebrow and goes back to the club on Back', async () => {
    mount('/club-admin/clubs/c1/pods', {});
    await waitFor(() => expect(screen.getByTestId('eyebrow').textContent).toContain('Sunrise Club'));
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    expect(screen.getByTestId('location').textContent).toBe('/club-admin/clubs/c1');
  });

  it('says the lookups failed above the form', async () => {
    mount('/club-admin/clubs/c1/pods', { ClubAdminPodLookups: new Error('Lookups are down') });
    expect(await screen.findByText('Lookups are down')).toBeTruthy();
  });

  it('warns when the pod being edited cannot be found', async () => {
    mount('/club-admin/clubs/c1/pods/p9', { ClubAdminPodForEdit: { clubAdminPodForEdit: null } });
    expect(await screen.findByText('Pod not found in this club.')).toBeTruthy();
  });

  it('shows the server message when the pod being edited cannot be read', async () => {
    mount('/club-admin/clubs/c1/pods/p9', { ClubAdminPodForEdit: new Error('Pod is down') });
    expect(await screen.findByText('Pod is down')).toBeTruthy();
  });

  it.each([
    [{ created: true, draft: false }, 'Pod created.'],
    [{ created: true, draft: true }, 'Pod draft saved.'],
    [{ created: false, draft: false }, 'Pod updated.'],
  ])('tells the admin %j was saved and returns to the club', async (saved, message) => {
    mount('/club-admin/clubs/c1/pods', {});
    await screen.findByTestId('eyebrow');
    mocks.onSaved?.(saved);
    await waitFor(() => expect(mocks.notifySuccess).toHaveBeenCalledTimes(1));
    expect(mocks.notifySuccess.mock.calls[0][0]).toBe(message);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/club-admin/clubs/c1'));
  });
});
