import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import ClubAdminAutoPodEditorPage from './index';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';
import { recordNotices } from '../../__tests__/groupC-notices';

interface EditorProps {
  title: string;
  eyebrow: string;
  error: string | null;
  busy: boolean;
  intro: ReactNode;
  initialValues: Record<string, unknown>;
  config: Record<string, unknown>;
  products: unknown[];
  onBack: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
}

/**
 * The stepper itself has its own suite in @duncit/pod-form; this page decides which
 * club it opens for, what it is seeded with and where a saved offer goes, so the
 * stepper is a stand-in that shows those inputs and submits what it was seeded with.
 */
function EditorStub(props: Readonly<EditorProps>) {
  return (
    <div data-testid="editor">
      <h1>{props.title}</h1>
      <p data-testid="eyebrow">{props.eyebrow}</p>
      <p data-testid="seed">{`${props.initialValues.super_category_id}|${props.initialValues.sub_category_id}`}</p>
      <p data-testid="config">{`${props.config.autoPod}|${props.config.lockCategory}|${props.config.showFinance}`}</p>
      <p data-testid="products">{props.products.length}</p>
      {props.intro}
      {props.error && <p role="alert">{props.error}</p>}
      <button type="button" disabled={props.busy} onClick={() => props.onSubmit(props.initialValues)}>
        Submit offer
      </button>
      <button type="button" onClick={props.onBack}>
        Back
      </button>
    </div>
  );
}

vi.mock(import('@duncit/pod-form'), async (importOriginal) => ({
  ...(await importOriginal()),
  PodEditorPage: EditorStub as never,
}));

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});

const lookups = (clubs: unknown[], products: unknown[] = []) => ({ myAdminClubs: clubs, availablePodProducts: products });
const club = (over: Record<string, unknown> = {}) => ({
  __typename: 'Club',
  id: 'club1',
  club_name: 'Smash Club',
  meetup_venues_id: [],
  super_category_id: 'super1',
  category_id: 'sub1',
  ...over,
});

const mount = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) =>
  renderWithProviders(<ClubAdminAutoPodEditorPage />, {
    route: '/club-admin/clubs/club1/auto-pods/new',
    path: '/club-admin/clubs/:clubId/auto-pods/new',
    link: scriptedLink(answers, sent),
  });

describe('ClubAdminAutoPodEditorPage', () => {
  it('opens the Auto Pod form locked to the club’s own category', async () => {
    mount({ ClubAdminPodLookups: lookups([club(), club({ id: 'other', club_name: 'Other' })], [{ __typename: 'Product', id: 'p1' }]) });
    expect(await screen.findByTestId('editor')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'New Auto Pod' })).toBeTruthy();
    expect(screen.getByTestId('eyebrow').textContent).toBe('Club Admin · Smash Club');
    expect(screen.getByTestId('seed').textContent).toBe('super1|sub1');
    expect(screen.getByTestId('config').textContent).toBe('true|true|false');
    expect(screen.getByTestId('products').textContent).toBe('1');
    expect(screen.getByText(/already claimed for Smash Club/)).toBeTruthy();
  });

  it('refuses to open the form for a club with no category', async () => {
    mount({ ClubAdminPodLookups: lookups([club({ category_id: null })]) });
    expect(
      await screen.findByText('This club has no category yet. Set one under Edit Club Details before opening an Auto Pod.'),
    ).toBeTruthy();
    expect(screen.queryByTestId('editor')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to pods' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/club-admin/clubs/club1'));
  });

  it('says the club was not found when it is not one the admin runs', async () => {
    mount({ ClubAdminPodLookups: lookups([club({ id: 'someone-elses' })]) });
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByTestId('editor')).toBeNull();
  });

  it('shows the lookup failure', async () => {
    mount({ ClubAdminPodLookups: new Error('Clubs unavailable') });
    expect(await screen.findByText('Clubs unavailable')).toBeTruthy();
  });

  it('opens the offer pinned to the club, tells the admin and goes to the Auto Pods queue', async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        ClubAdminPodLookups: lookups([club()]),
        ClubAdminCreateAutoPod: { createAutoPod: { __typename: 'AutoPod', id: 'ap1', auto_pod_no: 'DUN-AP-9' } },
      },
      sent,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Submit offer' }));

    await waitFor(() =>
      expect(notices.notices.map((n) => n.message)).toContain('Auto Pod opened — venues, hosts and club admins can now enrol.'),
    );
    const create = sent.find((op) => op.name === 'ClubAdminCreateAutoPod');
    expect(create?.variables.club_id).toBe('club1');
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/club-admin/auto-pods'));
  });

  it('shows the server refusal on the form and stays', async () => {
    mount({ ClubAdminPodLookups: lookups([club()]), ClubAdminCreateAutoPod: new Error('Club is suspended') });
    fireEvent.click(await screen.findByRole('button', { name: 'Submit offer' }));
    expect(await screen.findByText('Club is suspended')).toBeTruthy();
    expect(screen.getByTestId('editor')).toBeTruthy();
  });

  it('goes back to the club’s pods', async () => {
    mount({ ClubAdminPodLookups: lookups([club()]) });
    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/club-admin/clubs/club1'));
  });
});
