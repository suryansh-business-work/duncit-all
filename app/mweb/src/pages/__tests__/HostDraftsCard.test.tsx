import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { gql } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { MemoryRouter } from 'react-router-dom';
import HostDraftsCard from '../HostDraftsCard';
import { PUBLIC_APP_SETTINGS } from '../../utils/dateFormat';

const MY_POD_DRAFTS = gql`
  query MyPodDrafts {
    myPodDrafts {
      id
      pod_title
      step
      updated_at
    }
  }
`;
const DELETE_POD_DRAFT = gql`
  mutation DeletePodDraft($draft_id: ID!) {
    deletePodDraft(draft_id: $draft_id)
  }
`;

const settingsMock = {
  request: { query: PUBLIC_APP_SETTINGS },
  result: {
    data: {
      publicAppSettings: {
        date_format: 'dd MMM yyyy',
        time_format: 'hh:mm a',
        time_zone: 'Asia/Kolkata',
        min_birth_year: 1940,
        max_birth_year: 2012,
        draft_retention_days: 7,
      },
    },
  },
};

const draftsMock = (drafts: unknown[]) => ({
  request: { query: MY_POD_DRAFTS },
  result: { data: { myPodDrafts: drafts } },
});

const sampleDrafts = [
  { id: 'd1', pod_title: 'Sunday Football', step: 1, updated_at: '2026-07-01T10:00:00.000Z' },
  { id: 'd2', pod_title: '', step: 0, updated_at: null },
];

function renderCard(mocks: unknown[]) {
  return render(
    <MockedProvider mocks={mocks as never} addTypename={false}>
      <MemoryRouter>
        <HostDraftsCard />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('HostDraftsCard', () => {
  it('renders nothing while loading with no data', () => {
    const { container } = renderCard([draftsMock(sampleDrafts), settingsMock]);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no drafts', async () => {
    const { container } = renderCard([draftsMock([]), settingsMock]);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    // still empty after query resolves
    expect(screen.queryByText('Draft pods')).not.toBeInTheDocument();
  });

  it('renders drafts with retention note, step label and continue link', async () => {
    renderCard([draftsMock(sampleDrafts), settingsMock]);

    await screen.findByText('Draft pods');
    // retention days come from settings mock
    await waitFor(() =>
      expect(
        screen.getByText(/automatically deleted after 7 days/i),
      ).toBeInTheDocument(),
    );

    // count chip
    expect(screen.getByText('2')).toBeInTheDocument();

    // populated title + fallback title for empty pod_title
    expect(screen.getByText('Sunday Football')).toBeInTheDocument();
    expect(screen.getByText('Untitled pod')).toBeInTheDocument();

    // step label for step=1 => 'Location, Category & Club', display Step 2/4
    expect(screen.getByText(/Step 2\/4 · Location, Category & Club/)).toBeInTheDocument();
    // step=0 => Step 1/4 · Pod Basics
    expect(screen.getByText(/Step 1\/4 · Pod Basics/)).toBeInTheDocument();

    // continue links point at the draft route
    const links = screen.getAllByRole('link', { name: 'Continue' });
    expect(links[0]).toHaveAttribute('href', '/create-pod/d1');
    expect(links[1]).toHaveAttribute('href', '/create-pod/d2');
  });

  it('opens confirm dialog and deletes a draft, then refetches', async () => {
    const deleteMock = {
      request: { query: DELETE_POD_DRAFT, variables: { draft_id: 'd1' } },
      result: { data: { deletePodDraft: true } },
    };
    // after delete, refetch returns only the remaining draft
    const refetchMock = draftsMock([sampleDrafts[1]]);

    renderCard([draftsMock(sampleDrafts), settingsMock, deleteMock, refetchMock]);

    await screen.findByText('Sunday Football');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete draft' });
    fireEvent.click(deleteButtons[0]);

    // confirm dialog appears
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete draft?')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    // after successful delete + refetch, first draft removed
    await waitFor(() =>
      expect(screen.queryByText('Sunday Football')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Untitled pod')).toBeInTheDocument();
  });

  it('closes the confirm dialog on cancel without deleting', async () => {
    renderCard([draftsMock(sampleDrafts), settingsMock]);

    await screen.findByText('Sunday Football');
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete draft' })[0]);

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // draft still present
    expect(screen.getByText('Sunday Football')).toBeInTheDocument();
  });

  it('falls back to default retention days when settings query errors', async () => {
    const erroringSettings = {
      request: { query: PUBLIC_APP_SETTINGS },
      result: { errors: [new GraphQLError('boom')] },
    };
    renderCard([draftsMock(sampleDrafts), erroringSettings]);

    await screen.findByText('Draft pods');
    await waitFor(() =>
      expect(screen.getByText(/automatically deleted after 3 days/i)).toBeInTheDocument(),
    );
  });
});
