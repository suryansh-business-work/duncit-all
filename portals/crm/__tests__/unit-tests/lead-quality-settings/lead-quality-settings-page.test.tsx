import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { LEAD_QUALITY_SETTINGS, PUBLISH_LEAD_QUALITY_CONFIG, SAVE_LEAD_QUALITY_DRAFT } from '@/api/leadQuality.gql';
import LeadQualitySettingsPage from '@/pages/lead-quality-settings';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { configFixture, fixtureInput, publishedFixture, settingsFixture } from './fixtures';
import { historyMock, refused, settingsMock, versionsMock } from './mocks';

const { notifySuccess } = vi.hoisted(() => ({ notifySuccess: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<typeof import('@duncit/dialogs')>()), notifySuccess }));

const base = (withDraft = true): MockedResponse[] => [settingsMock(settingsFixture(withDraft)), versionsMock([]), historyMock([])];
const renderPage = (mocks: MockedResponse[], route = '/settings/lead-quality') => renderWithApollo(<LeadQualitySettingsPage />, mocks, { route });
const type = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });

const saveMock = (input: ReturnType<typeof fixtureInput>, result: MockedResponse['result'], revision = 7): MockedResponse => ({
  request: { query: SAVE_LEAD_QUALITY_DRAFT, variables: { lead_type: 'HOST_LEAD', input, revision, change_note: 'Tuned weights' } },
  result,
});
const publishMock = (revision: number, jobId: string | null): MockedResponse => ({
  request: { query: PUBLISH_LEAD_QUALITY_CONFIG, variables: { lead_type: 'HOST_LEAD', revision, change_note: 'Tuned weights' } },
  result: {
    data: {
      publishCrmLeadQualityConfig: {
        __typename: 'CrmLeadQualityPublishResult',
        recalculation_job_id: jobId,
        config: configFixture({ status: 'PUBLISHED', published_at: '2026-11-22T10:00:00.000Z', published_by: configFixture().updated_by }),
      },
    },
  },
});

beforeEach(() => {
  window.localStorage.clear();
  notifySuccess.mockClear();
});

describe('Lead Quality Score settings page', () => {
  it('shows the version in use and the draft, with one URL-selected tab per lead type', async () => {
    const venue = { ...settingsFixture(false), lead_type: 'VENUE_LEAD' as const, published: publishedFixture({ lead_type: 'VENUE_LEAD', version: 1 }) };
    renderPage([...base(), settingsMock(venue)]);

    expect(await screen.findByText('Published version 3')).toBeInTheDocument();
    expect(screen.getByText(/^Published by Ravi on /)).toBeInTheDocument();
    expect(screen.getByTestId('lead-quality-draft-status')).toHaveTextContent(/^Draft version 4, last saved by Asha on /);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Host lead', 'Venue lead', 'Community lead', 'Creator lead', 'Ecomm lead']);

    fireEvent.click(screen.getByRole('tab', { name: 'Venue lead' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/settings/lead-quality?selectedtab=VENUE_LEAD');
    expect(await screen.findByText('Published version 1')).toBeInTheDocument();
    expect(screen.getByTestId('lead-quality-draft-status')).toHaveTextContent('No draft.');
    expect(screen.getByTestId('lead-quality-edit')).toBeInTheDocument();
  });

  it('saves the draft with the revision it loaded and the exact criteria input', async () => {
    const input = fixtureInput();
    input.criteria[0].weightage = 15;
    renderPage([...base(), saveMock(input, { data: { saveCrmLeadQualityDraft: configFixture({ revision: 8 }) } })]);
    await screen.findByText('Published version 3');

    type('lead-quality-criterion-0-weightage', '15');
    fireEvent.click(screen.getByTestId('lead-quality-save'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Draft saved.'));
    expect(screen.queryByTestId('lead-quality-failure')).toBeNull();
  });

  it('publishes the stored draft once confirmed and says every lead is being rescored in the background', async () => {
    renderPage([...base(), publishMock(7, 'job-1')]);
    await screen.findByText('Published version 3');

    fireEvent.click(screen.getByTestId('lead-quality-publish'));
    const dialog = await screen.findByTestId('confirm-dialog');
    expect(within(dialog).getByText('Publish version 4?')).toBeInTheDocument();
    expect(within(dialog).getByText(/^Every Host lead in the CRM is rescored with this version in a background job\./)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-confirm'));

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        'Version 4 is live. Every lead of this type is being rescored in the background; follow the progress in the header.',
      ),
    );
  });

  it('saves unsaved edits first and publishes the revision that save returned', async () => {
    const input = fixtureInput();
    input.criteria[0].name = 'Uniqueness';
    renderPage([...base(), saveMock(input, { data: { saveCrmLeadQualityDraft: configFixture({ revision: 8 }) } }), publishMock(8, null)]);
    await screen.findByText('Published version 3');

    type('lead-quality-criterion-0-name', 'Uniqueness');
    fireEvent.click(screen.getByTestId('lead-quality-publish'));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    // Save, publish and the awaited refetch each re-render the whole form, so this outlasts the default 1 s on CI.
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Version 4 is live. There are no leads of this type to rescore yet.'), {
      timeout: 10_000,
    });
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('publishes nothing when the confirmation is cancelled', async () => {
    renderPage(base());
    await screen.findByText('Published version 3');
    fireEvent.click(screen.getByTestId('lead-quality-publish'));
    fireEvent.click(await screen.findByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('asks for a reload when someone else saved the draft first', async () => {
    renderPage([...base(), saveMock(fixtureInput(), refused('Someone else saved this draft.', { code: 'CONFLICT' }))]);
    await screen.findByText('Published version 3');
    fireEvent.click(screen.getByTestId('lead-quality-save'));

    expect(await screen.findByTestId('lead-quality-failure')).toHaveTextContent(
      'Someone else changed this draft after you opened it. Reload to see their changes.',
    );
    fireEvent.click(screen.getByTestId('lead-quality-reload'));
    await waitFor(() => expect(screen.queryByTestId('lead-quality-failure')).toBeNull());
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it("puts the server's BAD_USER_INPUT issues on the form's fields", async () => {
    const issue = { path: 'criteria.2.name', code: 'NAME_TOO_LONG', message: 'Keep names under 80 characters.', amount: 80 };
    renderPage([...base(), saveMock(fixtureInput(), refused(issue.message, { code: 'BAD_USER_INPUT', issues: [issue] }))]);
    await screen.findByText('Published version 3');
    fireEvent.click(screen.getByTestId('lead-quality-save'));

    expect(await screen.findByTestId('lead-quality-server-issues')).toHaveTextContent('The server refused this configuration.');
    expect(await screen.findByText('Keep names under 80 characters.')).toBeInTheDocument();
    expect(screen.getByTestId('lead-quality-criterion-2-name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByTestId('lead-quality-failure')).toBeNull();
  });

  it('shows any other refusal as the server worded it', async () => {
    renderPage([...base(), saveMock(fixtureInput(), refused('You cannot change scoring settings.', { code: 'FORBIDDEN' }))]);
    await screen.findByText('Published version 3');
    fireEvent.click(screen.getByTestId('lead-quality-save'));
    expect(await screen.findByTestId('lead-quality-failure')).toHaveTextContent('You cannot change scoring settings.');
    expect(screen.queryByTestId('lead-quality-reload')).toBeNull();
  });

  it('offers a retry when the scoring model cannot be loaded', async () => {
    renderPage([
      { request: { query: LEAD_QUALITY_SETTINGS, variables: { lead_type: 'HOST_LEAD' } }, result: { errors: [new GraphQLError('Settings are down')] } },
    ]);
    expect(await screen.findByText('Settings are down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
