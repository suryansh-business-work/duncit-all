import { describe, expect, it } from 'vitest';
import { gql } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import ClubMembersSection from '../ClubMembersSection';

// The query is defined inline (not exported) in the component; reproduce an
// identical document so MockedProvider can match the request.
const CLUB_MEMBERS = gql`
  query ClubMembers($ids: [ID!]!) {
    publicUsersByIds(user_ids: $ids) {
      user_id
      full_name
      profile_photo
    }
  }
`;

const renderSection = (memberIds: string[], mocks: any[]) =>
  render(
    <MemoryRouter>
      <MockedProvider mocks={mocks} addTypename={false}>
        <ClubMembersSection memberIds={memberIds} />
      </MockedProvider>
    </MemoryRouter>,
  );

describe('ClubMembersSection', () => {
  it('renders nothing when there are no member ids', () => {
    const { container } = renderSection([], []);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders member avatars from query data and opens the attendees dialog', async () => {
    const ids = ['u1', 'u2'];
    const mocks = [
      {
        request: { query: CLUB_MEMBERS, variables: { ids } },
        result: {
          data: {
            publicUsersByIds: [
              { user_id: 'u1', full_name: 'Asha Kumar', profile_photo: 'http://x/u1.jpg' },
              { user_id: 'u2', full_name: null, profile_photo: null },
            ],
          },
        },
      },
    ];

    renderSection(ids, mocks);

    expect(screen.getByText('Pod Members')).toBeInTheDocument();

    // Fallback initial for the member with no name/photo.
    await waitFor(() => expect(screen.getByText('?')).toBeInTheDocument());

    // Dialog starts closed.
    expect(screen.queryByText(/Attendees/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View all pod members' }));

    await waitFor(() => expect(screen.getByText('Attendees (2)')).toBeInTheDocument());
    expect(screen.getByText('Asha Kumar')).toBeInTheDocument();
    expect(screen.getByText('Attendee')).toBeInTheDocument();

    // Close the dialog.
    fireEvent.click(screen.getByRole('button', { name: 'Close attendees' }));
    await waitFor(() =>
      expect(screen.queryByText('Attendees (2)')).not.toBeInTheDocument(),
    );
  });

  it('falls back to placeholder people when the query returns no data', async () => {
    const ids = ['u9'];
    const mocks = [
      {
        request: { query: CLUB_MEMBERS, variables: { ids } },
        result: { data: { publicUsersByIds: null } },
      },
    ];

    renderSection(ids, mocks);

    fireEvent.click(screen.getByRole('button', { name: 'View all pod members' }));
    await waitFor(() => expect(screen.getByText('Attendees (1)')).toBeInTheDocument());
    // No name resolved -> default label.
    expect(screen.getByText('Attendee')).toBeInTheDocument();
  });
});
