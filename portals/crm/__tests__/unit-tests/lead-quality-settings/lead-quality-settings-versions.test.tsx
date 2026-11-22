import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { DELETE_LEAD_QUALITY_DRAFT, START_LEAD_QUALITY_DRAFT_FROM_VERSION } from '@/api/leadQuality.gql';
import LeadQualitySettingsPage from '@/pages/lead-quality-settings';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { configFixture, eventFixture, publishedFixture, settingsFixture } from './fixtures';
import { historyMock, settingsMock, versionsMock } from './mocks';

const { notifySuccess } = vi.hoisted(() => ({ notifySuccess: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<typeof import('@duncit/dialogs')>()), notifySuccess }));

const startMock = (version: number): MockedResponse => ({
  request: { query: START_LEAD_QUALITY_DRAFT_FROM_VERSION, variables: { lead_type: 'HOST_LEAD', version } },
  result: { data: { startCrmLeadQualityDraftFromVersion: configFixture({ change_note: `Started from version ${version}` }) } },
});

const archived = publishedFixture({ id: 'cfg-2', version: 2, status: 'ARCHIVED', change_note: 'First tune', archived_at: '2026-11-01T09:30:00.000Z' });

const renderPage = (withDraft: boolean, extra: MockedResponse[] = [], history = [eventFixture({})]) =>
  renderWithApollo(
    <LeadQualitySettingsPage />,
    [settingsMock(settingsFixture(withDraft)), versionsMock([configFixture(), publishedFixture(), archived]), historyMock(history), ...extra],
    { route: '/settings/lead-quality' },
  );

beforeEach(() => {
  window.localStorage.clear();
  notifySuccess.mockClear();
});

describe('Lead Quality Score drafts and versions', () => {
  it('shows the published version read-only until Edit starts a draft from it', async () => {
    renderPage(false, [startMock(3)]);
    await screen.findByText('Published version 3');
    expect(screen.getByTestId('lead-quality-criterion-0-name')).toBeDisabled();
    expect(screen.queryByTestId('lead-quality-save')).toBeNull();

    fireEvent.click(screen.getByTestId('lead-quality-edit'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Draft version 4 started from version 3.'));
  });

  it('discards the draft only after the admin confirms', async () => {
    renderPage(true, [{ request: { query: DELETE_LEAD_QUALITY_DRAFT, variables: { lead_type: 'HOST_LEAD' } }, result: { data: { deleteCrmLeadQualityDraft: true } } }]);
    await screen.findByText('Published version 3');

    fireEvent.click(screen.getByTestId('lead-quality-discard'));
    const dialog = await screen.findByTestId('confirm-dialog');
    expect(within(dialog).getByText('Discard draft version 4?')).toBeInTheDocument();
    expect(within(dialog).getByText('Its changes are deleted. The published version stays in use.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Draft discarded. The published version stays in use.'));
  });

  it('lists every version with its status and restores an archived one as the draft', async () => {
    renderPage(true, [startMock(2)]);
    const table = await screen.findByTestId('lead-quality-versions');
    expect(await within(table).findByText('First tune')).toBeInTheDocument();
    expect(within(table).getByText('Archived')).toBeInTheDocument();
    // The draft itself is not offered as something to restore.
    expect(within(table).getByRole('button', { name: 'Restore version 4 as draft' })).toBeDisabled();

    fireEvent.click(within(table).getByRole('button', { name: 'Restore version 2 as draft' }));
    const dialog = await screen.findByTestId('confirm-dialog');
    expect(within(dialog).getByText('Restore version 2 as the draft?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Draft version 4 started from version 2.'));
  });

  it('lists the settings change log: what changed, which version, who and why', async () => {
    renderPage(true, [], [
      eventFixture({ id: 'e2', kind: 'CONFIG_PUBLISH', config_version: 3, note: 'Went live', actor: { __typename: 'CrmLeadQualityActor', id: 'u-ravi', name: 'Ravi' } }),
      eventFixture({ id: 'e1', kind: 'CONFIG_DISCARD', note: '' }),
    ]);
    const log = await screen.findByTestId('lead-quality-change-log');
    expect(await within(log).findByText('Went live')).toBeInTheDocument();
    expect(within(log).getByText('Published')).toBeInTheDocument();
    expect(within(log).getByText('Draft discarded')).toBeInTheDocument();
    expect(within(log).getByText('Ravi')).toBeInTheDocument();
  });
});
